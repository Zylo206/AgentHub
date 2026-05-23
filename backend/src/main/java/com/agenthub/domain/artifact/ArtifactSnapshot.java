package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;

public class ArtifactSnapshot {

    private final String snapshotId;
    private final ArtifactId artifactId;
    private final ConversationId conversationId;
    private final TaskRunId taskRunId;
    private final String title;
    private final ArtifactType type;
    private final ArtifactStatus status;
    private final String language;
    private final String content;
    private final int version;
    private final String operationType;
    private final Instant createdAt;

    public ArtifactSnapshot(
            String snapshotId,
            ArtifactId artifactId,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            String operationType,
            Instant createdAt) {
        this.snapshotId = snapshotId;
        this.artifactId = artifactId;
        this.conversationId = conversationId;
        this.taskRunId = taskRunId;
        this.title = title;
        this.type = type;
        this.status = status;
        this.language = language;
        this.content = content;
        this.version = version;
        this.operationType = operationType;
        this.createdAt = createdAt;
    }

    public String getSnapshotId() {
        return snapshotId;
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

    public String getTitle() {
        return title;
    }

    public ArtifactType getType() {
        return type;
    }

    public ArtifactStatus getStatus() {
        return status;
    }

    public String getLanguage() {
        return language;
    }

    public String getContent() {
        return content;
    }

    public int getVersion() {
        return version;
    }

    public String getOperationType() {
        return operationType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
