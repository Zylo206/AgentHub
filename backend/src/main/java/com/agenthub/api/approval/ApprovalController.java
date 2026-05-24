package com.agenthub.api.approval;

import com.agenthub.application.approval.ApprovalApplicationService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApprovalController {

    private final ApprovalApplicationService approvalApplicationService;

    public ApprovalController(ApprovalApplicationService approvalApplicationService) {
        this.approvalApplicationService = approvalApplicationService;
    }

    @PostMapping("/conversations/{conversationId}/approval-requests")
    public ApiResponse<?> createApprovalRequest(
            @PathVariable("conversationId") String conversationId,
            @Valid @RequestBody CreateApprovalRequest request) {
        return ApiResponse.success(approvalApplicationService.create(
                conversationId,
                request.actionType(),
                request.targetType(),
                request.targetId(),
                request.riskLevel(),
                request.summary(),
                request.affectedItems()));
    }

    @PostMapping("/approval-requests/{approvalId}/approve")
    public ApiResponse<?> approve(@PathVariable("approvalId") String approvalId) {
        return ApiResponse.success(approvalApplicationService.approve(approvalId));
    }

    @PostMapping("/approval-requests/{approvalId}/cancel")
    public ApiResponse<?> cancel(@PathVariable("approvalId") String approvalId) {
        return ApiResponse.success(approvalApplicationService.cancel(approvalId));
    }

    @GetMapping("/conversations/{conversationId}/approval-requests")
    public ApiResponse<?> listByConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(approvalApplicationService.listByConversation(conversationId));
    }

    public record CreateApprovalRequest(
            @NotBlank String actionType,
            @NotBlank String targetType,
            @NotBlank String targetId,
            String riskLevel,
            @NotBlank String summary,
            List<String> affectedItems) {
    }
}
