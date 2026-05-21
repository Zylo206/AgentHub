package com.agenthub.api.task;

import com.agenthub.application.task.TaskApplicationService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskApplicationService taskApplicationService;

    public TaskController(TaskApplicationService taskApplicationService) {
        this.taskApplicationService = taskApplicationService;
    }

    @PostMapping("/conversations/{conversationId}/demo-task")
    public ApiResponse<?> createDemoTask(
            @PathVariable String conversationId,
            @Valid @RequestBody CreateDemoTaskRequest request) {
        return ApiResponse.success(
                taskApplicationService.createDemoTaskFromMessage(
                        conversationId,
                        request.messageId(),
                        request.userInput(),
                        request.selectedAgentId()),
                "Demo task created");
    }

    @GetMapping("/task-specs/{taskSpecId}")
    public ApiResponse<?> getTaskSpec(@PathVariable String taskSpecId) {
        return ApiResponse.success(taskApplicationService.getTaskSpec(taskSpecId));
    }

    @GetMapping("/conversations/{conversationId}/task-specs")
    public ApiResponse<?> listTaskSpecsByConversation(@PathVariable String conversationId) {
        return ApiResponse.success(taskApplicationService.listTaskSpecsByConversation(conversationId));
    }

    @GetMapping("/task-runs/{taskRunId}")
    public ApiResponse<?> getTaskRun(@PathVariable String taskRunId) {
        return ApiResponse.success(taskApplicationService.getTaskRun(taskRunId));
    }

    @GetMapping("/conversations/{conversationId}/task-runs")
    public ApiResponse<?> listTaskRunsByConversation(@PathVariable String conversationId) {
        return ApiResponse.success(taskApplicationService.listTaskRunsByConversation(conversationId));
    }
}

record CreateDemoTaskRequest(
        @NotBlank String messageId,
        @NotBlank String userInput,
        String selectedAgentId) {}
