package com.agenthub.domain.memory;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface MemoryRepository {

    MemoryItem save(MemoryItem memoryItem);

    Optional<MemoryItem> findById(String memoryId);

    Optional<MemoryItem> findBySource(ConversationId conversationId, String sourceType, String sourceId);

    List<MemoryItem> findByConversationId(ConversationId conversationId);

    List<MemoryItem> findRelevantForConversation(ConversationId conversationId, int limit);

    default List<MemoryItem> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        return findRelevantForConversation(conversationId, Math.max(20, limit)).stream()
                .filter(memoryItem -> containsAny(memoryItem.getContent(), normalizedKeywords))
                .limit(Math.max(0, limit))
                .toList();
    }

    Optional<MemoryItem> markUsed(String memoryId, Instant usedAt);

    void deleteById(String memoryId);

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
