package com.agenthub.application.attachment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;

public interface AttachmentStorageService {

    StoredAttachment store(String attachmentId, String originalFileName, InputStream inputStream) throws IOException;

    Path resolve(String storagePath);

    record StoredAttachment(String storagePath, String storageKey) {

        public StoredAttachment(String storagePath) {
            this(storagePath, storagePath);
        }
    }
}
