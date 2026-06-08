package com.agenthub.api.storage;

import com.agenthub.application.auth.AccessDeniedException;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.collab.CollabSnapshotStorageService;
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
    private final CollabSnapshotStorageService collabSnapshotStorageService;

    public ObjectStorageAdminController(
            AuthSessionService authSessionService,
            CollabSnapshotStorageService collabSnapshotStorageService) {
        this.authSessionService = authSessionService;
        this.collabSnapshotStorageService = collabSnapshotStorageService;
    }

    @GetMapping("/health")
    public ApiResponse<?> health() {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(collabSnapshotStorageService.health());
    }

    @PostMapping("/buckets/{bucketName}/ensure")
    public ApiResponse<?> ensureBucket(@PathVariable("bucketName") String bucketName) {
        requireAdmin(authSessionService.current());
        return ApiResponse.success(
                collabSnapshotStorageService.ensureBucket(bucketName),
                "Object-storage bucket ensured");
    }

    private void requireAdmin(AuthPrincipal principal) {
        if (principal == null || !principal.isAdmin()) {
            throw new AccessDeniedException("Admin permission is required for object-storage administration.");
        }
    }
}
