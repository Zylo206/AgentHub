package com.agenthub.domain.context;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;

public class PinnedContext {

    private final String id;
    private final ConversationId conversationId;
    private final String content;
    private final String sourceType;
    private final String sourceId;
    private final Instant createdAt;

    public PinnedContext(
            String id,
            ConversationId conversationId,
            String content,
            String sourceType,
            String sourceId,
            Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.content = content;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public String getContent() {
        return content;
    }

    public String getSourceType() {
        return sourceType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
