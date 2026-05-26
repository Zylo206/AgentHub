package com.agenthub.api.realtime;

import com.agenthub.application.realtime.RealtimeControlService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/task-runs/{taskRunId}")
public class RealtimeControlController {

    private final RealtimeControlService realtimeControlService;

    public RealtimeControlController(RealtimeControlService realtimeControlService) {
        this.realtimeControlService = realtimeControlService;
    }

    @PostMapping("/cancel")
    public ApiResponse<?> cancelRun(
            @PathVariable("taskRunId") String taskRunId,
            @Valid @RequestBody(required = false) ControlRequest request) {
        return ApiResponse.success(realtimeControlService.cancelRun(taskRunId, reasonOf(request)));
    }

    @PostMapping("/stop")
    public ApiResponse<?> stopRun(
            @PathVariable("taskRunId") String taskRunId,
            @Valid @RequestBody(required = false) ControlRequest request) {
        return ApiResponse.success(realtimeControlService.stopRun(taskRunId, reasonOf(request)));
    }

    private String reasonOf(ControlRequest request) {
        return request == null ? "" : request.reason();
    }

    public record ControlRequest(String reason) {
    }
}
