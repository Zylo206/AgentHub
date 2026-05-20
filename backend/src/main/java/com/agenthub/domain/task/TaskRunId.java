package com.agenthub.domain.task;

public record TaskRunId(String value) {

    public TaskRunId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("taskRunId must not be blank");
        }
    }
}
