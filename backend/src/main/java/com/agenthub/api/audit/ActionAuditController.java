package com.agenthub.api.audit;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.conversation.ConversationId;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ActionAuditController {

    private final ActionAuditService actionAuditService;

    public ActionAuditController(ActionAuditService actionAuditService) {
        this.actionAuditService = actionAuditService;
    }

    @GetMapping("/conversations/{conversationId}/action-audits")
    public ApiResponse<?> listActionAudits(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(actionAuditService.listByConversation(conversationId));
    }

    @PostMapping("/conversations/{conversationId}/action-audits")
    public ApiResponse<?> recordActionAudit(
            @PathVariable("conversationId") String conversationId,
            @RequestBody RecordActionAuditRequest request) {
        return ApiResponse.success(actionAuditService.record(
                new ConversationId(conversationId),
                request.actionType(),
                request.targetType(),
                request.targetId(),
                request.status(),
                request.summary()));
    }

    public record RecordActionAuditRequest(
            String actionType,
            String targetType,
            String targetId,
            String status,
            String summary) {
    }
}
