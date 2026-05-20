package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;

public class Artifact {

    private final ArtifactId id;
    private final ConversationId conversationId;
    private final TaskRunId taskRunId;
    private final String parentArtifactId;
    private final String revisionInstruction;
    private final String title;
    private final ArtifactType type;
    private final ArtifactStatus status;
    private final String language;
    private final String content;
    private final int version;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                null,
                null,
                title,
                type,
                status,
                language,
                content,
                version,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.taskRunId = taskRunId;
        this.parentArtifactId = parentArtifactId;
        this.revisionInstruction = revisionInstruction;
        this.title = title;
        this.type = type;
        this.status = status;
        this.language = language;
        this.content = content;
        this.version = version;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public ArtifactId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public String getParentArtifactId() {
        return parentArtifactId;
    }

    public String getRevisionInstruction() {
        return revisionInstruction;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
