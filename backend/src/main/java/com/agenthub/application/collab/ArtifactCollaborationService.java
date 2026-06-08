package com.agenthub.application.collab;

import com.agenthub.application.artifact.ArtifactApplicationService;
import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.conversation.ConversationId;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ArtifactCollaborationService {

    private static final String PROTOCOL = "AGENTHUB_ARTIFACT_COLLAB_V1";
    private static final int MAX_RETAINED_OPERATIONS = 200;

    private final ArtifactApplicationService artifactApplicationService;
    private final ConversationAccessService conversationAccessService;
    private final ActionAuditService actionAuditService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final ObjectMapper objectMapper;
    private final Path storageDir;
    private final int maxDocumentChars;

    private final Map<String, RoomState> rooms = new LinkedHashMap<>();

    public ArtifactCollaborationService(
            ArtifactApplicationService artifactApplicationService,
            ConversationAccessService conversationAccessService,
            ActionAuditService actionAuditService,
            RealtimeEventPublisher realtimeEventPublisher,
            IdGenerator idGenerator,
            TimeProvider timeProvider,
            ObjectMapper objectMapper,
            @Value("${agenthub.collaboration.storage-dir:${user.home}/.agenthub/agenthub/collab}") String storageDir,
            @Value("${agenthub.collaboration.max-document-chars:200000}") int maxDocumentChars) {
        this.artifactApplicationService = artifactApplicationService;
        this.conversationAccessService = conversationAccessService;
        this.actionAuditService = actionAuditService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
        this.objectMapper = objectMapper;
        this.storageDir = Path.of(storageDir);
        this.maxDocumentChars = maxDocumentChars;
    }

    public synchronized CollabRoomView openRoom(String artifactId) {
        Artifact artifact = loadEditableArtifact(artifactId, false);
        RoomState room = rooms.computeIfAbsent(artifactId, ignored -> loadOrCreateRoom(artifact));
        refreshArtifactMetadata(room, artifact);
        pruneStaleParticipants(room);
        persist(room);
        return toView(room);
    }

    public synchronized CollabRoomView updateDocument(
            String artifactId,
            Integer baseVersion,
            String content,
            String deviceId,
            AuthPrincipal principal,
            String summary) {
        Artifact artifact = loadEditableArtifact(artifactId, true);
        RoomState room = rooms.computeIfAbsent(artifactId, ignored -> loadOrCreateRoom(artifact));
        refreshArtifactMetadata(room, artifact);
        if (content == null) {
            throw new IllegalArgumentException("content is required.");
        }
        if (content.length() > maxDocumentChars) {
            throw new IllegalArgumentException("Collaborative document exceeds max length " + maxDocumentChars + ".");
        }
        if (baseVersion != null && baseVersion != room.version) {
            throw new IllegalStateException("Collaboration conflict: expected room version "
                    + baseVersion + " but current version is " + room.version + ".");
        }

        Instant now = timeProvider.now();
        upsertParticipant(room, principal, deviceId, "editing", now, null, null, true);
        room.version += 1;
        room.content = content;
        room.contentHash = artifactApplicationService.contentHash(content);
        room.updatedAt = now;
        room.operations.add(new CollabOperationView(
                idGenerator.nextId("op"),
                "REPLACE_DOCUMENT",
                principal.userId(),
                principal.displayName(),
                normalizeDeviceId(deviceId),
                room.version,
                summary == null || summary.isBlank() ? "Collaborative document update." : summary.trim(),
                room.contentHash,
                now.toString()));
        compactOperations(room);
        persist(room);
        publishRoomEvent(room, "DOCUMENT_UPDATED");
        return toView(room);
    }

    public synchronized CollabRoomView updatePresence(
            String artifactId,
            String deviceId,
            AuthPrincipal principal,
            String status,
            Integer cursorStart,
            Integer cursorEnd,
            boolean editing) {
        Artifact artifact = loadEditableArtifact(artifactId, false);
        RoomState room = rooms.computeIfAbsent(artifactId, ignored -> loadOrCreateRoom(artifact));
        refreshArtifactMetadata(room, artifact);
        upsertParticipant(
                room,
                principal,
                deviceId,
                status == null || status.isBlank() ? "online" : status,
                timeProvider.now(),
                cursorStart,
                cursorEnd,
                editing);
        persist(room);
        publishRoomEvent(room, "PRESENCE_UPDATED");
        return toView(room);
    }

    public synchronized CollabRoomView leave(String artifactId, String deviceId, AuthPrincipal principal) {
        RoomState room = rooms.get(artifactId);
        if (room == null) {
            return openRoom(artifactId);
        }
        String key = participantKey(principal.userId(), deviceId);
        CollabParticipantView participant = room.participants.remove(key);
        if (participant != null) {
            persist(room);
            publishRoomEvent(room, "PRESENCE_UPDATED");
        }
        return toView(room);
    }

    public synchronized Artifact publishDraft(String artifactId, String approvalId, String summary) {
        Artifact artifact = loadEditableArtifact(artifactId, true);
        RoomState room = rooms.computeIfAbsent(artifactId, ignored -> loadOrCreateRoom(artifact));
        refreshArtifactMetadata(room, artifact);
        Artifact revision = artifactApplicationService.createCollaborationRevision(
                artifactId,
                room.content,
                room.version,
                summary == null || summary.isBlank() ? "Publish collaborative draft." : summary.trim());
        actionAuditService.record(
                new ConversationId(room.conversationId),
                "PUBLISH_COLLAB_DRAFT",
                "ARTIFACT",
                artifactId,
                "COMPLETED",
                "Published collaborative draft room " + room.roomId
                        + " as revision " + revision.getId().value()
                        + " after approval " + approvalId + ".");
        publishRoomEvent(room, "DRAFT_PUBLISHED");
        return revision;
    }

    private Artifact loadEditableArtifact(String artifactId, boolean writable) {
        Artifact artifact = artifactApplicationService.getArtifact(artifactId);
        if (writable) {
            conversationAccessService.requireWritable(artifact.getConversationId().value());
        } else {
            conversationAccessService.requireReadable(artifact.getConversationId().value());
        }
        if (!isCollaborativeType(artifact.getType())) {
            throw new IllegalArgumentException("Artifact collaboration only supports CODE and MARKDOWN.");
        }
        return artifact;
    }

    private boolean isCollaborativeType(ArtifactType type) {
        return type == ArtifactType.CODE || type == ArtifactType.MARKDOWN;
    }

    private RoomState loadOrCreateRoom(Artifact artifact) {
        RoomState persisted = readPersistedRoom(artifact.getId().value());
        if (persisted != null) {
            return persisted;
        }
        Instant now = timeProvider.now();
        RoomState room = new RoomState();
        room.roomId = "artifact:" + artifact.getId().value();
        room.artifactId = artifact.getId().value();
        room.conversationId = artifact.getConversationId().value();
        room.title = artifact.getTitle();
        room.artifactType = artifact.getType().name();
        room.language = artifact.getLanguage();
        room.baseArtifactVersion = artifact.getVersion();
        room.baseArtifactHash = artifactApplicationService.contentHash(artifact.getContent());
        room.content = artifact.getContent() == null ? "" : artifact.getContent();
        room.contentHash = artifactApplicationService.contentHash(room.content);
        room.version = 1;
        room.protocol = PROTOCOL;
        room.createdAt = now;
        room.updatedAt = now;
        return room;
    }

    private void refreshArtifactMetadata(RoomState room, Artifact artifact) {
        room.conversationId = artifact.getConversationId().value();
        room.title = artifact.getTitle();
        room.artifactType = artifact.getType().name();
        room.language = artifact.getLanguage();
        room.currentArtifactVersion = artifact.getVersion();
        room.currentArtifactHash = artifactApplicationService.contentHash(artifact.getContent());
    }

    private RoomState readPersistedRoom(String artifactId) {
        Path file = roomPath(artifactId);
        if (!Files.exists(file)) {
            return null;
        }
        try {
            RoomState room = objectMapper.readValue(file.toFile(), RoomState.class);
            if (room.participants == null) {
                room.participants = new LinkedHashMap<>();
            }
            if (room.operations == null) {
                room.operations = new ArrayList<>();
            }
            if (room.protocol == null || room.protocol.isBlank()) {
                room.protocol = PROTOCOL;
            }
            return room;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to restore collaboration room: " + artifactId, exception);
        }
    }

    private void persist(RoomState room) {
        try {
            Files.createDirectories(storageDir);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(roomPath(room.artifactId).toFile(), room);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to persist collaboration room: " + room.artifactId, exception);
        }
    }

    private Path roomPath(String artifactId) {
        String encoded = URLEncoder.encode(artifactId, StandardCharsets.UTF_8);
        return storageDir.resolve(encoded + ".json");
    }

    private void upsertParticipant(
            RoomState room,
            AuthPrincipal principal,
            String deviceId,
            String status,
            Instant now,
            Integer cursorStart,
            Integer cursorEnd,
            boolean editing) {
        String normalizedDeviceId = normalizeDeviceId(deviceId);
        room.participants.put(
                participantKey(principal.userId(), normalizedDeviceId),
                new CollabParticipantView(
                        principal.userId(),
                        principal.displayName(),
                        principal.role(),
                        normalizedDeviceId,
                        status,
                        cursorStart,
                        cursorEnd,
                        editing,
                        now.toString()));
    }

    private String participantKey(String userId, String deviceId) {
        return userId + ":" + normalizeDeviceId(deviceId);
    }

    private String normalizeDeviceId(String deviceId) {
        return deviceId == null || deviceId.isBlank() ? "browser" : deviceId.trim();
    }

    private void compactOperations(RoomState room) {
        if (room.operations.size() <= MAX_RETAINED_OPERATIONS) {
            return;
        }
        int fromIndex = room.operations.size() - MAX_RETAINED_OPERATIONS;
        room.operations = new ArrayList<>(room.operations.subList(fromIndex, room.operations.size()));
        room.lastCompactedAt = timeProvider.now();
    }

    private void pruneStaleParticipants(RoomState room) {
        Instant cutoff = timeProvider.now().minus(Duration.ofMinutes(2));
        room.participants.entrySet().removeIf(entry -> {
            try {
                return Instant.parse(entry.getValue().lastSeenAt()).isBefore(cutoff);
            } catch (Exception ignored) {
                return true;
            }
        });
    }

    private CollabRoomView toView(RoomState room) {
        List<CollabParticipantView> participants = room.participants.values().stream()
                .sorted(Comparator.comparing(CollabParticipantView::displayName))
                .toList();
        return new CollabRoomView(
                room.roomId,
                room.artifactId,
                room.conversationId,
                room.title,
                room.artifactType,
                room.language,
                room.protocol,
                room.version,
                room.baseArtifactVersion,
                room.baseArtifactHash,
                room.currentArtifactVersion,
                room.currentArtifactHash,
                room.content,
                room.contentHash,
                maxDocumentChars,
                room.lastCompactedAt == null ? null : room.lastCompactedAt.toString(),
                room.createdAt == null ? null : room.createdAt.toString(),
                room.updatedAt == null ? null : room.updatedAt.toString(),
                participants,
                List.copyOf(room.operations));
    }

    private void publishRoomEvent(RoomState room, String eventName) {
        realtimeEventPublisher.publish(
                new ConversationId(room.conversationId),
                RealtimeEventType.COLLAB_ROOM_UPDATED,
                "COLLAB_ROOM",
                room.roomId,
                Map.of(
                        "eventName", eventName,
                        "artifactId", room.artifactId,
                        "roomVersion", room.version));
    }

    public record CollabRoomView(
            String roomId,
            String artifactId,
            String conversationId,
            String title,
            String artifactType,
            String language,
            String protocol,
            int version,
            int baseArtifactVersion,
            String baseArtifactHash,
            int currentArtifactVersion,
            String currentArtifactHash,
            String content,
            String contentHash,
            int maxDocumentChars,
            String lastCompactedAt,
            String createdAt,
            String updatedAt,
            List<CollabParticipantView> participants,
            List<CollabOperationView> operations) {
    }

    public record CollabParticipantView(
            String userId,
            String displayName,
            String role,
            String deviceId,
            String status,
            Integer cursorStart,
            Integer cursorEnd,
            boolean editing,
            String lastSeenAt) {
    }

    public record CollabOperationView(
            String operationId,
            String operationType,
            String userId,
            String displayName,
            String deviceId,
            int version,
            String summary,
            String contentHash,
            String createdAt) {
    }

    private static class RoomState {
        public String roomId;
        public String artifactId;
        public String conversationId;
        public String title;
        public String artifactType;
        public String language;
        public String protocol = PROTOCOL;
        public int version;
        public int baseArtifactVersion;
        public String baseArtifactHash;
        public int currentArtifactVersion;
        public String currentArtifactHash;
        public String content;
        public String contentHash;
        public Instant createdAt;
        public Instant updatedAt;
        public Instant lastCompactedAt;
        public Map<String, CollabParticipantView> participants = new LinkedHashMap<>();
        public List<CollabOperationView> operations = new ArrayList<>();
    }
}
