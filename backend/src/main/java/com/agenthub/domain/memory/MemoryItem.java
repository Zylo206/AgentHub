package com.agenthub.domain.memory;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;

public class MemoryItem {

    private final String memoryId;
    private final ConversationId conversationId;
    private final String sourceType;
    private final String sourceId;
    private final String scope;
    private final String category;
    private final String content;
    private final int importance;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final Instant lastUsedAt;

    public MemoryItem(
            String memoryId,
            ConversationId conversationId,
            String sourceType,
            String sourceId,
            String scope,
            String category,
            String content,
            int importance,
            Instant createdAt,
            Instant updatedAt,
            Instant lastUsedAt) {
        this.memoryId = memoryId;
        this.conversationId = conversationId;
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.scope = scope;
        this.category = category;
        this.content = content;
        this.importance = importance;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.lastUsedAt = lastUsedAt;
    }

    public String getMemoryId() {
        return memoryId;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public String getSourceType() {
        return sourceType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String getScope() {
        return scope;
    }

    public String getCategory() {
        return category;
    }

    public String getContent() {
        return content;
    }

    public int getImportance() {
        return importance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getLastUsedAt() {
        return lastUsedAt;
    }
}
