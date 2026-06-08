package com.agenthub.api.task;

import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.task.TaskRunObservabilityService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/conversations/{conversationId}/task-run-observability")
public class TaskRunObservabilityController {

    private final TaskRunObservabilityService taskRunObservabilityService;
    private final ConversationAccessService conversationAccessService;

    public TaskRunObservabilityController(
            TaskRunObservabilityService taskRunObservabilityService,
            ConversationAccessService conversationAccessService) {
        this.taskRunObservabilityService = taskRunObservabilityService;
        this.conversationAccessService = conversationAccessService;
    }

    @GetMapping
    public ApiResponse<?> getConversationTaskRunObservability(@PathVariable("conversationId") String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return ApiResponse.success(taskRunObservabilityService.summarizeConversation(conversationId));
    }
}
