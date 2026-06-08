package com.agenthub.application.collab;

import com.agenthub.application.artifact.ArtifactApplicationService;
import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.storage.ObjectStorageClient;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.conversation.ConversationId;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CollabSnapshotStorageService {

    private final ArtifactApplicationService artifactApplicationService;
    private final ConversationAccessService conversationAccessService;
    private final CollabSnapshotManifestRepository repository;
    private final ObjectStorageClient objectStorageClient;
    private final ActionAuditService actionAuditService;
    private final TimeProvider timeProvider;
    private final String bucket;

    public CollabSnapshotStorageService(
            ArtifactApplicationService artifactApplicationService,
            ConversationAccessService conversationAccessService,
            CollabSnapshotManifestRepository repository,
            ObjectStorageClient objectStorageClient,
            ActionAuditService actionAuditService,
            TimeProvider timeProvider,
            @Value("${agenthub.collaboration.v2.snapshot-object-storage.bucket:doc-collab-snapshots}") String bucket) {
        this.artifactApplicationService = artifactApplicationService;
        this.conversationAccessService = conversationAccessService;
        this.repository = repository;
        this.objectStorageClient = objectStorageClient;
        this.actionAuditService = actionAuditService;
        this.timeProvider = timeProvider;
        this.bucket = bucket == null || bucket.isBlank() ? "doc-collab-snapshots" : bucket.trim();
    }

    public SnapshotPayload loadLatest(String artifactId) {
        Artifact artifact = loadCollaborativeArtifact(artifactId, false);
        CollabSnapshotManifestRepository.CollabSnapshotManifest manifest = repository.findByArtifactId(artifactId)
                .orElseThrow(() -> new NoSuchElementException("No collaboration snapshot manifest for artifact " + artifactId));
        try {
            ObjectStorageClient.ObjectContent content = objectStorageClient.open(manifest.storageBucket(), manifest.storageKey());
            try (var inputStream = content.inputStream()) {
                byte[] snapshotBytes = inputStream.readAllBytes();
                return new SnapshotPayload(manifest, snapshotBytes);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load collaboration snapshot blob for artifact " + artifactId, exception);
        }
    }

    public CollabSnapshotManifestRepository.CollabSnapshotManifest saveSnapshot(
            String artifactId,
            SaveSnapshotCommand command,
            AuthPrincipal principal) {
        Artifact artifact = loadCollaborativeArtifact(artifactId, true);
        Instant now = timeProvider.now();
        String storageKey = "doc-collab/" + encode(artifactId) + "/snapshot-v"
                + Math.max(0, command.roomVersion()) + "-" + now.toEpochMilli() + ".bin";
        try {
            objectStorageClient.ensureBucket(bucket);
            ObjectStorageClient.StoredObject stored = objectStorageClient.store(
                    bucket,
                    storageKey,
                    command.snapshotBytes(),
                    "application/octet-stream");
            CollabSnapshotManifestRepository.CollabSnapshotManifest manifest = repository.save(
                    new CollabSnapshotManifestRepository.CollabSnapshotManifest(
                            artifactId,
                            artifact.getConversationId().value(),
                            command.roomId(),
                            normalizeProtocol(command.protocol()),
                            Math.max(0, command.roomVersion()),
                            stored.providerName(),
                            stored.bucket(),
                            stored.key(),
                            sha256(command.snapshotBytes()),
                            stored.sizeBytes(),
                            principal.userId(),
                            now));
            actionAuditService.record(
                    new ConversationId(artifact.getConversationId().value()),
                    "STORE_COLLAB_SNAPSHOT",
                    "ARTIFACT",
                    artifactId,
                    "COMPLETED",
                    "Stored collaborative snapshot manifest for room " + command.roomId()
                            + " using protocol " + manifest.protocol()
                            + " at roomVersion=" + manifest.roomVersion() + ".");
            return manifest;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to store collaboration snapshot for artifact " + artifactId, exception);
        }
    }

    public BucketHealthView health() {
        return new BucketHealthView(
                objectStorageClient.providerName(),
                objectStorageClient.configured(),
                bucket);
    }

    public BucketHealthView ensureBucket(String bucketName) {
        String targetBucket = bucketName == null || bucketName.isBlank() ? bucket : bucketName.trim();
        try {
            objectStorageClient.ensureBucket(targetBucket);
            return new BucketHealthView(objectStorageClient.providerName(), objectStorageClient.configured(), targetBucket);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to ensure object-storage bucket " + targetBucket, exception);
        }
    }

    private Artifact loadCollaborativeArtifact(String artifactId, boolean writable) {
        Artifact artifact = artifactApplicationService.getArtifact(artifactId);
        if (writable) {
            conversationAccessService.requireWritable(artifact.getConversationId().value());
        } else {
            conversationAccessService.requireReadable(artifact.getConversationId().value());
        }
        if (artifact.getType() != ArtifactType.CODE && artifact.getType() != ArtifactType.MARKDOWN) {
            throw new IllegalArgumentException("Collaboration snapshots only support CODE and MARKDOWN artifacts.");
        }
        return artifact;
    }

    private String normalizeProtocol(String protocol) {
        return protocol == null || protocol.isBlank() ? "AGENTHUB_ARTIFACT_COLLAB_V2_YJS" : protocol.trim();
    }

    private String encode(String value) {
        return value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is not available", exception);
        }
    }

    public record SaveSnapshotCommand(
            String roomId,
            String protocol,
            int roomVersion,
            byte[] snapshotBytes) {

        public SaveSnapshotCommand {
            roomId = roomId == null ? "" : roomId.trim();
            protocol = protocol == null ? "" : protocol.trim();
            if (roomId.isBlank()) {
                throw new IllegalArgumentException("roomId must not be blank");
            }
            if (snapshotBytes == null || snapshotBytes.length == 0) {
                throw new IllegalArgumentException("snapshotBytes must not be empty");
            }
        }
    }

    public record SnapshotPayload(
            CollabSnapshotManifestRepository.CollabSnapshotManifest manifest,
            byte[] snapshotBytes) {
    }

    public record BucketHealthView(
            String provider,
            boolean configured,
            String bucket) {
    }
}
