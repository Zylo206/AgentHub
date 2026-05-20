package com.agenthub.domain.agent;

public record AgentId(String value) {

    public AgentId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("agentId must not be blank");
        }
    }
}
