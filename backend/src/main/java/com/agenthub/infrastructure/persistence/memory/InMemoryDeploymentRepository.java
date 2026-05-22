package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.deployment.DeploymentRecord;
import com.agenthub.domain.deployment.DeploymentRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryDeploymentRepository implements DeploymentRepository {

    private final ConcurrentHashMap<String, DeploymentRecord> storage = new ConcurrentHashMap<>();

    @Override
    public DeploymentRecord save(DeploymentRecord deploymentRecord) {
        storage.put(deploymentRecord.getDeploymentId(), deploymentRecord);
        return deploymentRecord;
    }

    @Override
    public Optional<DeploymentRecord> findById(String deploymentId) {
        return Optional.ofNullable(storage.get(deploymentId));
    }

    @Override
    public List<DeploymentRecord> findByArtifactId(ArtifactId artifactId) {
        return storage.values().stream()
                .filter(deployment -> deployment.getArtifactId().equals(artifactId))
                .sorted(Comparator.comparing(DeploymentRecord::getCreatedAt).reversed())
                .toList();
    }

    @Override
    public List<DeploymentRecord> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(deployment -> deployment.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(DeploymentRecord::getCreatedAt).reversed())
                .toList();
    }
}
