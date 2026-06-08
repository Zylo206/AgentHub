package com.agenthub.domain.attachment;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;

public class AttachmentRecord {

    private final String attachmentId;
    private final ConversationId conversationId;
    private final String messageId;
    private final String fileName;
    private final String contentType;
    private final long sizeBytes;
    private final String storagePath;
    private final String storageKey;
    private final String checksumSha256;
    private final String visibility;
    private final String ownerUserId;
    private final String scanStatus;
    private final String storageProvider;
    private final String contentPreview;
    private final Instant createdAt;
    private final Instant deletedAt;

    public AttachmentRecord(
            String attachmentId,
            ConversationId conversationId,
            String messageId,
            String fileName,
            String contentType,
            long sizeBytes,
            String storagePath,
            String contentPreview,
            Instant createdAt) {
        this(
                attachmentId,
                conversationId,
                messageId,
                fileName,
                contentType,
                sizeBytes,
                storagePath,
                storagePath,
                null,
                "CONVERSATION",
                null,
                "SKIPPED",
                "LOCAL",
                contentPreview,
                createdAt,
                null);
    }

    public AttachmentRecord(
            String attachmentId,
            ConversationId conversationId,
            String messageId,
            String fileName,
            String contentType,
            long sizeBytes,
            String storagePath,
            String storageKey,
            String checksumSha256,
            String visibility,
            String ownerUserId,
            String scanStatus,
            String contentPreview,
            Instant createdAt,
            Instant deletedAt) {
        this(
                attachmentId,
                conversationId,
                messageId,
                fileName,
                contentType,
                sizeBytes,
                storagePath,
                storageKey,
                checksumSha256,
                visibility,
                ownerUserId,
                scanStatus,
                "LOCAL",
                contentPreview,
                createdAt,
                deletedAt);
    }

    public AttachmentRecord(
            String attachmentId,
            ConversationId conversationId,
            String messageId,
            String fileName,
            String contentType,
            long sizeBytes,
            String storagePath,
            String storageKey,
            String checksumSha256,
            String visibility,
            String ownerUserId,
            String scanStatus,
            String storageProvider,
            String contentPreview,
            Instant createdAt,
            Instant deletedAt) {
        if (attachmentId == null || attachmentId.isBlank()) {
            throw new IllegalArgumentException("attachmentId must not be blank");
        }
        if (conversationId == null) {
            throw new IllegalArgumentException("conversationId must not be null");
        }
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("fileName must not be blank");
        }
        if (sizeBytes < 0) {
            throw new IllegalArgumentException("sizeBytes must not be negative");
        }
        if (storagePath == null || storagePath.isBlank()) {
            throw new IllegalArgumentException("storagePath must not be blank");
        }
        this.attachmentId = attachmentId.trim();
        this.conversationId = conversationId;
        this.messageId = normalizeOptional(messageId);
        this.fileName = fileName.trim();
        this.contentType = normalizeOptional(contentType);
        this.sizeBytes = sizeBytes;
        this.storagePath = storagePath.trim();
        this.storageKey = normalizeOptional(storageKey) == null ? storagePath.trim() : normalizeOptional(storageKey);
        this.checksumSha256 = normalizeOptional(checksumSha256);
        this.visibility = normalizeOptional(visibility) == null ? "CONVERSATION" : normalizeOptional(visibility);
        this.ownerUserId = normalizeOptional(ownerUserId);
        this.scanStatus = normalizeOptional(scanStatus) == null ? "SKIPPED" : normalizeOptional(scanStatus);
        this.storageProvider = normalizeOptional(storageProvider) == null ? "LOCAL" : normalizeOptional(storageProvider);
        this.contentPreview = normalizeOptional(contentPreview);
        this.createdAt = createdAt;
        this.deletedAt = deletedAt;
    }

    public AttachmentRecord withMessageId(String nextMessageId) {
        return new AttachmentRecord(
                attachmentId,
                conversationId,
                nextMessageId,
                fileName,
                contentType,
                sizeBytes,
                storagePath,
                storageKey,
                checksumSha256,
                visibility,
                ownerUserId,
                scanStatus,
                storageProvider,
                contentPreview,
                createdAt,
                deletedAt);
    }

    public AttachmentRecord withScanStatus(String nextScanStatus) {
        return new AttachmentRecord(
                attachmentId,
                conversationId,
                messageId,
                fileName,
                contentType,
                sizeBytes,
                storagePath,
                storageKey,
                checksumSha256,
                visibility,
                ownerUserId,
                nextScanStatus,
                storageProvider,
                contentPreview,
                createdAt,
                deletedAt);
    }

    public AttachmentRecord markDeleted(Instant deletedAt) {
        return new AttachmentRecord(
                attachmentId,
                conversationId,
                messageId,
                fileName,
                contentType,
                sizeBytes,
                storagePath,
                storageKey,
                checksumSha256,
                visibility,
                ownerUserId,
                scanStatus,
                storageProvider,
                contentPreview,
                createdAt,
                deletedAt);
    }

    public String getAttachmentId() {
        return attachmentId;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public String getMessageId() {
        return messageId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getChecksumSha256() {
        return checksumSha256;
    }

    public String getVisibility() {
        return visibility;
    }

    public String getOwnerUserId() {
        return ownerUserId;
    }

    public String getScanStatus() {
        return scanStatus;
    }

    public String getStorageProvider() {
        return storageProvider;
    }

    public String getContentPreview() {
        return contentPreview;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
