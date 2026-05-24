package com.agenthub.domain.attachment;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface AttachmentRepository {

    AttachmentRecord save(AttachmentRecord attachmentRecord);

    Optional<AttachmentRecord> findById(String attachmentId);

    List<AttachmentRecord> findByConversationId(ConversationId conversationId);

    List<AttachmentRecord> findByMessageId(String messageId);
}
