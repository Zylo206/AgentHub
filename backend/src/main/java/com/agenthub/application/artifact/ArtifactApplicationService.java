package com.agenthub.application.artifact;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class ArtifactApplicationService {

    private final ArtifactRepository artifactRepository;

    public ArtifactApplicationService(ArtifactRepository artifactRepository) {
        this.artifactRepository = artifactRepository;
    }

    public List<Artifact> listArtifactsByConversation(String conversationId) {
        return artifactRepository.findByConversationId(new ConversationId(conversationId));
    }

    public List<Artifact> listArtifactsByTaskRun(String taskRunId) {
        return artifactRepository.findByTaskRunId(new TaskRunId(taskRunId));
    }

    public Artifact getArtifact(String artifactId) {
        return artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));
    }
}
