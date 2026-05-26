package com.agenthub.api.realtime;

import com.agenthub.application.realtime.RealtimeControlService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
public class RealtimeControlWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final RealtimeControlService realtimeControlService;

    public RealtimeControlWebSocketHandler(
            ObjectMapper objectMapper,
            RealtimeControlService realtimeControlService) {
        this.objectMapper = objectMapper;
        this.realtimeControlService = realtimeControlService;
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        try {
            JsonNode root = objectMapper.readTree(message.getPayload());
            String action = root.path("action").asText("");
            String taskRunId = root.path("taskRunId").asText("");
            String reason = root.path("reason").asText("");
            if (!"PING".equals(action) && taskRunId.isBlank()) {
                sendError(session, "taskRunId is required.");
                return;
            }
            RealtimeControlService.ControlResult result = switch (action) {
                case "CANCEL_RUN" -> realtimeControlService.cancelRun(taskRunId, reason);
                case "STOP_RUN" -> realtimeControlService.stopRun(taskRunId, reason);
                case "PING" -> new RealtimeControlService.ControlResult(
                        true,
                        "PONG",
                        taskRunId,
                        "",
                        "",
                        "",
                        "pong");
                default -> null;
            };
            if (result == null) {
                sendError(session, "Unsupported realtime control action: " + action);
                return;
            }
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                    "type", "CONTROL_RESULT",
                    "result", result))));
        } catch (NoSuchElementException exception) {
            sendError(session, exception.getMessage());
        } catch (Exception exception) {
            sendError(session, "Realtime control command failed: " + exception.getMessage());
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "CONNECTED",
                "protocol", "AgentHub realtime control v1",
                "supportedActions", java.util.List.of("PING", "CANCEL_RUN", "STOP_RUN")))));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        // No server-side session state is retained in v1.
    }

    private void sendError(WebSocketSession session, String message) throws IOException {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(Map.of(
                "type", "CONTROL_ERROR",
                "message", message == null ? "Unknown realtime control error." : message))));
    }
}
