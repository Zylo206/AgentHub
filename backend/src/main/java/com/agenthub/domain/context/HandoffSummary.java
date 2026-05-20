package com.agenthub.domain.context;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskStepId;
import java.time.Instant;
import java.util.List;

public class HandoffSummary {

    private final String id;
    private final TaskRunId taskRunId;
    private final TaskStepId sourceStepId;
    private final TaskStepId targetStepId;
    private final String sourceAgentId;
    private final String targetAgentId;
    private final List<ArtifactId> passedArtifactIds;
    private final List<String> keyDecisions;
    private final List<String> openIssues;
    private final String summary;
    private final Instant createdAt;

    public HandoffSummary(
            String id,
            TaskRunId taskRunId,
            TaskStepId sourceStepId,
            TaskStepId targetStepId,
            String sourceAgentId,
            String targetAgentId,
            List<ArtifactId> passedArtifactIds,
            List<String> keyDecisions,
            List<String> openIssues,
            String summary,
            Instant createdAt) {
        this.id = id;
        this.taskRunId = taskRunId;
        this.sourceStepId = sourceStepId;
        this.targetStepId = targetStepId;
        this.sourceAgentId = sourceAgentId;
        this.targetAgentId = targetAgentId;
        this.passedArtifactIds = List.copyOf(passedArtifactIds);
        this.keyDecisions = List.copyOf(keyDecisions);
        this.openIssues = List.copyOf(openIssues);
        this.summary = summary;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public TaskStepId getSourceStepId() {
        return sourceStepId;
    }

    public TaskStepId getTargetStepId() {
        return targetStepId;
    }

    public String getSourceAgentId() {
        return sourceAgentId;
    }

    public String getTargetAgentId() {
        return targetAgentId;
    }

    public List<ArtifactId> getPassedArtifactIds() {
        return passedArtifactIds;
    }

    public List<String> getKeyDecisions() {
        return keyDecisions;
    }

    public List<String> getOpenIssues() {
        return openIssues;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
