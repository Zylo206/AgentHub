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
        List<String> contextRequirements) {

    public OrchestratorStepPlan {
        expectedArtifactTypes = List.copyOf(expectedArtifactTypes);
        contextRequirements = List.copyOf(contextRequirements);
    }
}
