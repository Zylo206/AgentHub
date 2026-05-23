package com.agenthub.domain.task;

import java.time.Instant;
import java.util.List;

public class ExecutionBatch {

    private final String batchKey;
    private final List<Integer> stepOrders;
    private final List<String> dependsOnBatchKeys;
    private final String executionMode;
    private final String batchStatus;
    private final Instant startedAt;
    private final Instant completedAt;
    private final Long durationMs;
    private final String failurePolicy;

    public ExecutionBatch(
            String batchKey,
            List<Integer> stepOrders,
            List<String> dependsOnBatchKeys,
            String executionMode) {
        this(
                batchKey,
                stepOrders,
                dependsOnBatchKeys,
                executionMode,
                "COMPLETED",
                null,
                null,
                null,
                "STEP_FALLBACK_TO_MOCK");
    }

    public ExecutionBatch(
            String batchKey,
            List<Integer> stepOrders,
            List<String> dependsOnBatchKeys,
            String executionMode,
            String batchStatus,
            Instant startedAt,
            Instant completedAt,
            Long durationMs,
            String failurePolicy) {
        this.batchKey = batchKey;
        this.stepOrders = List.copyOf(stepOrders);
        this.dependsOnBatchKeys = List.copyOf(dependsOnBatchKeys);
        this.executionMode = executionMode;
        this.batchStatus = batchStatus;
        this.startedAt = startedAt;
        this.completedAt = completedAt;
        this.durationMs = durationMs;
        this.failurePolicy = failurePolicy;
    }

    public String getBatchKey() {
        return batchKey;
    }

    public List<Integer> getStepOrders() {
        return stepOrders;
    }

    public List<String> getDependsOnBatchKeys() {
        return dependsOnBatchKeys;
    }

    public String getExecutionMode() {
        return executionMode;
    }

    public String getBatchStatus() {
        return batchStatus;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public String getFailurePolicy() {
        return failurePolicy;
    }
}
