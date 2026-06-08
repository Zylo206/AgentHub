package com.agenthub.application.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LocalAttachmentStorageService implements AttachmentStorageService {

    public static final String PROVIDER_KEY = "LOCAL";

    private final Path storageDir;

    public LocalAttachmentStorageService(
            @Value("${agenthub.attachments.storage-dir:./.agenthub/uploads}") String storageDir) {
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @Override
    public String providerKey() {
        return PROVIDER_KEY;
    }

    @Override
    public StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException {
        Files.createDirectories(storageDir);
        String extension = extensionOf(originalFileName);
        Path target = storageDir.resolve(attachmentId + extension).normalize();
        if (!target.startsWith(storageDir)) {
            throw new IOException("Resolved attachment path escapes storage directory");
        }
        Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        return new StoredAttachment(target.toString(), storageDir.relativize(target).toString(), providerKey());
    }

    @Override
    public AttachmentContent open(String storagePath, String storageKey) throws IOException {
        Path resolved = Path.of(storagePath).toAbsolutePath().normalize();
        if (!resolved.startsWith(storageDir)) {
            throw new IllegalArgumentException("Attachment path escapes storage directory");
        }
        return new AttachmentContent(Files.newInputStream(resolved), Files.size(resolved), "application/octet-stream");
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
}
