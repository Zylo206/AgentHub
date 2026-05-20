package com.agenthub.infrastructure.adapter;

public interface AgentAdapter {

    AgentAdapterType type();

    default boolean supports(AgentAdapterType type) {
        return type() == type;
    }

    AgentResponse execute(AgentRequest request);
}
