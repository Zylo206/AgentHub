package com.agenthub.application.attachment;

import com.agenthub.domain.attachment.AttachmentRecord;
import org.springframework.stereotype.Service;

@Service
public class AttachmentAccessGuard {

    public void assertReadable(AttachmentRecord attachmentRecord) {
        if (attachmentRecord == null) {
            throw new IllegalArgumentException("Attachment is required.");
        }
        if (attachmentRecord.getDeletedAt() != null) {
            throw new IllegalStateException("Attachment has been deleted.");
        }
        if ("INFECTED".equalsIgnoreCase(attachmentRecord.getScanStatus())) {
            throw new IllegalStateException("Attachment failed scan and cannot be downloaded.");
        }
    }

    public void assertConversationAccess(AttachmentRecord attachmentRecord, String conversationId) {
        assertReadable(attachmentRecord);
        if (conversationId == null || conversationId.isBlank()) {
            return;
        }
        if (!attachmentRecord.getConversationId().value().equals(conversationId)) {
            throw new IllegalArgumentException("Attachment does not belong to this conversation.");
        }
    }
}
