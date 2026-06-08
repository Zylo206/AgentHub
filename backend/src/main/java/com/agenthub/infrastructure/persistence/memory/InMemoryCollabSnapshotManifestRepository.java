package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.application.collab.CollabSnapshotManifestRepository;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryCollabSnapshotManifestRepository implements CollabSnapshotManifestRepository {

    private final ConcurrentHashMap<String, CollabSnapshotManifest> storage = new ConcurrentHashMap<>();

    @Override
    public Optional<CollabSnapshotManifest> findByArtifactId(String artifactId) {
        return Optional.ofNullable(storage.get(artifactId));
    }

    @Override
    public CollabSnapshotManifest save(CollabSnapshotManifest manifest) {
        storage.put(manifest.artifactId(), manifest);
        return manifest;
    }
}
