package com.agenthub.application.realtime;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Component
public class SseConnectionRegistry {

    private static final long SSE_TIMEOUT_MILLIS = 0L;

    private final Map<String, Set<RegisteredEmitter>> emittersByConversation = new ConcurrentHashMap<>();
    private final ScheduledExecutorService heartbeatExecutor;

    public SseConnectionRegistry(
            @Value("${agenthub.realtime.heartbeat-seconds:25}") long heartbeatSeconds) {
        this.heartbeatExecutor = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "agenthub-sse-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
        long interval = Math.max(10, heartbeatSeconds);
        this.heartbeatExecutor.scheduleAtFixedRate(this::sendHeartbeat, interval, interval, TimeUnit.SECONDS);
    }

    public SseEmitter register(String conversationId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        RegisteredEmitter registeredEmitter = new RegisteredEmitter(UUID.randomUUID().toString(), emitter);
        emittersByConversation.computeIfAbsent(conversationId, ignored -> ConcurrentHashMap.newKeySet())
                .add(registeredEmitter);
        emitter.onCompletion(() -> unregister(conversationId, registeredEmitter));
        emitter.onTimeout(() -> unregister(conversationId, registeredEmitter));
        emitter.onError(ignored -> unregister(conversationId, registeredEmitter));
        return emitter;
    }

    public void broadcast(RealtimeEvent event) {
        Set<RegisteredEmitter> emitters = emittersByConversation.get(event.getConversationId());
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (RegisteredEmitter registeredEmitter : emitters) {
            try {
                registeredEmitter.emitter().send(SseEmitter.event()
                        .id(event.getEventId())
                        .name(event.getEventType().name())
                        .data(event));
            } catch (IOException | IllegalStateException exception) {
                unregister(event.getConversationId(), registeredEmitter);
            }
        }
    }

    private void sendHeartbeat() {
        emittersByConversation.forEach((conversationId, emitters) -> {
            for (RegisteredEmitter registeredEmitter : emitters) {
                try {
                    registeredEmitter.emitter().send(SseEmitter.event()
                            .name("HEARTBEAT")
                            .data(Map.of("conversationId", conversationId)));
                } catch (IOException | IllegalStateException exception) {
                    unregister(conversationId, registeredEmitter);
                }
            }
        });
    }

    private void unregister(String conversationId, RegisteredEmitter registeredEmitter) {
        Set<RegisteredEmitter> emitters = emittersByConversation.get(conversationId);
        if (emitters != null) {
            emitters.remove(registeredEmitter);
        }
    }

    @PreDestroy
    public void shutdown() {
        heartbeatExecutor.shutdownNow();
    }

    private record RegisteredEmitter(String id, SseEmitter emitter) {
    }
}
