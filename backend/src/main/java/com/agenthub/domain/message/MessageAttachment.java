package com.agenthub.domain.message;

public record MessageAttachment(
        String attachmentId,
        String fileName,
        String contentType,
        long size,
        String contentPreview) {

    public MessageAttachment {
        if (attachmentId == null || attachmentId.isBlank()) {
            throw new IllegalArgumentException("attachmentId must not be blank");
        }
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("fileName must not be blank");
        }
        if (size < 0) {
            throw new IllegalArgumentException("attachment size must not be negative");
        }
        attachmentId = attachmentId.trim();
        fileName = fileName.trim();
        contentType = normalizeOptional(contentType);
        contentPreview = normalizeOptional(contentPreview);
    }

    private static String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
