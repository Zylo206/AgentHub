package com.agenthub.domain.task;

public record TaskStepId(String value) {

    public TaskStepId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("taskStepId must not be blank");
        }
    }
}
