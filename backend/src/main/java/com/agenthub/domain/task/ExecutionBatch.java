package com.agenthub.domain.task;

import java.util.List;

public class ExecutionBatch {

    private final String batchKey;
    private final List<Integer> stepOrders;
    private final List<String> dependsOnBatchKeys;
    private final String executionMode;

    public ExecutionBatch(
            String batchKey,
            List<Integer> stepOrders,
            List<String> dependsOnBatchKeys,
            String executionMode) {
        this.batchKey = batchKey;
        this.stepOrders = List.copyOf(stepOrders);
        this.dependsOnBatchKeys = List.copyOf(dependsOnBatchKeys);
        this.executionMode = executionMode;
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
}
