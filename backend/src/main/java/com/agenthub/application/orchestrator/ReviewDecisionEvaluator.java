package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.task.TaskStep;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;
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
        this.rejectionKeywords = Stream.concat(
                        Arrays.stream((rejectionKeywords == null ? "" : rejectionKeywords).split(",")),
                        Stream.of("force reject", "不通过", "拒绝", "阻塞"))
                .map(String::trim)
                .filter(keyword -> !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    public ReviewDecision evaluate(
            String userInput,
            TaskStep reviewStep,
            Artifact reviewArtifact,
            List<ArtifactId> affectedArtifactIds) {
        return evaluate(userInput, reviewStep, reviewArtifact, List.of(), affectedArtifactIds);
    }

    public ReviewDecision evaluate(
            String userInput,
            TaskStep reviewStep,
            Artifact reviewArtifact,
            List<Artifact> reviewedArtifacts,
            List<ArtifactId> affectedArtifactIds) {
        if (forceRejectionEnabled) {
            return rejected("force-rejection-enabled", affectedArtifactIds);
        }

        List<String> qualityBlockers = findQualityBlockers(reviewStep, reviewArtifact, reviewedArtifacts);
        if (!qualityBlockers.isEmpty()) {
            return rejected("quality-gate", qualityBlockers, affectedArtifactIds);
        }

        String evidence = String.join("\n",
                value(userInput),
                value(reviewStep == null ? null : reviewStep.getOutputContent()),
                value(reviewStep == null ? null : reviewStep.getAdapterStatus()),
                value(reviewStep == null ? null : reviewStep.getAdapterResponseSummary()),
                value(reviewStep == null ? null : reviewStep.getAdapterErrorMessage()),
                value(reviewStep == null ? null : reviewStep.getArtifactParseStatus()),
                value(reviewStep == null ? null : reviewStep.getArtifactBuildValidationStatus()),
                value(reviewStep == null ? null : reviewStep.getArtifactBuildValidationReason()),
                value(reviewStep == null ? null : reviewStep.getArtifactQualityStatus()),
                value(reviewStep == null ? null : reviewStep.getArtifactQualityReason()),
                artifactQualityEvidence(reviewedArtifacts),
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
        return rejected(
                source,
                List.of(
                        "Reviewer found blocker evidence and did not approve the current artifact set.",
                        "Affected artifacts must be revised before approval."),
                affectedArtifactIds);
    }

    private ReviewDecision rejected(String source, List<String> blockers, List<ArtifactId> affectedArtifactIds) {
        List<ArtifactId> safeAffectedArtifactIds = affectedArtifactIds == null ? List.of() : List.copyOf(affectedArtifactIds);
        return ReviewDecision.rejected(
                blockers,
                safeAffectedArtifactIds,
                "action=REVISE_AND_RETRY; autoFix=false; owner=owning-worker; affectedArtifacts="
                        + safeAffectedArtifactIds.stream().map(ArtifactId::value).toList()
                        + "; steps=[inspectBlockers,reviseAffectedArtifacts,rerunBuildValidation,rerunLint,rerunTests,rerunReviewer]; "
                        + "note=Orchestrator records guidance only and does not fabricate an automatic fix.",
                source);
    }

    private List<String> findQualityBlockers(
            TaskStep reviewStep,
            Artifact reviewArtifact,
            List<Artifact> reviewedArtifacts) {
        List<String> blockers = new ArrayList<>();
        addStepQualityBlockers(blockers, reviewStep);
        addArtifactQualityBlockers(blockers, reviewArtifact);
        if (reviewedArtifacts != null) {
            reviewedArtifacts.forEach(artifact -> addArtifactQualityBlockers(blockers, artifact));
        }
        return blockers.stream().distinct().toList();
    }

    private void addStepQualityBlockers(List<String> blockers, TaskStep step) {
        if (step == null) {
            return;
        }
        if (isParseFailure(step.getArtifactParseStatus())) {
            blockers.add("Reviewer step parse status failed: " + step.getArtifactParseStatus());
        }
        if (isBuildFailure(step.getArtifactBuildValidationStatus())) {
            blockers.add("Reviewer step build/lint validation failed: "
                    + step.getArtifactBuildValidationStatus()
                    + qualityReason(step.getArtifactBuildValidationReason())
                    + qualityReason(step.getArtifactQualityReason()));
        }
        if (isQualityFailure(step.getArtifactQualityStatus())) {
            blockers.add("Reviewer step artifact quality failed: "
                    + step.getArtifactQualityStatus()
                    + qualityReason(step.getArtifactQualityReason()));
        }
        String adapterEvidence = String.join(" ",
                value(step.getAdapterStatus()),
                value(step.getAdapterErrorMessage()),
                value(step.getAdapterResponseSummary()),
                value(step.getArtifactQualityReason()));
        if (containsToken(adapterEvidence, "FALLBACK_BLOCKING")) {
            blockers.add("Reviewer step adapter fallback is blocking approval.");
        }
        if (containsToken(adapterEvidence, "INVALID_CODE")) {
            blockers.add("Reviewer step reported invalid code.");
        }
        addExternalValidationBlockers(
                blockers,
                "Reviewer step",
                String.join(" ",
                        value(step.getOutputContent()),
                        value(step.getAdapterResponseSummary()),
                        value(step.getAdapterErrorMessage()),
                        value(step.getArtifactBuildValidationReason()),
                        value(step.getArtifactQualityReason())));
    }

    private void addArtifactQualityBlockers(List<String> blockers, Artifact artifact) {
        if (artifact == null) {
            return;
        }
        String label = artifact.getTitle() == null || artifact.getTitle().isBlank()
                ? artifact.getId().value()
                : artifact.getTitle();
        if (isBuildFailure(artifact.getBuildValidationStatus())) {
            blockers.add("Artifact build/lint validation failed: "
                    + label
                    + " status=" + artifact.getBuildValidationStatus()
                    + qualityReason(artifact.getBuildValidationReason())
                    + qualityReason(artifact.getQualityReason()));
        }
        if (isQualityFailure(artifact.getQualityStatus())) {
            blockers.add("Artifact quality failed: "
                    + label
                    + " status=" + artifact.getQualityStatus()
                    + qualityReason(artifact.getQualityReason()));
        }
        if (artifact.getType() == ArtifactType.CODE && looksLikeInvalidCode(artifact.getContent())) {
            blockers.add("Artifact contains invalid code markers: " + label);
        }
        addExternalValidationBlockers(
                blockers,
                "Artifact " + label,
                String.join(" ",
                        value(artifact.getContent()),
                        value(artifact.getBuildValidationReason()),
                        value(artifact.getQualityReason())));
    }

    private void addExternalValidationBlockers(List<String> blockers, String scope, String evidence) {
        if (containsAny(
                evidence,
                "LINT_FAILED",
                "ESLINT_FAILED",
                "eslint failed",
                "lint failed",
                "lint error",
                "code style failed")) {
            blockers.add(scope + " lint validation failed.");
        }
        if (containsAny(
                evidence,
                "TEST_FAILED",
                "VITEST_FAILED",
                "JEST_FAILED",
                "npm test failed",
                "test failed",
                "tests failed",
                "unit test failed")) {
            blockers.add(scope + " test validation failed.");
        }
        if (containsAny(
                evidence,
                "TYPECHECK_FAILED",
                "TSC_FAILED",
                "tsc failed",
                "typecheck failed",
                "type check failed",
                "typescript compilation failed")) {
            blockers.add(scope + " typecheck validation failed.");
        }
    }

    private boolean isParseFailure(String status) {
        return containsAny(status, "PARSE_FAILED", "INVALID_JSON", "MALFORMED_JSON");
    }

    private boolean isBuildFailure(String status) {
        return containsAny(status, "BUILD_FAILED", "FAILED");
    }

    private boolean isQualityFailure(String status) {
        return containsAny(status, "QUALITY_FAILED", "REJECTED");
    }

    private boolean looksLikeInvalidCode(String content) {
        return containsAny(content, "TODO_BUILD_FAIL", "throw new Error(\"TODO\")", "SYNTAX_ERROR");
    }

    private String artifactQualityEvidence(List<Artifact> artifacts) {
        if (artifacts == null || artifacts.isEmpty()) {
            return "";
        }
        return artifacts.stream()
                .map(artifact -> String.join(" ",
                        value(artifact.getTitle()),
                        value(artifact.getBuildValidationStatus()),
                        value(artifact.getBuildValidationReason()),
                        value(artifact.getQualityStatus()),
                        value(artifact.getQualityReason())))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
    }

    private String qualityReason(String reason) {
        return reason == null || reason.isBlank() ? "" : " reason=" + reason;
    }

    private boolean containsAny(String value, String... tokens) {
        for (String token : tokens) {
            if (containsToken(value, token)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsToken(String value, String token) {
        return value != null
                && token != null
                && value.toUpperCase(Locale.ROOT).contains(token.toUpperCase(Locale.ROOT));
    }

    private String value(String value) {
        return value == null ? "" : value;
    }
}
