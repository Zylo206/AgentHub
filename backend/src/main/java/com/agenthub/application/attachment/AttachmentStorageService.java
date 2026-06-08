package com.agenthub.application.attachment;

import java.io.IOException;
import java.io.InputStream;

public interface AttachmentStorageService {

    String providerKey();

    StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException;

    AttachmentContent open(String storagePath, String storageKey) throws IOException;

    record StoredAttachment(String storagePath, String storageKey, String storageProvider) {

        public StoredAttachment(String storagePath, String storageKey) {
            this(storagePath, storageKey, "LOCAL");
        }

        public StoredAttachment(String storagePath) {
            this(storagePath, storagePath, "LOCAL");
        }
    }

    record AttachmentContent(
            InputStream inputStream,
            long sizeBytes,
            String contentType) {
    }
}
