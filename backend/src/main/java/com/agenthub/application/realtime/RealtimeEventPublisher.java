package com.agenthub.application.realtime;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.conversation.ConversationId;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RealtimeEventPublisher {

    private final RealtimeEventStore realtimeEventStore;
    private final SseConnectionRegistry sseConnectionRegistry;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final boolean enabled;

    public RealtimeEventPublisher(
            RealtimeEventStore realtimeEventStore,
            SseConnectionRegistry sseConnectionRegistry,
            IdGenerator idGenerator,
            TimeProvider timeProvider,
            @Value("${agenthub.realtime.enabled:true}") boolean enabled) {
        this.realtimeEventStore = realtimeEventStore;
        this.sseConnectionRegistry = sseConnectionRegistry;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
        this.enabled = enabled;
    }

    public RealtimeEvent publish(
            ConversationId conversationId,
            RealtimeEventType eventType,
            String resourceType,
            String resourceId) {
        return publish(conversationId.value(), eventType, resourceType, resourceId, Map.of());
    }

    public RealtimeEvent publish(
            String conversationId,
            RealtimeEventType eventType,
            String resourceType,
            String resourceId) {
        return publish(conversationId, eventType, resourceType, resourceId, Map.of());
    }

    public RealtimeEvent publish(
            ConversationId conversationId,
            RealtimeEventType eventType,
            String resourceType,
            String resourceId,
            Map<String, Object> payload) {
        return publish(conversationId.value(), eventType, resourceType, resourceId, payload);
    }

    public RealtimeEvent publish(
            String conversationId,
            RealtimeEventType eventType,
            String resourceType,
            String resourceId,
            Map<String, Object> payload) {
        RealtimeEvent event = realtimeEventStore.append(new RealtimeEvent(
                idGenerator.nextId("evt"),
                conversationId,
                eventType,
                resourceType,
                resourceId,
                payload,
                timeProvider.now()));
        if (enabled) {
            sseConnectionRegistry.broadcast(event);
        }
        return event;
    }
}
