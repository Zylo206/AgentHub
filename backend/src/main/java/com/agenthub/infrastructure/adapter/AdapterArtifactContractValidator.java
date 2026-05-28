package com.agenthub.infrastructure.adapter;

import com.agenthub.domain.artifact.ArtifactType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class AdapterArtifactContractValidator {

    private final ObjectMapper objectMapper;

    public AdapterArtifactContractValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ValidationResult validate(String content) {
        if (content == null || content.isBlank()) {
            return ValidationResult.invalid("Artifact contract content is empty.");
        }

        String normalizedContent = content.trim();
        if (normalizedContent.startsWith("```")) {
            return ValidationResult.invalid("Artifact contract must be raw JSON and must not use Markdown fences.");
        }
        JsonNode root;
        try {
            root = objectMapper.readTree(normalizedContent);
        } catch (JsonProcessingException exception) {
            return ValidationResult.invalid(
                    "Artifact contract is not valid JSON: " + safeSnippet(content));
        }

        List<String> errors = validateRoot(root);
        if (!errors.isEmpty()) {
            return ValidationResult.invalid("Artifact contract validation failed: " + String.join("; ", errors) + ".");
        }

        try {
            return ValidationResult.valid(objectMapper.writeValueAsString(root));
        } catch (JsonProcessingException exception) {
            return ValidationResult.invalid("Artifact contract could not be normalized.");
        }
    }

    private List<String> validateRoot(JsonNode root) {
        List<String> errors = new ArrayList<>();
        if (!root.isObject()) {
            errors.add("root must be a JSON object");
            return errors;
        }

        JsonNode assistantMessage = root.path("assistantMessage");
        if (!assistantMessage.isTextual() || assistantMessage.asText().isBlank()) {
            errors.add("assistantMessage must be a non-empty string");
        }

        JsonNode artifactsNode = root.path("artifacts");
        if (!artifactsNode.isArray() || artifactsNode.isEmpty()) {
            errors.add("artifacts must be a non-empty array");
            return errors;
        }

        for (int index = 0; index < artifactsNode.size(); index++) {
            validateArtifact(index, artifactsNode.path(index), errors);
        }
        return errors;
    }

    private void validateArtifact(int index, JsonNode artifactNode, List<String> errors) {
        if (!artifactNode.isObject()) {
            errors.add("artifact[" + index + "] must be an object");
            return;
        }

        for (String fieldName : List.of("title", "type", "language", "content", "summary")) {
            JsonNode value = artifactNode.path(fieldName);
            if (!value.isTextual() || value.asText().isBlank()) {
                errors.add("artifact[" + index + "]." + fieldName + " must be a non-empty string");
            }
        }

        String rawType = artifactNode.path("type").asText("");
        ArtifactType artifactType = parseArtifactType(rawType);
        if (artifactType == null) {
            errors.add("artifact[" + index + "].type is unsupported: " + rawType);
            return;
        }

        String content = normalizeArtifactContent(artifactType, artifactNode.path("content").asText(""));
        if (artifactNode instanceof ObjectNode objectNode) {
            objectNode.put("content", content);
        }
        if (looksLikeProviderError(content)) {
            errors.add("artifact[" + index + "].content looks like a provider error message");
        }
        if (content.trim().startsWith("```")) {
            errors.add("artifact[" + index + "].content must not be Markdown fenced content");
        }
        if (looksLikeCliWrapperOrLog(content)) {
            errors.add("artifact[" + index + "].content looks like CLI wrapper metadata or logs");
        }
        if (artifactType == ArtifactType.CODE && content.trim().startsWith("```")) {
            errors.add("artifact[" + index + "].content must be raw source code, not Markdown fenced code");
        }
    }

    private ArtifactType parseArtifactType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            return null;
        }
        try {
            return ArtifactType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private boolean looksLikeProviderError(String content) {
        String normalized = content == null ? "" : content.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return false;
        }
        return normalized.startsWith("error:")
                || normalized.startsWith("exception:")
                || normalized.startsWith("traceback")
                || normalized.startsWith("api key")
                || normalized.startsWith("unauthorized")
                || normalized.startsWith("rate limit")
                || normalized.contains("api key is missing")
                || normalized.contains("invalid api key")
                || normalized.contains("authentication failed")
                || normalized.contains("rate limit exceeded");
    }

    private boolean looksLikeCliWrapperOrLog(String content) {
        String normalized = content == null ? "" : content.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return false;
        }
        return normalized.startsWith("stdout=")
                || normalized.startsWith("stderr=")
                || normalized.startsWith("exit code")
                || normalized.startsWith("usage:")
                || normalized.startsWith("claude code cli failed")
                || normalized.startsWith("codex cli failed")
                || (normalized.contains("\"session_id\"")
                && normalized.contains("\"usage\"")
                && normalized.contains("\"result\""))
                || (normalized.contains("\"is_error\"") && normalized.contains("\"result\""))
                || (normalized.contains("stdout=") && normalized.contains("stderr="));
    }

    private String normalizeArtifactContent(ArtifactType artifactType, String content) {
        if (artifactType != ArtifactType.CODE || content == null || content.isBlank()) {
            return content;
        }
        String normalized = content.replace("\\r\\n", "\\n");
        if (normalized.indexOf('\n') >= 0 || countOccurrences(normalized, "\\n") < 2) {
            return content;
        }
        return normalized
                .replace("\\n", "\n")
                .replace("\\t", "\t")
                .replace("\\\"", "\"");
    }

    private int countOccurrences(String value, String token) {
        int count = 0;
        int index = 0;
        while ((index = value.indexOf(token, index)) >= 0) {
            count++;
            index += token.length();
        }
        return count;
    }

    private String safeSnippet(String value) {
        String sanitized = value == null ? "" : value.replace("\r", " ").replace("\n", " ").trim();
        if (sanitized.length() <= 500) {
            return sanitized;
        }
        return sanitized.substring(0, 500) + "...";
    }

    public record ValidationResult(boolean valid, String normalizedJson, String errorMessage) {

        static ValidationResult valid(String normalizedJson) {
            return new ValidationResult(true, normalizedJson, null);
        }

        static ValidationResult invalid(String errorMessage) {
            return new ValidationResult(false, null, errorMessage);
        }
    }
}
