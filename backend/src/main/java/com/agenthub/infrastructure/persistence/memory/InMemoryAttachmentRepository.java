package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryAttachmentRepository implements AttachmentRepository {

    private final ConcurrentMap<String, AttachmentRecord> attachments = new ConcurrentHashMap<>();

    @Override
    public AttachmentRecord save(AttachmentRecord attachmentRecord) {
        attachments.put(attachmentRecord.getAttachmentId(), attachmentRecord);
        return attachmentRecord;
    }

    @Override
    public Optional<AttachmentRecord> findById(String attachmentId) {
        return Optional.ofNullable(attachments.get(attachmentId));
    }

    @Override
    public List<AttachmentRecord> findByConversationId(ConversationId conversationId) {
        return attachments.values().stream()
                .filter(attachment -> attachment.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(AttachmentRecord::getCreatedAt))
                .toList();
    }

    @Override
    public List<AttachmentRecord> findByMessageId(String messageId) {
        return attachments.values().stream()
                .filter(attachment -> messageId != null && messageId.equals(attachment.getMessageId()))
                .sorted(Comparator.comparing(AttachmentRecord::getCreatedAt))
                .toList();
    }
}
