package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactSnapshot;
import com.agenthub.domain.artifact.ArtifactSnapshotRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryArtifactSnapshotRepository implements ArtifactSnapshotRepository {

    private final ConcurrentHashMap<String, ArtifactSnapshot> storage = new ConcurrentHashMap<>();

    @Override
    public ArtifactSnapshot save(ArtifactSnapshot snapshot) {
        storage.put(snapshot.getSnapshotId(), snapshot);
        return snapshot;
    }

    @Override
    public Optional<ArtifactSnapshot> findById(String snapshotId) {
        return Optional.ofNullable(storage.get(snapshotId));
    }

    @Override
    public List<ArtifactSnapshot> findByArtifactId(ArtifactId artifactId) {
        return storage.values().stream()
                .filter(snapshot -> snapshot.getArtifactId().equals(artifactId))
                .sorted(Comparator.comparing(ArtifactSnapshot::getCreatedAt))
                .toList();
    }

    @Override
    public List<ArtifactSnapshot> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(snapshot -> snapshot.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(ArtifactSnapshot::getCreatedAt))
                .toList();
    }
}
