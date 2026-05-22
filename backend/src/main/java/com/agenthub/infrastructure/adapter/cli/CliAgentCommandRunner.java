package com.agenthub.infrastructure.adapter.cli;

import com.agenthub.infrastructure.adapter.AgentRequest;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

@Component
public class CliAgentCommandRunner {

    public CliAvailability checkAvailable(String command) {
        String normalized = normalize(command);
        if (normalized.isBlank()) {
            return CliAvailability.unavailable("CLI command is not configured.");
        }

        Path directPath = Path.of(normalized);
        if (directPath.isAbsolute() || normalized.contains("/") || normalized.contains("\\")) {
            return Files.isRegularFile(directPath) && (isWindows() || Files.isExecutable(directPath))
                    ? CliAvailability.availableResult()
                    : CliAvailability.unavailable("CLI command path is not executable: " + normalized);
        }

        String pathEnv = System.getenv("PATH");
        if (pathEnv == null || pathEnv.isBlank()) {
            return CliAvailability.unavailable("PATH environment variable is empty.");
        }

        for (String pathEntry : pathEnv.split(java.io.File.pathSeparator)) {
            if (pathEntry == null || pathEntry.isBlank()) {
                continue;
            }
            for (String candidateName : commandCandidates(normalized)) {
                Path candidate = Path.of(pathEntry, candidateName);
                if (Files.isRegularFile(candidate)) {
                    return CliAvailability.availableResult();
                }
            }
        }

        return CliAvailability.unavailable("CLI command is not available on PATH: " + normalized);
    }

    public CliCommandResult execute(
            String command,
            String argsTemplate,
            AgentRequest request,
            int timeoutSeconds) {
        String normalizedCommand = normalize(command);
        String normalizedTemplate = normalize(argsTemplate);
        if (normalizedCommand.isBlank()) {
            return CliCommandResult.failed(-1, "", "CLI command is not configured.", false);
        }
        if (normalizedTemplate.isBlank()) {
            return CliCommandResult.failed(
                    -1,
                    "",
                    "CLI command is available but args-template is not configured.",
                    false);
        }

        List<String> commandLine = new ArrayList<>();
        commandLine.add(normalizedCommand);
        commandLine.addAll(parseArgs(applyTemplate(normalizedTemplate, request)));

        Process process = null;
        try {
            process = new ProcessBuilder(commandLine)
                    .redirectInput(ProcessBuilder.Redirect.PIPE)
                    .start();

            CompletableFuture<String> stdoutFuture = readStream(process.getInputStream());
            CompletableFuture<String> stderrFuture = readStream(process.getErrorStream());

            boolean completed = process.waitFor(safeTimeoutSeconds(timeoutSeconds), TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                return CliCommandResult.failed(-1, "", "CLI command timed out.", true);
            }

            int exitCode = process.exitValue();
            String stdout = stdoutFuture.get(2, TimeUnit.SECONDS);
            String stderr = stderrFuture.get(2, TimeUnit.SECONDS);
            if (exitCode != 0) {
                return CliCommandResult.failed(exitCode, stdout, stderr, false);
            }
            return new CliCommandResult(exitCode, stdout, stderr, false, true);
        } catch (Exception exception) {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            String message = exception.getMessage() == null || exception.getMessage().isBlank()
                    ? exception.getClass().getSimpleName()
                    : exception.getMessage();
            return CliCommandResult.failed(-1, "", message, false);
        }
    }

    private CompletableFuture<String> readStream(java.io.InputStream inputStream) {
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

    private List<String> parseArgs(String args) {
        List<String> tokens = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inSingleQuote = false;
        boolean inDoubleQuote = false;

        for (int index = 0; index < args.length(); index++) {
            char character = args.charAt(index);
            if (character == '\'' && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                continue;
            }
            if (character == '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
            if (Character.isWhitespace(character) && !inSingleQuote && !inDoubleQuote) {
                if (!current.isEmpty()) {
                    tokens.add(current.toString());
                    current.setLength(0);
                }
                continue;
            }
            current.append(character);
        }

        if (!current.isEmpty()) {
            tokens.add(current.toString());
        }
        return tokens;
    }

    private String applyTemplate(String argsTemplate, AgentRequest request) {
        String prompt = buildPrompt(request);
        return argsTemplate
                .replace("{prompt}", prompt)
                .replace("{taskDescription}", nullToBlank(request.taskDescription()))
                .replace("{userInput}", nullToBlank(request.userInput()));
    }

    private String buildPrompt(AgentRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("Agent: ").append(nullToBlank(request.agentName())).append('\n');
        if (!nullToBlank(request.taskDescription()).isBlank()) {
            builder.append("Task: ").append(request.taskDescription()).append('\n');
        }
        if (!nullToBlank(request.userInput()).isBlank()) {
            builder.append("User input: ").append(request.userInput()).append('\n');
        }
        if (!request.contextItems().isEmpty()) {
            builder.append("Context:\n");
            request.contextItems().forEach(item -> builder.append("- ").append(item).append('\n'));
        }
        if (!request.artifactSummaries().isEmpty()) {
            builder.append("Artifacts:\n");
            request.artifactSummaries().forEach(item -> builder.append("- ").append(item).append('\n'));
        }
        return builder.toString().trim();
    }

    private List<String> commandCandidates(String command) {
        List<String> candidates = new ArrayList<>();
        candidates.add(command);
        if (isWindows() && !command.contains(".")) {
            String pathExt = System.getenv("PATHEXT");
            String[] extensions = pathExt == null || pathExt.isBlank()
                    ? new String[] {".EXE", ".CMD", ".BAT"}
                    : pathExt.split(";");
            for (String extension : extensions) {
                if (extension != null && !extension.isBlank()) {
                    candidates.add(command + extension.toLowerCase(Locale.ROOT));
                    candidates.add(command + extension.toUpperCase(Locale.ROOT));
                }
            }
        }
        return candidates;
    }

    private boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private long safeTimeoutSeconds(int timeoutSeconds) {
        return Duration.ofSeconds(timeoutSeconds <= 0 ? 30 : timeoutSeconds).toSeconds();
    }

    public record CliAvailability(boolean available, String failureReason) {
        public static CliAvailability availableResult() {
            return new CliAvailability(true, null);
        }

        public static CliAvailability unavailable(String failureReason) {
            return new CliAvailability(false, failureReason);
        }
    }

    public record CliCommandResult(
            int exitCode,
            String stdout,
            String stderr,
            boolean timedOut,
            boolean success) {
        public static CliCommandResult failed(int exitCode, String stdout, String stderr, boolean timedOut) {
            return new CliCommandResult(exitCode, stdout, stderr, timedOut, false);
        }
    }
}
