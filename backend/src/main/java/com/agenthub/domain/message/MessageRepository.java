package com.agenthub.domain.message;

import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface MessageRepository {

    Message save(Message message);

    Optional<Message> findById(MessageId messageId);

    List<Message> findByConversationId(ConversationId conversationId);

    default List<Message> findRecentByConversationId(ConversationId conversationId, int limit) {
        List<Message> messages = findByConversationId(conversationId);
        return messages.stream()
                .sorted(Comparator.comparing(Message::getCreatedAt))
                .skip(Math.max(0, messages.size() - Math.max(0, limit)))
                .toList();
    }

    default List<Message> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        return findByConversationId(conversationId).stream()
                .filter(message -> containsAny(message.getContent(), normalizedKeywords))
                .sorted(Comparator.comparing(Message::getCreatedAt).reversed())
                .limit(Math.max(0, limit))
                .sorted(Comparator.comparing(Message::getCreatedAt))
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
