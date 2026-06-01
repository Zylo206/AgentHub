package com.agenthub.application.artifact;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Service;

@Service
public class ArtifactBundleService {

    private final ArtifactRepository artifactRepository;

    public ArtifactBundleService(ArtifactRepository artifactRepository) {
        this.artifactRepository = artifactRepository;
    }

    public ArtifactBundle buildConversationBundle(
            String conversationId,
            List<String> artifactIds,
            boolean includeRelated) {
        ConversationId targetConversationId = new ConversationId(conversationId);
        List<Artifact> conversationArtifacts = artifactRepository.findByConversationId(targetConversationId);
        if (conversationArtifacts.isEmpty()) {
            throw new NoSuchElementException("No artifacts found for conversation: " + conversationId);
        }

        List<Artifact> selectedArtifacts = selectArtifacts(conversationArtifacts, artifactIds, includeRelated);
        if (selectedArtifacts.isEmpty()) {
            throw new NoSuchElementException("No matching artifacts found for bundle download.");
        }

        return new ArtifactBundle(buildZip(selectedArtifacts), buildFileName(conversationId), selectedArtifacts.size());
    }

    private List<Artifact> selectArtifacts(
            List<Artifact> conversationArtifacts,
            List<String> artifactIds,
            boolean includeRelated) {
        Map<String, Artifact> byId = conversationArtifacts.stream()
                .collect(Collectors.toMap(
                        artifact -> artifact.getId().value(),
                        artifact -> artifact,
                        (left, right) -> left,
                        LinkedHashMap::new));
        List<String> normalizedIds = artifactIds == null
                ? List.of()
                : artifactIds.stream()
                        .filter(id -> id != null && !id.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();

        if (normalizedIds.isEmpty()) {
            return conversationArtifacts;
        }

        LinkedHashMap<String, Artifact> selected = new LinkedHashMap<>();
        normalizedIds.forEach(id -> {
            Artifact artifact = byId.get(id);
            if (artifact != null) {
                selected.put(id, artifact);
            }
        });

        if (!includeRelated || selected.isEmpty()) {
            return new ArrayList<>(selected.values());
        }

        Set<String> selectedTaskRunIds = selected.values().stream()
                .map(artifact -> artifact.getTaskRunId() == null ? null : artifact.getTaskRunId().value())
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toSet());
        Set<String> selectedIds = selected.keySet();

        conversationArtifacts.stream()
                .filter(artifact -> isRelatedArtifact(artifact, selectedIds, selectedTaskRunIds))
                .forEach(artifact -> selected.putIfAbsent(artifact.getId().value(), artifact));

        return new ArrayList<>(selected.values());
    }

    private boolean isRelatedArtifact(
            Artifact artifact,
            Set<String> selectedIds,
            Set<String> selectedTaskRunIds) {
        String artifactId = artifact.getId().value();
        String parentArtifactId = artifact.getParentArtifactId();
        String taskRunId = artifact.getTaskRunId() == null ? null : artifact.getTaskRunId().value();

        return selectedIds.contains(artifactId)
                || (parentArtifactId != null && selectedIds.contains(parentArtifactId))
                || (taskRunId != null && selectedTaskRunIds.contains(taskRunId));
    }

    private byte[] buildZip(List<Artifact> artifacts) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            Map<String, Integer> fileNameCounts = new LinkedHashMap<>();
            for (Artifact artifact : artifacts) {
                String fileName = uniqueFileName(buildArtifactFileName(artifact), fileNameCounts);
                ZipEntry entry = new ZipEntry(fileName);
                zip.putNextEntry(entry);
                zip.write((artifact.getContent() == null ? "" : artifact.getContent()).getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
            zip.finish();
            return output.toByteArray();
        } catch (IOException error) {
            throw new IllegalStateException("Failed to build artifact bundle zip.", error);
        }
    }

    private String uniqueFileName(String fileName, Map<String, Integer> fileNameCounts) {
        int count = fileNameCounts.getOrDefault(fileName, 0);
        fileNameCounts.put(fileName, count + 1);
        if (count == 0) {
            return fileName;
        }

        int extensionIndex = fileName.lastIndexOf('.');
        if (extensionIndex < 0) {
            return fileName + "-" + (count + 1);
        }
        return fileName.substring(0, extensionIndex)
                + "-"
                + (count + 1)
                + fileName.substring(extensionIndex);
    }

    private String buildArtifactFileName(Artifact artifact) {
        String title = sanitizeFileName(artifact.getTitle());
        String extension = extensionFor(artifact.getLanguage(), artifact.getType().name());
        return title + "-v" + artifact.getVersion() + "-" + artifact.getId().value() + extension;
    }

    private String extensionFor(String language, String type) {
        String normalizedLanguage = language == null ? "" : language.toLowerCase(Locale.ROOT);
        if (normalizedLanguage.contains("typescript") || normalizedLanguage.equals("tsx")) {
            return ".tsx";
        }
        if (normalizedLanguage.contains("javascript") || normalizedLanguage.equals("jsx")) {
            return ".jsx";
        }
        if (normalizedLanguage.contains("markdown") || type.equals("MARKDOWN") || type.equals("REVIEW_REPORT")) {
            return ".md";
        }
        if (normalizedLanguage.contains("json") || type.equals("DATA_MODEL")) {
            return ".json";
        }
        if (normalizedLanguage.contains("yaml") || normalizedLanguage.contains("yml") || type.equals("API_CONTRACT")) {
            return ".yaml";
        }
        if (type.equals("WEB_PREVIEW")) {
            return ".html";
        }
        return ".txt";
    }

    private String sanitizeFileName(String value) {
        String sanitized = value == null || value.isBlank() ? "artifact" : value.trim();
        sanitized = sanitized.replaceAll("[\\\\/:*?\"<>|]+", "-").replaceAll("\\s+", "-");
        return sanitized.length() > 80 ? sanitized.substring(0, 80) : sanitized;
    }

    private String buildFileName(String conversationId) {
        return "agenthub-artifacts-" + sanitizeFileName(conversationId) + ".zip";
    }

    public record ArtifactBundle(byte[] content, String fileName, int artifactCount) {
    }
}
