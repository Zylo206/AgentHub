package com.agenthub.application.storage;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ObjectStorageAdminService {

    private final ObjectStorageClient objectStorageClient;
    private final String attachmentsBucket;
    private final String collabSnapshotBucket;

    public ObjectStorageAdminService(
            ObjectStorageClient objectStorageClient,
            @Value("${agenthub.attachments.object-storage.bucket:attachments}") String attachmentsBucket,
            @Value("${agenthub.collaboration.v2.snapshot-object-storage.bucket:doc-collab-snapshots}") String collabSnapshotBucket) {
        this.objectStorageClient = objectStorageClient;
        this.attachmentsBucket = defaultBucket(attachmentsBucket, "attachments");
        this.collabSnapshotBucket = defaultBucket(collabSnapshotBucket, "doc-collab-snapshots");
    }

    public HealthView health() {
        return new HealthView(
                objectStorageClient.providerName(),
                objectStorageClient.configured(),
                List.of(
                        new BucketView("attachments", attachmentsBucket),
                        new BucketView("collabSnapshots", collabSnapshotBucket)));
    }

    public BucketEnsureView ensureBucket(String bucketName) {
        String targetBucket = normalizeBucket(bucketName);
        try {
            objectStorageClient.ensureBucket(targetBucket);
            return new BucketEnsureView(
                    objectStorageClient.providerName(),
                    objectStorageClient.configured(),
                    targetBucket,
                    true);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to ensure object-storage bucket " + targetBucket, exception);
        }
    }

    public BucketVerifyView verifyBucket(String bucketName) {
        String targetBucket = normalizeBucket(bucketName);
        String key = "agenthub/admin/verify-" + Instant.now().toEpochMilli() + ".txt";
        byte[] bytes = ("agenthub-object-storage-verify:" + targetBucket + ":" + key).getBytes(StandardCharsets.UTF_8);
        String expectedChecksum = sha256(bytes);
        try {
            objectStorageClient.ensureBucket(targetBucket);
            ObjectStorageClient.StoredObject storedObject =
                    objectStorageClient.store(targetBucket, key, bytes, "text/plain; charset=utf-8");
            byte[] roundtrip;
            String contentType;
            ObjectStorageClient.ObjectContent objectContent = objectStorageClient.open(targetBucket, key);
            contentType = objectContent.contentType();
            try (var inputStream = objectContent.inputStream()) {
                roundtrip = inputStream.readAllBytes();
            }
            String actualChecksum = sha256(roundtrip);
            objectStorageClient.delete(targetBucket, key);
            if (!expectedChecksum.equals(actualChecksum)) {
                throw new IllegalStateException("Object-storage roundtrip checksum mismatch.");
            }
            return new BucketVerifyView(
                    objectStorageClient.providerName(),
                    targetBucket,
                    key,
                    storedObject.sizeBytes(),
                    expectedChecksum,
                    actualChecksum,
                    contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType,
                    true);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to verify object-storage bucket " + targetBucket, exception);
        }
    }

    public BucketEnsureView ensureDefaultBuckets() {
        ensureBucket(attachmentsBucket);
        ensureBucket(collabSnapshotBucket);
        return new BucketEnsureView(
                objectStorageClient.providerName(),
                objectStorageClient.configured(),
                attachmentsBucket + "," + collabSnapshotBucket,
                true);
    }

    public record HealthView(
            String provider,
            boolean configured,
            List<BucketView> buckets) {
    }

    public record BucketView(
            String purpose,
            String bucketName) {
    }

    public record BucketEnsureView(
            String provider,
            boolean configured,
            String bucket,
            boolean ensured) {
    }

    public record BucketVerifyView(
            String provider,
            String bucket,
            String key,
            long sizeBytes,
            String expectedChecksumSha256,
            String actualChecksumSha256,
            String contentType,
            boolean roundtripMatched) {
    }

    private String defaultBucket(String bucket, String fallback) {
        return bucket == null || bucket.isBlank() ? fallback : bucket.trim();
    }

    private String normalizeBucket(String bucketName) {
        if (bucketName == null || bucketName.isBlank()) {
            throw new IllegalArgumentException("bucketName must not be blank");
        }
        return bucketName.trim();
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 digest is not available", exception);
        }
    }
}
