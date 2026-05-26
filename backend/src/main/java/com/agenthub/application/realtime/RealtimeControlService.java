package com.agenthub.application.realtime;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskRunStatus;
import java.time.Instant;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class RealtimeControlService {

    private final TaskRepository taskRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RealtimeRunStateService realtimeRunStateService;
    private final RunCancellationRegistry runCancellationRegistry;
    private final ActionAuditService actionAuditService;
    private final TimeProvider timeProvider;

    public RealtimeControlService(
            TaskRepository taskRepository,
            RealtimeEventPublisher realtimeEventPublisher,
            RealtimeRunStateService realtimeRunStateService,
            RunCancellationRegistry runCancellationRegistry,
            ActionAuditService actionAuditService,
            TimeProvider timeProvider) {
        this.taskRepository = taskRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.realtimeRunStateService = realtimeRunStateService;
        this.runCancellationRegistry = runCancellationRegistry;
        this.actionAuditService = actionAuditService;
        this.timeProvider = timeProvider;
    }

    public ControlResult cancelRun(String taskRunId, String reason) {
        return applyControl(taskRunId, "CANCEL_RUN", TaskRunStatus.CANCELLED, reason);
    }

    public ControlResult stopRun(String taskRunId, String reason) {
        return applyControl(taskRunId, "STOP_RUN", TaskRunStatus.CANCELLED, reason);
    }

    private ControlResult applyControl(
            String taskRunId,
            String action,
            TaskRunStatus targetStatus,
            String reason) {
        Instant now = timeProvider.now();
        TaskRun taskRun = taskRepository.findTaskRunById(new TaskRunId(taskRunId))
                .orElseThrow(() -> new NoSuchElementException("TaskRun not found: " + taskRunId));

        if (isTerminal(taskRun.getStatus())) {
            safePublishRejected(taskRun, action, reason, "TaskRun is already terminal: " + taskRun.getStatus());
            safeRecordAudit(
                    taskRun.getConversationId(),
                    action,
                    "TASK_RUN",
                    taskRun.getId().value(),
                    "REJECTED",
                    "Realtime control command rejected because TaskRun is already terminal: " + taskRun.getStatus());
            return new ControlResult(
                    false,
                    action,
                    taskRun.getId().value(),
                    taskRun.getConversationId().value(),
                    taskRun.getStatus().name(),
                    taskRun.getStatus().name(),
                    "TaskRun is already terminal: " + taskRun.getStatus());
        }

        String summary = "Realtime control command " + action + " accepted."
                + (reason == null || reason.isBlank() ? "" : " Reason: " + reason);
        runCancellationRegistry.request(
                taskRun.getConversationId().value(),
                taskRun.getId().value(),
                action,
                reason);
        TaskRun updated = taskRepository.saveTaskRun(taskRun.withStatus(targetStatus, summary, now));
        RealtimeEvent event = realtimeEventPublisher.publish(
                updated.getConversationId(),
                RealtimeEventType.CONTROL_COMMAND_RECEIVED,
                "TASK_RUN",
                updated.getId().value(),
                Map.of(
                        "action", action,
                        "status", updated.getStatus().name(),
                        "reason", reason == null ? "" : reason));
        realtimeEventPublisher.publish(
                updated.getConversationId(),
                RealtimeEventType.TASK_RUN_UPDATED,
                "TASK_RUN",
                updated.getId().value(),
                Map.of(
                        "status", updated.getStatus().name(),
                        "controlAction", action));
        realtimeRunStateService.complete(
                updated.getConversationId().value(),
                updated.getId().value(),
                null,
                updated.getStatus().name(),
                event.getEventId(),
                summary,
                java.util.List.of("taskRun:" + updated.getId().value()),
                now);
        safeRecordAudit(
                updated.getConversationId(),
                action,
                "TASK_RUN",
                updated.getId().value(),
                "ACCEPTED",
                summary);
        return new ControlResult(
                true,
                action,
                updated.getId().value(),
                updated.getConversationId().value(),
                taskRun.getStatus().name(),
                updated.getStatus().name(),
                summary);
    }

    private void safePublishRejected(TaskRun taskRun, String action, String reason, String rejectionReason) {
        try {
            realtimeEventPublisher.publish(
                    taskRun.getConversationId(),
                    RealtimeEventType.CONTROL_COMMAND_REJECTED,
                    "TASK_RUN",
                    taskRun.getId().value(),
                    Map.of(
                            "action", action,
                            "reason", reason == null ? "" : reason,
                            "rejectionReason", rejectionReason));
        } catch (RuntimeException ignored) {
            // Control commands should still return a deterministic result even if realtime notification fails.
        }
    }

    private void safeRecordAudit(
            com.agenthub.domain.conversation.ConversationId conversationId,
            String action,
            String targetType,
            String targetId,
            String status,
            String summary) {
        try {
            actionAuditService.record(conversationId, action, targetType, targetId, status, summary);
        } catch (RuntimeException ignored) {
            // Audit is important but must not turn a rejected/accepted control command into a 500 response.
        }
    }

    private boolean isTerminal(TaskRunStatus status) {
        return status == TaskRunStatus.COMPLETED
                || status == TaskRunStatus.FAILED
                || status == TaskRunStatus.BLOCKED
                || status == TaskRunStatus.CANCELLED;
    }

    public record ControlResult(
            boolean accepted,
            String action,
            String taskRunId,
            String conversationId,
            String previousStatus,
            String status,
            String message) {
    }
}
