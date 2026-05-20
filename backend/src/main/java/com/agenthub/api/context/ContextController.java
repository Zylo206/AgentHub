package com.agenthub.api.context;

import com.agenthub.application.context.ContextApplicationService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ContextController {

    private final ContextApplicationService contextApplicationService;

    public ContextController(ContextApplicationService contextApplicationService) {
        this.contextApplicationService = contextApplicationService;
    }

    @GetMapping("/conversations/{conversationId}/context-snapshots")
    public ApiResponse<?> listContextSnapshotsByConversation(@PathVariable String conversationId) {
        return ApiResponse.success(
                contextApplicationService.listContextSnapshotsByConversation(conversationId));
    }

    @GetMapping("/task-runs/{taskRunId}/context-snapshots")
    public ApiResponse<?> listContextSnapshotsByTaskRun(@PathVariable String taskRunId) {
        return ApiResponse.success(contextApplicationService.listContextSnapshotsByTaskRun(taskRunId));
    }

    @GetMapping("/task-runs/{taskRunId}/handoff-summaries")
    public ApiResponse<?> listHandoffSummariesByTaskRun(@PathVariable String taskRunId) {
        return ApiResponse.success(contextApplicationService.listHandoffSummariesByTaskRun(taskRunId));
    }
}
