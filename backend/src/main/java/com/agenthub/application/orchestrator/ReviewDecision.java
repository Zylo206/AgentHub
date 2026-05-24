package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.ArtifactId;
import java.util.List;

public record ReviewDecision(
        Decision decision,
        List<String> blockers,
        List<ArtifactId> affectedArtifactIds,
        String retryInstruction,
        String source) {

    public enum Decision {
        APPROVED,
        REJECTED
    }

    public boolean rejected() {
        return decision == Decision.REJECTED;
    }

    public static ReviewDecision approved(List<ArtifactId> affectedArtifactIds, String source) {
        return new ReviewDecision(
                Decision.APPROVED,
                List.of(),
                affectedArtifactIds == null ? List.of() : List.copyOf(affectedArtifactIds),
                "No retry required.",
                source == null || source.isBlank() ? "RULE_BASED_REVIEW" : source);
    }

    public static ReviewDecision rejected(
            List<String> blockers,
            List<ArtifactId> affectedArtifactIds,
            String retryInstruction,
            String source) {
        return new ReviewDecision(
                Decision.REJECTED,
                blockers == null ? List.of() : List.copyOf(blockers),
                affectedArtifactIds == null ? List.of() : List.copyOf(affectedArtifactIds),
                retryInstruction == null || retryInstruction.isBlank()
                        ? "Revise affected artifacts and rerun Reviewer before approval."
                        : retryInstruction,
                source == null || source.isBlank() ? "RULE_BASED_REVIEW" : source);
    }
}
