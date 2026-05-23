package com.agenthub.domain.context;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;
import java.util.List;

public class ContextSnapshot {

    private final ContextSnapshotId id;
    private final ConversationId conversationId;
    private final TaskRunId taskRunId;
    private final List<MessageId> includedMessageIds;
    private final List<ArtifactId> includedArtifactIds;
    private final List<String> pinnedContextItems;
    private final List<RetrievedContextItem> retrievedContextItems;
    private final String summary;
    private final Instant createdAt;

    public ContextSnapshot(
            ContextSnapshotId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            List<MessageId> includedMessageIds,
            List<ArtifactId> includedArtifactIds,
            List<String> pinnedContextItems,
            String summary,
            Instant createdAt) {
        this(
                id,
                conversationId,
                taskRunId,
                includedMessageIds,
                includedArtifactIds,
                pinnedContextItems,
                List.of(),
                summary,
                createdAt);
    }

    public ContextSnapshot(
            ContextSnapshotId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            List<MessageId> includedMessageIds,
            List<ArtifactId> includedArtifactIds,
            List<String> pinnedContextItems,
            List<RetrievedContextItem> retrievedContextItems,
            String summary,
            Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.taskRunId = taskRunId;
        this.includedMessageIds = List.copyOf(includedMessageIds);
        this.includedArtifactIds = List.copyOf(includedArtifactIds);
        this.pinnedContextItems = List.copyOf(pinnedContextItems);
        this.retrievedContextItems = retrievedContextItems == null ? List.of() : List.copyOf(retrievedContextItems);
        this.summary = summary;
        this.createdAt = createdAt;
    }

    public ContextSnapshotId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public List<MessageId> getIncludedMessageIds() {
        return includedMessageIds;
    }

    public List<ArtifactId> getIncludedArtifactIds() {
        return includedArtifactIds;
    }

    public List<String> getPinnedContextItems() {
        return pinnedContextItems;
    }

    public List<RetrievedContextItem> getRetrievedContextItems() {
        return retrievedContextItems;
    }

    public String getSummary() {
        return summary;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
