package com.agenthub.application.context;

import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ContextApplicationService {

    private final ContextRepository contextRepository;
    private final MessageRepository messageRepository;
    private final AttachmentRepository attachmentRepository;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ContextApplicationService(
            ContextRepository contextRepository,
            MessageRepository messageRepository,
            AttachmentRepository attachmentRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.contextRepository = contextRepository;
        this.messageRepository = messageRepository;
        this.attachmentRepository = attachmentRepository;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public ContextSnapshot getContextSnapshot(String contextSnapshotId) {
        return contextRepository.findContextSnapshotById(new ContextSnapshotId(contextSnapshotId))
                .orElseThrow(() -> new NoSuchElementException("ContextSnapshot not found: " + contextSnapshotId));
    }

    public List<ContextSnapshot> listContextSnapshotsByConversation(String conversationId) {
        return contextRepository.findContextSnapshotsByConversationId(new ConversationId(conversationId));
    }

    public List<ContextSnapshot> listContextSnapshotsByTaskRun(String taskRunId) {
        return contextRepository.findContextSnapshotsByTaskRunId(new TaskRunId(taskRunId));
    }

    public List<PinnedContext> listPinnedContextsByConversation(String conversationId) {
        return contextRepository.findPinnedContextsByConversationId(new ConversationId(conversationId));
    }

    public PinnedContext pinMessage(String conversationId, String messageId) {
        ConversationId conversationRef = new ConversationId(conversationId);
        Message message = messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
        if (!message.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Message does not belong to the provided conversation.");
        }

        return contextRepository.findPinnedContextBySource(conversationRef, "MESSAGE", messageId)
                .orElseGet(() -> contextRepository.savePinnedContext(new PinnedContext(
                        idGenerator.nextId("pin"),
                        conversationRef,
                        buildPinnedMessageContent(message),
                        "MESSAGE",
                        messageId,
                        timeProvider.now())));
    }

    public PinnedContext pinAttachment(String conversationId, String attachmentId) {
        ConversationId conversationRef = new ConversationId(conversationId);
        AttachmentRecord attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new NoSuchElementException("Attachment not found: " + attachmentId));
        if (!attachment.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Attachment does not belong to the provided conversation.");
        }

        return contextRepository.findPinnedContextBySource(conversationRef, "ATTACHMENT", attachmentId)
                .orElseGet(() -> contextRepository.savePinnedContext(new PinnedContext(
                        idGenerator.nextId("pin"),
                        conversationRef,
                        buildPinnedAttachmentContent(attachment),
                        "ATTACHMENT",
                        attachmentId,
                        timeProvider.now())));
    }

    public PinnedContext unpinContext(String pinnedContextId) {
        PinnedContext pinnedContext = contextRepository.findPinnedContextById(pinnedContextId)
                .orElseThrow(() -> new NoSuchElementException("PinnedContext not found: " + pinnedContextId));
        contextRepository.deletePinnedContext(pinnedContextId);
        return pinnedContext;
    }

    public List<HandoffSummary> listHandoffSummariesByTaskRun(String taskRunId) {
        return contextRepository.findHandoffSummariesByTaskRunId(new TaskRunId(taskRunId));
    }

    private String buildPinnedMessageContent(Message message) {
        return "Pinned message from " + message.getSenderType()
                + " (" + message.getSenderId() + "): "
                + message.getContent();
    }

    private String buildPinnedAttachmentContent(AttachmentRecord attachment) {
        return "Pinned attachment: " + attachment.getFileName()
                + " (" + attachment.getContentType() + ", " + attachment.getSizeBytes() + " bytes)\n"
                + (attachment.getContentPreview() == null ? "" : attachment.getContentPreview());
    }
}
