package com.agenthub.application.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

public interface AttachmentStorageService {

    String providerKey();

    StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException;

    Path resolve(String storagePath);

    record StoredAttachment(String storagePath, String storageKey, String storageProvider) {

        public StoredAttachment(String storagePath, String storageKey) {
            this(storagePath, storageKey, "LOCAL");
        }

        public StoredAttachment(String storagePath) {
            this(storagePath, storagePath, "LOCAL");
        }
    }
}
