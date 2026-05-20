package com.agenthub.domain.conversation;

public record ConversationId(String value) {

    public ConversationId {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("conversationId must not be blank");
        }
    }
}
