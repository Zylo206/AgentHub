package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface ArtifactRepository {

    Artifact save(Artifact artifact);

    Optional<Artifact> findById(ArtifactId artifactId);

    List<Artifact> findByConversationId(ConversationId conversationId);

    List<Artifact> findByTaskRunId(TaskRunId taskRunId);

    default List<Artifact> findRecentByConversationId(ConversationId conversationId, int limit) {
        List<Artifact> artifacts = findByConversationId(conversationId);
        return artifacts.stream()
                .sorted(Comparator.comparing(Artifact::getCreatedAt))
                .skip(Math.max(0, artifacts.size() - Math.max(0, limit)))
                .toList();
    }

    default List<Artifact> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        return findByConversationId(conversationId).stream()
                .filter(artifact -> containsAny(artifact.getTitle() + " " + artifact.getContent(), normalizedKeywords))
                .sorted(Comparator.comparing(Artifact::getCreatedAt).reversed())
                .limit(Math.max(0, limit))
                .sorted(Comparator.comparing(Artifact::getCreatedAt))
                .toList();
    }

    private static List<String> normalizeKeywords(List<String> keywords) {
        if (keywords == null) {
            return List.of();
        }
        return keywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private static boolean containsAny(String content, List<String> keywords) {
        if (content == null || content.isBlank()) {
            return false;
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        return keywords.stream().anyMatch(normalizedContent::contains);
    }
}
