package com.agenthub.infrastructure.adapter;

import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.application.realtime.RunCancellationRegistry;
import com.agenthub.infrastructure.adapter.cli.CliCommandResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.stereotype.Component;

@Component
public class CodexCommandRunner {

    private final ObjectMapper objectMapper;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RunCancellationRegistry runCancellationRegistry;

    public CodexCommandRunner(
            ObjectMapper objectMapper,
            RealtimeEventPublisher realtimeEventPublisher,
            RunCancellationRegistry runCancellationRegistry) {
        this.objectMapper = objectMapper;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.runCancellationRegistry = runCancellationRegistry;
    }

    public Availability checkAvailable(String command) {
        String normalized = normalize(command);
        if (normalized.isBlank()) {
            return Availability.unavailable("Codex CLI command is not configured.");
        }

        CliCommandResolver.ResolvedCommand resolved = CliCommandResolver.resolve(normalized);
        return resolved.available()
                ? Availability.availableResult(resolved.executablePath())
                : Availability.unavailable(resolved.failureReason());
    }

    public ProbeResult probe(String command, List<String> args, int timeoutSeconds) {
        String normalized = normalize(command);
        if (normalized.isBlank()) {
            return ProbeResult.failed("Codex CLI command is not configured.");
        }
        List<String> commandLine = CliCommandResolver.processCommand(resolveCommandExecutable(normalized), args);
        Process process = null;
        try {
            process = new ProcessBuilder(commandLine)
                    .redirectInput(ProcessBuilder.Redirect.PIPE)
                    .start();
            CompletableFuture<String> stdoutFuture = readStream(process.getInputStream());
            CompletableFuture<String> stderrFuture = readStream(process.getErrorStream());
            boolean completed = process.waitFor(safeTimeout(timeoutSeconds).toSeconds(), TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                return ProbeResult.failed("Codex CLI probe timed out.");
            }
            String stdout = getFuture(stdoutFuture, "stdout");
            String stderr = getFuture(stderrFuture, "stderr");
            if (process.exitValue() != 0) {
                return ProbeResult.failed("Codex CLI probe exited with code " + process.exitValue()
                        + ": " + safeSnippet(!normalize(stderr).isBlank() ? stderr : stdout));
            }
            return new ProbeResult(true, stdout, stderr, null);
        } catch (Exception exception) {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            return ProbeResult.failed(exception.getMessage() == null
                    ? exception.getClass().getSimpleName()
                    : exception.getMessage());
        }
    }

    public String resolveCommandPath(String command) {
        return resolveCommandExecutable(normalize(command));
    }

    public Result execute(
            AgentRequest request,
            Options options,
            String prompt,
            String outputSchema)
            throws CodexCommandException, InterruptedException {
        Path requestDir = prepareRequestDir(request, options, prompt, outputSchema);
        Path outputFile = requestDir.resolve("final-message.json");
        List<String> commandLine = buildCommandLine(options, requestDir, outputFile, options.streamingEnabled());

        Process process = null;
        try {
            process = startProcess(commandLine, requestDir);
            writePrompt(process, prompt);
            CompletableFuture<String> stderrFuture = readStream(process.getErrorStream());
            CompletableFuture<String> stdoutFuture = options.streamingEnabled()
                    ? consumeJsonEvents(process.getInputStream(), request)
                    : readStream(process.getInputStream());

            boolean completed = process.waitFor(safeTimeout(options.timeoutSeconds()).toSeconds(), TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new CodexCommandException("Codex CLI timed out after " + options.timeoutSeconds() + " seconds.");
            }
            String stdout = getFuture(stdoutFuture, "stdout");
            String stderr = getFuture(stderrFuture, "stderr");
            if (process.exitValue() != 0) {
                throw new CodexCommandException(buildCliFailure(process.exitValue(), stdout, stderr));
            }
            if (isCancellationRequested(request)) {
                throw new CodexCommandException("Codex execution was cancelled before final output was accepted.");
            }
            String finalOutput = readFinalOutput(outputFile, stdout);
            return new Result(finalOutput, options.streamingEnabled(), summarizeDiagnostics(stdout, stderr));
        } catch (IOException exception) {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            throw new CodexCommandException("Codex CLI I/O failed: " + sanitizeDiagnosticText(exception.getMessage()));
        } finally {
            cleanupRequestDir(requestDir);
        }
    }

    private Path prepareRequestDir(
            AgentRequest request,
            Options options,
            String prompt,
            String outputSchema)
            throws CodexCommandException {
        Path requestDir = options.workDir()
                .resolve(safePathSegment(request.requestId()))
                .toAbsolutePath()
                .normalize();
        try {
            Files.createDirectories(requestDir);
            Files.writeString(requestDir.resolve("prompt.txt"), prompt, StandardCharsets.UTF_8);
            Files.writeString(requestDir.resolve("artifact-schema.json"), outputSchema, StandardCharsets.UTF_8);
            return requestDir;
        } catch (IOException exception) {
            throw new CodexCommandException("Codex request workspace could not be prepared: "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private List<String> buildCommandLine(
            Options options,
            Path requestDir,
            Path outputFile,
            boolean streaming) {
        List<String> commandLine = new ArrayList<>();
        commandLine.add(resolveCommandExecutable(options.command()));
        commandLine.add("exec");
        if (streaming) {
            commandLine.add("--json");
        }
        commandLine.add("--output-last-message");
        commandLine.add(outputFile.toString());
        commandLine.add("--output-schema");
        commandLine.add(requestDir.resolve("artifact-schema.json").toString());
        commandLine.add("--cd");
        commandLine.add(requestDir.toString());
        commandLine.add("--skip-git-repo-check");
        commandLine.add("--ephemeral");
        commandLine.add("--sandbox");
        commandLine.add("read-only");
        if (!normalize(options.model()).isBlank()) {
            commandLine.add("--model");
            commandLine.add(options.model().trim());
        }
        commandLine.add("-");
        return commandLine;
    }

    private Process startProcess(List<String> commandLine, Path requestDir) throws IOException {
        List<String> nativeCommandLine = commandLine.isEmpty()
                ? commandLine
                : CliCommandResolver.processCommand(commandLine.get(0), commandLine.subList(1, commandLine.size()));
        return new ProcessBuilder(nativeCommandLine)
                .directory(requestDir.toFile())
                .redirectInput(ProcessBuilder.Redirect.PIPE)
                .start();
    }

    private void writePrompt(Process process, String prompt) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(
                new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8))) {
            writer.write(prompt);
            writer.flush();
        }
    }

    private CompletableFuture<String> consumeJsonEvents(InputStream inputStream, AgentRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            StringBuilder diagnostics = new StringBuilder();
            StringBuilder accumulatedPreview = new StringBuilder();
            int chunkIndex = 0;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    appendDiagnosticLine(diagnostics, line);
                    if (isCancellationRequested(request)) {
                        continue;
                    }
                    String chunk = extractStreamChunk(line);
                    if (chunk != null && !chunk.isBlank()) {
                        accumulatedPreview.append(chunk);
                        publishStreamChunk(request, chunkIndex++, chunk, accumulatedPreview.length());
                    }
                }
            } catch (IOException exception) {
                appendDiagnosticLine(diagnostics, "Failed to read Codex JSON event stream: " + exception.getMessage());
            }
            return diagnostics.toString();
        });
    }

    private CompletableFuture<String> readStream(InputStream inputStream) {
        return CompletableFuture.supplyAsync(() -> {
            StringBuilder builder = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    appendDiagnosticLine(builder, line);
                }
            } catch (IOException exception) {
                appendDiagnosticLine(builder, "Failed to read CLI stream: " + exception.getMessage());
            }
            return builder.toString();
        });
    }

    private String extractStreamChunk(String line) {
        if (line == null || line.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(line);
            return firstText(
                    root.path("delta"),
                    root.path("text"),
                    root.path("content"),
                    root.path("message").path("content"),
                    root.path("event").path("message").path("content"),
                    root.path("item").path("text"));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String firstText(JsonNode... nodes) {
        for (JsonNode node : nodes) {
            String value = extractText(node);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private String extractText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return node.asText();
        }
        if (node.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : node) {
                String value = extractText(item);
                if (value != null) {
                    builder.append(value);
                }
            }
            return builder.toString();
        }
        if (node.has("text")) {
            return node.path("text").asText("");
        }
        if (node.has("content")) {
            return extractText(node.path("content"));
        }
        return null;
    }

    private String readFinalOutput(Path outputFile, String stdout) throws CodexCommandException {
        try {
            if (Files.isRegularFile(outputFile)) {
                String content = Files.readString(outputFile, StandardCharsets.UTF_8).trim();
                if (!content.isBlank()) {
                    return content;
                }
            }
        } catch (IOException exception) {
            throw new CodexCommandException("Codex final output file could not be read: "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
        String trimmed = stdout == null ? "" : stdout.trim();
        if (!trimmed.isBlank() && trimmed.startsWith("{") && trimmed.contains("\"artifacts\"")) {
            return trimmed;
        }
        throw new CodexCommandException("Codex did not produce a final Artifact JSON output file.");
    }

    private void cleanupRequestDir(Path requestDir) {
        if (requestDir == null || !Files.exists(requestDir)) {
            return;
        }
        try (var paths = Files.walk(requestDir)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Best-effort cleanup only; stale diagnostics must not break adapter fallback behavior.
                }
            });
        } catch (IOException ignored) {
            // Best-effort cleanup only.
        }
        try {
            Path parent = requestDir.getParent();
            if (parent != null && Files.isDirectory(parent) && isDirectoryEmpty(parent)) {
                Files.deleteIfExists(parent);
            }
        } catch (IOException ignored) {
            // Best-effort cleanup only.
        }
    }

    private boolean isDirectoryEmpty(Path directory) throws IOException {
        try (var entries = Files.list(directory)) {
            return entries.findAny().isEmpty();
        }
    }

    private String getFuture(CompletableFuture<String> future, String streamName) throws CodexCommandException {
        try {
            return future.get(2, TimeUnit.SECONDS);
        } catch (TimeoutException exception) {
            throw new CodexCommandException("Timed out while reading Codex CLI " + streamName + ".");
        } catch (Exception exception) {
            throw new CodexCommandException("Failed to read Codex CLI " + streamName + ": "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private String resolveCommandExecutable(String command) {
        return CliCommandResolver.resolveExecutable(command);
    }

    private void publishStreamChunk(
            AgentRequest request,
            int chunkIndex,
            String chunk,
            int accumulatedLength) {
        if (chunk == null || chunk.isEmpty() || isCancellationRequested(request)) {
            return;
        }
        try {
            Map<String, Object> payload = Map.of(
                    "taskRunId", nullToBlank(request.taskRunId()),
                    "taskStepId", nullToBlank(request.taskStepId()),
                    "adapterType", AgentAdapterType.CODEX.name(),
                    "chunk", chunk,
                    "chunkIndex", chunkIndex,
                    "chunkLength", chunk.length(),
                    "accumulatedLength", accumulatedLength);
            realtimeEventPublisher.publish(
                    request.conversationId(),
                    RealtimeEventType.ADAPTER_STREAM_CHUNK,
                    "TASK_STEP",
                    request.taskStepId(),
                    payload);
            realtimeEventPublisher.publish(
                    request.conversationId(),
                    RealtimeEventType.TASK_STEP_STREAM_CHUNK,
                    "TASK_STEP",
                    request.taskStepId(),
                    payload);
        } catch (RuntimeException ignored) {
            // Streaming preview is best-effort and must not break adapter fallback behavior.
        }
    }

    private boolean isCancellationRequested(AgentRequest request) {
        return request != null
                && request.taskRunId() != null
                && runCancellationRegistry.isCancellationRequested(request.taskRunId());
    }

    private String buildCliFailure(int exitCode, String stdout, String stderr) {
        String detail = !normalize(stderr).isBlank() ? stderr : stdout;
        return "Codex CLI failed with exit code " + exitCode
                + (detail == null || detail.isBlank() ? "." : ": " + safeSnippet(detail));
    }

    private String summarizeDiagnostics(String stdout, String stderr) {
        List<String> parts = new ArrayList<>();
        if (stdout != null && !stdout.isBlank()) {
            parts.add("stdout=" + safeSnippet(stdout));
        }
        if (stderr != null && !stderr.isBlank()) {
            parts.add("stderr=" + safeSnippet(stderr));
        }
        return parts.isEmpty() ? null : String.join("; ", parts);
    }

    private void appendDiagnosticLine(StringBuilder builder, String line) {
        if (!builder.isEmpty()) {
            builder.append(System.lineSeparator());
        }
        builder.append(line);
    }

    private Duration safeTimeout(int timeoutSeconds) {
        return Duration.ofSeconds(timeoutSeconds <= 0 ? 120 : timeoutSeconds);
    }

    private String safePathSegment(String value) {
        String normalized = value == null ? "request" : value.replaceAll("[^A-Za-z0-9._-]", "_");
        return normalized.isBlank() ? "request" : normalized;
    }

    private String safeSnippet(String value) {
        String sanitized = sanitizeDiagnosticText(value)
                .replace("\r", " ")
                .replace("\n", " ")
                .trim();
        if (sanitized.length() <= 500) {
            return sanitized;
        }
        return sanitized.substring(0, 500) + "...";
    }

    private String sanitizeDiagnosticText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.replaceAll("(?i)api[_-]?key\\s*[:=]\\s*[^\\s]+", "api_key=[REDACTED]")
                .replaceAll("(?i)openai_api_key\\s*[:=]\\s*[^\\s]+", "OPENAI_API_KEY=[REDACTED]")
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    public record Options(
            String command,
            String model,
            int timeoutSeconds,
            boolean streamingEnabled,
            Path workDir) {
    }

    public record Availability(boolean available, String failureReason, String resolvedPath) {
        public static Availability availableResult(String resolvedPath) {
            return new Availability(true, null, resolvedPath);
        }

        public static Availability unavailable(String failureReason) {
            return new Availability(false, failureReason, null);
        }
    }

    public record ProbeResult(boolean success, String stdout, String stderr, String failureReason) {
        public static ProbeResult failed(String failureReason) {
            return new ProbeResult(false, "", "", failureReason);
        }
    }

    public record Result(String content, boolean streaming, String diagnostic) {
    }

    public static class CodexCommandException extends Exception {
        public CodexCommandException(String message) {
            super(message);
        }
    }
}
