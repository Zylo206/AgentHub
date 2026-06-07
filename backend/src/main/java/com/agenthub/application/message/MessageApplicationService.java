package com.agenthub.application.message;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageAttachment;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.message.MessageSenderType;
import com.agenthub.domain.message.MessageType;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class MessageApplicationService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final AgentApplicationService agentApplicationService;
    private final ConversationAccessService conversationAccessService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public MessageApplicationService(
            MessageRepository messageRepository,
            ConversationRepository conversationRepository,
            AgentApplicationService agentApplicationService,
            ConversationAccessService conversationAccessService,
            RealtimeEventPublisher realtimeEventPublisher,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
        this.agentApplicationService = agentApplicationService;
        this.conversationAccessService = conversationAccessService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public Message sendUserMessage(String conversationId, String content) {
        return sendUserMessage(conversationId, content, null);
    }

    public Message sendUserMessage(String conversationId, String content, String targetAgentId) {
        return sendUserMessage(conversationId, content, targetAgentId, List.of());
    }

    public Message sendUserMessage(
            String conversationId,
            String content,
            String targetAgentId,
            List<String> mentionedAgentIds) {
        return sendUserMessage(conversationId, content, targetAgentId, mentionedAgentIds, null, null);
    }

    public Message sendUserMessage(
            String conversationId,
            String content,
            String targetAgentId,
            List<String> mentionedAgentIds,
            String replyToMessageId,
            String quotedMessageId) {
        return sendUserMessage(
                conversationId,
                content,
                targetAgentId,
                mentionedAgentIds,
                replyToMessageId,
                quotedMessageId,
                List.of());
    }

    public Message sendUserMessage(
            String conversationId,
            String content,
            String targetAgentId,
            List<String> mentionedAgentIds,
            String replyToMessageId,
            String quotedMessageId,
            List<MessageAttachment> attachments) {
        conversationAccessService.requireWritable(conversationId);
        String normalizedTargetAgentId = normalizeTargetAgentId(targetAgentId);
        List<String> normalizedMentionedAgentIds = normalizeMentionedAgentIds(mentionedAgentIds);
        List<MessageAttachment> normalizedAttachments = normalizeAttachments(attachments);
        ConversationId conversationRef = new ConversationId(conversationId);
        String normalizedReplyToMessageId = normalizeMessageReferenceId(replyToMessageId);
        String normalizedQuotedMessageId = normalizeMessageReferenceId(quotedMessageId);
        String quotedMessageContent = resolveQuotedMessageContent(
                conversationRef,
                normalizedQuotedMessageId != null ? normalizedQuotedMessageId : normalizedReplyToMessageId);
        if (normalizedMentionedAgentIds.isEmpty() && normalizedTargetAgentId != null) {
            normalizedMentionedAgentIds = List.of(normalizedTargetAgentId);
        }
        if (normalizedTargetAgentId == null && normalizedMentionedAgentIds.size() == 1) {
            normalizedTargetAgentId = normalizedMentionedAgentIds.get(0);
        }
        if (normalizedTargetAgentId != null && !normalizedMentionedAgentIds.contains(normalizedTargetAgentId)) {
            normalizedMentionedAgentIds = new java.util.ArrayList<>(normalizedMentionedAgentIds);
            normalizedMentionedAgentIds.add(0, normalizedTargetAgentId);
            normalizedMentionedAgentIds = List.copyOf(normalizedMentionedAgentIds);
        }
        normalizedMentionedAgentIds.forEach(agentApplicationService::getAgent);

        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                conversationRef,
                MessageSenderType.USER,
                "user",
                normalizedTargetAgentId,
                normalizedMentionedAgentIds,
                normalizedReplyToMessageId,
                normalizedQuotedMessageId,
                quotedMessageContent,
                MessageType.TEXT,
                content,
                List.of(),
                normalizedAttachments,
                timeProvider.now());
        Message saved = messageRepository.save(message);
        touchConversationActivity(saved, false);
        publishMessageCreated(saved);
        return saved;
    }

    public List<Message> listMessages(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return messageRepository.findByConversationId(new ConversationId(conversationId));
    }

    public Message getMessage(String messageId) {
        return messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
    }

    public Message appendAgentMessage(String conversationId, String agentId, String content) {
        return appendAgentMessage(conversationId, agentId, content, List.of());
    }

    public Message appendAgentMessage(
            String conversationId,
            String agentId,
            String content,
            List<ArtifactId> artifactIds) {
        return appendAgentMessage(conversationId, agentId, MessageType.TEXT, content, artifactIds);
    }

    public Message appendAgentMessage(
            String conversationId,
            String agentId,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds) {
        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.AGENT,
                agentId,
                messageType == null ? MessageType.TEXT : messageType,
                content,
                artifactIds == null ? List.of() : artifactIds,
                timeProvider.now());
        Message saved = messageRepository.save(message);
        touchConversationActivity(saved, true);
        publishMessageCreated(saved);
        return saved;
    }

    public Message appendSystemMessage(
            String conversationId,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds) {
        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.SYSTEM,
                "system",
                messageType,
                content,
                artifactIds,
                timeProvider.now());
        Message saved = messageRepository.save(message);
        touchConversationActivity(saved, true);
        publishMessageCreated(saved);
        return saved;
    }

    public Message regenerateAgentReply(String conversationId, String messageId) {
        conversationAccessService.requireWritable(conversationId);
        ConversationId conversationRef = new ConversationId(conversationId);
        Message originalMessage = messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
        if (!originalMessage.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Message does not belong to conversation: " + messageId);
        }
        if (originalMessage.getSenderType() != MessageSenderType.AGENT) {
            throw new IllegalArgumentException("Only agent replies can be regenerated.");
        }

        String regeneratedContent = """
                Regenerated agent reply (static demo)

                Source message: %s
                This is a single-message regeneration demo. No real external Agent call was executed.

                %s
                """.formatted(messageId, originalMessage.getContent());

        Message regeneratedMessage = new Message(
                new MessageId(idGenerator.nextId("msg")),
                conversationRef,
                MessageSenderType.AGENT,
                originalMessage.getSenderId(),
                null,
                List.of(),
                messageId,
                messageId,
                originalMessage.getContent(),
                MessageType.TEXT,
                regeneratedContent,
                originalMessage.getArtifactIds(),
                timeProvider.now());
        Message saved = messageRepository.save(regeneratedMessage);
        touchConversationActivity(saved, true);
        publishMessageCreated(saved);
        return saved;
    }

    private void touchConversationActivity(Message message, boolean incrementUnread) {
        Conversation conversation = conversationRepository.findById(message.getConversationId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Conversation not found: " + message.getConversationId().value()));
        conversationRepository.save(conversation.touchMessageActivity(message.getCreatedAt(), incrementUnread));
    }

    private void publishMessageCreated(Message message) {
        realtimeEventPublisher.publish(
                message.getConversationId(),
                RealtimeEventType.MESSAGE_CREATED,
                "MESSAGE",
                message.getId().value(),
                java.util.Map.of(
                        "senderType", message.getSenderType().name(),
                        "messageType", message.getMessageType().name()));
    }

    private String normalizeTargetAgentId(String targetAgentId) {
        if (targetAgentId == null) {
            return null;
        }

        String normalized = targetAgentId.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private List<String> normalizeMentionedAgentIds(List<String> mentionedAgentIds) {
        if (mentionedAgentIds == null) {
            return List.of();
        }

        return mentionedAgentIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(agentId -> !agentId.isBlank())
                .distinct()
                .toList();
    }

    private List<MessageAttachment> normalizeAttachments(List<MessageAttachment> attachments) {
        if (attachments == null) {
            return List.of();
        }

        return attachments.stream()
                .filter(Objects::nonNull)
                .toList();
    }

    private String normalizeMessageReferenceId(String messageId) {
        if (messageId == null) {
            return null;
        }

        String normalized = messageId.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String resolveQuotedMessageContent(ConversationId conversationId, String messageId) {
        if (messageId == null) {
            return null;
        }

        Message referencedMessage = messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Referenced message not found: " + messageId));
        if (!referencedMessage.getConversationId().equals(conversationId)) {
            throw new IllegalArgumentException("Referenced message does not belong to conversation: " + messageId);
        }

        return referencedMessage.getContent();
    }
}
