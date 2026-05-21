package com.agenthub.infrastructure.adapter;

public record AgentAdapterDescriptor(
        AgentAdapterType adapterType,
        AgentAdapterHealthStatus status,
        boolean enabled,
        boolean placeholder,
        String description,
        String failureReason) {
}
