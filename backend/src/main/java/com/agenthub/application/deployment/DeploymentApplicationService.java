package com.agenthub.application.deployment;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.message.MessageApplicationService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactSnapshot;
import com.agenthub.domain.artifact.ArtifactSnapshotRepository;
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
    private final ArtifactSnapshotRepository artifactSnapshotRepository;
    private final DeploymentRepository deploymentRepository;
    private final ConversationAccessService conversationAccessService;
    private final MessageApplicationService messageApplicationService;
    private final ActionAuditService actionAuditService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public DeploymentApplicationService(
            ArtifactRepository artifactRepository,
            ArtifactSnapshotRepository artifactSnapshotRepository,
            DeploymentRepository deploymentRepository,
            ConversationAccessService conversationAccessService,
            MessageApplicationService messageApplicationService,
            ActionAuditService actionAuditService,
            RealtimeEventPublisher realtimeEventPublisher,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.artifactRepository = artifactRepository;
        this.artifactSnapshotRepository = artifactSnapshotRepository;
        this.deploymentRepository = deploymentRepository;
        this.conversationAccessService = conversationAccessService;
        this.messageApplicationService = messageApplicationService;
        this.actionAuditService = actionAuditService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public DeploymentRecord createDemoDeployment(String artifactId) {
        Artifact artifact = artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));
        conversationAccessService.requireWritable(artifact.getConversationId().value());
        ArtifactSnapshot snapshot = artifactSnapshotRepository.save(new ArtifactSnapshot(
                idGenerator.nextId("snapshot"),
                artifact.getId(),
                artifact.getConversationId(),
                artifact.getTaskRunId(),
                artifact.getTitle(),
                artifact.getType(),
                artifact.getStatus(),
                artifact.getLanguage(),
                artifact.getContent(),
                artifact.getVersion(),
                "DEMO_DEPLOY",
                timeProvider.now()));

        String deploymentId = idGenerator.nextId("deploy");
        String previewUrl = "http://localhost:8080/deploy/" + deploymentId;
        String message = "Static preview deployed. Accessible at the preview URL.";
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
        realtimeEventPublisher.publish(
                saved.getConversationId(),
                RealtimeEventType.DEPLOYMENT_CREATED,
                "DEPLOYMENT",
                saved.getDeploymentId(),
                java.util.Map.of(
                        "artifactId", saved.getArtifactId().value(),
                        "status", saved.getStatus().name(),
                        "previewUrl", saved.getPreviewUrl()));
        actionAuditService.record(
                artifact.getConversationId(),
                "DEMO_DEPLOY",
                "ARTIFACT",
                artifact.getId().value(),
                "COMPLETED",
                "Created deploy snapshot " + snapshot.getSnapshotId() + " and static preview URL "
                        + saved.getPreviewUrl() + ".");
        return saved;
    }

    public List<DeploymentRecord> listDeploymentsByConversation(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return deploymentRepository.findByConversationId(new ConversationId(conversationId));
    }

    public List<DeploymentRecord> listDeploymentsByArtifact(String artifactId) {
        Artifact artifact = artifactRepository.findById(new ArtifactId(artifactId))
                .orElseThrow(() -> new NoSuchElementException("Artifact not found: " + artifactId));
        conversationAccessService.requireReadable(artifact.getConversationId().value());
        return deploymentRepository.findByArtifactId(new ArtifactId(artifactId));
    }

    public DeploymentRecord getDeployment(String deploymentId) {
        DeploymentRecord record = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new NoSuchElementException("Deployment not found: " + deploymentId));
        conversationAccessService.requireReadable(record.getConversationId().value());
        return record;
    }

    private void appendDeployStatusMessage(DeploymentRecord deploymentRecord) {
        String content = "Static preview deployed for "
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
