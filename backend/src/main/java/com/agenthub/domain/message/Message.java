package com.agenthub.domain.message;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;

public class Message {

    private final MessageId id;
    private final ConversationId conversationId;
    private final MessageSenderType senderType;
    private final String senderId;
    private final String targetAgentId;
    private final List<String> mentionedAgentIds;
    private final String replyToMessageId;
    private final String quotedMessageId;
    private final String quotedMessageContent;
    private final MessageType messageType;
    private final String content;
    private final List<ArtifactId> artifactIds;
    private final Instant createdAt;

    public Message(
            MessageId id,
            ConversationId conversationId,
            MessageSenderType senderType,
            String senderId,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds,
            Instant createdAt) {
        this(
                id,
                conversationId,
                senderType,
                senderId,
                null,
                List.of(),
                null,
                null,
                null,
                messageType,
                content,
                artifactIds,
                createdAt);
    }

    public Message(
            MessageId id,
            ConversationId conversationId,
            MessageSenderType senderType,
            String senderId,
            String targetAgentId,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds,
            Instant createdAt) {
        this(
                id,
                conversationId,
                senderType,
                senderId,
                targetAgentId,
                targetAgentId == null || targetAgentId.isBlank() ? List.of() : List.of(targetAgentId),
                null,
                null,
                null,
                messageType,
                content,
                artifactIds,
                createdAt);
    }

    public Message(
            MessageId id,
            ConversationId conversationId,
            MessageSenderType senderType,
            String senderId,
            String targetAgentId,
            List<String> mentionedAgentIds,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds,
            Instant createdAt) {
        this(
                id,
                conversationId,
                senderType,
                senderId,
                targetAgentId,
                mentionedAgentIds,
                null,
                null,
                null,
                messageType,
                content,
                artifactIds,
                createdAt);
    }

    public Message(
            MessageId id,
            ConversationId conversationId,
            MessageSenderType senderType,
            String senderId,
            String targetAgentId,
            List<String> mentionedAgentIds,
            String replyToMessageId,
            String quotedMessageId,
            String quotedMessageContent,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds,
            Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.senderType = senderType;
        this.senderId = senderId;
        this.targetAgentId = targetAgentId;
        this.mentionedAgentIds = mentionedAgentIds == null ? List.of() : List.copyOf(mentionedAgentIds);
        this.replyToMessageId = replyToMessageId;
        this.quotedMessageId = quotedMessageId;
        this.quotedMessageContent = quotedMessageContent;
        this.messageType = messageType;
        this.content = content;
        this.artifactIds = List.copyOf(artifactIds);
        this.createdAt = createdAt;
    }

    public MessageId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public MessageSenderType getSenderType() {
        return senderType;
    }

    public String getSenderId() {
        return senderId;
    }

    public String getTargetAgentId() {
        return targetAgentId;
    }

    public List<String> getMentionedAgentIds() {
        return mentionedAgentIds;
    }

    public String getReplyToMessageId() {
        return replyToMessageId;
    }

    public String getQuotedMessageId() {
        return quotedMessageId;
    }

    public String getQuotedMessageContent() {
        return quotedMessageContent;
    }

    public MessageType getMessageType() {
        return messageType;
    }

    public String getContent() {
        return content;
    }

    public List<ArtifactId> getArtifactIds() {
        return artifactIds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
