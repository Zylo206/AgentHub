package com.agenthub.domain.task;

import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.artifact.ArtifactId;
import java.time.Instant;
import java.util.List;

public class TaskStep {

    private final TaskStepId id;
    private final TaskRunId taskRunId;
    private final int stepOrder;
    private final AgentId assignedAgentId;
    private final String taskDescription;
    private final TaskStepStatus status;
    private final String inputContext;
    private final String outputContent;
    private final List<ArtifactId> producedArtifactIds;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.taskRunId = taskRunId;
        this.stepOrder = stepOrder;
        this.assignedAgentId = assignedAgentId;
        this.taskDescription = taskDescription;
        this.status = status;
        this.inputContext = inputContext;
        this.outputContent = outputContent;
        this.producedArtifactIds = List.copyOf(producedArtifactIds);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public TaskStepId getId() {
        return id;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public AgentId getAssignedAgentId() {
        return assignedAgentId;
    }

    public String getTaskDescription() {
        return taskDescription;
    }

    public TaskStepStatus getStatus() {
        return status;
    }

    public String getInputContext() {
        return inputContext;
    }

    public String getOutputContent() {
        return outputContent;
    }

    public List<ArtifactId> getProducedArtifactIds() {
        return producedArtifactIds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
