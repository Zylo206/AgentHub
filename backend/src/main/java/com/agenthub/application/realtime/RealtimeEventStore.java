package com.agenthub.application.realtime;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RealtimeEventStore {

    private final ConcurrentMap<String, ConcurrentLinkedDeque<RealtimeEvent>> eventsByConversation = new ConcurrentHashMap<>();
    private final int retentionPerConversation;

    public RealtimeEventStore(
            @Value("${agenthub.realtime.event-retention-per-conversation:200}") int retentionPerConversation) {
        this.retentionPerConversation = Math.max(20, retentionPerConversation);
    }

    public RealtimeEvent append(RealtimeEvent event) {
        ConcurrentLinkedDeque<RealtimeEvent> events = eventsByConversation.computeIfAbsent(
                event.getConversationId(),
                ignored -> new ConcurrentLinkedDeque<>());
        events.addLast(event);
        while (events.size() > retentionPerConversation) {
            events.pollFirst();
        }
        return event;
    }

    public List<RealtimeEvent> findAfter(String conversationId, String lastEventId) {
        List<RealtimeEvent> events = new ArrayList<>(eventsByConversation.getOrDefault(
                conversationId,
                new ConcurrentLinkedDeque<>()));
        if (lastEventId == null || lastEventId.isBlank()) {
            return events;
        }

        for (int index = 0; index < events.size(); index += 1) {
            if (events.get(index).getEventId().equals(lastEventId)) {
                return events.subList(index + 1, events.size());
            }
        }
        return events;
    }
}
