package com.agenthub.api.realtime;

import com.agenthub.application.realtime.PresenceService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations/{conversationId}/presence")
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @PostMapping
    public ApiResponse<?> heartbeat(
            @PathVariable("conversationId") String conversationId,
            @RequestBody(required = false) PresenceRequest request) {
        return ApiResponse.success(presenceService.heartbeat(
                conversationId,
                request == null ? null : request.deviceId(),
                request == null ? null : request.status(),
                request == null ? null : request.activeArtifactId(),
                request == null ? null : request.lastSeenEventId()));
    }

    @GetMapping
    public ApiResponse<?> list(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(presenceService.list(conversationId));
    }

    public record PresenceRequest(
            String deviceId,
            String status,
            String activeArtifactId,
            String lastSeenEventId) {
    }
}
