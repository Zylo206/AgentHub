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
    private final String summary;

    public TaskGraph(String graphType, List<ExecutionBatch> executionBatches, String summary) {
        this.graphType = graphType;
        this.executionBatches = List.copyOf(executionBatches);
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
                    String batchStatus = entry.getValue().stream()
                            .allMatch(step -> step.getStatus() == TaskStepStatus.COMPLETED)
                            ? "COMPLETED"
                            : "FAILED";
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

        long parallelBatchCount = batches.stream()
                .filter(batch -> batch.getStepOrders().size() > 1)
                .count();
        return new TaskGraph(
                "ORCHESTRATOR_TASK_GRAPH",
                batches,
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

    public String getGraphType() {
        return graphType;
    }

    public List<ExecutionBatch> getExecutionBatches() {
        return executionBatches;
    }

    public String getSummary() {
        return summary;
    }
}
