package com.agenthub.domain.context;

public record ContextSnapshotId(String value) {

    public ContextSnapshotId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("contextSnapshotId must not be blank");
        }
    }
}
