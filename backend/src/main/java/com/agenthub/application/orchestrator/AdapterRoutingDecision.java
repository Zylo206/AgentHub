package com.agenthub.application.orchestrator;

import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.List;

public record AdapterRoutingDecision(
        AgentAdapterType selectedAdapterType,
        List<AdapterCandidateScore> candidateScores,
        String reason,
        String fallbackPolicy) {

    public AdapterRoutingDecision {
        candidateScores = candidateScores == null ? List.of() : List.copyOf(candidateScores);
        fallbackPolicy = fallbackPolicy == null || fallbackPolicy.isBlank()
                ? "STEP_FALLBACK_TO_MOCK"
                : fallbackPolicy;
    }

    public AdapterCandidateScore selectedScore() {
        return candidateScores.stream()
                .filter(score -> score.adapterType() == selectedAdapterType)
                .findFirst()
                .orElse(null);
    }

    public String describe() {
        AdapterCandidateScore selected = selectedScore();
        String scoreSummary = selected == null
                ? "no selected candidate score"
                : "selectedScore="
                        + selected.totalScore()
                        + ", adapterHealthScore="
                        + selected.healthScore()
                        + ", historyScore="
                        + selected.successRateScore()
                        + ", fallbackPenalty="
                        + selected.fallbackPenaltyScore()
                        + ", preferredBonus="
                        + selected.preferredBonusScore();
        String candidateSummary = candidateScores.stream()
                .map(score -> score.adapterType()
                        + "(total="
                        + score.totalScore()
                        + ",health="
                        + score.healthScore()
                        + ",successRate="
                        + score.successRateScore()
                        + ",fallbackPenalty="
                        + score.fallbackPenaltyScore()
                        + ",preferredBonus="
                        + score.preferredBonusScore()
                        + ",status="
                        + score.status()
                        + ")")
                .reduce((left, right) -> left + "; " + right)
                .orElse("none");
        return reason + ", " + scoreSummary + ", candidates=[" + candidateSummary + "], fallbackPolicy=" + fallbackPolicy + ".";
    }

    public record AdapterCandidateScore(
            AgentAdapterType adapterType,
            double totalScore,
            double healthScore,
            double successRateScore,
            double fallbackPenaltyScore,
            double preferredBonusScore,
            String status) {
    }
}
