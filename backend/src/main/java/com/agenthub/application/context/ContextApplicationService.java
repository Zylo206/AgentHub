package com.agenthub.application.context;

import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.conversation.ConversationId;
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
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ContextApplicationService(
            ContextRepository contextRepository,
            MessageRepository messageRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.contextRepository = contextRepository;
        this.messageRepository = messageRepository;
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
}
