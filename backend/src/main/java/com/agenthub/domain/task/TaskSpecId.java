package com.agenthub.domain.task;

public record TaskSpecId(String value) {

    public TaskSpecId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("taskSpecId must not be blank");
        }
    }
}
