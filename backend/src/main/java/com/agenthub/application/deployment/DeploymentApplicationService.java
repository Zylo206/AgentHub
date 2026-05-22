package com.agenthub.application.deployment;

import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.deployment.DeploymentRecord;
import com.agenthub.domain.deployment.DeploymentRepository;
import com.agenthub.domain.deployment.DeploymentStatus;
import com.agenthub.domain.message.MessageType;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class DeploymentApplicationService {

    private static final String DEPLOY_TARGET = "STATIC_PREVIEW";

    private final ArtifactRepository artifactRepository;
    private final DeploymentRepository deploymentRepository;
    private final MessageApplicationService messageApplicationService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public DeploymentApplicationService(
            ArtifactRepository artifactRepository,
            DeploymentRepository deploymentRepository,
            MessageApplicationService messageApplicationService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.artifactRepository = artifactRepository;
        this.deploymentRepository = deploymentRepository;
        this.messageApplicationService = messageApplicationService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public DeploymentRecord createDemoDeployment(String artifactId) {
        Artifact artifact = artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));

        String deploymentId = idGenerator.nextId("deploy");
        String previewUrl = "http://localhost:5173/preview/" + artifact.getId().value();
        String message = "Static demo deployment completed. No real external deployment was executed.";
        DeploymentRecord deploymentRecord = new DeploymentRecord(
                deploymentId,
                artifact.getId(),
                artifact.getConversationId(),
                artifact.getTaskRunId(),
                artifact.getTitle(),
                DEPLOY_TARGET,
                DeploymentStatus.SUCCESS,
                previewUrl,
                message,
                timeProvider.now());

        DeploymentRecord saved = deploymentRepository.save(deploymentRecord);
        appendDeployStatusMessage(saved);
        return saved;
    }

    public List<DeploymentRecord> listDeploymentsByConversation(String conversationId) {
        return deploymentRepository.findByConversationId(new ConversationId(conversationId));
    }

    public List<DeploymentRecord> listDeploymentsByArtifact(String artifactId) {
        return deploymentRepository.findByArtifactId(new ArtifactId(artifactId));
    }

    public DeploymentRecord getDeployment(String deploymentId) {
        return deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new NoSuchElementException("Deployment not found: " + deploymentId));
    }

    private void appendDeployStatusMessage(DeploymentRecord deploymentRecord) {
        String content = "Static demo deployment completed for "
                + deploymentRecord.getArtifactTitle()
                + ". Preview URL: "
                + deploymentRecord.getPreviewUrl()
                + "\nDeployment ID: "
                + deploymentRecord.getDeploymentId()
                + "\nTarget: "
                + deploymentRecord.getDeployTarget()
                + "\nStatus: "
                + deploymentRecord.getStatus();

        messageApplicationService.appendSystemMessage(
                deploymentRecord.getConversationId().value(),
                MessageType.DEPLOY_STATUS,
                content,
                List.of(deploymentRecord.getArtifactId()));
    }
}
