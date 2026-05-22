package com.agenthub.domain.deployment;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface DeploymentRepository {

    DeploymentRecord save(DeploymentRecord deploymentRecord);

    Optional<DeploymentRecord> findById(String deploymentId);

    List<DeploymentRecord> findByArtifactId(ArtifactId artifactId);

    List<DeploymentRecord> findByConversationId(ConversationId conversationId);
}
