package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.ArtifactType;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AdapterArtifactQualityEvaluator {

    public QualityReport evaluate(AdapterArtifactExtractor.ExtractionResult extractionResult) {
        if (extractionResult == null) {
            return new QualityReport("EMPTY", "REJECTED", "Adapter extraction result is missing.", List.of());
        }

        String parseStatus = extractionResult.fallbackReason() == null ? "VALID_JSON_ARTIFACTS" : "FALLBACK_TEXT";
        List<ArtifactQuality> artifactQualities = extractionResult.artifacts().stream()
                .map(this::evaluateArtifact)
                .toList();
        long acceptedCount = artifactQualities.stream()
                .filter(item -> "ACCEPTED".equals(item.qualityStatus()))
                .count();
        String qualityStatus = acceptedCount > 0 ? "ACCEPTED" : "REJECTED";
        String reason = acceptedCount > 0
                ? "Accepted " + acceptedCount + " adapter artifact(s); parseStatus=" + parseStatus + "."
                : "No adapter artifact passed quality checks; parseStatus=" + parseStatus + ".";
        if (extractionResult.fallbackReason() != null && !extractionResult.fallbackReason().isBlank()) {
            reason += " " + extractionResult.fallbackReason();
        }
        return new QualityReport(parseStatus, qualityStatus, reason, artifactQualities);
    }

    private ArtifactQuality evaluateArtifact(AdapterArtifactExtractor.AdapterArtifactSpec spec) {
        if (spec == null) {
            return new ArtifactQuality(null, "REJECTED", "Artifact spec is missing.");
        }
        if (isBlank(spec.title())) {
            return new ArtifactQuality(spec, "REJECTED", "Artifact title is missing.");
        }
        if (isBlank(spec.content())) {
            return new ArtifactQuality(spec, "REJECTED", "Artifact content is empty.");
        }
        if (spec.content().trim().length() < 20) {
            return new ArtifactQuality(spec, "REJECTED", "Artifact content is too short to be useful.");
        }
        if (looksLikeError(spec.content())) {
            return new ArtifactQuality(spec, "REJECTED", "Artifact content looks like an error message.");
        }
        if (spec.type() == ArtifactType.CODE && !looksLikeCode(spec.content())) {
            return new ArtifactQuality(spec, "REJECTED", "CODE artifact content does not look like raw source code.");
        }
        if ((spec.type() == ArtifactType.API_CONTRACT || spec.type() == ArtifactType.DATA_MODEL)
                && !looksLikeStructuredText(spec.content())) {
            return new ArtifactQuality(spec, "REJECTED", spec.type() + " content does not look like structured text.");
        }
        return new ArtifactQuality(spec, "ACCEPTED", "Artifact passed rule-based quality checks.");
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

    public record QualityReport(
            String parseStatus,
            String qualityStatus,
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
            String qualityReason) {
    }
}
