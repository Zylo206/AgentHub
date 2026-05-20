package com.agenthub.infrastructure.adapter;

import java.time.Instant;
import java.util.List;

public record AgentResponse(
        String requestId,
        AgentAdapterType preferredAdapterType,
        AgentAdapterType actualAdapterType,
        AgentAdapterType adapterType,
        boolean fallbackUsed,
        AgentExecutionStatus status,
        String content,
        List<String> producedArtifactHints,
        String errorMessage,
        Instant startedAt,
        Instant completedAt) {

    public AgentResponse {
        producedArtifactHints = producedArtifactHints == null ? List.of() : List.copyOf(producedArtifactHints);
        adapterType = actualAdapterType != null ? actualAdapterType : adapterType;
    }
}
