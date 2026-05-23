package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.ArtifactType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AdapterArtifactExtractor {

    private final ObjectMapper objectMapper;

    public AdapterArtifactExtractor(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ExtractionResult extract(String content, ExtractionContext context) {
        if (content == null || content.isBlank()) {
            return new ExtractionResult(null, List.of(), "empty adapter content");
        }

        String normalizedContent = stripJsonCodeFence(content.trim());
        try {
            JsonNode root = objectMapper.readTree(normalizedContent);
            JsonNode artifactsNode = root.path("artifacts");
            if (artifactsNode.isArray()) {
                List<AdapterArtifactSpec> specs = new ArrayList<>();
                for (JsonNode item : artifactsNode) {
                    AdapterArtifactSpec spec = parseSpec(item, context);
                    if (spec != null) {
                        specs.add(spec);
                    }
                }
                if (!specs.isEmpty()) {
                    String assistantMessage = root.path("assistantMessage").asText(null);
                    return new ExtractionResult(assistantMessage, specs, null);
                }
            }
        } catch (Exception ignored) {
            // Plain text adapter output is still useful as a real artifact.
        }

        return new ExtractionResult(
                null,
                List.of(fallbackSpec(content, context)),
                "adapter output was not valid artifact JSON; persisted as fallback text artifact");
    }

    private AdapterArtifactSpec parseSpec(JsonNode item, ExtractionContext context) {
        String rawContent = item.path("content").asText("");
        if (rawContent.isBlank()) {
            return null;
        }

        ArtifactType artifactType = parseType(item.path("type").asText(null), context);
        String title = item.path("title").asText(null);
        String language = item.path("language").asText(null);
        String summary = item.path("summary").asText(null);
        return new AdapterArtifactSpec(
                title == null || title.isBlank() ? fallbackTitle(context, artifactType) : title.trim(),
                artifactType,
                language == null || language.isBlank() ? fallbackLanguage(artifactType) : language.trim(),
                rawContent,
                summary);
    }

    private AdapterArtifactSpec fallbackSpec(String content, ExtractionContext context) {
        ArtifactType artifactType = context.reviewStep() ? ArtifactType.REVIEW_REPORT : ArtifactType.MARKDOWN;
        return new AdapterArtifactSpec(
                fallbackTitle(context, artifactType),
                artifactType,
                fallbackLanguage(artifactType),
                content,
                "Plain text adapter output persisted as an artifact.");
    }

    private ArtifactType parseType(String rawType, ExtractionContext context) {
        if (rawType == null || rawType.isBlank()) {
            return context.reviewStep() ? ArtifactType.REVIEW_REPORT : ArtifactType.MARKDOWN;
        }
        try {
            return ArtifactType.valueOf(rawType.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return context.reviewStep() ? ArtifactType.REVIEW_REPORT : ArtifactType.MARKDOWN;
        }
    }

    private String fallbackTitle(ExtractionContext context, ArtifactType artifactType) {
        String extension = switch (artifactType) {
            case CODE -> ".txt";
            case API_CONTRACT, DATA_MODEL -> ".json";
            default -> ".md";
        };
        return "Real Adapter Output - " + context.agentName() + " - Step " + context.stepOrder() + extension;
    }

    private String fallbackLanguage(ArtifactType artifactType) {
        return switch (artifactType) {
            case CODE -> "txt";
            case API_CONTRACT, DATA_MODEL -> "json";
            default -> "md";
        };
    }

    private String stripJsonCodeFence(String content) {
        if (content.startsWith("```json")) {
            return trimClosingFence(content.substring("```json".length()));
        }
        if (content.startsWith("```")) {
            return trimClosingFence(content.substring("```".length()));
        }
        return content;
    }

    private String trimClosingFence(String content) {
        String trimmed = content.trim();
        if (trimmed.endsWith("```")) {
            return trimmed.substring(0, trimmed.length() - 3).trim();
        }
        return trimmed;
    }

    public record ExtractionContext(
            int stepOrder,
            String agentName,
            String requiredSkill,
            String taskDescription) {

        boolean reviewStep() {
            String normalizedSkill = requiredSkill == null ? "" : requiredSkill.toLowerCase();
            String normalizedTask = taskDescription == null ? "" : taskDescription.toLowerCase();
            return normalizedSkill.contains("review")
                    || normalizedTask.contains("review")
                    || normalizedTask.contains("check")
                    || normalizedTask.contains("检查")
                    || normalizedTask.contains("评审");
        }
    }

    public record ExtractionResult(
            String assistantMessage,
            List<AdapterArtifactSpec> artifacts,
            String fallbackReason) {
    }

    public record AdapterArtifactSpec(
            String title,
            ArtifactType type,
            String language,
            String content,
            String summary) {
    }
}
