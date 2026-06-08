package com.agenthub.application.collab;

import java.time.Instant;
import java.util.Optional;

public interface CollabSnapshotManifestRepository {

    Optional<CollabSnapshotManifest> findByArtifactId(String artifactId);

    CollabSnapshotManifest save(CollabSnapshotManifest manifest);

    record CollabSnapshotManifest(
            String artifactId,
            String conversationId,
            String roomId,
            String protocol,
            int roomVersion,
            String storageProvider,
            String storageBucket,
            String storageKey,
            String checksumSha256,
            long snapshotSizeBytes,
            String updatedByUserId,
            Instant updatedAt) {

        public CollabSnapshotManifest {
            artifactId = normalizeRequired(artifactId, "artifactId");
            conversationId = normalizeRequired(conversationId, "conversationId");
            roomId = normalizeRequired(roomId, "roomId");
            protocol = normalizeRequired(protocol, "protocol");
            storageProvider = normalizeRequired(storageProvider, "storageProvider");
            storageBucket = normalizeRequired(storageBucket, "storageBucket");
            storageKey = normalizeRequired(storageKey, "storageKey");
            checksumSha256 = normalizeRequired(checksumSha256, "checksumSha256");
            updatedByUserId = normalizeRequired(updatedByUserId, "updatedByUserId");
            if (roomVersion < 0) {
                throw new IllegalArgumentException("roomVersion must not be negative");
            }
            if (snapshotSizeBytes < 0) {
                throw new IllegalArgumentException("snapshotSizeBytes must not be negative");
            }
        }

        private static String normalizeRequired(String value, String fieldName) {
            String normalized = value == null ? "" : value.trim();
            if (normalized.isBlank()) {
                throw new IllegalArgumentException(fieldName + " must not be blank");
            }
            return normalized;
        }
    }
}
