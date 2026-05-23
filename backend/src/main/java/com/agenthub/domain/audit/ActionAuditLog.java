package com.agenthub.domain.audit;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;

public class ActionAuditLog {

    private final String auditId;
    private final ConversationId conversationId;
    private final String actionType;
    private final String targetType;
    private final String targetId;
    private final String status;
    private final String summary;
    private final Instant createdAt;

    public ActionAuditLog(
            String auditId,
            ConversationId conversationId,
            String actionType,
            String targetType,
            String targetId,
            String status,
            String summary,
            Instant createdAt) {
        this.auditId = auditId;
        this.conversationId = conversationId;
        this.actionType = actionType;
        this.targetType = targetType;
        this.targetId = targetId;
        this.status = status;
        this.summary = summary;
        this.createdAt = createdAt;
    }

    public String getAuditId() {
        return auditId;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public String getActionType() {
        return actionType;
    }

    public String getTargetType() {
        return targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public String getStatus() {
        return status;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
