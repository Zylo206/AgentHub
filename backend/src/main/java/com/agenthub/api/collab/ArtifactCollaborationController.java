package com.agenthub.api.collab;

import com.agenthub.application.approval.ApprovalApplicationService;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.collab.ArtifactCollaborationService;
import com.agenthub.application.collab.CollabSnapshotStorageService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.conversation.ConversationId;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArtifactCollaborationController {

    private final ArtifactCollaborationService collaborationService;
    private final CollabSnapshotStorageService collabSnapshotStorageService;
    private final AuthSessionService authSessionService;
    private final ApprovalApplicationService approvalApplicationService;

    public ArtifactCollaborationController(
            ArtifactCollaborationService collaborationService,
            CollabSnapshotStorageService collabSnapshotStorageService,
            AuthSessionService authSessionService,
            ApprovalApplicationService approvalApplicationService) {
        this.collaborationService = collaborationService;
        this.collabSnapshotStorageService = collabSnapshotStorageService;
        this.authSessionService = authSessionService;
        this.approvalApplicationService = approvalApplicationService;
    }

    @GetMapping("/api/artifacts/{artifactId}/collab-room")
    public ApiResponse<?> openRoom(@PathVariable("artifactId") String artifactId) {
        return ApiResponse.success(collaborationService.openRoom(artifactId));
    }

    @PostMapping("/api/artifacts/{artifactId}/collab-room/document")
    public ApiResponse<?> updateDocument(
            @PathVariable("artifactId") String artifactId,
            @Valid @RequestBody CollabDocumentUpdateRequest request) {
        AuthPrincipal principal = authSessionService.current();
        return ApiResponse.success(collaborationService.updateDocument(
                artifactId,
                request.baseVersion(),
                request.content(),
                request.deviceId(),
                principal,
                request.summary()));
    }

    @PostMapping("/api/artifacts/{artifactId}/collab-room/presence")
    public ApiResponse<?> updatePresence(
            @PathVariable("artifactId") String artifactId,
            @RequestBody(required = false) CollabPresenceRequest request) {
        AuthPrincipal principal = authSessionService.current();
        CollabPresenceRequest body = request == null ? new CollabPresenceRequest(null, null, null, null, false) : request;
        return ApiResponse.success(collaborationService.updatePresence(
                artifactId,
                body.deviceId(),
                principal,
                body.status(),
                body.cursorStart(),
                body.cursorEnd(),
                body.editing()));
    }

    @PostMapping("/api/artifacts/{artifactId}/collab-room/authorize")
    public ApiResponse<?> authorize(
            @PathVariable("artifactId") String artifactId,
            @RequestBody(required = false) CollabAuthorizeRequest request) {
        AuthPrincipal principal = authSessionService.current();
        CollabAuthorizeRequest body = request == null
                ? new CollabAuthorizeRequest("READ", "AGENTHUB_ARTIFACT_COLLAB_V1")
                : request;
        return ApiResponse.success(collaborationService.authorize(artifactId, body.mode(), principal));
    }

    @PostMapping("/api/artifacts/{artifactId}/collab-room/publish")
    public ApiResponse<?> publishDraft(
            @PathVariable("artifactId") String artifactId,
            @Valid @RequestBody CollabPublishRequest request) {
        ArtifactCollaborationService.CollabRoomView room = collaborationService.openRoom(artifactId);
        approvalApplicationService.validateApproved(
                request.approvalId(),
                new ConversationId(room.conversationId()),
                "PUBLISH_COLLAB_DRAFT",
                "ARTIFACT",
                artifactId);
        Artifact revision = collaborationService.publishDraft(
                artifactId,
                request.approvalId(),
                request.summary(),
                request.content(),
                request.protocol(),
                request.roomVersion());
        approvalApplicationService.consume(request.approvalId());
        return ApiResponse.success(revision, "Collaborative draft published as Artifact revision");
    }

    @GetMapping("/api/artifacts/{artifactId}/collab-room/v2/snapshot")
    public ResponseEntity<Resource> downloadV2Snapshot(@PathVariable("artifactId") String artifactId) {
        CollabSnapshotStorageService.SnapshotPayload payload = collabSnapshotStorageService.loadLatest(artifactId);
        ByteArrayResource resource = new ByteArrayResource(payload.snapshotBytes());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(payload.snapshotBytes().length)
                .header("X-AgentHub-Room-Id", payload.manifest().roomId())
                .header("X-AgentHub-Protocol", payload.manifest().protocol())
                .header("X-AgentHub-Room-Version", String.valueOf(payload.manifest().roomVersion()))
                .header("X-AgentHub-Storage-Provider", payload.manifest().storageProvider())
                .header("X-AgentHub-Storage-Bucket", payload.manifest().storageBucket())
                .header("X-AgentHub-Storage-Key", payload.manifest().storageKey())
                .header("X-AgentHub-Checksum-Sha256", payload.manifest().checksumSha256())
                .body(resource);
    }

    @PutMapping(
            value = "/api/artifacts/{artifactId}/collab-room/v2/snapshot",
            consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ApiResponse<?> uploadV2Snapshot(
            @PathVariable("artifactId") String artifactId,
            @RequestHeader("X-AgentHub-Room-Id") String roomId,
            @RequestHeader(value = "X-AgentHub-Protocol", required = false) String protocol,
            @RequestHeader(value = "X-AgentHub-Room-Version", required = false) Integer roomVersion,
            @RequestBody byte[] snapshotBytes) {
        AuthPrincipal principal = authSessionService.current();
        return ApiResponse.success(
                collabSnapshotStorageService.saveSnapshot(
                        artifactId,
                        new CollabSnapshotStorageService.SaveSnapshotCommand(
                                roomId,
                                protocol,
                                roomVersion == null ? 0 : roomVersion,
                                snapshotBytes),
                        principal),
                "Collaborative snapshot persisted");
    }
}

record CollabAuthorizeRequest(
        String mode,
        String protocol) {
}

record CollabDocumentUpdateRequest(
        Integer baseVersion,
        String content,
        String deviceId,
        String summary) {
}

record CollabPresenceRequest(
        String deviceId,
        String status,
        Integer cursorStart,
        Integer cursorEnd,
        boolean editing) {
}

record CollabPublishRequest(
        @NotBlank String approvalId,
        String summary,
        String protocol,
        Integer roomVersion,
        String content) {
}
