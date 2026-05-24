package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAICompatibleAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;
    private final boolean fixtureEnabled;
    private final String fixtureReviewDecision;

    public OpenAICompatibleAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            @Value("${agenthub.adapters.openai-compatible.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.openai-compatible.base-url:}") String baseUrl,
            @Value("${agenthub.adapters.openai-compatible.api-key:}") String apiKey,
            @Value("${agenthub.adapters.openai-compatible.model:}") String model,
            @Value("${agenthub.adapters.openai-compatible.timeout-seconds:30}") int timeoutSeconds,
            @Value("${agenthub.adapters.openai-compatible.fixture-enabled:false}") boolean fixtureEnabled,
            @Value("${agenthub.adapters.openai-compatible.fixture-review-decision:APPROVE}") String fixtureReviewDecision) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
        this.fixtureEnabled = fixtureEnabled;
        this.fixtureReviewDecision = fixtureReviewDecision == null ? "APPROVE" : fixtureReviewDecision.trim().toUpperCase();
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.OPENAI_COMPATIBLE;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        if (!enabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.DISABLED,
                    false,
                    false,
                    "OpenAI Compatible adapter is disabled in configuration.",
                    "Set agenthub.adapters.openai-compatible.enabled=true to enable it.");
        }

        if (fixtureEnabled) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.AVAILABLE,
                    true,
                    false,
                    "OpenAI Compatible adapter is using local fixture mode for deterministic contract tests.",
                    null);
        }

        List<String> missingFields = new ArrayList<>();
        if (baseUrl.isBlank()) {
            missingFields.add("base-url");
        }
        if (apiKey.isBlank()) {
            missingFields.add("api-key");
        }
        if (model.isBlank()) {
            missingFields.add("model");
        }
        if (!missingFields.isEmpty()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "OpenAI Compatible adapter is enabled but missing required configuration.",
                    "Missing configuration: " + String.join(", ", missingFields));
        }

        return new AgentAdapterDescriptor(
                AgentAdapterType.OPENAI_COMPATIBLE,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                "OpenAI Compatible adapter is configured and ready for non-stream chat completions calls.",
                null);
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        AgentAdapterDescriptor descriptor = describe();
        if (descriptor.status() != AgentAdapterHealthStatus.AVAILABLE) {
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    false,
                    AgentExecutionStatus.FAILED,
                    descriptor.description(),
                    List.of(),
                    descriptor.failureReason(),
                    startedAt,
                    timeProvider.now());
        }

        if (fixtureEnabled) {
            return executeFixture(request, startedAt);
        }

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                    .build();

            String payload = objectMapper.writeValueAsString(buildPayload(request));
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(buildChatCompletionsUrl(baseUrl)))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
                return failedResponse(
                        request,
                        startedAt,
                        "OpenAI Compatible adapter request failed with HTTP status " + httpResponse.statusCode() + ".");
            }

            String content = extractResponseContent(httpResponse.body());
            if (content == null || content.isBlank()) {
                return failedResponse(
                        request,
                        startedAt,
                        "OpenAI Compatible adapter returned an empty message content.");
            }

            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    content,
                    List.of("TEXT:openai-compatible-response"),
                    null,
                    startedAt,
                    timeProvider.now());
        } catch (IOException exception) {
            return failedResponse(request, startedAt, "Failed to parse OpenAI Compatible adapter request or response.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return failedResponse(request, startedAt, "OpenAI Compatible adapter request was interrupted.");
        } catch (Exception exception) {
            String message = exception.getMessage() == null || exception.getMessage().isBlank()
                    ? exception.getClass().getSimpleName()
                    : exception.getMessage();
            return failedResponse(request, startedAt, "OpenAI Compatible adapter error: " + message);
        }
    }

    private JsonNode buildPayload(AgentRequest request) {
        var root = objectMapper.createObjectNode();
        root.put("model", model);
        root.put("temperature", 0.2);
        root.put("stream", false);

        var messages = root.putArray("messages");

        String systemPrompt = request.systemPrompt() == null || request.systemPrompt().isBlank()
                ? "You are an AI specialist working inside the AgentHub demo platform."
                : request.systemPrompt();
        messages.addObject()
                .put("role", "system")
                .put("content", systemPrompt);

        messages.addObject()
                .put("role", "user")
                .put("content", buildUserMessageContent(request));

        return root;
    }

    private AgentResponse executeFixture(AgentRequest request, Instant startedAt) {
        try {
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    objectMapper.writeValueAsString(buildFixtureArtifactContract(request)),
                    List.of("JSON:openai-compatible-fixture-contract"),
                    null,
                    startedAt,
                    timeProvider.now());
        } catch (Exception exception) {
            return failedResponse(request, startedAt, "OpenAI Compatible fixture failed to build JSON contract.");
        }
    }

    private JsonNode buildFixtureArtifactContract(AgentRequest request) {
        String task = ((request.taskDescription() == null ? "" : request.taskDescription()) + "\n"
                + (request.userInput() == null ? "" : request.userInput()) + "\n"
                + String.valueOf(request.metadata().getOrDefault("requiredSkill", ""))).toLowerCase();
        var root = objectMapper.createObjectNode();
        var artifacts = root.putArray("artifacts");

        if (containsAny(task, "review", "quality", "risk", "妫€鏌?", "璇勫")) {
            boolean rejected = "REJECT".equals(fixtureReviewDecision) || "REJECTION".equals(fixtureReviewDecision);
            root.put("assistantMessage", rejected
                    ? "REJECTION: Fixture reviewer found acceptance blockers and requests revision."
                    : "APPROVAL: Fixture reviewer checked the generated outputs.");
            artifacts.addObject()
                    .put("title", rejected ? "fixture-review-rejection.md" : "fixture-review-report.md")
                    .put("type", "REVIEW_REPORT")
                    .put("language", "md")
                    .put("summary", rejected
                            ? "Fixture reviewer rejected the current output and requested a revise/retry loop."
                            : "Fixture reviewer approved the current output with minor follow-up notes.")
                    .put("content", rejected
                            ? """
                            REJECTION

                            Decision: REJECTION
                            Blockers:
                            - API contract and UI behavior are not aligned enough for acceptance.
                            - Error state copy is missing from the generated login flow.

                            Suggested next action: revise the API contract and retry the frontend handoff.
                            """
                            : """
                            APPROVAL

                            Decision: APPROVAL
                            Notes:
                            - Login UI, README, and API contract are present.
                            - Remaining issues are acceptable for the static demo path.
                            """);
            return root;
        }

        if (containsAny(task, "backend", "api", "contract", "data model", "鎺ュ彛")) {
            root.put("assistantMessage", "Fixture backend worker produced a login API contract.");
            artifacts.addObject()
                    .put("title", "fixture-login-api-contract.json")
                    .put("type", "API_CONTRACT")
                    .put("language", "json")
                    .put("summary", "Fixture API contract for the login flow.")
                    .put("content", """
                            {
                              "endpoint": "/api/auth/login",
                              "method": "POST",
                              "request": {
                                "email": "string",
                                "verificationCode": "string"
                              },
                              "successResponse": {
                                "token": "string",
                                "userId": "string",
                                "displayName": "string"
                              },
                              "errorResponse": {
                                "code": "INVALID_CODE",
                                "message": "Verification code is invalid or expired."
                              }
                            }
                            """);
            return root;
        }

        root.put("assistantMessage", "Fixture frontend worker produced a React login component and README.");
        artifacts.addObject()
                .put("title", "FixtureLoginPage.tsx")
                .put("type", "CODE")
                .put("language", "tsx")
                .put("summary", "Fixture React login component generated without external network calls.")
                .put("content", """
                        import { useState } from "react";

                        export default function FixtureLoginPage() {
                          const [email, setEmail] = useState("");
                          const [verificationCode, setVerificationCode] = useState("");
                          return (
                            <form aria-label="fixture-login">
                              <input value={email} onChange={(event) => setEmail(event.target.value)} />
                              <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} />
                              <button type="submit">Sign in</button>
                            </form>
                          );
                        }
                        """);
        artifacts.addObject()
                .put("title", "fixture-login-readme.md")
                .put("type", "MARKDOWN")
                .put("language", "md")
                .put("summary", "Fixture README for the login component.")
                .put("content", """
                        # Fixture Login Page

                        This artifact is generated by the local OPENAI_COMPATIBLE fixture adapter.
                        It verifies the REAL_ADAPTER JSON contract without calling external networks.
                        """);
        return root;
    }

    private boolean containsAny(String input, String... keywords) {
        for (String keyword : keywords) {
            if (input.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    private String buildUserMessageContent(AgentRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("Agent name: ").append(request.agentName()).append('\n');
        if (request.taskDescription() != null && !request.taskDescription().isBlank()) {
            builder.append("Task description: ").append(request.taskDescription()).append('\n');
        }
        if (request.userInput() != null && !request.userInput().isBlank()) {
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
        builder.append("""
                Output contract:
                Return only JSON. Do not wrap it in markdown fences.
                Schema:
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
                Generate artifacts suitable for the current task step. If the task is review-oriented, produce a REVIEW_REPORT.
                """);
        return builder.toString();
    }

    private String buildChatCompletionsUrl(String configuredBaseUrl) {
        String normalized = configuredBaseUrl.trim();
        if (normalized.endsWith("/chat/completions")) {
            return normalized;
        }
        if (normalized.endsWith("/")) {
            return normalized + "chat/completions";
        }
        return normalized + "/chat/completions";
    }

    private String extractResponseContent(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode contentNode = root.path("choices").path(0).path("message").path("content");
        if (contentNode.isMissingNode() || contentNode.isNull()) {
            return null;
        }
        if (contentNode.isTextual()) {
            return contentNode.asText();
        }
        if (contentNode.isArray()) {
            StringBuilder builder = new StringBuilder();
            for (JsonNode item : contentNode) {
                if (item.isTextual()) {
                    builder.append(item.asText());
                } else if (item.has("text")) {
                    builder.append(item.path("text").asText(""));
                }
            }
            return builder.toString();
        }
        return contentNode.toString();
    }

    private AgentResponse failedResponse(AgentRequest request, Instant startedAt, String errorMessage) {
        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.OPENAI_COMPATIBLE,
                AgentAdapterType.OPENAI_COMPATIBLE,
                AgentAdapterType.OPENAI_COMPATIBLE,
                false,
                AgentExecutionStatus.FAILED,
                "OpenAI Compatible adapter could not complete the request.",
                List.of(),
                errorMessage,
                startedAt,
                timeProvider.now());
    }
}
