package com.agenthub.application.realtime;

import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class PresenceService {

    private final ConcurrentHashMap<String, ConcurrentHashMap<String, PresenceRecord>> presenceByConversation =
            new ConcurrentHashMap<>();
    private final AuthSessionService authSessionService;
    private final ConversationAccessService conversationAccessService;
    private final RealtimeEventPublisher realtimeEventPublisher;

    public PresenceService(
            AuthSessionService authSessionService,
            ConversationAccessService conversationAccessService,
            RealtimeEventPublisher realtimeEventPublisher) {
        this.authSessionService = authSessionService;
        this.conversationAccessService = conversationAccessService;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    public PresenceRecord heartbeat(
            String conversationId,
            String deviceId,
            String status,
            String activeArtifactId,
            String lastSeenEventId) {
        conversationAccessService.requireReadable(conversationId);
        AuthPrincipal principal = authSessionService.current();
        String normalizedDeviceId = deviceId == null || deviceId.isBlank() ? "browser" : deviceId.trim();
        PresenceRecord record = new PresenceRecord(
                conversationId,
                principal.userId(),
                principal.displayName(),
                normalizedDeviceId,
                status == null || status.isBlank() ? "ACTIVE" : status.trim().toUpperCase(),
                activeArtifactId,
                lastSeenEventId,
                Instant.now());
        presenceByConversation
                .computeIfAbsent(conversationId, ignored -> new ConcurrentHashMap<>())
                .put(principal.userId() + ":" + normalizedDeviceId, record);
        realtimeEventPublisher.publish(
                new ConversationId(conversationId),
                RealtimeEventType.PRESENCE_UPDATED,
                "PRESENCE",
                principal.userId(),
                Map.of(
                        "userId", principal.userId(),
                        "displayName", principal.displayName(),
                        "deviceId", normalizedDeviceId,
                        "status", record.status()));
        return record;
    }

    public List<PresenceRecord> list(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return presenceByConversation.getOrDefault(conversationId, new ConcurrentHashMap<>()).values().stream()
                .sorted(Comparator.comparing(PresenceRecord::updatedAt).reversed())
                .toList();
    }

    public record PresenceRecord(
            String conversationId,
            String userId,
            String displayName,
            String deviceId,
            String status,
            String activeArtifactId,
            String lastSeenEventId,
            Instant updatedAt) {
    }
}
