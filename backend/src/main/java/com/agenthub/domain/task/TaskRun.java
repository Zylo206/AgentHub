package com.agenthub.domain.task;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;

public class TaskRun {

    private final TaskRunId id;
    private final ConversationId conversationId;
    private final TaskSpecId taskSpecId;
    private final TaskRunStatus status;
    private final TaskPlan taskPlan;
    private final List<TaskStep> steps;
    private final TaskGraph taskGraph;
    private final String resultSummary;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TaskRun(
            TaskRunId id,
            ConversationId conversationId,
            TaskSpecId taskSpecId,
            TaskRunStatus status,
            TaskPlan taskPlan,
            List<TaskStep> steps,
            String resultSummary,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskSpecId,
                status,
                taskPlan,
                steps,
                TaskGraph.fromSteps(steps),
                resultSummary,
                createdAt,
                updatedAt);
    }

    public TaskRun(
            TaskRunId id,
            ConversationId conversationId,
            TaskSpecId taskSpecId,
            TaskRunStatus status,
            TaskPlan taskPlan,
            List<TaskStep> steps,
            TaskGraph taskGraph,
            String resultSummary,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.taskSpecId = taskSpecId;
        this.status = status;
        this.taskPlan = taskPlan;
        this.steps = List.copyOf(steps);
        this.taskGraph = taskGraph == null ? TaskGraph.fromSteps(steps) : taskGraph;
        this.resultSummary = resultSummary;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public TaskRunId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public TaskSpecId getTaskSpecId() {
        return taskSpecId;
    }

    public TaskRunStatus getStatus() {
        return status;
    }

    public TaskPlan getTaskPlan() {
        return taskPlan;
    }

    public List<TaskStep> getSteps() {
        return steps;
    }

    public TaskGraph getTaskGraph() {
        return taskGraph;
    }

    public String getResultSummary() {
        return resultSummary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
