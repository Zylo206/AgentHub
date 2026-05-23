package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface ArtifactSnapshotRepository {

    ArtifactSnapshot save(ArtifactSnapshot snapshot);

    Optional<ArtifactSnapshot> findById(String snapshotId);

    List<ArtifactSnapshot> findByArtifactId(ArtifactId artifactId);

    List<ArtifactSnapshot> findByConversationId(ConversationId conversationId);
}
