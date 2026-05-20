package com.agenthub.domain.message;

public record MessageId(String value) {

    public MessageId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("messageId must not be blank");
        }
    }
}
