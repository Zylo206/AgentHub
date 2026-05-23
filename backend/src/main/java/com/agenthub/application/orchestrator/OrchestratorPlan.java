package com.agenthub.application.orchestrator;

import java.util.List;

public record OrchestratorPlan(
        String goal,
        List<OrchestratorStepPlan> steps,
        List<String> acceptanceCriteria,
        List<String> expectedArtifacts,
        String planningMode,
        List<String> parallelGroups,
        String plannerReasoningSummary,
        String fallbackReason) {

    public OrchestratorPlan(
            String goal,
            List<OrchestratorStepPlan> steps,
            List<String> acceptanceCriteria,
            List<String> expectedArtifacts,
            String planningMode) {
        this(
                goal,
                steps,
                acceptanceCriteria,
                expectedArtifacts,
                planningMode,
                List.of(),
                null,
                null);
    }

    public OrchestratorPlan {
        steps = List.copyOf(steps);
        acceptanceCriteria = List.copyOf(acceptanceCriteria);
        expectedArtifacts = List.copyOf(expectedArtifacts);
        parallelGroups = parallelGroups == null ? List.of() : List.copyOf(parallelGroups);
    }
}
