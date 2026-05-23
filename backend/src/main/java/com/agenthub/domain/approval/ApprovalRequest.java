package com.agenthub.domain.approval;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;

public class ApprovalRequest {

    private final String approvalId;
    private final ConversationId conversationId;
    private final String actionType;
    private final String targetType;
    private final String targetId;
    private final String riskLevel;
    private final String summary;
    private final List<String> affectedItems;
    private final ApprovalStatus status;
    private final Instant createdAt;
    private final Instant resolvedAt;
    private final Instant expiresAt;

    public ApprovalRequest(
            String approvalId,
            ConversationId conversationId,
            String actionType,
            String targetType,
            String targetId,
            String riskLevel,
            String summary,
            List<String> affectedItems,
            ApprovalStatus status,
            Instant createdAt,
            Instant resolvedAt,
            Instant expiresAt) {
        this.approvalId = approvalId;
        this.conversationId = conversationId;
        this.actionType = normalize(actionType);
        this.targetType = normalize(targetType);
        this.targetId = targetId;
        this.riskLevel = normalize(riskLevel);
        this.summary = summary;
        this.affectedItems = affectedItems == null ? List.of() : List.copyOf(affectedItems);
        this.status = status;
        this.createdAt = createdAt;
        this.resolvedAt = resolvedAt;
        this.expiresAt = expiresAt;
    }

    public ApprovalRequest withStatus(ApprovalStatus nextStatus, Instant resolvedAt) {
        return new ApprovalRequest(
                approvalId,
                conversationId,
                actionType,
                targetType,
                targetId,
                riskLevel,
                summary,
                affectedItems,
                nextStatus,
                createdAt,
                resolvedAt,
                expiresAt);
    }

    public boolean isExpired(Instant now) {
        return expiresAt != null && now != null && now.isAfter(expiresAt);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    public String getApprovalId() {
        return approvalId;
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

    public String getRiskLevel() {
        return riskLevel;
    }

    public String getSummary() {
        return summary;
    }

    public List<String> getAffectedItems() {
        return affectedItems;
    }

    public ApprovalStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
