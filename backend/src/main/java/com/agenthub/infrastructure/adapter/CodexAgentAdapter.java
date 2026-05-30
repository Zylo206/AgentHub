package com.agenthub.infrastructure.adapter;

import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.application.realtime.RunCancellationRegistry;
import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.CodexCommandRunner.CodexCommandException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodexAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final AdapterArtifactContractValidator artifactContractValidator;
    private final CodexCommandRunner commandRunner;
    private final CodexArtifactPromptBuilder promptBuilder;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RunCancellationRegistry runCancellationRegistry;
    private final boolean enabled;
    private final String command;
    private final String model;
    private final int timeoutSeconds;
    private final boolean streamingEnabled;
    private final boolean artifactOnly;
    private final Path workDir;
    private final boolean fixtureEnabled;
    private final int fixtureStreamChunkDelayMillis;

    public CodexAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            AdapterArtifactContractValidator artifactContractValidator,
            CodexCommandRunner commandRunner,
            CodexArtifactPromptBuilder promptBuilder,
            RealtimeEventPublisher realtimeEventPublisher,
            RunCancellationRegistry runCancellationRegistry,
            @Value("${agenthub.adapters.codex.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.codex.command:codex}") String command,
            @Value("${agenthub.adapters.codex.model:}") String model,
            @Value("${agenthub.adapters.codex.timeout-seconds:120}") int timeoutSeconds,
            @Value("${agenthub.adapters.codex.streaming-enabled:false}") boolean streamingEnabled,
            @Value("${agenthub.adapters.codex.artifact-only:true}") boolean artifactOnly,
            @Value("${agenthub.adapters.codex.work-dir:.agenthub/codex-runs}") String workDir,
            @Value("${agenthub.adapters.codex.fixture-enabled:false}") boolean fixtureEnabled,
            @Value("${agenthub.adapters.codex.fixture-stream-chunk-delay-millis:0}") int fixtureStreamChunkDelayMillis) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.artifactContractValidator = artifactContractValidator;
        this.commandRunner = commandRunner;
        this.promptBuilder = promptBuilder;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.runCancellationRegistry = runCancellationRegistry;
        this.enabled = enabled;
        this.command = normalize(command, "codex");
        this.model = normalize(model, "");
        this.timeoutSeconds = timeoutSeconds <= 0 ? 120 : timeoutSeconds;
        this.streamingEnabled = streamingEnabled;
        this.artifactOnly = artifactOnly;
        this.workDir = Path.of(normalize(workDir, ".agenthub/codex-runs"));
        this.fixtureEnabled = fixtureEnabled;
        this.fixtureStreamChunkDelayMillis = Math.max(0, fixtureStreamChunkDelayMillis);
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.CODEX;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        if (!enabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.DISABLED,
                    false,
                    false,
                    "Codex headless adapter is disabled.",
                    "Set agenthub.adapters.codex.enabled=true to enable it.");
        }

        if (!artifactOnly) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Codex adapter v1 requires Artifact-only mode.",
                    "Set agenthub.adapters.codex.artifact-only=true. Workspace-write mode is not supported in v1.");
        }

        if (fixtureEnabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.AVAILABLE,
                    true,
                    false,
                    "Codex adapter is using local fixture mode for deterministic Artifact-only contract tests.",
                    null,
                    supportedModes(),
                    safetyPolicies(),
                    capabilityDetails("fixture", null));
        }

        CodexCommandRunner.Availability availability = commandRunner.checkAvailable(command);
        if (!availability.available()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Codex CLI command is not available.",
                    withFailureType("NOT_INSTALLED", availability.failureReason()),
                    supportedModes(),
                    safetyPolicies(),
                    capabilityDetails("missing", availability.failureReason()));
        }

        Map<String, Object> details = capabilityDetails("available", null);
        String probeFailure = cliProbeFailure(details);
        if (probeFailure != null) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Codex CLI command exists but capability probing failed.",
                    withFailureType(classifyFailure(probeFailure, ""), probeFailure),
                    supportedModes(),
                    safetyPolicies(),
                    details);
        }

        return new AgentAdapterDescriptor(
                AgentAdapterType.CODEX,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                streamingEnabled
                        ? "Codex headless adapter is configured for Artifact-only JSON event execution."
                        : "Codex headless adapter is configured for Artifact-only non-interactive execution.",
                null,
                supportedModes(),
                safetyPolicies(),
                details);
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
            String prompt = promptBuilder.build(request);
            CodexCommandRunner.Options options = new CodexCommandRunner.Options(
                    command,
                    model,
                    timeoutSeconds,
                    streamingEnabled,
                    workDir);
            CodexCommandRunner.Result result =
                    commandRunner.execute(request, options, prompt, promptBuilder.buildJsonSchema());
            String artifactJson = normalizeAndValidateArtifactContract(result.content());
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.CODEX,
                    AgentAdapterType.CODEX,
                    AgentAdapterType.CODEX,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    artifactJson,
                    List.of(result.streaming()
                            ? "JSON:codex-json-event-artifact-contract"
                            : "JSON:codex-artifact-contract"),
                    withCommandDiagnostics(result.diagnostic(), result.streaming() ? "json-event-stream" : "exec", "COMPLETED"),
                    startedAt,
                    timeProvider.now());
        } catch (CodexCommandException exception) {
            return failedResponse(
                    request,
                    startedAt,
                    "Codex headless adapter could not complete the request.",
                    exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return failedResponse(
                    request,
                    startedAt,
                    "Codex headless adapter was interrupted.",
                    "CLI execution was interrupted.");
        } catch (Exception exception) {
            return failedResponse(
                    request,
                    startedAt,
                    "Codex headless adapter failed.",
                    sanitizeDiagnosticText(exception.getMessage()));
        }
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
                    AgentAdapterType.CODEX,
                    AgentAdapterType.CODEX,
                    AgentAdapterType.CODEX,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    artifactJson,
                    List.of("JSON:codex-fixture-artifact-contract"),
                    withCommandDiagnostics(
                            "Codex fixture mode generated local Artifact-only JSON.",
                            streamingEnabled ? "fixture-json-event-stream" : "fixture-exec",
                            "COMPLETED"),
                    startedAt,
                    timeProvider.now());
        } catch (Exception exception) {
            return failedResponse(request, startedAt, "Codex fixture failed.", exception.getMessage());
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

        if (containsAny(signal, "review", "quality", "risk", "check", "reviewer")) {
            root.put("assistantMessage", "Codex fixture reviewer produced a review report.");
            artifacts.addObject()
                    .put("title", "codex-fixture-review.md")
                    .put("type", "REVIEW_REPORT")
                    .put("language", "md")
                    .put("summary", "Fixture review report produced by the Codex adapter contract.")
                    .put("content", """
                            # Codex Fixture Review

                            Decision: APPROVAL

                            - Artifact-only contract was respected.
                            - No workspace write was executed.
                            - Follow-up: run real Codex smoke when CLI is installed and authenticated.
                            """);
            return root;
        }

        if (containsAny(signal, "api", "backend", "contract", "data model")) {
            root.put("assistantMessage", "Codex fixture produced an API contract.");
            artifacts.addObject()
                    .put("title", "codex-fixture-api-contract.json")
                    .put("type", "API_CONTRACT")
                    .put("language", "json")
                    .put("summary", "Fixture API contract from Codex Artifact-only mode.")
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

        root.put("assistantMessage", "Codex fixture produced a React login component and README.");
        artifacts.addObject()
                .put("title", "CodexFixtureLoginPage.tsx")
                .put("type", "CODE")
                .put("language", "tsx")
                .put("summary", "Fixture React login component generated by Codex Artifact-only adapter.")
                .put("content", """
                        import { useState } from "react";

                        export default function CodexFixtureLoginPage() {
                          const [email, setEmail] = useState("");
                          const [verificationCode, setVerificationCode] = useState("");

                          return (
                            <main className="login-shell">
                              <form aria-label="codex-fixture-login">
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
                .put("title", "codex-fixture-readme.md")
                .put("type", "MARKDOWN")
                .put("language", "md")
                .put("summary", "Fixture README for Codex Artifact-only mode.")
                .put("content", """
                        # Codex Fixture

                        This artifact verifies the AgentHub Codex headless adapter contract.
                        It is local fixture output and does not represent a real Codex provider run.
                        """);
        return root;
    }

    private String normalizeAndValidateArtifactContract(String content) throws CodexCommandException {
        AdapterArtifactContractValidator.ValidationResult validationResult =
                artifactContractValidator.validate(content);
        if (!validationResult.valid()) {
            throw new CodexCommandException(
                    "PARSE_FAILED: Codex output failed AgentHub artifact JSON schema validation: "
                            + validationResult.errorMessage());
        }
        return validationResult.normalizedJson();
    }

    private List<String> supportedModes() {
        List<String> modes = new ArrayList<>();
        modes.add("headless");
        modes.add("artifact-only");
        modes.add("exec");
        modes.add("json-schema");
        modes.add("read-only-sandbox");
        if (streamingEnabled) {
            modes.add("json-event-stream");
            modes.add("sse-preview");
        }
        modes.add("real-first-compatible");
        return List.copyOf(modes);
    }

    private List<String> safetyPolicies() {
        return List.of(
                "workspace-write-disabled",
                "processbuilder-no-shell",
                "isolated-run-directory=" + workDir,
                "sandbox=read-only",
                "ephemeral-session",
                "skip-git-repo-check-inside-run-dir",
                "final-output-requires-artifact-contract",
                "streaming-chunks-are-preview-only");
    }

    private Map<String, Object> capabilityDetails(String availability, String failureReason) {
        CodexCommandRunner.ProbeResult versionProbe = "available".equals(availability)
                ? commandRunner.probe(command, List.of("--version"), 3)
                : CodexCommandRunner.ProbeResult.failed(
                        failureReason == null ? "Version probe skipped because adapter is not available." : failureReason);
        CodexCommandRunner.ProbeResult execHelpProbe = "available".equals(availability)
                ? commandRunner.probe(command, List.of("exec", "--help"), 3)
                : CodexCommandRunner.ProbeResult.failed(
                        failureReason == null ? "Help probe skipped because adapter is not available." : failureReason);
        String helpOutput = (nullToBlank(execHelpProbe.stdout()) + "\n" + nullToBlank(execHelpProbe.stderr()))
                .toLowerCase(Locale.ROOT);
        return Map.ofEntries(
                Map.entry("adapterMode", "HEADLESS_ARTIFACT_ONLY"),
                Map.entry("availabilityProbe", availability),
                Map.entry("cliPath", commandRunner.resolveCommandPath(command)),
                Map.entry("commandMode", streamingEnabled ? "json-event-stream" : "exec"),
                Map.entry("version", versionProbe.success()
                        ? safeDiagnostic(versionProbe.stdout() + " " + versionProbe.stderr())
                        : "UNKNOWN"),
                Map.entry("versionProbeStatus", versionProbe.success() ? "PASSED" : "FAILED"),
                Map.entry("versionProbeFailure", versionProbe.failureReason() == null ? "" : versionProbe.failureReason()),
                Map.entry("helpProbeStatus", execHelpProbe.success() ? "PASSED" : "FAILED"),
                Map.entry("helpProbeFailure", execHelpProbe.failureReason() == null ? "" : execHelpProbe.failureReason()),
                Map.entry("supportsExec", helpOutput.contains("exec")),
                Map.entry("supportsJsonEvents", helpOutput.contains("--json")),
                Map.entry("supportsOutputSchema", helpOutput.contains("--output-schema")),
                Map.entry("supportsOutputLastMessage", helpOutput.contains("--output-last-message")),
                Map.entry("supportsSandbox", helpOutput.contains("--sandbox")),
                Map.entry("authenticationProbe", "NOT_PROBED_EXECUTE_SMOKE_REQUIRED"),
                Map.entry("authProbeStatus", "NOT_PROBED_EXECUTE_SMOKE_REQUIRED"),
                Map.entry("streamingEnabled", streamingEnabled),
                Map.entry("artifactOnly", artifactOnly),
                Map.entry("workspaceWriteAllowed", false),
                Map.entry("timeoutSeconds", timeoutSeconds));
    }

    private String cliProbeFailure(Map<String, Object> details) {
        String versionStatus = String.valueOf(details.getOrDefault("versionProbeStatus", ""));
        String helpStatus = String.valueOf(details.getOrDefault("helpProbeStatus", ""));
        if ("PASSED".equals(versionStatus) && "PASSED".equals(helpStatus)) {
            return null;
        }
        String versionFailure = String.valueOf(details.getOrDefault("versionProbeFailure", ""));
        String helpFailure = String.valueOf(details.getOrDefault("helpProbeFailure", ""));
        return "versionProbeStatus="
                + versionStatus
                + "; versionProbeFailure="
                + versionFailure
                + "; helpProbeStatus="
                + helpStatus
                + "; helpProbeFailure="
                + helpFailure;
    }

    private String withCommandDiagnostics(String diagnostic, String commandMode, String status) {
        return "failureType=NONE"
                + "; commandMode=" + commandMode
                + "; timeoutSeconds=" + timeoutSeconds
                + "; cliPath=" + commandRunner.resolveCommandPath(command)
                + "; status=" + status
                + (diagnostic == null || diagnostic.isBlank() ? "" : "; " + diagnostic);
    }

    private String withFailureType(String failureType, String message) {
        String normalizedType = failureType == null || failureType.isBlank() ? "FAILED" : failureType;
        String normalizedMessage = message == null || message.isBlank() ? "No diagnostic message." : message;
        return "failureType=" + normalizedType
                + "; commandMode=" + (streamingEnabled ? "json-event-stream" : "exec")
                + "; timeoutSeconds=" + timeoutSeconds
                + "; cliPath=" + commandRunner.resolveCommandPath(command)
                + "; " + sanitizeDiagnosticText(normalizedMessage);
    }

    private String classifyFailure(String errorMessage, String content) {
        String normalized = (nullToBlank(errorMessage) + "\n" + nullToBlank(content)).toLowerCase(Locale.ROOT);
        if (normalized.contains("cancel")) {
            return "CANCELLED";
        }
        if (normalized.contains("timed out") || normalized.contains("timeout")) {
            return "TIMEOUT";
        }
        if (normalized.contains("artifact json schema validation")
                || normalized.contains("json output")
                || normalized.contains("contract")
                || normalized.contains("invalid json")
                || normalized.contains("not valid json")) {
            return "CONTRACT_INVALID";
        }
        if (normalized.contains("permission denied")
                || normalized.contains("access is denied")
                || normalized.contains("createprocess error=5")
                || normalized.contains("拒绝访问")) {
            return "PERMISSION_DENIED";
        }
        if (normalized.contains("not available") || normalized.contains("cannot run program")) {
            return "NOT_INSTALLED";
        }
        if (normalized.contains("auth")
                || normalized.contains("login")
                || normalized.contains("unauthorized")
                || normalized.contains("api key")
                || normalized.contains("not authenticated")) {
            return "NOT_AUTHENTICATED";
        }
        return "FAILED";
    }

    private AgentResponse failedResponse(
            AgentRequest request,
            Instant startedAt,
            String content,
            String errorMessage) {
        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.CODEX,
                AgentAdapterType.CODEX,
                AgentAdapterType.CODEX,
                false,
                AgentExecutionStatus.FAILED,
                content,
                List.of(),
                withFailureType(classifyFailure(errorMessage, content), errorMessage),
                startedAt,
                timeProvider.now());
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

    private String sanitizeDiagnosticText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.replaceAll("(?i)api[_-]?key\\s*[:=]\\s*[^\\s]+", "api_key=[REDACTED]")
                .replaceAll("(?i)openai_api_key\\s*[:=]\\s*[^\\s]+", "OPENAI_API_KEY=[REDACTED]")
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]");
    }

    private String safeDiagnostic(String value) {
        String sanitized = sanitizeDiagnosticText(value).replace("\r", " ").replace("\n", " ").trim();
        return sanitized.length() <= 240 ? sanitized : sanitized.substring(0, 240) + "...";
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
            sleepBetweenFixtureChunks();
        }
    }

    private void sleepBetweenFixtureChunks() {
        if (fixtureStreamChunkDelayMillis <= 0) {
            return;
        }
        try {
            Thread.sleep(fixtureStreamChunkDelayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
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
            // Streaming preview is best-effort and must not break adapter execution or fallback behavior.
        }
    }

    private boolean isCancellationRequested(AgentRequest request) {
        return request != null
                && request.taskRunId() != null
                && runCancellationRegistry.isCancellationRequested(request.taskRunId());
    }

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
