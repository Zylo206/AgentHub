package com.agenthub.infrastructure.adapter;

import java.util.List;
import java.util.Map;

public record AgentAdapterDescriptor(
        AgentAdapterType adapterType,
        AgentAdapterHealthStatus status,
        boolean enabled,
        boolean placeholder,
        String description,
        String failureReason,
        List<String> supportedModes,
        List<String> safetyPolicies,
        Map<String, Object> capabilityDetails) {

    public AgentAdapterDescriptor(
            AgentAdapterType adapterType,
            AgentAdapterHealthStatus status,
            boolean enabled,
            boolean placeholder,
            String description,
            String failureReason) {
        this(adapterType, status, enabled, placeholder, description, failureReason, List.of(), List.of(), Map.of());
    }

    public AgentAdapterDescriptor {
        supportedModes = supportedModes == null ? List.of() : List.copyOf(supportedModes);
        safetyPolicies = safetyPolicies == null ? List.of() : List.copyOf(safetyPolicies);
        capabilityDetails = capabilityDetails == null ? Map.of() : Map.copyOf(capabilityDetails);
    }
}
