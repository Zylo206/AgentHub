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

    public OpenAICompatibleAgentAdapter(
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            @Value("${agenthub.adapters.openai-compatible.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.openai-compatible.base-url:}") String baseUrl,
            @Value("${agenthub.adapters.openai-compatible.api-key:}") String apiKey,
            @Value("${agenthub.adapters.openai-compatible.model:}") String model,
            @Value("${agenthub.adapters.openai-compatible.timeout-seconds:30}") int timeoutSeconds) {
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
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
        builder.append("Respond concisely with implementation guidance or review output suitable for the current task step.");
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
