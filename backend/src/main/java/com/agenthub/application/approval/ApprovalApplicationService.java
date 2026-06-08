package com.agenthub.application.approval;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.approval.ApprovalRepository;
import com.agenthub.domain.approval.ApprovalRequest;
import com.agenthub.domain.approval.ApprovalStatus;
import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ApprovalApplicationService {

    private static final long DEFAULT_EXPIRY_MINUTES = 30;

    private final ApprovalRepository approvalRepository;
    private final ActionAuditService actionAuditService;
    private final ConversationAccessService conversationAccessService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ApprovalApplicationService(
            ApprovalRepository approvalRepository,
            ActionAuditService actionAuditService,
            ConversationAccessService conversationAccessService,
            RealtimeEventPublisher realtimeEventPublisher,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.approvalRepository = approvalRepository;
        this.actionAuditService = actionAuditService;
        this.conversationAccessService = conversationAccessService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public ApprovalRequest create(
            String conversationId,
            String actionType,
            String targetType,
            String targetId,
            String riskLevel,
            String summary,
            List<String> affectedItems) {
        conversationAccessService.requireWritable(conversationId);
        Instant now = timeProvider.now();
        ApprovalRequest approvalRequest = approvalRepository.save(new ApprovalRequest(
                idGenerator.nextId("approval"),
                new ConversationId(conversationId),
                actionType,
                targetType,
                targetId,
                riskLevel,
                summary,
                affectedItems,
                ApprovalStatus.PENDING,
                now,
                null,
                now.plus(DEFAULT_EXPIRY_MINUTES, ChronoUnit.MINUTES)));
        actionAuditService.record(
                approvalRequest.getConversationId(),
                "APPROVAL_REQUEST_CREATED",
                approvalRequest.getTargetType(),
                approvalRequest.getTargetId(),
                approvalRequest.getStatus().name(),
                "Approval request created: " + approvalRequest.getActionType() + ". " + approvalRequest.getSummary());
        publishApprovalUpdated(approvalRequest);
        return approvalRequest;
    }

    public ApprovalRequest approve(String approvalId) {
        ApprovalRequest approvalRequest = requireApproval(approvalId);
        conversationAccessService.requireWritable(approvalRequest.getConversationId().value());
        Instant now = timeProvider.now();
        ensurePending(approvalRequest, now);
        ApprovalRequest approved = approvalRepository.save(approvalRequest.withStatus(ApprovalStatus.APPROVED, now));
        actionAuditService.record(
                approved.getConversationId(),
                "APPROVAL_REQUEST_APPROVED",
                approved.getTargetType(),
                approved.getTargetId(),
                approved.getStatus().name(),
                "Approval request approved: " + approved.getApprovalId());
        publishApprovalUpdated(approved);
        return approved;
    }

    public ApprovalRequest cancel(String approvalId) {
        ApprovalRequest approvalRequest = requireApproval(approvalId);
        conversationAccessService.requireWritable(approvalRequest.getConversationId().value());
        Instant now = timeProvider.now();
        ensurePending(approvalRequest, now);
        ApprovalRequest cancelled = approvalRepository.save(approvalRequest.withStatus(ApprovalStatus.CANCELLED, now));
        actionAuditService.record(
                cancelled.getConversationId(),
                "APPROVAL_REQUEST_CANCELLED",
                cancelled.getTargetType(),
                cancelled.getTargetId(),
                cancelled.getStatus().name(),
                "Approval request cancelled: " + cancelled.getApprovalId());
        publishApprovalUpdated(cancelled);
        return cancelled;
    }

    public ApprovalRequest validateApproved(
            String approvalId,
            ConversationId conversationId,
            String actionType,
            String targetType,
            String targetId) {
        if (approvalId == null || approvalId.isBlank()) {
            actionAuditService.record(
                    conversationId,
                    "APPROVAL_BYPASS_ATTEMPT",
                    targetType,
                    targetId,
                    "REJECTED",
                    "approvalId is required for high-risk operation " + normalize(actionType) + ".");
            throw new IllegalArgumentException("approvalId is required for this high-risk operation.");
        }
        ApprovalRequest approvalRequest = requireApproval(approvalId);
        conversationAccessService.requireWritable(approvalRequest.getConversationId().value());
        Instant now = timeProvider.now();
        if (approvalRequest.isExpired(now)) {
            ApprovalRequest expired = approvalRepository.save(approvalRequest.withStatus(ApprovalStatus.EXPIRED, now));
            actionAuditService.record(
                    expired.getConversationId(),
                    "APPROVAL_REQUEST_EXPIRED",
                    expired.getTargetType(),
                    expired.getTargetId(),
                    expired.getStatus().name(),
                    "Approval request expired before execution: " + expired.getApprovalId());
            publishApprovalUpdated(expired);
            actionAuditService.record(
                    conversationId,
                    "APPROVAL_BYPASS_ATTEMPT",
                    targetType,
                    targetId,
                    "REJECTED",
                    "Approval request expired before execution: " + approvalId);
            throw new IllegalStateException("Approval request is expired: " + approvalId);
        }
        if (approvalRequest.getStatus() != ApprovalStatus.APPROVED) {
            actionAuditService.record(
                    conversationId,
                    "APPROVAL_BYPASS_ATTEMPT",
                    targetType,
                    targetId,
                    "REJECTED",
                    "Approval request must be APPROVED before execution: " + approvalId);
            throw new IllegalStateException("Approval request must be APPROVED before execution: " + approvalId);
        }
        if (!approvalRequest.getConversationId().equals(conversationId)
                || !approvalRequest.getActionType().equals(normalize(actionType))
                || !approvalRequest.getTargetType().equals(normalize(targetType))
                || !approvalRequest.getTargetId().equals(targetId)) {
            actionAuditService.record(
                    conversationId,
                    "APPROVAL_BYPASS_ATTEMPT",
                    targetType,
                    targetId,
                    "REJECTED",
                    "Approval request does not match the requested operation target: " + approvalId);
            throw new IllegalArgumentException("Approval request does not match the requested operation target.");
        }
        return approvalRequest;
    }

    public ApprovalRequest consume(String approvalId) {
        ApprovalRequest approvalRequest = requireApproval(approvalId);
        conversationAccessService.requireWritable(approvalRequest.getConversationId().value());
        if (approvalRequest.getStatus() != ApprovalStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED approval requests can be consumed.");
        }
        ApprovalRequest consumed = approvalRepository.save(
                approvalRequest.withStatus(ApprovalStatus.CONSUMED, timeProvider.now()));
        actionAuditService.record(
                consumed.getConversationId(),
                "APPROVAL_REQUEST_CONSUMED",
                consumed.getTargetType(),
                consumed.getTargetId(),
                consumed.getStatus().name(),
                "Approval request consumed by backend operation: " + consumed.getApprovalId());
        publishApprovalUpdated(consumed);
        return consumed;
    }

    public List<ApprovalRequest> listByConversation(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return approvalRepository.findByConversationId(new ConversationId(conversationId));
    }

    private ApprovalRequest requireApproval(String approvalId) {
        return approvalRepository.findById(approvalId)
                .orElseThrow(() -> new NoSuchElementException("Approval request not found: " + approvalId));
    }

    private void ensurePending(ApprovalRequest approvalRequest, Instant now) {
        if (approvalRequest.isExpired(now)) {
            ApprovalRequest expired = approvalRepository.save(approvalRequest.withStatus(ApprovalStatus.EXPIRED, now));
            publishApprovalUpdated(expired);
            throw new IllegalStateException("Approval request is expired: " + approvalRequest.getApprovalId());
        }
        if (approvalRequest.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Approval request is not pending: " + approvalRequest.getApprovalId());
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private void publishApprovalUpdated(ApprovalRequest approvalRequest) {
        realtimeEventPublisher.publish(
                approvalRequest.getConversationId(),
                RealtimeEventType.APPROVAL_UPDATED,
                "APPROVAL_REQUEST",
                approvalRequest.getApprovalId(),
                java.util.Map.of(
                        "actionType", approvalRequest.getActionType(),
                        "targetType", approvalRequest.getTargetType(),
                        "status", approvalRequest.getStatus().name()));
    }
}
