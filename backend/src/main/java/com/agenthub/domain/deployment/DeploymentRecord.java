package com.agenthub.domain.deployment;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;

public class DeploymentRecord {

    private final String deploymentId;
    private final ArtifactId artifactId;
    private final ConversationId conversationId;
    private final TaskRunId taskRunId;
    private final String artifactTitle;
    private final String deployTarget;
    private final DeploymentStatus status;
    private final String previewUrl;
    private final String message;
    private final Instant createdAt;

    public DeploymentRecord(
            String deploymentId,
            ArtifactId artifactId,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String artifactTitle,
            String deployTarget,
            DeploymentStatus status,
            String previewUrl,
            String message,
            Instant createdAt) {
        this.deploymentId = deploymentId;
        this.artifactId = artifactId;
        this.conversationId = conversationId;
        this.taskRunId = taskRunId;
        this.artifactTitle = artifactTitle;
        this.deployTarget = deployTarget;
        this.status = status;
        this.previewUrl = previewUrl;
        this.message = message;
        this.createdAt = createdAt;
    }

    public String getDeploymentId() {
        return deploymentId;
    }

    public ArtifactId getArtifactId() {
        return artifactId;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public String getArtifactTitle() {
        return artifactTitle;
    }

    public String getDeployTarget() {
        return deployTarget;
    }

    public DeploymentStatus getStatus() {
        return status;
    }

    public String getPreviewUrl() {
        return previewUrl;
    }

    public String getMessage() {
        return message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
