package com.agenthub.application.attachment;

import com.agenthub.domain.attachment.AttachmentRecord;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AttachmentStorageRegistry {

    private final Map<String, AttachmentStorageService> providers;
    private final String defaultProvider;

    public AttachmentStorageRegistry(
            List<AttachmentStorageService> providers,
            @Value("${agenthub.attachments.storage.type:local}") String defaultProvider) {
        this.providers = providers.stream()
                .collect(Collectors.toUnmodifiableMap(
                        provider -> normalizeKey(provider.providerKey()),
                        Function.identity(),
                        (left, right) -> left));
        this.defaultProvider = normalizeKey(defaultProvider);
    }

    public AttachmentStorageService.StoredAttachment store(
            String attachmentId,
            String originalFileName,
            InputStream inputStream) throws IOException {
        return requireProvider(defaultProvider).store(attachmentId, originalFileName, inputStream);
    }

    public Path resolve(AttachmentRecord attachmentRecord) {
        return requireProvider(attachmentRecord.getStorageProvider()).resolve(attachmentRecord.getStoragePath());
    }

    public Path resolve(String providerKey, String storagePath) {
        return requireProvider(providerKey).resolve(storagePath);
    }

    private AttachmentStorageService requireProvider(String providerKey) {
        AttachmentStorageService provider = providers.get(normalizeKey(providerKey));
        if (provider != null) {
            return provider;
        }
        AttachmentStorageService localProvider = providers.get(normalizeKey(LocalAttachmentStorageService.PROVIDER_KEY));
        if (localProvider != null) {
            return localProvider;
        }
        throw new IllegalStateException("Attachment storage provider is not configured: " + providerKey);
    }

    private String normalizeKey(String providerKey) {
        String normalized = providerKey == null ? "" : providerKey.trim().toUpperCase(Locale.ROOT);
        if (normalized.equals("OBJECT") || normalized.equals("OBJECT-STORE")) {
            return ObjectStorageAttachmentStorageService.PROVIDER_KEY;
        }
        return normalized.replace('-', '_');
    }
}
