package com.agenthub.application.orchestrator;

import java.util.List;

public record OrchestratorStepPlan(
        int stepOrder,
        String agentId,
        String agentName,
        String agentRole,
        String taskDescription,
        String requiredSkill,
        List<String> expectedArtifactTypes,
        String preferredAdapterType,
        List<String> contextRequirements,
        String parallelGroupKey,
        List<Integer> dependsOnStepOrders,
        String routingReason) {

    public OrchestratorStepPlan(
            int stepOrder,
            String agentId,
            String agentName,
            String agentRole,
            String taskDescription,
            String requiredSkill,
            List<String> expectedArtifactTypes,
            String preferredAdapterType,
            List<String> contextRequirements) {
        this(
                stepOrder,
                agentId,
                agentName,
                agentRole,
                taskDescription,
                requiredSkill,
                expectedArtifactTypes,
                preferredAdapterType,
                contextRequirements,
                "GROUP_" + stepOrder,
                List.of(),
                "Rule-based default routing");
    }

    public OrchestratorStepPlan {
        expectedArtifactTypes = List.copyOf(expectedArtifactTypes);
        contextRequirements = List.copyOf(contextRequirements);
        dependsOnStepOrders = dependsOnStepOrders == null ? List.of() : List.copyOf(dependsOnStepOrders);
    }
}
