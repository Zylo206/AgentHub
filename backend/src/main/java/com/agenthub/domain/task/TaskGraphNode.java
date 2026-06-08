package com.agenthub.domain.task;

import java.time.Instant;
import java.util.List;

public class TaskGraphNode {

    private final String nodeId;
    private final String nodeType;
    private final int stepOrder;
    private final List<String> dependsOnNodeIds;
    private final String retryPolicy;
    private final Integer timeoutSeconds;
    private final String idempotencyKey;
    private final String fallbackStrategy;
    private final String status;
    private final String terminalStatus;
    private final Integer retryAttempt;
    private final String executionToken;
    private final Integer leaseVersion;
    private final Instant startedAt;
    private final Instant completedAt;
    private final String failureType;
    private final String discardedReason;
    private final String finalDecision;

    public TaskGraphNode(
            String nodeId,
            String nodeType,
            int stepOrder,
            List<String> dependsOnNodeIds,
            String retryPolicy,
            Integer timeoutSeconds,
            String idempotencyKey,
            String fallbackStrategy,
            String status,
            String terminalStatus,
            Integer retryAttempt,
            String executionToken,
            Integer leaseVersion,
            Instant startedAt,
            Instant completedAt,
            String failureType,
            String discardedReason,
            String finalDecision) {
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        this.stepOrder = stepOrder;
        this.dependsOnNodeIds = dependsOnNodeIds == null ? List.of() : List.copyOf(dependsOnNodeIds);
        this.retryPolicy = retryPolicy;
        this.timeoutSeconds = timeoutSeconds;
        this.idempotencyKey = idempotencyKey;
        this.fallbackStrategy = fallbackStrategy;
        this.status = status;
        this.terminalStatus = terminalStatus;
        this.retryAttempt = retryAttempt;
        this.executionToken = executionToken;
        this.leaseVersion = leaseVersion;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.failureType = failureType;
        this.discardedReason = discardedReason;
        this.finalDecision = finalDecision;
    }

    public String getNodeId() {
        return nodeId;
    }

    public String getNodeType() {
        return nodeType;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public List<String> getDependsOnNodeIds() {
        return dependsOnNodeIds;
    }

    public String getRetryPolicy() {
        return retryPolicy;
    }

    public Integer getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getFallbackStrategy() {
        return fallbackStrategy;
    }

    public String getStatus() {
        return status;
    }

    public String getTerminalStatus() {
        return terminalStatus;
    }

    public Integer getRetryAttempt() {
        return retryAttempt;
    }

    public String getExecutionToken() {
        return executionToken;
    }

    public Integer getLeaseVersion() {
        return leaseVersion;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public String getFailureType() {
        return failureType;
    }

    public String getDiscardedReason() {
        return discardedReason;
    }

    public String getFinalDecision() {
        return finalDecision;
    }
}
