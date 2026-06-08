package com.agenthub.infrastructure.adapter;

import com.agenthub.application.agent.OpenAICompatibleRuntimeConfigService;
import com.agenthub.application.agent.OpenAICompatibleRuntimeConfigService.RuntimeConfig;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.application.realtime.RunCancellationRegistry;
import com.agenthub.common.TimeProvider;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenAICompatibleAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final AdapterArtifactContractValidator artifactContractValidator;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RunCancellationRegistry runCancellationRegistry;
    private final OpenAICompatibleRuntimeConfigService runtimeConfigService;
    private final boolean enabled;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;
    private final boolean streamingEnabled;
    private final boolean jsonResponseFormatEnabled;
    private final int maxRetries;
    private final long retryBackoffMillis;
    private final boolean fixtureEnabled;
    private final String fixtureReviewDecision;

    public OpenAICompatibleAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            AdapterArtifactContractValidator artifactContractValidator,
            RealtimeEventPublisher realtimeEventPublisher,
            RunCancellationRegistry runCancellationRegistry,
            OpenAICompatibleRuntimeConfigService runtimeConfigService,
            @Value("${agenthub.adapters.openai-compatible.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.openai-compatible.base-url:}") String baseUrl,
            @Value("${agenthub.adapters.openai-compatible.api-key:}") String apiKey,
            @Value("${agenthub.adapters.openai-compatible.model:}") String model,
            @Value("${agenthub.adapters.openai-compatible.timeout-seconds:30}") int timeoutSeconds,
            @Value("${agenthub.adapters.openai-compatible.streaming-enabled:false}") boolean streamingEnabled,
            @Value("${agenthub.adapters.openai-compatible.json-response-format-enabled:false}") boolean jsonResponseFormatEnabled,
            @Value("${agenthub.adapters.openai-compatible.max-retries:1}") int maxRetries,
            @Value("${agenthub.adapters.openai-compatible.retry-backoff-millis:500}") long retryBackoffMillis,
            @Value("${agenthub.adapters.openai-compatible.fixture-enabled:false}") boolean fixtureEnabled,
            @Value("${agenthub.adapters.openai-compatible.fixture-review-decision:APPROVE}") String fixtureReviewDecision) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.artifactContractValidator = artifactContractValidator;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.runCancellationRegistry = runCancellationRegistry;
        this.runtimeConfigService = runtimeConfigService;
        this.enabled = enabled;
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
        this.streamingEnabled = streamingEnabled;
        this.jsonResponseFormatEnabled = jsonResponseFormatEnabled;
        this.maxRetries = Math.max(0, Math.min(maxRetries, 3));
        this.retryBackoffMillis = Math.max(0L, Math.min(retryBackoffMillis, 5_000L));
        this.fixtureEnabled = fixtureEnabled;
        this.fixtureReviewDecision = fixtureReviewDecision == null ? "APPROVE" : fixtureReviewDecision.trim().toUpperCase();
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.OPENAI_COMPATIBLE;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        EffectiveProviderConfig effectiveConfig = effectiveConfig();
        if (!effectiveConfig.enabled()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.DISABLED,
                    false,
                    false,
                    "OpenAI Compatible adapter is disabled in configuration.",
                    "Set agenthub.adapters.openai-compatible.enabled=true to enable it.");
        }

        if (fixtureEnabled && !effectiveConfig.runtimeConfigured()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.AVAILABLE,
                    true,
                    false,
                    "OpenAI Compatible adapter is using local fixture mode for deterministic contract tests.",
                    null);
        }

        List<String> missingFields = new ArrayList<>();
        if (effectiveConfig.baseUrl().isBlank()) {
            missingFields.add("base-url");
        }
        if (effectiveConfig.apiKey().isBlank()) {
            missingFields.add("api-key");
        }
        if (effectiveConfig.model().isBlank()) {
            missingFields.add("model");
        }
        if (!missingFields.isEmpty()) {
            return new AgentAdapterDescriptor(
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    "OpenAI Compatible adapter is enabled but missing required API provider configuration.",
                    "Missing configuration: " + String.join(", ", missingFields));
        }

        return new AgentAdapterDescriptor(
                AgentAdapterType.OPENAI_COMPATIBLE,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                streamingEnabled
                        ? "OpenAI Compatible adapter is configured for IM API Q&A through streaming chat completions."
                        : "OpenAI Compatible adapter is configured for IM API Q&A through non-stream chat completions.",
                null,
                List.of("chat-completions", "artifact-json-contract", "im-question-answering-api"),
                List.of("API key remains backend-only", "No local CLI execution", "MOCK fallback is preserved"),
                Map.of(
                        "providerName", effectiveConfig.providerName(),
                        "baseUrl", effectiveConfig.baseUrl(),
                        "model", effectiveConfig.model(),
                        "runtimeConfigured", effectiveConfig.runtimeConfigured(),
                        "apiKeyConfigured", !effectiveConfig.apiKey().isBlank()));
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

        EffectiveProviderConfig effectiveConfig = effectiveConfig();
        if (fixtureEnabled && !effectiveConfig.runtimeConfigured()) {
            return executeFixture(request, startedAt);
        }

        try {
            return executeProviderRequest(request, startedAt, effectiveConfig);
        } catch (AdapterResponseException exception) {
            return failedResponse(request, startedAt, exception.getMessage());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return failedResponse(request, startedAt, "OpenAI Compatible adapter request was interrupted.");
        } catch (Exception exception) {
            String message = sanitizeDiagnosticMessage(exception);
            return failedResponse(request, startedAt, "OpenAI Compatible adapter error: " + message);
        }
    }

    private AgentResponse executeProviderRequest(
            AgentRequest request,
            Instant startedAt,
            EffectiveProviderConfig effectiveConfig)
            throws AdapterResponseException, InterruptedException {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        String nonStreamingPayload = buildRequestPayload(request, false, effectiveConfig);
        String streamingPayload = streamingEnabled
                ? buildRequestPayload(request, true, effectiveConfig)
                : nonStreamingPayload;
        int totalAttempts = maxRetries + 1;
        String lastRetryableFailure = "";

        for (int attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                ProviderMessage providerMessage = streamingEnabled
                        ? sendStreamingRequestWithFallback(
                                client,
                                streamingPayload,
                                nonStreamingPayload,
                                request,
                                effectiveConfig)
                        : sendNonStreamingRequest(client, nonStreamingPayload, effectiveConfig);
                if (providerMessage.statusCode() < 200 || providerMessage.statusCode() >= 300) {
                    String errorMessage = describeProviderHttpError(providerMessage.statusCode(), providerMessage.body());
                    if (isRetryableHttpStatus(providerMessage.statusCode()) && attempt < totalAttempts) {
                        lastRetryableFailure = errorMessage;
                        sleepBeforeRetry();
                        continue;
                    }
                    return failedResponse(request, startedAt,
                            withAttemptSummary(errorMessage, attempt, totalAttempts, lastRetryableFailure));
                }

                String content = providerMessage.content();
                if (content == null || content.isBlank()) {
                    content = extractResponseContent(providerMessage.body());
                }
                if (content == null || content.isBlank()) {
                    return failedResponse(
                            request,
                            startedAt,
                            withAttemptSummary(
                                    "OpenAI Compatible adapter returned an empty message content.",
                                    attempt,
                                    totalAttempts,
                                    lastRetryableFailure));
                }
                String artifactJson = normalizeAndValidateArtifactContract(content);

                return new AgentResponse(
                        request.requestId(),
                        AgentAdapterType.OPENAI_COMPATIBLE,
                        AgentAdapterType.OPENAI_COMPATIBLE,
                        AgentAdapterType.OPENAI_COMPATIBLE,
                        false,
                        AgentExecutionStatus.COMPLETED,
                        artifactJson,
                        List.of("JSON:openai-compatible-artifact-contract"),
                        null,
                        startedAt,
                        timeProvider.now());
            } catch (HttpTimeoutException exception) {
                String errorMessage = "OpenAI Compatible adapter request timed out after "
                        + timeoutSeconds + " seconds.";
                if (attempt < totalAttempts) {
                    lastRetryableFailure = errorMessage;
                    sleepBeforeRetry();
                    continue;
                }
                return failedResponse(request, startedAt,
                        withAttemptSummary(errorMessage, attempt, totalAttempts, lastRetryableFailure));
            } catch (IOException exception) {
                String errorMessage = "OpenAI Compatible adapter request I/O failed: "
                        + sanitizeDiagnosticMessage(exception);
                if (attempt < totalAttempts) {
                    lastRetryableFailure = errorMessage;
                    sleepBeforeRetry();
                    continue;
                }
                return failedResponse(request, startedAt,
                        withAttemptSummary(errorMessage, attempt, totalAttempts, lastRetryableFailure));
            }
        }

        return failedResponse(request, startedAt,
                withAttemptSummary(
                        "OpenAI Compatible adapter exhausted retry attempts.",
                        totalAttempts,
                        totalAttempts,
                        lastRetryableFailure));
    }

    private ProviderMessage sendNonStreamingRequest(
            HttpClient client,
            String payload,
            EffectiveProviderConfig effectiveConfig) throws IOException, InterruptedException {
        HttpResponse<String> httpResponse = client.send(
                buildHttpRequest(payload, effectiveConfig),
                HttpResponse.BodyHandlers.ofString());
        return new ProviderMessage(httpResponse.statusCode(), httpResponse.body(), null);
    }

    private ProviderMessage sendStreamingRequestWithFallback(
            HttpClient client,
            String streamingPayload,
            String nonStreamingPayload,
            AgentRequest request,
            EffectiveProviderConfig effectiveConfig) throws IOException, InterruptedException, AdapterResponseException {
        ProviderMessage providerMessage;
        try {
            providerMessage = sendStreamingRequest(client, streamingPayload, request, effectiveConfig);
        } catch (AdapterResponseException exception) {
            if (isCancellationRequested(request)) {
                throw exception;
            }
            return sendNonStreamingRequest(client, nonStreamingPayload, effectiveConfig);
        }
        if (isCancellationRequested(request)) {
            throw new AdapterResponseException(
                    "OpenAI Compatible streaming response was cancelled before completion.");
        }
        if (shouldFallbackFromStreaming(providerMessage) && !isCancellationRequested(request)) {
            return sendNonStreamingRequest(client, nonStreamingPayload, effectiveConfig);
        }
        return providerMessage;
    }

    private boolean shouldFallbackFromStreaming(ProviderMessage providerMessage) {
        return providerMessage == null
                || providerMessage.statusCode() < 200
                || providerMessage.statusCode() >= 300
                || providerMessage.content() == null
                || providerMessage.content().isBlank();
    }

    private ProviderMessage sendStreamingRequest(
            HttpClient client,
            String payload,
            AgentRequest request,
            EffectiveProviderConfig effectiveConfig) throws IOException, InterruptedException, AdapterResponseException {
        HttpResponse<Stream<String>> httpResponse = client.send(
                buildHttpRequest(payload, effectiveConfig),
                HttpResponse.BodyHandlers.ofLines());
        if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
            String body;
            try (Stream<String> lines = httpResponse.body()) {
                body = String.join("\n", lines.toList());
            }
            return new ProviderMessage(httpResponse.statusCode(), body, null);
        }

        StringBuilder content = new StringBuilder();
        int chunkIndex = 0;
        try (Stream<String> lines = httpResponse.body()) {
            Iterator<String> iterator = lines.iterator();
            while (iterator.hasNext()) {
                if (isCancellationRequested(request)) {
                    throw new AdapterResponseException(
                            "OpenAI Compatible streaming response was cancelled before completion.");
                }
                String line = iterator.next();
                String chunk = parseStreamingContentDelta(line);
                if (chunk == null || chunk.isEmpty()) {
                    continue;
                }
                content.append(chunk);
                publishStreamChunk(request, chunkIndex++, chunk, content.length());
            }
        }
        return new ProviderMessage(httpResponse.statusCode(), "", content.toString());
    }

    private String buildRequestPayload(
            AgentRequest request,
            boolean stream,
            EffectiveProviderConfig effectiveConfig) throws AdapterResponseException {
        try {
            return objectMapper.writeValueAsString(buildPayload(request, stream, effectiveConfig));
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException("OpenAI Compatible adapter failed to serialize request payload.");
        }
    }

    private HttpRequest buildHttpRequest(String payload, EffectiveProviderConfig effectiveConfig) {
        return HttpRequest.newBuilder()
                .uri(URI.create(buildChatCompletionsUrl(effectiveConfig.baseUrl())))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + effectiveConfig.apiKey())
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
    }

    private boolean isRetryableHttpStatus(int statusCode) {
        return statusCode == 429 || statusCode >= 500;
    }

    private void sleepBeforeRetry() throws InterruptedException {
        if (retryBackoffMillis > 0) {
            Thread.sleep(retryBackoffMillis);
        }
    }

    private String withAttemptSummary(
            String errorMessage,
            int finalAttempt,
            int totalAttempts,
            String previousRetryableFailure) {
        StringBuilder builder = new StringBuilder(sanitizeDiagnosticText(errorMessage));
        builder.append(" Attempts: ").append(finalAttempt).append('/').append(totalAttempts).append('.');
        if (previousRetryableFailure != null && !previousRetryableFailure.isBlank()) {
            builder.append(" Previous retryable failure: ")
                    .append(safeSnippet(previousRetryableFailure));
        }
        return builder.toString();
    }

    private JsonNode buildPayload(
            AgentRequest request,
            boolean stream,
            EffectiveProviderConfig effectiveConfig) {
        var root = objectMapper.createObjectNode();
        root.put("model", effectiveConfig.model());
        root.put("temperature", 0.2);
        root.put("stream", stream);
        if (jsonResponseFormatEnabled) {
            root.putObject("response_format").put("type", "json_object");
        }

        var messages = root.putArray("messages");

        String systemPrompt = request.systemPrompt() == null || request.systemPrompt().isBlank()
                ? buildJsonOnlySystemPrompt("You are an AI specialist working inside the AgentHub demo platform.")
                : buildJsonOnlySystemPrompt(request.systemPrompt());
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
            String fixtureJson = objectMapper.writeValueAsString(buildFixtureArtifactContract(request));
            if (streamingEnabled) {
                publishFixtureStream(request, fixtureJson);
            }
            return new AgentResponse(
                    request.requestId(),
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    AgentAdapterType.OPENAI_COMPATIBLE,
                    false,
                    AgentExecutionStatus.COMPLETED,
                    fixtureJson,
                    List.of("JSON:openai-compatible-fixture-contract"),
                    null,
                    startedAt,
                    timeProvider.now());
        } catch (Exception exception) {
            return failedResponse(request, startedAt, "OpenAI Compatible fixture failed to build JSON contract.");
        }
    }

    private JsonNode buildFixtureArtifactContract(AgentRequest request) {
        String taskDescription = (request.taskDescription() == null ? "" : request.taskDescription()).toLowerCase();
        String requiredSkill = String.valueOf(request.metadata().getOrDefault("requiredSkill", "")).toLowerCase();
        String userInput = (request.userInput() == null ? "" : request.userInput()).toLowerCase();
        String routingSignal = requiredSkill + "\n" + taskDescription;
        String fullTask = routingSignal + "\n" + userInput;
        var root = objectMapper.createObjectNode();
        var artifacts = root.putArray("artifacts");

        if (containsAny(routingSignal, "review", "quality", "risk", "\u68c0\u67e5", "\u8bc4\u5ba1")) {
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

        if (containsAny(routingSignal, "backend", "api", "contract", "data model", "\u63a5\u53e3")) {
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

        if (!containsAny(fullTask, "frontend", "react", "ui", "page", "\u9875\u9762", "\u524d\u7aef", "login", "\u767b\u5f55")) {
            root.put("assistantMessage", "Fixture adapter produced a markdown task summary.");
            artifacts.addObject()
                    .put("title", "fixture-task-summary.md")
                    .put("type", "MARKDOWN")
                    .put("language", "md")
                    .put("summary", "Fixture markdown artifact generated from the adapter contract.")
                    .put("content", """
                            # Fixture Task Summary

                            The fixture adapter returned a generic markdown artifact because no specialist route was detected.
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
                You are in JSON-only artifact contract mode.
                Return exactly one valid JSON object and nothing else. Do not wrap the response in markdown fences.
                Do not include prose before or after the JSON object. Do not return a JSON string; return a JSON object.
                AgentHub will parse this response directly into Artifacts and will fall back to MOCK if parsing fails.
                The response is accepted as REAL_ADAPTER output only when every artifact has non-empty title, type, language, content, and summary.
                For CODE artifacts, content must be a JSON string containing complete raw source code only. Escape newlines as needed for JSON. Do not put markdown fences, prose, or metadata wrappers inside content.
                For API_CONTRACT or DATA_MODEL artifacts, content must be a JSON string containing valid JSON text or structured schema text.
                For REVIEW_REPORT or MARKDOWN artifacts, content must be a JSON string containing useful markdown body text, not a one-line placeholder.
                Empty content, provider error messages, plain text, markdown-only replies, invalid JSON, or missing artifacts will be rejected and AgentHub will use static fallback artifacts.
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
                Generate at least one artifact suitable for the current task step. If the task is review-oriented, produce a REVIEW_REPORT. If the task asks for UI or React code, produce a CODE artifact with language "tsx".
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

    private EffectiveProviderConfig effectiveConfig() {
        RuntimeConfig runtimeConfig = runtimeConfigService.snapshot();
        if (runtimeConfig.enabled()) {
            return new EffectiveProviderConfig(
                    true,
                    runtimeConfig.providerName().isBlank()
                            ? "Custom OpenAI-compatible"
                            : runtimeConfig.providerName(),
                    runtimeConfig.baseUrl(),
                    runtimeConfig.apiKey(),
                    runtimeConfig.model(),
                    true);
        }
        return new EffectiveProviderConfig(
                enabled,
                "Environment OpenAI-compatible",
                baseUrl,
                apiKey,
                model,
                false);
    }

    private String extractResponseContent(String responseBody) throws AdapterResponseException {
        if (responseBody == null || responseBody.isBlank()) {
            throw new AdapterResponseException("OpenAI Compatible provider returned an empty HTTP response body.");
        }

        JsonNode root = readProviderJson(responseBody);
        JsonNode choicesNode = root.path("choices");
        if (!choicesNode.isArray() || choicesNode.isEmpty()) {
            throw new AdapterResponseException(
                    "OpenAI Compatible provider JSON response did not contain any choices.");
        }

        JsonNode firstChoice = choicesNode.path(0);
        JsonNode contentNode = firstChoice.path("message").path("content");
        if (contentNode.isMissingNode() || contentNode.isNull()) {
            String finishReason = firstChoice.path("finish_reason").asText("");
            throw new AdapterResponseException(
                    "OpenAI Compatible provider response choice did not include message.content"
                            + (finishReason.isBlank() ? "." : " (finish_reason=" + finishReason + ")."));
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

    private String parseStreamingContentDelta(String line) throws AdapterResponseException {
        if (line == null) {
            return null;
        }
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith(":")) {
            return null;
        }
        if (!trimmed.startsWith("data:")) {
            return null;
        }
        String data = trimmed.substring("data:".length()).trim();
        if ("[DONE]".equals(data)) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(data);
            JsonNode choicesNode = root.path("choices");
            if (!choicesNode.isArray() || choicesNode.isEmpty()) {
                return null;
            }
            JsonNode firstChoice = choicesNode.path(0);
            JsonNode deltaContent = firstChoice.path("delta").path("content");
            if (deltaContent.isTextual()) {
                return deltaContent.asText();
            }
            JsonNode messageContent = firstChoice.path("message").path("content");
            if (messageContent.isTextual()) {
                return messageContent.asText();
            }
            return null;
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException(
                    "OpenAI Compatible streaming response contained invalid JSON event: " + safeSnippet(data));
        }
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
            realtimeEventPublisher.publish(
                    request.conversationId(),
                    RealtimeEventType.ADAPTER_STREAM_CHUNK,
                    "TASK_STEP",
                    request.taskStepId(),
                    Map.of(
                        "taskRunId", request.taskRunId(),
                        "taskStepId", request.taskStepId(),
                        "adapterType", AgentAdapterType.OPENAI_COMPATIBLE.name(),
                        "chunk", chunk,
                        "chunkIndex", chunkIndex,
                        "chunkLength", chunk.length(),
                        "accumulatedLength", accumulatedLength));
            realtimeEventPublisher.publish(
                    request.conversationId(),
                    RealtimeEventType.TASK_STEP_STREAM_CHUNK,
                    "TASK_STEP",
                    request.taskStepId(),
                    Map.of(
                        "taskRunId", request.taskRunId(),
                        "taskStepId", request.taskStepId(),
                        "adapterType", AgentAdapterType.OPENAI_COMPATIBLE.name(),
                        "chunk", chunk,
                        "chunkIndex", chunkIndex,
                        "chunkLength", chunk.length(),
                        "accumulatedLength", accumulatedLength));
        } catch (RuntimeException ignored) {
            // Streaming preview must never break adapter execution or fallback behavior.
        }
    }

    private boolean isCancellationRequested(AgentRequest request) {
        return request != null
                && request.taskRunId() != null
                && runCancellationRegistry.isCancellationRequested(request.taskRunId());
    }

    private JsonNode readProviderJson(String responseBody) throws AdapterResponseException {
        try {
            return objectMapper.readTree(responseBody);
        } catch (JsonProcessingException exception) {
            throw new AdapterResponseException(
                    "OpenAI Compatible provider returned non-JSON HTTP response body: "
                            + safeSnippet(responseBody));
        }
    }

    private String normalizeAndValidateArtifactContract(String content) throws AdapterResponseException {
        AdapterArtifactContractValidator.ValidationResult validationResult =
                artifactContractValidator.validate(content);
        if (!validationResult.valid()) {
            throw new AdapterResponseException(
                    "OpenAI Compatible adapter message content failed artifact JSON schema validation: "
                            + validationResult.errorMessage());
        }
        return validationResult.normalizedJson();
    }

    private String buildJsonOnlySystemPrompt(String basePrompt) {
        return basePrompt.strip() + """

                Critical output rule:
                Return only the AgentHub artifact JSON object requested by the user message.
                No markdown fences, no explanation outside JSON, no tool transcript, no plain-text answer.
                """;
    }

    private String describeProviderHttpError(int statusCode, String responseBody) {
        String providerDetail = extractProviderErrorDetail(responseBody);
        return "OpenAI Compatible adapter request failed with HTTP status " + statusCode
                + (providerDetail.isBlank() ? "." : ": " + providerDetail);
    }

    private String extractProviderErrorDetail(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "provider returned an empty error body.";
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode errorNode = root.path("error");
            if (errorNode.isObject()) {
                List<String> parts = new ArrayList<>();
                addProviderErrorPart(parts, "type", errorNode.path("type"));
                addProviderErrorPart(parts, "code", errorNode.path("code"));
                addProviderErrorPart(parts, "message", errorNode.path("message"));
                if (!parts.isEmpty()) {
                    return sanitizeDiagnosticText(String.join(", ", parts));
                }
            }
            String message = firstProviderText(root, "message", "error_description", "detail");
            if (!message.isBlank()) {
                return sanitizeDiagnosticText(message);
            }
        } catch (JsonProcessingException ignored) {
            // Fall through to a bounded sanitized body snippet.
        }
        return "provider error body snippet: " + safeSnippet(responseBody);
    }

    private void addProviderErrorPart(List<String> parts, String label, JsonNode value) {
        if (value.isTextual() && !value.asText().isBlank()) {
            parts.add(label + "=" + value.asText());
        } else if (value.isNumber() || value.isBoolean()) {
            parts.add(label + "=" + value.asText());
        }
    }

    private String firstProviderText(JsonNode node, String... fieldNames) {
        for (String fieldName : fieldNames) {
            JsonNode value = node.path(fieldName);
            if (value.isTextual() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        Iterator<JsonNode> values = node.elements();
        while (values.hasNext()) {
            JsonNode value = values.next();
            if (value.isTextual() && !value.asText().isBlank()) {
                return value.asText();
            }
        }
        return "";
    }

    private String sanitizeDiagnosticMessage(Exception exception) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
                ? exception.getClass().getSimpleName()
                : exception.getMessage();
        return sanitizeDiagnosticText(message);
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
        String sanitized = value;
        if (!apiKey.isBlank()) {
            sanitized = sanitized.replace(apiKey, "[REDACTED_API_KEY]");
        }
        String runtimeApiKey = runtimeConfigService.snapshot().apiKey();
        if (!runtimeApiKey.isBlank()) {
            sanitized = sanitized.replace(runtimeApiKey, "[REDACTED_API_KEY]");
        }
        sanitized = sanitized.replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]");
        sanitized = sanitized.replaceAll("(?i)(api[_-]?key[\"'\\s:=]+)[^\\s,\"'}]+", "$1[REDACTED]");
        return sanitized;
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

    private record ProviderMessage(int statusCode, String body, String content) {
    }

    private record EffectiveProviderConfig(
            boolean enabled,
            String providerName,
            String baseUrl,
            String apiKey,
            String model,
            boolean runtimeConfigured) {
    }

    private static class AdapterResponseException extends Exception {
        private AdapterResponseException(String message) {
            super(message);
        }
    }
}
