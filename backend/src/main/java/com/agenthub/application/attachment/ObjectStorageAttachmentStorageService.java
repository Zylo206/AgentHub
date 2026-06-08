package com.agenthub.application.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ObjectStorageAttachmentStorageService implements AttachmentStorageService {

    public static final String PROVIDER_KEY = "OBJECT_STORAGE";

    private final Path rootDir;
    private final String bucket;

    public ObjectStorageAttachmentStorageService(
            @Value("${agenthub.attachments.object-storage.root-dir:${user.home}/.agenthub/agenthub/object-storage}") String rootDir,
            @Value("${agenthub.attachments.object-storage.bucket:attachments}") String bucket) {
        this.rootDir = Path.of(rootDir).toAbsolutePath().normalize();
        this.bucket = bucket == null || bucket.isBlank() ? "attachments" : bucket.trim();
    }

    @Override
    public String providerKey() {
        return PROVIDER_KEY;
    }

    @Override
    public StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException {
        Files.createDirectories(bucketDir());
        String extension = extensionOf(originalFileName);
        String key = "attachments/" + attachmentId + extension;
        Path target = bucketDir().resolve(key.replace('/', java.io.File.separatorChar)).normalize();
        if (!target.startsWith(bucketDir())) {
            throw new IOException("Resolved object-storage attachment path escapes object storage root");
        }
        Path parent = target.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        return new StoredAttachment(target.toString(), key, providerKey());
    }

    @Override
    public Path resolve(String storagePath) {
        Path resolved = Path.of(storagePath).toAbsolutePath().normalize();
        if (!resolved.startsWith(bucketDir())) {
            throw new IllegalArgumentException("Object-storage attachment path escapes configured bucket directory");
        }
        return resolved;
    }

    private Path bucketDir() {
        return rootDir.resolve(bucket).normalize();
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
