package com.agenthub.domain.task;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.Duration;
import java.time.Instant;

public class TaskGraph {

    private final String graphType;
    private final List<ExecutionBatch> executionBatches;
    private final List<TaskGraphNode> nodes;
    private final String summary;

    public TaskGraph(String graphType, List<ExecutionBatch> executionBatches, String summary) {
        this(graphType, executionBatches, List.of(), summary);
    }

    public TaskGraph(
            String graphType,
            List<ExecutionBatch> executionBatches,
            List<TaskGraphNode> nodes,
            String summary) {
        this.graphType = graphType;
        this.executionBatches = List.copyOf(executionBatches);
        this.nodes = nodes == null ? List.of() : List.copyOf(nodes);
        this.summary = summary;
    }

    public static TaskGraph fromSteps(List<TaskStep> steps) {
        Map<String, List<TaskStep>> stepsByGroup = new LinkedHashMap<>();
        steps.stream()
                .sorted(Comparator.comparingInt(TaskStep::getStepOrder))
                .forEach(step -> {
                    String groupKey = step.getParallelGroupKey() == null || step.getParallelGroupKey().isBlank()
                            ? "GROUP_" + step.getStepOrder()
                            : step.getParallelGroupKey();
                    stepsByGroup.putIfAbsent(groupKey, new ArrayList<>());
                    stepsByGroup.get(groupKey).add(step);
                });

        List<ExecutionBatch> batches = stepsByGroup.entrySet().stream()
                .map(entry -> {
                    List<Integer> stepOrders = entry.getValue().stream()
                            .map(TaskStep::getStepOrder)
                            .toList();
                    List<String> dependsOnBatchKeys = entry.getValue().stream()
                            .flatMap(step -> step.getDependsOnStepOrders().stream())
                            .map(dependsOnStepOrder -> findGroupForStep(stepsByGroup, dependsOnStepOrder))
                            .filter(groupKey -> groupKey != null && !groupKey.equals(entry.getKey()))
                            .distinct()
                            .toList();
                    String executionMode = entry.getValue().size() > 1 ? "PARALLEL_COMPLETABLE_FUTURE" : "SEQUENTIAL";
                    Instant startedAt = entry.getValue().stream()
                            .map(TaskStep::getCreatedAt)
                            .min(Instant::compareTo)
                            .orElse(null);
                    Instant completedAt = entry.getValue().stream()
                            .map(TaskStep::getUpdatedAt)
                            .max(Instant::compareTo)
                            .orElse(null);
                    Long durationMs = startedAt == null || completedAt == null
                            ? null
                            : Math.max(0, Duration.between(startedAt, completedAt).toMillis());
                    String batchStatus = resolveBatchStatus(entry.getValue());
                    return new ExecutionBatch(
                            entry.getKey(),
                            stepOrders,
                            dependsOnBatchKeys,
                            executionMode,
                            batchStatus,
                            startedAt,
                            completedAt,
                            durationMs,
                            "STEP_FALLBACK_TO_MOCK");
                })
                .toList();
        List<TaskGraphNode> nodes = steps.stream()
                .sorted(Comparator.comparingInt(TaskStep::getStepOrder))
                .map(step -> new TaskGraphNode(
                        step.getNodeId(),
                        step.getNodeType(),
                        step.getStepOrder(),
                        step.getDependsOnStepOrders().stream()
                                .map(dependsOnStepOrder -> findStepByOrder(steps, dependsOnStepOrder))
                                .filter(match -> match != null)
                                .map(TaskStep::getNodeId)
                                .distinct()
                                .toList(),
                        step.getRetryPolicy(),
                        step.getTimeoutSeconds(),
                        step.getIdempotencyKey(),
                        step.getFallbackStrategy(),
                        step.getNodeStatus(),
                        step.getTerminalStatus(),
                        step.getRetryAttempt(),
                        step.getExecutionToken(),
                        step.getLeaseVersion(),
                        step.getStartedAt(),
                        step.getCompletedAt(),
                        step.getFailureType(),
                        step.getDiscardedReason(),
                        step.getFinalDecision()))
                .toList();

        long parallelBatchCount = batches.stream()
                .filter(batch -> batch.getStepOrders().size() > 1)
                .count();
        return new TaskGraph(
                "ORCHESTRATOR_TASK_GRAPH",
                batches,
                nodes,
                "TaskGraph contains " + batches.size() + " execution batch(es), "
                        + parallelBatchCount + " parallel batch(es).");
    }

    private static String findGroupForStep(Map<String, List<TaskStep>> stepsByGroup, Integer stepOrder) {
        if (stepOrder == null) {
            return null;
        }
        return stepsByGroup.entrySet().stream()
                .filter(entry -> entry.getValue().stream().anyMatch(step -> step.getStepOrder() == stepOrder))
                .map(Map.Entry::getKey)
                .findFirst()
                .orElse(null);
    }

    private static TaskStep findStepByOrder(List<TaskStep> steps, Integer stepOrder) {
        if (stepOrder == null) {
            return null;
        }
        return steps.stream()
                .filter(step -> step.getStepOrder() == stepOrder)
                .findFirst()
                .orElse(null);
    }

    private static String resolveBatchStatus(List<TaskStep> steps) {
        if (steps.stream().anyMatch(step -> "STOPPED".equals(step.getAdapterStatus()))) {
            return "STOPPED";
        }
        if (steps.stream().anyMatch(step -> "CANCELLED".equals(step.getAdapterStatus()))) {
            return "CANCELLED";
        }
        if (steps.stream().anyMatch(step -> step.getStatus() == TaskStepStatus.FAILED)) {
            return "FAILED";
        }
        if (steps.stream().allMatch(step -> step.getStatus() == TaskStepStatus.SKIPPED)) {
            return "SKIPPED";
        }
        if (steps.stream().allMatch(step -> step.getStatus() == TaskStepStatus.COMPLETED)) {
            return "COMPLETED";
        }
        return "PARTIAL";
    }

    public String getGraphType() {
        return graphType;
    }

    public List<ExecutionBatch> getExecutionBatches() {
        return executionBatches;
    }

    public List<TaskGraphNode> getNodes() {
        return nodes;
    }

    public String getSummary() {
        return summary;
    }
}
