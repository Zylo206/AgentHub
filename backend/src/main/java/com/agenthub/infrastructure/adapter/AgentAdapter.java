package com.agenthub.infrastructure.adapter;

public interface AgentAdapter {

    AgentAdapterType type();

    default AgentAdapterDescriptor describe() {
        return new AgentAdapterDescriptor(
                type(),
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                "Adapter is available.",
                null);
    }

    default boolean supports(AgentAdapterType type) {
        return type() == type;
    }

    AgentResponse execute(AgentRequest request);
}
