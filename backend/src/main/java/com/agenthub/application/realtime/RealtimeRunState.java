package com.agenthub.application.realtime;

import java.time.Instant;
import java.util.List;

public class RealtimeRunState {

    private final String taskRunId;
    private final String conversationId;
    private final String sourceMessageId;
    private final String status;
    private final String lastEventId;
    private final String summary;
    private final List<String> resourceRefs;
    private final Instant createdAt;
    private final Instant updatedAt;
    private final String errorMessage;

    public RealtimeRunState(
            String taskRunId,
            String conversationId,
            String sourceMessageId,
            String status,
            String lastEventId,
            String summary,
            List<String> resourceRefs,
            Instant createdAt,
            Instant updatedAt,
            String errorMessage) {
        this.taskRunId = taskRunId;
        this.conversationId = conversationId;
        this.sourceMessageId = sourceMessageId;
        this.status = status;
        this.lastEventId = lastEventId;
        this.summary = summary;
        this.resourceRefs = resourceRefs == null ? List.of() : List.copyOf(resourceRefs);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.errorMessage = errorMessage;
    }

    public String getTaskRunId() {
        return taskRunId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public String getSourceMessageId() {
        return sourceMessageId;
    }

    public String getStatus() {
        return status;
    }

    public String getLastEventId() {
        return lastEventId;
    }

    public String getSummary() {
        return summary;
    }

    public List<String> getResourceRefs() {
        return resourceRefs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }
}
