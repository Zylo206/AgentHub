package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.List;
import java.util.Optional;

public interface ArtifactRepository {

    Artifact save(Artifact artifact);

    Optional<Artifact> findById(ArtifactId artifactId);

    List<Artifact> findByConversationId(ConversationId conversationId);

    List<Artifact> findByTaskRunId(TaskRunId taskRunId);
}
