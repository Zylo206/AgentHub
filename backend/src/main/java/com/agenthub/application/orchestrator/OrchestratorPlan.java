package com.agenthub.application.orchestrator;

import java.util.List;

public record OrchestratorPlan(
        String goal,
        List<OrchestratorStepPlan> steps,
        List<String> acceptanceCriteria,
        List<String> expectedArtifacts,
        String planningMode) {

    public OrchestratorPlan {
        steps = List.copyOf(steps);
        acceptanceCriteria = List.copyOf(acceptanceCriteria);
        expectedArtifacts = List.copyOf(expectedArtifacts);
    }
}
