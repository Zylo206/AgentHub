package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryArtifactRepository implements ArtifactRepository {

    private final ConcurrentHashMap<String, Artifact> storage = new ConcurrentHashMap<>();

    @Override
    public Artifact save(Artifact artifact) {
        storage.put(artifact.getId().value(), artifact);
        return artifact;
    }

    @Override
    public Optional<Artifact> findById(ArtifactId artifactId) {
        return Optional.ofNullable(storage.get(artifactId.value()));
    }

    @Override
    public List<Artifact> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(artifact -> artifact.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(Artifact::getCreatedAt))
                .toList();
    }

    @Override
    public List<Artifact> findByTaskRunId(TaskRunId taskRunId) {
        return storage.values().stream()
                .filter(artifact -> artifact.getTaskRunId().equals(taskRunId))
                .sorted(Comparator.comparing(Artifact::getCreatedAt))
                .toList();
    }
}
