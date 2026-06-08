package com.agenthub.api.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import com.agenthub.api.collab.ArtifactCollaborationWebSocketHandler;

@Configuration
@EnableWebSocket
public class RealtimeControlWebSocketConfig implements WebSocketConfigurer {

    private final RealtimeControlWebSocketHandler realtimeControlWebSocketHandler;
    private final ArtifactCollaborationWebSocketHandler artifactCollaborationWebSocketHandler;

    public RealtimeControlWebSocketConfig(
            RealtimeControlWebSocketHandler realtimeControlWebSocketHandler,
            ArtifactCollaborationWebSocketHandler artifactCollaborationWebSocketHandler) {
        this.realtimeControlWebSocketHandler = realtimeControlWebSocketHandler;
        this.artifactCollaborationWebSocketHandler = artifactCollaborationWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(realtimeControlWebSocketHandler, "/api/realtime/control")
                .setAllowedOrigins("*");
        registry.addHandler(artifactCollaborationWebSocketHandler, "/api/doc-collab")
                .setAllowedOrigins("*");
    }
}
