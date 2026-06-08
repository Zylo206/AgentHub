package com.agenthub.api.storage;

import com.agenthub.application.auth.AccessDeniedException;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.storage.ObjectStorageAdminService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/object-storage")
public class ObjectStorageAdminController {

    private final AuthSessionService authSessionService;
    private final ObjectStorageAdminService objectStorageAdminService;

    public ObjectStorageAdminController(
            AuthSessionService authSessionService,
            ObjectStorageAdminService objectStorageAdminService) {
        this.authSessionService = authSessionService;
        this.objectStorageAdminService = objectStorageAdminService;
    }

    @GetMapping("/health")
    public ApiResponse<?> health() {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(objectStorageAdminService.health());
    }

    @PostMapping("/buckets/{bucketName}/ensure")
    public ApiResponse<?> ensureBucket(@PathVariable("bucketName") String bucketName) {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(
                objectStorageAdminService.ensureBucket(bucketName),
                "Object-storage bucket ensured");
    }

    @PostMapping("/buckets/{bucketName}/verify")
    public ApiResponse<?> verifyBucket(@PathVariable("bucketName") String bucketName) {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(
                objectStorageAdminService.verifyBucket(bucketName),
                "Object-storage bucket verified");
    }

    @PostMapping("/default-buckets/ensure")
    public ApiResponse<?> ensureDefaultBuckets() {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(
                objectStorageAdminService.ensureDefaultBuckets(),
                "Default object-storage buckets ensured");
    }

    private void requireAdmin(AuthPrincipal principal) {
        if (principal == null || !principal.isAdmin()) {
            throw new AccessDeniedException("Admin permission is required for object-storage administration.");
        }
    }
}
