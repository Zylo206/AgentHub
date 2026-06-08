package com.agenthub.application.task;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.domain.audit.ActionAuditLog;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskStep;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class TaskRunObservabilityService {

    private final TaskRepository taskRepository;
    private final ActionAuditService actionAuditService;

    public TaskRunObservabilityService(
            TaskRepository taskRepository,
            ActionAuditService actionAuditService) {
        this.taskRepository = taskRepository;
        this.actionAuditService = actionAuditService;
    }

    public TaskRunObservabilitySummary summarizeConversation(String conversationId) {
        List<TaskRun> taskRuns = taskRepository.findTaskRunsByConversationId(new ConversationId(conversationId));
        List<ActionAuditLog> audits = actionAuditService.listByConversation(conversationId);
        List<TaskStep> steps = taskRuns.stream()
                .flatMap(taskRun -> taskRun.getSteps().stream())
                .toList();

        int timelineEntryCount = taskRuns.stream()
                .mapToInt(taskRun -> taskRun.getTimeline().size())
                .sum();
        int retryCount = taskRuns.stream()
                .mapToInt(TaskRun::getRetryCount)
                .sum();
        int fallbackCount = (int) steps.stream()
                .filter(step -> "FALLBACK".equalsIgnoreCase(step.getTerminalStatus())
                        || "FALLBACK".equalsIgnoreCase(step.getRealAdapterOutcome()))
                .count();
        int discardedResultCount = (int) steps.stream()
                .filter(step -> step.getDiscardedReason() != null && !step.getDiscardedReason().isBlank())
                .count();
        int approvalBypassAttempts = (int) audits.stream()
                .filter(audit -> "APPROVAL_BYPASS_ATTEMPT".equalsIgnoreCase(audit.getActionType()))
                .count();

        return new TaskRunObservabilitySummary(
                taskRuns.size(),
                timelineEntryCount,
                retryCount,
                fallbackCount,
                discardedResultCount,
                approvalBypassAttempts,
                summarizeCounts(steps.stream()
                        .map(TaskStep::getFailureType)
                        .filter(Objects::nonNull)
                        .filter(value -> !value.isBlank()),
                        6),
                summarizeCounts(audits.stream()
                        .map(this::resolveConflictType)
                        .filter(Objects::nonNull)
                        .filter(value -> !value.isBlank()),
                        6),
                summarizeCounts(steps.stream()
                        .filter(step -> "FALLBACK".equalsIgnoreCase(step.getTerminalStatus())
                                || "FALLBACK".equalsIgnoreCase(step.getRealAdapterOutcome()))
                        .map(this::resolveFallbackReason)
                        .filter(Objects::nonNull)
                        .filter(value -> !value.isBlank()),
                        6),
                summarizeCounts(steps.stream()
                        .map(TaskStep::getDiscardedReason)
                        .filter(Objects::nonNull)
                        .filter(value -> !value.isBlank()),
                        6));
    }

    private String resolveConflictType(ActionAuditLog auditLog) {
        if (!"CONFLICT".equalsIgnoreCase(auditLog.getStatus())) {
            return null;
        }
        String summary = auditLog.getSummary();
        if (summary == null || summary.isBlank()) {
            return "TEXT_CONFLICT";
        }
        String marker = "conflictType=";
        int start = summary.indexOf(marker);
        if (start < 0) {
            return "TEXT_CONFLICT";
        }
        int valueStart = start + marker.length();
        int end = summary.indexOf(';', valueStart);
        String value = end >= 0 ? summary.substring(valueStart, end) : summary.substring(valueStart);
        return value.trim().isEmpty() ? "TEXT_CONFLICT" : value.trim();
    }

    private String resolveFallbackReason(TaskStep step) {
        if (step.getArtifactQualityReason() != null && !step.getArtifactQualityReason().isBlank()) {
            return step.getArtifactQualityReason();
        }
        if (step.getAdapterErrorMessage() != null && !step.getAdapterErrorMessage().isBlank()) {
            return step.getAdapterErrorMessage();
        }
        if (step.getAdapterResponseSummary() != null && !step.getAdapterResponseSummary().isBlank()) {
            return step.getAdapterResponseSummary();
        }
        return step.getFallbackStrategy();
    }

    private List<ValueCount> summarizeCounts(java.util.stream.Stream<String> stream, int limit) {
        Map<String, Long> counts = stream
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(entry -> entry.getKey().toLowerCase(Locale.ROOT)))
                .limit(limit)
                .map(entry -> new ValueCount(entry.getKey(), entry.getValue().intValue()))
                .toList();
    }

    public record TaskRunObservabilitySummary(
            int taskRunCount,
            int timelineEntryCount,
            int retryCount,
            int fallbackCount,
            int discardedResultCount,
            int approvalBypassAttempts,
            List<ValueCount> failureTypes,
            List<ValueCount> conflictTypes,
            List<ValueCount> fallbackReasons,
            List<ValueCount> discardedReasons) {
    }

    public record ValueCount(String label, int count) {
    }
}
