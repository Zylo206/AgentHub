package com.agenthub.application.storage;

import java.io.IOException;
import java.io.InputStream;

public interface ObjectStorageClient {

    String providerName();

    boolean configured();

    void ensureBucket(String bucket) throws IOException;

    StoredObject store(String bucket, String key, byte[] bytes, String contentType) throws IOException;

    ObjectContent open(String bucket, String key) throws IOException;

    void delete(String bucket, String key) throws IOException;

    record StoredObject(
            String bucket,
            String key,
            long sizeBytes,
            String providerName) {
    }

    record ObjectContent(
            InputStream inputStream,
            long sizeBytes,
            String contentType) {
    }
}
