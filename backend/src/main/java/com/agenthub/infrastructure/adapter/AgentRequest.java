package com.agenthub.infrastructure.adapter;

import java.util.List;
import java.util.Map;

public record AgentRequest(
        String requestId,
        String conversationId,
        String taskRunId,
        String taskStepId,
        String agentId,
        String agentName,
        String userInput,
        String systemPrompt,
        String taskDescription,
        List<String> contextItems,
        List<String> artifactSummaries,
        Map<String, Object> metadata) {

    public AgentRequest {
        contextItems = contextItems == null ? List.of() : List.copyOf(contextItems);
        artifactSummaries = artifactSummaries == null ? List.of() : List.copyOf(artifactSummaries);
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }
}
