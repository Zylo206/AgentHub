package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.ArtifactType;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AdapterArtifactQualityEvaluator {

    private static final int ACCEPTANCE_SCORE_THRESHOLD = 70;

    public QualityReport evaluate(AdapterArtifactExtractor.ExtractionResult extractionResult) {
        if (extractionResult == null) {
            return new QualityReport(
                    "EMPTY",
                    "REJECTED",
                    0,
                    "NOT_EVALUATED",
                    "Adapter extraction result is missing.",
                    "score=0; status=REJECTED; reason=Adapter extraction result is missing.; "
                            + "retryAdvice=Return structured artifacts before retry.",
                    List.of());
        }

        String parseStatus = extractionResult.fallbackReason() == null ? "VALID_JSON_ARTIFACTS" : "FALLBACK_TEXT";
        List<ArtifactQuality> artifactQualities = extractionResult.artifacts().stream()
                .map(this::evaluateArtifact)
                .toList();
        long acceptedCount = artifactQualities.stream()
                .filter(item -> "ACCEPTED".equals(item.qualityStatus()))
                .count();
        int score = aggregateScore(artifactQualities);
        String buildValidationStatus = aggregateBuildValidationStatus(artifactQualities);
        String buildValidationReason = aggregateBuildValidationReason(artifactQualities);
        String qualityStatus = acceptedCount > 0 ? "ACCEPTED" : "REJECTED";
        String reason = acceptedCount > 0
                ? "Accepted " + acceptedCount + " adapter artifact(s); parseStatus=" + parseStatus + "."
                : "No adapter artifact passed quality checks; parseStatus=" + parseStatus + ".";
        if (extractionResult.fallbackReason() != null && !extractionResult.fallbackReason().isBlank()) {
            reason += " " + extractionResult.fallbackReason();
        }
        return new QualityReport(
                parseStatus,
                qualityStatus,
                score,
                buildValidationStatus,
                buildValidationReason,
                "score=" + score
                        + "; status=" + qualityStatus
                        + "; buildValidation=" + buildValidationStatus
                        + "; reason=" + reason
                        + "; retryAdvice=" + buildQualityRetryAdvice(artifactQualities),
                artifactQualities);
    }

    private ArtifactQuality evaluateArtifact(AdapterArtifactExtractor.AdapterArtifactSpec spec) {
        if (spec == null) {
            return rejected(null, 0, "Artifact spec is missing.");
        }
        if (isBlank(spec.title())) {
            return rejected(spec, 15, "Artifact title is missing.");
        }
        if (isBlank(spec.content())) {
            return rejected(spec, 0, "Artifact content is empty.");
        }
        if (spec.content().trim().length() < 20) {
            return rejected(spec, 35, "Artifact content is too short to be useful.");
        }
        if (looksLikeError(spec.content())) {
            return rejected(spec, 20, "Artifact content looks like an error message.");
        }
        if (spec.type() == ArtifactType.CODE && !looksLikeCode(spec.content())) {
            return rejected(spec, 45, "CODE artifact content does not look like raw source code.");
        }
        if ((spec.type() == ArtifactType.API_CONTRACT || spec.type() == ArtifactType.DATA_MODEL)
                && !looksLikeStructuredText(spec.content())) {
            return rejected(spec, 50, spec.type() + " content does not look like structured text.");
        }
        int score = scoreAcceptedArtifact(spec);
        BuildValidation buildValidation = validateBuild(spec);
        if ("FAILED".equals(buildValidation.status())) {
            return new ArtifactQuality(
                    spec,
                    "REJECTED",
                    Math.min(score, 45),
                    formatQualityReason(Math.min(score, 45), "REJECTED", buildValidation.reason(), spec, "BUILD_FAILED"),
                    buildValidation.status(),
                    buildValidation.reason());
        }
        String status = score >= ACCEPTANCE_SCORE_THRESHOLD ? "ACCEPTED" : "REJECTED";
        String reason = status.equals("ACCEPTED")
                ? "Artifact passed rule-based quality checks."
                : "Artifact is parseable but below the quality score threshold.";
        return new ArtifactQuality(
                spec,
                status,
                score,
                formatQualityReason(score, status, reason, spec, classifyQualityOutcome(status, buildValidation.status())),
                buildValidation.status(),
                buildValidation.reason());
    }

    private boolean looksLikeCode(String content) {
        String normalized = content.trim().toLowerCase(Locale.ROOT);
        if (normalized.startsWith("# ") || normalized.startsWith("## ") || normalized.startsWith("```")) {
            return false;
        }
        return normalized.contains("function ")
                || normalized.contains("export ")
                || normalized.contains("import ")
                || normalized.contains("const ")
                || normalized.contains("class ")
                || normalized.contains("return ")
                || normalized.contains("<")
                || normalized.contains("{");
    }

    private boolean looksLikeStructuredText(String content) {
        String trimmed = content.trim();
        return trimmed.startsWith("{")
                || trimmed.startsWith("[")
                || trimmed.contains(":")
                || trimmed.contains("- ");
    }

    private boolean looksLikeError(String content) {
        String normalized = content.toLowerCase(Locale.ROOT);
        return normalized.contains("error:")
                || normalized.contains("exception")
                || normalized.contains("traceback")
                || normalized.contains("api key")
                || normalized.contains("unauthorized")
                || normalized.contains("rate limit");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private ArtifactQuality rejected(
            AdapterArtifactExtractor.AdapterArtifactSpec spec,
            int score,
            String reason) {
        BuildValidation buildValidation = spec == null
                ? new BuildValidation("NOT_EVALUATED", "Artifact spec is missing.")
                : validateBuild(spec);
        return new ArtifactQuality(
                spec,
                "REJECTED",
                score,
                formatQualityReason(score, "REJECTED", reason, spec, classifyQualityOutcome("REJECTED", buildValidation.status())),
                buildValidation.status(),
                buildValidation.reason());
    }

    private BuildValidation validateBuild(AdapterArtifactExtractor.AdapterArtifactSpec spec) {
        if (spec == null || spec.type() != ArtifactType.CODE) {
            return new BuildValidation("NOT_APPLICABLE", "Lightweight build validation applies to CODE artifacts only.");
        }
        String content = spec.content() == null ? "" : spec.content().trim();
        if (content.startsWith("```")) {
            return new BuildValidation("FAILED", "CODE content is wrapped in Markdown fences instead of raw source.");
        }
        if (!balanced(content, '(', ')') || !balanced(content, '{', '}') || !balanced(content, '[', ']')) {
            return new BuildValidation("FAILED", "CODE content has unbalanced brackets or braces.");
        }
        if (content.contains("TODO_BUILD_FAIL") || content.contains("throw new Error(\"TODO\")")) {
            return new BuildValidation("FAILED", "CODE content contains explicit build-failure placeholder markers.");
        }
        if (looksLikeReactCode(content) && !content.contains("export")) {
            return new BuildValidation("WARN", "React-like CODE has no export; preview may not be directly importable.");
        }
        return new BuildValidation("PASSED", "Lightweight syntax/build heuristics passed; no external build was executed.");
    }

    private boolean balanced(String content, char open, char close) {
        int depth = 0;
        for (int i = 0; i < content.length(); i++) {
            char value = content.charAt(i);
            if (value == open) {
                depth++;
            } else if (value == close) {
                depth--;
                if (depth < 0) {
                    return false;
                }
            }
        }
        return depth == 0;
    }

    private boolean looksLikeReactCode(String content) {
        String normalized = content.toLowerCase(Locale.ROOT);
        return normalized.contains("react")
                || normalized.contains("jsx")
                || normalized.contains("tsx")
                || normalized.contains("classname");
    }

    private int scoreAcceptedArtifact(AdapterArtifactExtractor.AdapterArtifactSpec spec) {
        int score = 100;
        String content = spec.content().trim();
        if (spec.summary() == null || spec.summary().isBlank()) {
            score -= 5;
        }
        if (content.length() < 80) {
            score -= 10;
        }
        if (spec.type() == ArtifactType.CODE && !hasCodeStructure(content)) {
            score -= 15;
        }
        if ((spec.type() == ArtifactType.API_CONTRACT || spec.type() == ArtifactType.DATA_MODEL)
                && !content.contains("\"")) {
            score -= 10;
        }
        return Math.max(0, score);
    }

    private boolean hasCodeStructure(String content) {
        String normalized = content.toLowerCase(Locale.ROOT);
        return normalized.contains("\n")
                && (normalized.contains("return ")
                || normalized.contains("function ")
                || normalized.contains("class ")
                || normalized.contains("=>")
                || normalized.contains("export "));
    }

    private int aggregateScore(List<ArtifactQuality> artifactQualities) {
        if (artifactQualities == null || artifactQualities.isEmpty()) {
            return 0;
        }
        return (int) Math.round(artifactQualities.stream()
                .mapToInt(ArtifactQuality::qualityScore)
                .average()
                .orElse(0));
    }

    private String aggregateBuildValidationStatus(List<ArtifactQuality> artifactQualities) {
        if (artifactQualities == null || artifactQualities.isEmpty()) {
            return "NOT_EVALUATED";
        }
        if (artifactQualities.stream().anyMatch(item -> "FAILED".equals(item.buildValidationStatus()))) {
            return "FAILED";
        }
        if (artifactQualities.stream().anyMatch(item -> "WARN".equals(item.buildValidationStatus()))) {
            return "WARN";
        }
        if (artifactQualities.stream().anyMatch(item -> "PASSED".equals(item.buildValidationStatus()))) {
            return "PASSED";
        }
        return "NOT_APPLICABLE";
    }

    private String aggregateBuildValidationReason(List<ArtifactQuality> artifactQualities) {
        if (artifactQualities == null || artifactQualities.isEmpty()) {
            return "No adapter artifact was available for build validation.";
        }
        return artifactQualities.stream()
                .map(item -> (item.spec() == null ? "unknown artifact" : item.spec().title())
                        + ": "
                        + item.buildValidationStatus()
                        + " - "
                        + item.buildValidationReason())
                .reduce((left, right) -> left + " | " + right)
                .orElse("No build validation details recorded.");
    }

    private String formatQualityReason(
            int score,
            String status,
            String reason,
            AdapterArtifactExtractor.AdapterArtifactSpec spec,
            String outcome) {
        return "outcome=" + outcome
                + "; score=" + score
                + "; status=" + status
                + "; reason=" + reason
                + "; retryAdvice=" + buildArtifactRetryAdvice(spec, reason);
    }

    private String classifyQualityOutcome(String qualityStatus, String buildValidationStatus) {
        if ("FAILED".equals(buildValidationStatus)) {
            return "BUILD_FAILED";
        }
        if ("REJECTED".equals(qualityStatus)) {
            return "QUALITY_FAILED";
        }
        return "ACCEPTED";
    }

    private String buildQualityRetryAdvice(List<ArtifactQuality> artifactQualities) {
        List<String> rejectedTitles = artifactQualities.stream()
                .filter(item -> !"ACCEPTED".equals(item.qualityStatus()))
                .map(item -> item.spec() == null ? "unknown artifact" : item.spec().title())
                .toList();
        if (rejectedTitles.isEmpty()) {
            return "No retry required; continue to reviewer approval.";
        }
        return "action=REVISE_ARTIFACTS; autoFix=false; targets=" + rejectedTitles
                + "; instruction=Ask the owning worker to regenerate valid artifact JSON/content and rerun quality checks.";
    }

    private String buildArtifactRetryAdvice(
            AdapterArtifactExtractor.AdapterArtifactSpec spec,
            String reason) {
        String target = spec == null || spec.title() == null || spec.title().isBlank()
                ? "unknown artifact"
                : spec.title();
        return "action=REVISE_ARTIFACT; autoFix=false; target=" + target
                + "; requirement=" + reason;
    }

    public record QualityReport(
            String parseStatus,
            String qualityStatus,
            int qualityScore,
            String buildValidationStatus,
            String buildValidationReason,
            String qualityReason,
            List<ArtifactQuality> artifactQualities) {

        public QualityReport {
            artifactQualities = artifactQualities == null ? List.of() : List.copyOf(artifactQualities);
        }

        public boolean hasAcceptedArtifacts() {
            return artifactQualities.stream()
                    .anyMatch(item -> "ACCEPTED".equals(item.qualityStatus()));
        }
    }

    public record ArtifactQuality(
            AdapterArtifactExtractor.AdapterArtifactSpec spec,
            String qualityStatus,
            int qualityScore,
            String qualityReason,
            String buildValidationStatus,
            String buildValidationReason) {
    }

    public record BuildValidation(String status, String reason) {
    }
}
