package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.task.TaskStep;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ReviewDecisionEvaluator {

    private final boolean forceRejectionEnabled;
    private final List<String> rejectionKeywords;

    public ReviewDecisionEvaluator(
            @Value("${agenthub.orchestrator.review.force-rejection-enabled:false}") boolean forceRejectionEnabled,
            @Value("${agenthub.orchestrator.review.rejection-keywords:REJECTION,decision: reject,reject,不通过,拒绝,blocker,阻塞}") String rejectionKeywords) {
        this.forceRejectionEnabled = forceRejectionEnabled;
        this.rejectionKeywords = Arrays.stream((rejectionKeywords == null ? "" : rejectionKeywords).split(","))
                .map(String::trim)
                .filter(keyword -> !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .toList();
    }

    public ReviewDecision evaluate(
            String userInput,
            TaskStep reviewStep,
            Artifact reviewArtifact,
            List<ArtifactId> affectedArtifactIds) {
        if (forceRejectionEnabled) {
            return rejected("force-rejection-enabled", affectedArtifactIds);
        }

        String evidence = String.join("\n",
                value(userInput),
                value(reviewStep == null ? null : reviewStep.getOutputContent()),
                value(reviewStep == null ? null : reviewStep.getAdapterResponseSummary()),
                value(reviewStep == null ? null : reviewStep.getAdapterErrorMessage()),
                value(reviewArtifact == null ? null : reviewArtifact.getContent()));
        String normalizedEvidence = evidence.toLowerCase(Locale.ROOT);
        String matchedKeyword = rejectionKeywords.stream()
                .filter(normalizedEvidence::contains)
                .findFirst()
                .orElse(null);
        if (matchedKeyword != null) {
            return rejected("keyword=" + matchedKeyword, affectedArtifactIds);
        }

        return ReviewDecision.approved(affectedArtifactIds, "RULE_BASED_REVIEW_APPROVED");
    }

    private ReviewDecision rejected(String source, List<ArtifactId> affectedArtifactIds) {
        List<ArtifactId> safeAffectedArtifactIds = affectedArtifactIds == null ? List.of() : List.copyOf(affectedArtifactIds);
        return ReviewDecision.rejected(
                List.of(
                        "Reviewer found blocker evidence and did not approve the current artifact set.",
                        "Affected artifacts must be revised before approval."),
                safeAffectedArtifactIds,
                "action=REVISE_AND_RETRY; autoFix=false; owner=owning-worker; affectedArtifacts="
                        + safeAffectedArtifactIds.stream().map(ArtifactId::value).toList()
                        + "; steps=[inspectBlockers,reviseAffectedArtifacts,rerunQualityChecks,rerunReviewer]; "
                        + "note=Orchestrator records guidance only and does not fabricate an automatic fix.",
                source);
    }

    private String value(String value) {
        return value == null ? "" : value;
    }
}
