package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.CodexCommandRunner.CodexCommandException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodexAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final AdapterArtifactContractValidator artifactContractValidator;
    private final CodexCommandRunner commandRunner;
    private final CodexArtifactPromptBuilder promptBuilder;
    private final boolean enabled;
    private final String command;
    private final String model;
    private final int timeoutSeconds;
    private final boolean streamingEnabled;
    private final boolean artifactOnly;
    private final Path workDir;
    private final boolean fixtureEnabled;

    public CodexAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            AdapterArtifactContractValidator artifactContractValidator,
            CodexCommandRunner commandRunner,
            CodexArtifactPromptBuilder promptBuilder,
            @Value("${agenthub.adapters.codex.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.codex.command:codex}") String command,
            @Value("${agenthub.adapters.codex.model:}") String model,
            @Value("${agenthub.adapters.codex.timeout-seconds:120}") int timeoutSeconds,
            @Value("${agenthub.adapters.codex.streaming-enabled:false}") boolean streamingEnabled,
            @Value("${agenthub.adapters.codex.artifact-only:true}") boolean artifactOnly,
            @Value("${agenthub.adapters.codex.work-dir:.agenthub/codex-runs}") String workDir,
            @Value("${agenthub.adapters.codex.fixture-enabled:false}") boolean fixtureEnabled) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.artifactContractValidator = artifactContractValidator;
        this.commandRunner = commandRunner;
        this.promptBuilder = promptBuilder;
        this.enabled = enabled;
        this.command = normalize(command, "codex");
        this.model = normalize(model, "");
        this.timeoutSeconds = timeoutSeconds <= 0 ? 120 : timeoutSeconds;
        this.streamingEnabled = streamingEnabled;
        this.artifactOnly = artifactOnly;
        this.workDir = Path.of(normalize(workDir, ".agenthub/codex-runs"));
        this.fixtureEnabled = fixtureEnabled;
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
                    null);
        }

        CodexCommandRunner.Availability availability = commandRunner.checkAvailable(command);
        if (!availability.available()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.CODEX,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "Codex CLI command is not available.",
                    availability.failureReason());
        }

        return new AgentAdapterDescriptor(
                AgentAdapterType.CODEX,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                streamingEnabled
                        ? "Codex headless adapter is configured for Artifact-only JSON event execution."
                        : "Codex headless adapter is configured for Artifact-only non-interactive execution.",
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
                    result.diagnostic(),
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
                    "Codex fixture mode generated local Artifact-only JSON.",
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
                    "Codex output failed AgentHub artifact JSON schema validation: "
                            + validationResult.errorMessage());
        }
        return validationResult.normalizedJson();
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
                sanitizeDiagnosticText(errorMessage),
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

    private String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
