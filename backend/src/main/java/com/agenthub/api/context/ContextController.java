package com.agenthub.api.context;

import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.context.ContextApplicationService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ContextController {

    private final ContextApplicationService contextApplicationService;
    private final ConversationAccessService conversationAccessService;

    public ContextController(
            ContextApplicationService contextApplicationService,
            ConversationAccessService conversationAccessService) {
        this.contextApplicationService = contextApplicationService;
        this.conversationAccessService = conversationAccessService;
    }

    @GetMapping("/conversations/{conversationId}/context-snapshots")
    public ApiResponse<?> listContextSnapshotsByConversation(@PathVariable("conversationId") String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return ApiResponse.success(
                contextApplicationService.listContextSnapshotsByConversation(conversationId));
    }

    @GetMapping("/task-runs/{taskRunId}/context-snapshots")
    public ApiResponse<?> listContextSnapshotsByTaskRun(@PathVariable("taskRunId") String taskRunId) {
        return ApiResponse.success(contextApplicationService.listContextSnapshotsByTaskRun(taskRunId));
    }

    @GetMapping("/conversations/{conversationId}/pinned-contexts")
    public ApiResponse<?> listPinnedContextsByConversation(@PathVariable("conversationId") String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return ApiResponse.success(contextApplicationService.listPinnedContextsByConversation(conversationId));
    }

    @PostMapping("/conversations/{conversationId}/messages/{messageId}/pin")
    public ApiResponse<?> pinMessage(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("messageId") String messageId) {
        conversationAccessService.requireWritable(conversationId);
        return ApiResponse.success(
                contextApplicationService.pinMessage(conversationId, messageId),
                "Message pinned as context");
    }

    @PostMapping("/conversations/{conversationId}/attachments/{attachmentId}/pin")
    public ApiResponse<?> pinAttachment(
            @PathVariable("conversationId") String conversationId,
            @PathVariable("attachmentId") String attachmentId) {
        conversationAccessService.requireWritable(conversationId);
        return ApiResponse.success(
                contextApplicationService.pinAttachment(conversationId, attachmentId),
                "Attachment pinned as context");
    }

    @DeleteMapping("/pinned-contexts/{pinnedContextId}")
    public ApiResponse<?> unpinContext(@PathVariable("pinnedContextId") String pinnedContextId) {
        return ApiResponse.success(
                contextApplicationService.unpinContext(pinnedContextId),
                "Pinned context removed");
    }

    @GetMapping("/task-runs/{taskRunId}/handoff-summaries")
    public ApiResponse<?> listHandoffSummariesByTaskRun(@PathVariable("taskRunId") String taskRunId) {
        return ApiResponse.success(contextApplicationService.listHandoffSummariesByTaskRun(taskRunId));
    }
}
