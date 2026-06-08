package com.agenthub.application.attachment;

import com.agenthub.application.storage.ObjectStorageClient;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ObjectStorageAttachmentStorageService implements AttachmentStorageService {

    public static final String PROVIDER_KEY = "OBJECT_STORAGE";

    private final ObjectStorageClient objectStorageClient;
    private final String bucket;

    public ObjectStorageAttachmentStorageService(
            ObjectStorageClient objectStorageClient,
            @Value("${agenthub.attachments.object-storage.bucket:attachments}") String bucket) {
        this.objectStorageClient = objectStorageClient;
        this.bucket = bucket == null || bucket.isBlank() ? "attachments" : bucket.trim();
    }

    @Override
    public String providerKey() {
        return PROVIDER_KEY;
    }

    @Override
    public StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException {
        String extension = extensionOf(originalFileName);
        String key = "attachments/" + attachmentId + extension;
        byte[] bytes = inputStream.readAllBytes();
        objectStorageClient.store(bucket, key, bytes, "application/octet-stream");
        return new StoredAttachment("object-storage://" + bucket + "/" + key, key, providerKey());
    }

    @Override
    public AttachmentContent open(String storagePath, String storageKey) throws IOException {
        ObjectStorageClient.ObjectContent content = objectStorageClient.open(bucket, normalizeKey(storageKey, storagePath));
        return new AttachmentContent(content.inputStream(), content.sizeBytes(), content.contentType());
    }

    private String extensionOf(String fileName) {
        if (fileName == null) {
            return "";
        }
        String safeName = fileName.replace("\\", "/");
        int slash = safeName.lastIndexOf('/');
        String leaf = slash >= 0 ? safeName.substring(slash + 1) : safeName;
        int dot = leaf.lastIndexOf('.');
        if (dot < 0 || dot == leaf.length() - 1) {
            return "";
        }
        String extension = leaf.substring(dot);
        return extension.length() > 16 ? "" : extension.replaceAll("[^A-Za-z0-9.\\-_]", "");
    }

    private String normalizeKey(String storageKey, String storagePath) {
        String preferred = storageKey == null || storageKey.isBlank() ? storagePath : storageKey;
        if (preferred == null || preferred.isBlank()) {
            throw new IllegalArgumentException("Object-storage attachment key must not be blank");
        }
        String normalized = preferred.replace('\\', '/').trim();
        int schemeIndex = normalized.indexOf("://");
        if (schemeIndex >= 0) {
            int bucketSeparator = normalized.indexOf('/', schemeIndex + 3);
            normalized = bucketSeparator >= 0 ? normalized.substring(bucketSeparator + 1) : "";
        }
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
}
