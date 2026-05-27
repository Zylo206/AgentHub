package com.agenthub.infrastructure.adapter;

import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.application.realtime.RunCancellationRegistry;
import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.cli.CliAgentCommandRunner;
import com.fasterxml.jackson.core.JsonProcessingException;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClaudeCodeAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final AdapterArtifactContractValidator artifactContractValidator;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RunCancellationRegistry runCancellationRegistry;
    private final CliAgentCommandRunner commandRunner;
    private final boolean enabled;
    private final String command;
    private final String model;
    private final int maxTurns;
    private final int timeoutSeconds;
    private final boolean streamingEnabled;
    private final boolean artifactOnly;
    private final String allowedTools;
    private final String disallowedTools;
    private final Path workDir;
    private final boolean fixtureEnabled;

    public ClaudeCodeAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            AdapterArtifactContractValidator artifactContractValidator,
            RealtimeEventPublisher realtimeEventPublisher,
            RunCancellationRegistry runCancellationRegistry,
            CliAgentCommandRunner commandRunner,
            @Value("${agenthub.adapters.claude-code.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.claude-code.command:claude}") String command,
            @Value("${agenthub.adapters.claude-code.model:sonnet}") String model,
            @Value("${agenthub.adapters.claude-code.max-turns:3}") int maxTurns,
            @Value("${agenthub.adapters.claude-code.timeout-seconds:120}") int timeoutSeconds,
            @Value("${agenthub.adapters.claude-code.streaming-enabled:false}") boolean streamingEnabled,
            @Value("${agenthub.adapters.claude-code.artifact-only:true}") boolean artifactOnly,
            @Value("${agenthub.adapters.claude-code.allowed-tools:Read,Grep,Glob}") String allowedTools,
            @Value("${agenthub.adapters.claude-code.disallowed-tools:Edit,MultiEdit,Write,NotebookEdit,Bash}") String disallowedTools,
            @Value("${agenthub.adapters.claude-code.work-dir:.agenthub/claude-code-runs}") String workDir,
            @Value("${agenthub.adapters.claude-code.fixture-enabled:false}") boolean fixtureEnabled) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.artifactContractValidator = artifactContractValidator;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.runCancellationRegistry = runCancellationRegistry;
        this.commandRunner = commandRunner;
        this.enabled = enabled;
        this.command = normalize(command, "claude");
        this.model = normalize(model, "sonnet");
        this.maxTurns = Math.max(1, Math.min(maxTurns, 10));
        this.timeoutSeconds = timeoutSeconds <= 0 ? 120 : timeoutSeconds;
        this.streamingEnabled = streamingEnabled;
        this.artifactOnly = artifactOnly;
        this.allowedTools = normalize(allowedTools, "Read,Grep,Glob");
        this.disallowedTools = normalize(disallowedTools, "Edit,MultiEdit,Write,NotebookEdit,Bash");
        this.workDir = Path.of(normalize(workDir, ".agenthub/claude-code-runs"));
        this.fixtureEnabled = fixtureEnabled;
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.CLAUDE_CODE;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        if (!enabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterHealthStatus.DISABLED,
                    false,
                    false,
                    "Claude Code headless adapter is disabled.",
                    "Set agenthub.adapters.claude-code.enabled=true to enable it.");
        }

        if (!artifactOnly) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Claude Code adapter v1 requires Artifact-only mode.",
                    "Set agenthub.adapters.claude-code.artifact-only=true. Workspace-write mode is not supported in v1.");
        }

        if (fixtureEnabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterHealthStatus.AVAILABLE,
                    true,
                    false,
                    "Claude Code adapter is using local fixture mode for deterministic Artifact-only contract tests.",
                    null);
        }

        CliAgentCommandRunner.CliAvailability availability = commandRunner.checkAvailable(command);
        if (!availability.available()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Claude Code CLI command is not available.",
                    availability.failureReason());
        }

        return new AgentAdapterDescriptor(
                AgentAdapterType.CLAUDE_CODE,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                streamingEnabled
                        ? "Claude Code headless adapter is configured for Artifact-only stream-json execution."
                        : "Claude Code headless adapter is configured for Artifact-only json execution.",
                null);
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        AgentAdapterDescriptor descriptor = describe();
        if (descriptor.status() != AgentAdapterHealthStatus.AVAILABLE) {
            return failedResponse(request, startedAt, descriptor.description(), descriptor.failureReason());
        }

        if (fixtureEnabled) {
            return executeFixture(request, startedAt);
        }

        try {
            ExecutionResult result = streamingEnabled
                    ? executeStreamingWithFallback(request)
                    : executeNonStreaming(request);
            String artifactJson = normalizeAndValidateArtifactContract(result.content());
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterType.CLAUDE_CODE,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    artifactJson,
                    List.of(result.streaming()
                            ? "JSON:claude-code-stream-json-artifact-contract"
                            : "JSON:claude-code-json-artifact-contract"),
                    result.diagnostic(),
                    startedAt,
                    timeProvider.now());
        } catch (AdapterResponseException exception) {
            return failedResponse(
                    request,
                    startedAt,
                    "Claude Code headless adapter could not complete the request.",
                    exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return failedResponse(
                    request,
                    startedAt,
                    "Claude Code headless adapter was interrupted.",
                    "CLI execution was interrupted.");
        } catch (Exception exception) {
            return failedResponse(
                    request,
                    startedAt,
                    "Claude Code headless adapter failed.",
                    sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private ExecutionResult executeStreamingWithFallback(AgentRequest request)
            throws AdapterResponseException, InterruptedException {
        try {
            return executeStreaming(request);
        } catch (AdapterResponseException exception) {
            if (isCancellationRequested(request)) {
                throw exception;
            }
            return executeNonStreaming(request);
        }
    }

    private ExecutionResult executeNonStreaming(AgentRequest request)
            throws AdapterResponseException, InterruptedException {
        Process process = null;
        Path requestDir = prepareRequestDir(request);
        try {
            process = startProcess(buildCommand(false), requestDir);
            writePrompt(process, buildArtifactPrompt(request));
            CompletableFuture<String> stdoutFuture = readStream(process.getInputStream());
            CompletableFuture<String> stderrFuture = readStream(process.getErrorStream());
            boolean completed = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new AdapterResponseException("Claude Code CLI timed out after " + timeoutSeconds + " seconds.");
            }
            String stdout = getFuture(stdoutFuture);
            String stderr = getFuture(stderrFuture);
            if (process.exitValue() != 0) {
                throw new AdapterResponseException(buildCliFailure(process.exitValue(), stdout, stderr));
            }
            if (isCancellationRequested(request)) {
                throw new AdapterResponseException("Claude Code execution was cancelled before final output was accepted.");
            }
            String content = extractJsonResult(stdout);
            return new ExecutionResult(content, false, summarizeDiagnostics(stdout, stderr));
        } catch (IOException exception) {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            throw new AdapterResponseException("Claude Code CLI I/O failed: " + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private ExecutionResult executeStreaming(AgentRequest request)
            throws AdapterResponseException, InterruptedException {
        Process process = null;
        Path requestDir = prepareRequestDir(request);
        try {
            process = startProcess(buildCommand(true), requestDir);
            writePrompt(process, buildArtifactPrompt(request));
            CompletableFuture<String> stderrFuture = readStream(process.getErrorStream());
            String content = consumeStreamJson(process, request);
            boolean completed = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new AdapterResponseException("Claude Code stream-json execution timed out after "
                        + timeoutSeconds + " seconds.");
            }
            String stderr = getFuture(stderrFuture);
            if (process.exitValue() != 0) {
                throw new AdapterResponseException(buildCliFailure(process.exitValue(), "", stderr));
            }
            if (isCancellationRequested(request)) {
                throw new AdapterResponseException("Claude Code stream-json execution was cancelled before final output was accepted.");
            }
            if (content == null || content.isBlank()) {
                throw new AdapterResponseException("Claude Code stream-json did not include a final result payload.");
            }
            return new ExecutionResult(content, true, summarizeDiagnostics("", stderr));
        } catch (IOException exception) {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            throw new AdapterResponseException("Claude Code stream-json I/O failed: "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private String consumeStreamJson(Process process, AgentRequest request)
            throws IOException, AdapterResponseException {
        StringBuilder assistantPreview = new StringBuilder();
        String finalResult = "";
        int chunkIndex = 0;
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (isCancellationRequested(request)) {
                    throw new AdapterResponseException("Claude Code stream-json response was cancelled before completion.");
                }
                String chunk = parseStreamJsonLine(line);
                if (chunk != null && !chunk.isBlank()) {
                    assistantPreview.append(chunk);
                    publishStreamChunk(request, chunkIndex++, chunk, assistantPreview.length());
                }
                String result = parseResultLine(line);
                if (result != null && !result.isBlank()) {
                    finalResult = result;
                }
            }
        }
        if (!finalResult.isBlank()) {
            return finalResult;
        }
        return assistantPreview.toString();
    }

    private String parseStreamJsonLine(String line) throws AdapterResponseException {
        if (line == null || line.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(line);
            if ("assistant".equals(root.path("type").asText(""))) {
                JsonNode contentNode = root.path("message").path("content");
                return extractTextContent(contentNode);
            }
            return null;
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException("Claude Code stream-json emitted invalid JSONL: " + safeSnippet(line));
        }
    }

    private String parseResultLine(String line) throws AdapterResponseException {
        if (line == null || line.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(line);
            if (!"result".equals(root.path("type").asText(""))) {
                return null;
            }
            if (root.path("is_error").asBoolean(false)) {
                throw new AdapterResponseException("Claude Code stream-json result reported an error: "
                        + safeSnippet(root.path("result").asText("")));
            }
            return root.path("result").asText("");
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException("Claude Code stream-json result was invalid JSON: " + safeSnippet(line));
        }
    }

    private List<String> buildCommand(boolean streaming) {
        List<String> commandLine = new ArrayList<>();
        commandLine.add(resolveCommandExecutable());
        commandLine.add("-p");
        commandLine.add("--output-format");
        commandLine.add(streaming ? "stream-json" : "json");
        commandLine.add("--input-format");
        commandLine.add("text");
        commandLine.add("--max-turns");
        commandLine.add(String.valueOf(maxTurns));
        commandLine.add("--model");
        commandLine.add(model);
        if (!allowedTools.isBlank()) {
            commandLine.add("--allowedTools");
            commandLine.add(allowedTools);
        }
        if (!disallowedTools.isBlank()) {
            commandLine.add("--disallowedTools");
            commandLine.add(disallowedTools);
        }
        return commandLine;
    }

    private String resolveCommandExecutable() {
        Path directPath = Path.of(command);
        if (directPath.isAbsolute() || command.contains("/") || command.contains("\\")) {
            return command;
        }

        String pathEnv = System.getenv("PATH");
        if (pathEnv == null || pathEnv.isBlank()) {
            return command;
        }

        for (String pathEntry : pathEnv.split(java.io.File.pathSeparator)) {
            if (pathEntry == null || pathEntry.isBlank()) {
                continue;
            }
            for (String candidateName : commandCandidates(command)) {
                Path candidate = Path.of(pathEntry, candidateName);
                if (Files.isRegularFile(candidate)) {
                    return candidate.toString();
                }
            }
        }
        return command;
    }

    private List<String> commandCandidates(String commandName) {
        List<String> candidates = new ArrayList<>();
        candidates.add(commandName);
        if (isWindows() && !commandName.contains(".")) {
            String pathExt = System.getenv("PATHEXT");
            String[] extensions = pathExt == null || pathExt.isBlank()
                    ? new String[] {".EXE", ".CMD", ".BAT"}
                    : pathExt.split(";");
            for (String extension : extensions) {
                if (extension != null && !extension.isBlank()) {
                    candidates.add(commandName + extension.toLowerCase(Locale.ROOT));
                    candidates.add(commandName + extension.toUpperCase(Locale.ROOT));
                }
            }
        }
        return candidates;
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    private Path prepareRequestDir(AgentRequest request) throws AdapterResponseException {
        String safeRequestId = safePathSegment(request.requestId());
        Path requestDir = workDir.resolve(safeRequestId);
        try {
            Files.createDirectories(requestDir);
            Files.writeString(
                    requestDir.resolve("prompt.txt"),
                    buildArtifactPrompt(request),
                    StandardCharsets.UTF_8);
            return requestDir;
        } catch (IOException exception) {
            throw new AdapterResponseException("Claude Code request workspace could not be prepared: "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private Process startProcess(List<String> commandLine, Path requestDir) throws IOException {
        return new ProcessBuilder(commandLine)
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

    private CompletableFuture<String> readStream(InputStream inputStream) {
        return CompletableFuture.supplyAsync(() -> {
            StringBuilder builder = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (!builder.isEmpty()) {
                        builder.append(System.lineSeparator());
                    }
                    builder.append(line);
                }
            } catch (IOException exception) {
                if (!builder.isEmpty()) {
                    builder.append(System.lineSeparator());
                }
                builder.append("Failed to read CLI stream: ").append(exception.getMessage());
            }
            return builder.toString();
        });
    }

    private String getFuture(CompletableFuture<String> future) throws AdapterResponseException {
        try {
            return future.get(2, TimeUnit.SECONDS);
        } catch (TimeoutException exception) {
            throw new AdapterResponseException("Timed out while reading Claude Code CLI output.");
        } catch (Exception exception) {
            throw new AdapterResponseException("Failed to read Claude Code CLI output: "
                    + sanitizeDiagnosticText(exception.getMessage()));
        }
    }

    private String extractJsonResult(String stdout) throws AdapterResponseException {
        if (stdout == null || stdout.isBlank()) {
            throw new AdapterResponseException("Claude Code JSON output was empty.");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(stdout.trim());
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException("Claude Code JSON output was not valid JSON: " + safeSnippet(stdout));
        }
        if (root.path("is_error").asBoolean(false)) {
            throw new AdapterResponseException("Claude Code JSON result reported an error: "
                    + safeSnippet(root.path("result").asText("")));
        }
        String result = root.path("result").asText("");
        if (result.isBlank()) {
            throw new AdapterResponseException("Claude Code JSON output did not include a non-empty result field.");
        }
        return result;
    }

    private String extractTextContent(JsonNode contentNode) {
        if (contentNode == null || contentNode.isMissingNode() || contentNode.isNull()) {
            return "";
        }
        if (contentNode.isTextual()) {
            return contentNode.asText();
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item.isTextual()) {
                    builder.append(item.asText());
                } else if ("text".equals(item.path("type").asText("")) || item.has("text")) {
                    builder.append(item.path("text").asText(""));
                }
            }
            return builder.toString();
        }
        if (contentNode.has("text")) {
            return contentNode.path("text").asText("");
        }
        return contentNode.toString();
    }

    private AgentResponse executeFixture(AgentRequest request, Instant startedAt) {
        try {
            String fixtureJson = objectMapper.writeValueAsString(buildFixtureArtifactContract(request));
            if (streamingEnabled) {
                publishFixtureStream(request, fixtureJson);
            }
            String artifactJson = normalizeAndValidateArtifactContract(fixtureJson);
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterType.CLAUDE_CODE,
                    AgentAdapterType.CLAUDE_CODE,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    artifactJson,
                    List.of("JSON:claude-code-fixture-artifact-contract"),
                    "Claude Code fixture mode generated local Artifact-only JSON.",
                    startedAt,
                    timeProvider.now());
        } catch (Exception exception) {
            return failedResponse(request, startedAt, "Claude Code fixture failed.", exception.getMessage());
        }
    }

    private JsonNode buildFixtureArtifactContract(AgentRequest request) {
        String taskDescription = nullToBlank(request.taskDescription()).toLowerCase(Locale.ROOT);
        String userInput = nullToBlank(request.userInput()).toLowerCase(Locale.ROOT);
        String requiredSkill = String.valueOf(request.metadata().getOrDefault("requiredSkill", ""))
                .toLowerCase(Locale.ROOT);
        String signal = taskDescription + "\n" + userInput + "\n" + requiredSkill;

        var root = objectMapper.createObjectNode();
        var artifacts = root.putArray("artifacts");

        if (containsAny(signal, "review", "quality", "risk", "检查", "评审")) {
            root.put("assistantMessage", "Claude Code fixture reviewer produced a review report.");
            artifacts.addObject()
                    .put("title", "claude-code-fixture-review.md")
                    .put("type", "REVIEW_REPORT")
                    .put("language", "md")
                    .put("summary", "Fixture review report produced by the Claude Code adapter contract.")
                    .put("content", """
                            # Claude Code Fixture Review

                            Decision: APPROVAL

                            - Artifact-only contract was respected.
                            - No workspace write was executed.
                            - Follow-up: run real Claude Code smoke when CLI is installed and authenticated.
                            """);
            return root;
        }

        if (containsAny(signal, "api", "backend", "contract", "data model", "接口")) {
            root.put("assistantMessage", "Claude Code fixture produced an API contract.");
            artifacts.addObject()
                    .put("title", "claude-code-fixture-api-contract.json")
                    .put("type", "API_CONTRACT")
                    .put("language", "json")
                    .put("summary", "Fixture API contract from Claude Code Artifact-only mode.")
                    .put("content", """
                            {
                              "endpoint": "/api/auth/login",
                              "method": "POST",
                              "request": {
                                "email": "string",
                                "verificationCode": "string"
                              },
                              "response": {
                                "token": "string",
                                "expiresIn": 3600
                              }
                            }
                            """);
            return root;
        }

        root.put("assistantMessage", "Claude Code fixture produced a React login component and README.");
        artifacts.addObject()
                .put("title", "ClaudeCodeFixtureLoginPage.tsx")
                .put("type", "CODE")
                .put("language", "tsx")
                .put("summary", "Fixture React login component generated by Claude Code Artifact-only adapter.")
                .put("content", """
                        import { useState } from "react";

                        export default function ClaudeCodeFixtureLoginPage() {
                          const [email, setEmail] = useState("");
                          const [verificationCode, setVerificationCode] = useState("");

                          return (
                            <main className="login-shell">
                              <form aria-label="claude-code-fixture-login">
                                <label>
                                  Email
                                  <input value={email} onChange={(event) => setEmail(event.target.value)} />
                                </label>
                                <label>
                                  Verification code
                                  <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} />
                                </label>
                                <button type="submit">Sign in</button>
                              </form>
                            </main>
                          );
                        }
                        """);
        artifacts.addObject()
                .put("title", "claude-code-fixture-readme.md")
                .put("type", "MARKDOWN")
                .put("language", "md")
                .put("summary", "Fixture README for Claude Code Artifact-only mode.")
                .put("content", """
                        # Claude Code Fixture

                        This artifact verifies the AgentHub Claude Code headless adapter contract.
                        It is local fixture output and does not represent a real Claude Code provider run.
                        """);
        return root;
    }

    private String buildArtifactPrompt(AgentRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("You are Claude Code running inside AgentHub Artifact-only adapter mode.\n");
        builder.append("You must not modify files, run commands, or write to the workspace.\n");
        builder.append("Return exactly one valid JSON object and nothing else.\n\n");
        builder.append("Agent name: ").append(nullToBlank(request.agentName())).append('\n');
        if (!nullToBlank(request.systemPrompt()).isBlank()) {
            builder.append("Agent system prompt:\n").append(request.systemPrompt()).append("\n\n");
        }
        if (!nullToBlank(request.taskDescription()).isBlank()) {
            builder.append("Task description:\n").append(request.taskDescription()).append("\n\n");
        }
        if (!nullToBlank(request.userInput()).isBlank()) {
            builder.append("User input:\n").append(request.userInput()).append("\n\n");
        }
        if (!request.contextItems().isEmpty()) {
            builder.append("Context items:\n");
            request.contextItems().forEach(item -> builder.append("- ").append(item).append('\n'));
            builder.append('\n');
        }
        if (!request.artifactSummaries().isEmpty()) {
            builder.append("Artifact summaries:\n");
            request.artifactSummaries().forEach(item -> builder.append("- ").append(item).append('\n'));
            builder.append('\n');
        }
        builder.append("""
                AgentHub Artifact JSON contract:
                {
                  "assistantMessage": "short summary for AgentHub chat",
                  "artifacts": [
                    {
                      "title": "file or report title",
                      "type": "CODE | MARKDOWN | REVIEW_REPORT | API_CONTRACT | DATA_MODEL | WEB_PREVIEW",
                      "language": "tsx | md | json | html | txt",
                      "summary": "one sentence summary",
                      "content": "complete artifact content"
                    }
                  ]
                }

                Rules:
                - Return only the JSON object. No markdown fences. No prose outside JSON.
                - Every artifact must have non-empty title, type, language, content, and summary.
                - CODE content must be complete raw source code inside the JSON string, not markdown fenced code.
                - REVIEW_REPORT and MARKDOWN content must be useful markdown body text.
                - API_CONTRACT and DATA_MODEL content should be structured JSON text or schema text.
                - Empty content, provider error text, plain text responses, invalid JSON, or missing artifacts will be rejected.
                """);
        return builder.toString();
    }

    private String normalizeAndValidateArtifactContract(String content) throws AdapterResponseException {
        AdapterArtifactContractValidator.ValidationResult validationResult =
                artifactContractValidator.validate(content);
        if (!validationResult.valid()) {
            throw new AdapterResponseException(
                    "Claude Code output failed AgentHub artifact JSON schema validation: "
                            + validationResult.errorMessage());
        }
        return validationResult.normalizedJson();
    }

    private void publishFixtureStream(AgentRequest request, String content) {
        int chunkSize = 160;
        int chunkIndex = 0;
        for (int offset = 0; offset < content.length(); offset += chunkSize) {
            if (isCancellationRequested(request)) {
                return;
            }
            String chunk = content.substring(offset, Math.min(content.length(), offset + chunkSize));
            publishStreamChunk(request, chunkIndex++, chunk, Math.min(content.length(), offset + chunk.length()));
        }
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
                    "adapterType", AgentAdapterType.CLAUDE_CODE.name(),
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
            // Streaming preview must never break adapter execution or fallback behavior.
        }
    }

    private AgentResponse failedResponse(
            AgentRequest request,
            Instant startedAt,
            String content,
            String errorMessage) {
        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.CLAUDE_CODE,
                AgentAdapterType.CLAUDE_CODE,
                AgentAdapterType.CLAUDE_CODE,
                false,
                AgentExecutionStatus.FAILED,
                content,
                List.of(),
                errorMessage,
                startedAt,
                timeProvider.now());
    }

    private String buildCliFailure(int exitCode, String stdout, String stderr) {
        String detail = !nullToBlank(stderr).isBlank() ? stderr : stdout;
        return "Claude Code CLI failed with exit code " + exitCode
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

    private boolean isCancellationRequested(AgentRequest request) {
        return request != null
                && request.taskRunId() != null
                && runCancellationRegistry.isCancellationRequested(request.taskRunId());
    }

    private boolean containsAny(String input, String... keywords) {
        String normalized = input == null ? "" : input.toLowerCase(Locale.ROOT);
        for (String keyword : keywords) {
            if (normalized.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
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
        return value.replaceAll("(?i)x-api-key\\s*[:=]\\s*[^\\s]+", "x-api-key=[REDACTED]")
                .replaceAll("(?i)anthropic_api_key\\s*[:=]\\s*[^\\s]+", "ANTHROPIC_API_KEY=[REDACTED]")
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]");
    }

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private record ExecutionResult(String content, boolean streaming, String diagnostic) {
    }

    private static class AdapterResponseException extends Exception {
        private AdapterResponseException(String message) {
            super(message);
        }
    }
}
