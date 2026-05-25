package com.agenthub.application.realtime;

import java.time.Instant;
import java.util.Map;

public class RealtimeEvent {

    private final String eventId;
    private final String conversationId;
    private final RealtimeEventType eventType;
    private final String resourceType;
    private final String resourceId;
    private final Map<String, Object> payload;
    private final Instant createdAt;

    public RealtimeEvent(
            String eventId,
            String conversationId,
            RealtimeEventType eventType,
            String resourceType,
            String resourceId,
            Map<String, Object> payload,
            Instant createdAt) {
        this.eventId = eventId;
        this.conversationId = conversationId;
        this.eventType = eventType;
        this.resourceType = resourceType;
        this.resourceId = resourceId;
        this.payload = payload == null ? Map.of() : Map.copyOf(payload);
        this.createdAt = createdAt;
    }

    public String getEventId() {
        return eventId;
    }

    public String getConversationId() {
        return conversationId;
    }

    public RealtimeEventType getEventType() {
        return eventType;
    }

    public String getResourceType() {
        return resourceType;
    }

    public String getResourceId() {
        return resourceId;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
