package com.agenthub.api.collab;

import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.collab.ArtifactCollaborationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class ArtifactCollaborationWebSocketHandler extends TextWebSocketHandler {

    private static final String PRINCIPAL_ATTRIBUTE = "agenthubPrincipal";

    private final ObjectMapper objectMapper;
    private final AuthSessionService authSessionService;
    private final ArtifactCollaborationService collaborationService;
    private final Map<String, Set<WebSocketSession>> sessionsByArtifact = new ConcurrentHashMap<>();
    private final Map<String, String> artifactBySessionId = new ConcurrentHashMap<>();
    private final Map<String, String> deviceBySessionId = new ConcurrentHashMap<>();

    public ArtifactCollaborationWebSocketHandler(
            ObjectMapper objectMapper,
            AuthSessionService authSessionService,
            ArtifactCollaborationService collaborationService) {
        this.objectMapper = objectMapper;
        this.authSessionService = authSessionService;
        this.collaborationService = collaborationService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        try {
            AuthPrincipal principal = authSessionService.resolve(extractToken(session));
            session.getAttributes().put(PRINCIPAL_ATTRIBUTE, principal);
            send(session, Map.of(
                    "type", "CONNECTED",
                    "protocol", "AgentHub artifact collaboration v1",
                    "supportedActions", List.of("JOIN", "UPDATE_DOCUMENT", "CURSOR", "PING", "LEAVE")));
        } catch (Exception exception) {
            send(session, Map.of(
                    "type", "COLLAB_ERROR",
                    "message", exception.getMessage() == null ? "Collaboration authentication failed." : exception.getMessage()));
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Authentication failed"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        AuthPrincipal principal = principal(session);
        try {
            if (principal == null) {
                throw new IllegalStateException("Collaboration socket is not authenticated.");
            }
            authSessionService.bind(principal);
            JsonNode root = objectMapper.readTree(message.getPayload());
            String action = root.path("action").asText("");
            switch (action) {
                case "JOIN" -> handleJoin(session, root, principal);
                case "UPDATE_DOCUMENT" -> handleUpdateDocument(session, root, principal);
                case "CURSOR" -> handleCursor(session, root, principal);
                case "LEAVE" -> handleLeave(session, principal);
                case "PING" -> send(session, Map.of("type", "PONG"));
                default -> sendError(session, "Unsupported collaboration action: " + action);
            }
        } catch (Exception exception) {
            sendError(session, exception.getMessage());
        } finally {
            authSessionService.clear();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        AuthPrincipal principal = principal(session);
        String artifactId = artifactBySessionId.remove(session.getId());
        String deviceId = deviceBySessionId.remove(session.getId());
        if (artifactId != null) {
            Set<WebSocketSession> sessions = sessionsByArtifact.get(artifactId);
            if (sessions != null) {
                sessions.remove(session);
            }
            if (principal != null) {
                try {
                    authSessionService.bind(principal);
                    ArtifactCollaborationService.CollabRoomView room = collaborationService.leave(artifactId, deviceId, principal);
                    broadcast(artifactId, Map.of("type", "PRESENCE_UPDATED", "room", room));
                } catch (Exception ignored) {
                    // Closing a socket must not fail the container thread.
                } finally {
                    authSessionService.clear();
                }
            }
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode root, AuthPrincipal principal) throws IOException {
        String artifactId = root.path("artifactId").asText("");
        String deviceId = root.path("deviceId").asText("browser");
        if (artifactId.isBlank()) {
            sendError(session, "artifactId is required.");
            return;
        }
        ArtifactCollaborationService.CollabRoomView room = collaborationService.updatePresence(
                artifactId,
                deviceId,
                principal,
                "online",
                null,
                null,
                false);
        sessionsByArtifact.computeIfAbsent(artifactId, ignored -> new CopyOnWriteArraySet<>()).add(session);
        artifactBySessionId.put(session.getId(), artifactId);
        deviceBySessionId.put(session.getId(), deviceId);
        send(session, Map.of("type", "ROOM_STATE", "room", room));
        broadcast(artifactId, Map.of("type", "PRESENCE_UPDATED", "room", room));
    }

    private void handleUpdateDocument(WebSocketSession session, JsonNode root, AuthPrincipal principal) throws IOException {
        String artifactId = requireJoinedArtifact(session);
        Integer baseVersion = root.hasNonNull("baseVersion") ? root.path("baseVersion").asInt() : null;
        String content = root.path("content").asText("");
        String summary = root.path("summary").asText("");
        ArtifactCollaborationService.CollabRoomView room = collaborationService.updateDocument(
                artifactId,
                baseVersion,
                content,
                deviceBySessionId.get(session.getId()),
                principal,
                summary);
        broadcast(artifactId, Map.of("type", "DOCUMENT_UPDATED", "room", room));
    }

    private void handleCursor(WebSocketSession session, JsonNode root, AuthPrincipal principal) throws IOException {
        String artifactId = requireJoinedArtifact(session);
        Integer cursorStart = root.hasNonNull("cursorStart") ? root.path("cursorStart").asInt() : null;
        Integer cursorEnd = root.hasNonNull("cursorEnd") ? root.path("cursorEnd").asInt() : null;
        ArtifactCollaborationService.CollabRoomView room = collaborationService.updatePresence(
                artifactId,
                deviceBySessionId.get(session.getId()),
                principal,
                "online",
                cursorStart,
                cursorEnd,
                root.path("editing").asBoolean(false));
        broadcast(artifactId, Map.of("type", "CURSOR_UPDATED", "room", room));
    }

    private void handleLeave(WebSocketSession session, AuthPrincipal principal) throws IOException {
        String artifactId = requireJoinedArtifact(session);
        ArtifactCollaborationService.CollabRoomView room = collaborationService.leave(
                artifactId,
                deviceBySessionId.get(session.getId()),
                principal);
        artifactBySessionId.remove(session.getId());
        deviceBySessionId.remove(session.getId());
        Set<WebSocketSession> sessions = sessionsByArtifact.get(artifactId);
        if (sessions != null) {
            sessions.remove(session);
        }
        broadcast(artifactId, Map.of("type", "PRESENCE_UPDATED", "room", room));
    }

    private String requireJoinedArtifact(WebSocketSession session) {
        String artifactId = artifactBySessionId.get(session.getId());
        if (artifactId == null || artifactId.isBlank()) {
            throw new IllegalStateException("Join a collaboration room before sending document operations.");
        }
        return artifactId;
    }

    private AuthPrincipal principal(WebSocketSession session) {
        Object value = session.getAttributes().get(PRINCIPAL_ATTRIBUTE);
        return value instanceof AuthPrincipal principal ? principal : null;
    }

    private String extractToken(WebSocketSession session) {
        if (session.getUri() == null || session.getUri().getRawQuery() == null) {
            return null;
        }
        for (String part : session.getUri().getRawQuery().split("&")) {
            int separator = part.indexOf('=');
            String key = separator >= 0 ? part.substring(0, separator) : part;
            String value = separator >= 0 ? part.substring(separator + 1) : "";
            if ("access_token".equals(key) || "token".equals(key)) {
                return URLDecoder.decode(value, StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    private void broadcast(String artifactId, Map<String, Object> payload) {
        Set<WebSocketSession> sessions = sessionsByArtifact.get(artifactId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }
        for (WebSocketSession session : sessions) {
            if (!session.isOpen()) {
                sessions.remove(session);
                continue;
            }
            try {
                send(session, payload);
            } catch (IOException ignored) {
                sessions.remove(session);
            }
        }
    }

    private void sendError(WebSocketSession session, String message) throws IOException {
        send(session, Map.of(
                "type", "COLLAB_ERROR",
                "message", message == null || message.isBlank() ? "Unknown collaboration error." : message));
    }

    private void send(WebSocketSession session, Map<String, Object> payload) throws IOException {
        if (session.isOpen()) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
        }
    }
}
