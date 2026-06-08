package com.agenthub.infrastructure.storage;

import com.agenthub.application.storage.ObjectStorageClient;
import java.io.IOException;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@ConditionalOnProperty(name = "agenthub.object-storage.provider", havingValue = "s3")
public class S3ObjectStorageClient implements ObjectStorageClient {

    private final String endpoint;
    private final String accessKey;
    private final String secretKey;
    private final String region;
    private final boolean forcePathStyle;
    private final boolean autoCreateBuckets;
    private final S3Client client;

    public S3ObjectStorageClient(
            @Value("${agenthub.object-storage.s3.endpoint:}") String endpoint,
            @Value("${agenthub.object-storage.s3.access-key:}") String accessKey,
            @Value("${agenthub.object-storage.s3.secret-key:}") String secretKey,
            @Value("${agenthub.object-storage.s3.region:us-east-1}") String region,
            @Value("${agenthub.object-storage.s3.force-path-style:true}") boolean forcePathStyle,
            @Value("${agenthub.object-storage.s3.auto-create-buckets:true}") boolean autoCreateBuckets) {
        this.endpoint = endpoint == null ? "" : endpoint.trim();
        this.accessKey = accessKey == null ? "" : accessKey.trim();
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.region = region == null || region.isBlank() ? "us-east-1" : region.trim();
        this.forcePathStyle = forcePathStyle;
        this.autoCreateBuckets = autoCreateBuckets;
        this.client = configured() ? buildClient() : null;
    }

    @Override
    public String providerName() {
        return "S3";
    }

    @Override
    public boolean configured() {
        return !endpoint.isBlank() && !accessKey.isBlank() && !secretKey.isBlank();
    }

    @Override
    public void ensureBucket(String bucket) throws IOException {
        try {
            try {
                requireClient().headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            } catch (S3Exception exception) {
                if (!autoCreateBuckets || !isMissingBucket(exception)) {
                    throw exception;
                }
                requireClient().createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            }
        } catch (Exception exception) {
            throw new IOException("Failed to ensure S3/MinIO bucket " + bucket + ": " + exception.getMessage(), exception);
        }
    }

    @Override
    public StoredObject store(String bucket, String key, byte[] bytes, String contentType) throws IOException {
        try {
            ensureBucket(bucket);
            requireClient().putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType)
                            .build(),
                    RequestBody.fromBytes(bytes));
            return new StoredObject(bucket, key, bytes.length, providerName());
        } catch (Exception exception) {
            throw new IOException("Failed to store object " + bucket + "/" + key + ": " + exception.getMessage(), exception);
        }
    }

    @Override
    public ObjectContent open(String bucket, String key) throws IOException {
        try {
            var response = requireClient().getObject(GetObjectRequest.builder().bucket(bucket).key(key).build());
            long sizeBytes = response.response().contentLength() == null ? -1L : response.response().contentLength();
            String contentType = response.response().contentType();
            return new ObjectContent(response, sizeBytes, contentType);
        } catch (Exception exception) {
            throw new IOException("Failed to open object " + bucket + "/" + key + ": " + exception.getMessage(), exception);
        }
    }

    @Override
    public void delete(String bucket, String key) throws IOException {
        try {
            requireClient().deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception exception) {
            throw new IOException("Failed to delete object " + bucket + "/" + key + ": " + exception.getMessage(), exception);
        }
    }

    private S3Client buildClient() {
        return S3Client.builder()
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(region))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(forcePathStyle)
                        .build())
                .build();
    }

    private S3Client requireClient() {
        if (client == null) {
            throw new IllegalStateException("S3/MinIO object storage is not fully configured.");
        }
        return client;
    }

    private boolean isMissingBucket(Exception exception) {
        if (exception instanceof NoSuchBucketException) {
            return true;
        }
        if (exception instanceof S3Exception s3Exception) {
            return s3Exception.statusCode() == 404 || "NoSuchBucket".equalsIgnoreCase(s3Exception.awsErrorDetails().errorCode());
        }
        return false;
    }
}
