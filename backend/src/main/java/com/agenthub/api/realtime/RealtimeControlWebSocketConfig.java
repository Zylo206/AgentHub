package com.agenthub.api.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class RealtimeControlWebSocketConfig implements WebSocketConfigurer {

    private final RealtimeControlWebSocketHandler realtimeControlWebSocketHandler;

    public RealtimeControlWebSocketConfig(RealtimeControlWebSocketHandler realtimeControlWebSocketHandler) {
        this.realtimeControlWebSocketHandler = realtimeControlWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(realtimeControlWebSocketHandler, "/api/realtime/control")
                .setAllowedOrigins("*");
    }
}
