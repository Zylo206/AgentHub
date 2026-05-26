package com.agenthub.domain.attachment;

import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

public interface AttachmentRepository {

    AttachmentRecord save(AttachmentRecord attachmentRecord);

    Optional<AttachmentRecord> findById(String attachmentId);

    List<AttachmentRecord> findByConversationId(ConversationId conversationId);

    List<AttachmentRecord> findByMessageId(String messageId);

    default List<AttachmentRecord> findRecentByConversationId(ConversationId conversationId, int limit) {
        List<AttachmentRecord> attachments = findByConversationId(conversationId).stream()
                .filter(attachment -> attachment.getDeletedAt() == null)
                .sorted(Comparator.comparing(AttachmentRecord::getCreatedAt))
                .toList();
        return attachments.stream()
                .skip(Math.max(0, attachments.size() - Math.max(0, limit)))
                .toList();
    }

    default List<AttachmentRecord> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        return findByConversationId(conversationId).stream()
                .filter(attachment -> attachment.getDeletedAt() == null)
                .filter(attachment -> containsAny(attachment.getFileName() + " " + attachment.getContentPreview(), normalizedKeywords))
                .sorted(Comparator.comparing(AttachmentRecord::getCreatedAt).reversed())
                .limit(Math.max(0, limit))
                .sorted(Comparator.comparing(AttachmentRecord::getCreatedAt))
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
