package com.agenthub.api.realtime;

import com.agenthub.application.realtime.RealtimeEvent;
import com.agenthub.application.realtime.RealtimeEventStore;
import com.agenthub.application.realtime.RealtimeRunStateService;
import com.agenthub.application.realtime.SseConnectionRegistry;
import com.agenthub.common.ApiResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api")
public class RealtimeController {

    private final SseConnectionRegistry sseConnectionRegistry;
    private final RealtimeEventStore realtimeEventStore;
    private final RealtimeRunStateService realtimeRunStateService;

    public RealtimeController(
            SseConnectionRegistry sseConnectionRegistry,
            RealtimeEventStore realtimeEventStore,
            RealtimeRunStateService realtimeRunStateService) {
        this.sseConnectionRegistry = sseConnectionRegistry;
        this.realtimeEventStore = realtimeEventStore;
        this.realtimeRunStateService = realtimeRunStateService;
    }

    @GetMapping(
            value = "/conversations/{conversationId}/events",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamConversationEvents(
            @PathVariable("conversationId") String conversationId,
            @RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {
        SseEmitter emitter = sseConnectionRegistry.register(conversationId);
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(java.util.Map.of("conversationId", conversationId)));
            List<RealtimeEvent> missedEvents = realtimeEventStore.findAfter(conversationId, lastEventId);
            for (RealtimeEvent event : missedEvents) {
                emitter.send(SseEmitter.event()
                        .id(event.getEventId())
                        .name(event.getEventType().name())
                        .data(event));
            }
        } catch (IOException | IllegalStateException exception) {
            // Client disconnect during the initial replay is a normal SSE lifecycle event.
            // Completing normally avoids routing a text/event-stream response through the JSON API exception handler.
            emitter.complete();
        }
        return emitter;
    }

    @GetMapping("/task-runs/{taskRunId}/realtime-state")
    public ApiResponse<?> getTaskRunRealtimeState(@PathVariable("taskRunId") String taskRunId) {
        return ApiResponse.success(realtimeRunStateService.findByTaskRunId(taskRunId).orElse(null));
    }

    @GetMapping("/conversations/{conversationId}/active-realtime-state")
    public ApiResponse<?> getActiveRealtimeState(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(realtimeRunStateService.findActiveByConversationId(conversationId).orElse(null));
    }
}
