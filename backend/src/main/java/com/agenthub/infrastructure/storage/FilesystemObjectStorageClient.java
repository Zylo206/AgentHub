package com.agenthub.infrastructure.storage;

import com.agenthub.application.storage.ObjectStorageClient;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "agenthub.object-storage.provider", havingValue = "filesystem", matchIfMissing = true)
public class FilesystemObjectStorageClient implements ObjectStorageClient {

    private final Path rootDir;

    public FilesystemObjectStorageClient(
            @Value("${agenthub.object-storage.filesystem-root-dir:${AGENTHUB_ATTACHMENTS_OBJECT_STORAGE_ROOT_DIR:${user.home}/.agenthub/agenthub/object-storage}}")
            String rootDir) {
        this.rootDir = Path.of(rootDir).toAbsolutePath().normalize();
    }

    @Override
    public String providerName() {
        return "FILESYSTEM";
    }

    @Override
    public boolean configured() {
        return true;
    }

    @Override
    public void ensureBucket(String bucket) throws IOException {
        Files.createDirectories(bucketDir(bucket));
    }

    @Override
    public StoredObject store(String bucket, String key, byte[] bytes, String contentType) throws IOException {
        ensureBucket(bucket);
        Path target = resolvePath(bucket, key);
        Path parent = target.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        Files.write(target, bytes);
        return new StoredObject(normalizeBucket(bucket), normalizeKey(key), bytes.length, providerName());
    }

    @Override
    public ObjectContent open(String bucket, String key) throws IOException {
        Path target = resolvePath(bucket, key);
        return new ObjectContent(Files.newInputStream(target), Files.size(target), "application/octet-stream");
    }

    private Path bucketDir(String bucket) {
        return rootDir.resolve(normalizeBucket(bucket)).normalize();
    }

    private Path resolvePath(String bucket, String key) throws IOException {
        Path bucketDir = bucketDir(bucket);
        Path resolved = bucketDir.resolve(normalizeKey(key).replace('/', java.io.File.separatorChar)).normalize();
        if (!resolved.startsWith(bucketDir)) {
            throw new IOException("Object-storage key escapes configured filesystem root");
        }
        return resolved;
    }

    private String normalizeBucket(String bucket) {
        String normalized = bucket == null ? "" : bucket.trim();
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("bucket must not be blank");
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeKey(String key) {
        String normalized = key == null ? "" : key.trim().replace("\\", "/");
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }
        return normalized;
    }
}
