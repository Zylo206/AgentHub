package com.agenthub.api.artifact;

import com.agenthub.application.approval.ApprovalApplicationService;
import com.agenthub.application.artifact.ArtifactApplicationService;
import com.agenthub.application.artifact.ArtifactBundleService;
import com.agenthub.application.task.TaskApplicationService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactSnapshot;
import com.agenthub.domain.task.TaskRun;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArtifactController {

    private final ArtifactApplicationService artifactApplicationService;
    private final ArtifactBundleService artifactBundleService;
    private final TaskApplicationService taskApplicationService;
    private final ApprovalApplicationService approvalApplicationService;

    public ArtifactController(
            ArtifactApplicationService artifactApplicationService,
            ArtifactBundleService artifactBundleService,
            TaskApplicationService taskApplicationService,
            ApprovalApplicationService approvalApplicationService) {
        this.artifactApplicationService = artifactApplicationService;
        this.artifactBundleService = artifactBundleService;
        this.taskApplicationService = taskApplicationService;
        this.approvalApplicationService = approvalApplicationService;
    }

    @GetMapping("/api/conversations/{conversationId}/artifacts")
    public ApiResponse<?> listArtifactsByConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(artifactApplicationService.listArtifactsByConversation(conversationId));
    }

    @GetMapping("/api/task-runs/{taskRunId}/artifacts")
    public ApiResponse<?> listArtifactsByTaskRun(@PathVariable("taskRunId") String taskRunId) {
        return ApiResponse.success(artifactApplicationService.listArtifactsByTaskRun(taskRunId));
    }

    @GetMapping("/api/artifacts/{artifactId}")
    public ApiResponse<?> getArtifact(@PathVariable("artifactId") String artifactId) {
        return ApiResponse.success(artifactApplicationService.getArtifact(artifactId));
    }

    @GetMapping("/api/conversations/{conversationId}/artifact-bundle/download")
    public ResponseEntity<byte[]> downloadArtifactBundle(
            @PathVariable("conversationId") String conversationId,
            @RequestParam(value = "artifactIds", required = false) String artifactIds,
            @RequestParam(value = "includeRelated", defaultValue = "true") boolean includeRelated) {
        List<String> selectedArtifactIds = artifactIds == null || artifactIds.isBlank()
                ? List.of()
                : Arrays.stream(artifactIds.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isBlank())
                        .distinct()
                        .toList();
        ArtifactBundleService.ArtifactBundle bundle = artifactBundleService.buildConversationBundle(
                conversationId,
                selectedArtifactIds,
                includeRelated);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + bundle.fileName() + "\"")
                .header("X-AgentHub-Artifact-Count", String.valueOf(bundle.artifactCount()))
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(bundle.content());
    }

    @GetMapping("/api/artifacts/{artifactId}/snapshots")
    public ApiResponse<?> listSnapshotsByArtifact(@PathVariable("artifactId") String artifactId) {
        return ApiResponse.success(artifactApplicationService.listSnapshotsByArtifact(artifactId));
    }

    @GetMapping("/api/conversations/{conversationId}/artifact-snapshots")
    public ApiResponse<?> listSnapshotsByConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(artifactApplicationService.listSnapshotsByConversation(conversationId));
    }

    @PostMapping("/api/artifact-snapshots/{snapshotId}/restore")
    public ApiResponse<?> restoreSnapshot(
            @PathVariable("snapshotId") String snapshotId,
            @RequestBody(required = false) RestoreSnapshotRequest request) {
        ArtifactSnapshot snapshot = artifactApplicationService.getSnapshot(snapshotId);
        String approvalId = request == null ? null : request.approvalId();
        approvalApplicationService.validateApproved(
                approvalId,
                snapshot.getConversationId(),
                "RESTORE_SNAPSHOT",
                "ARTIFACT_SNAPSHOT",
                snapshotId);
        Artifact restoredArtifact = artifactApplicationService.restoreSnapshot(
                snapshotId,
                request == null ? null : request.baseVersion(),
                request == null ? null : request.baseContentHash());
        approvalApplicationService.consume(approvalId);
        return ApiResponse.success(restoredArtifact, "Artifact snapshot restored");
    }

    @PostMapping("/api/artifacts/{artifactId}/apply-diff")
    public ApiResponse<?> applyDiff(
            @PathVariable("artifactId") String artifactId,
            @RequestBody(required = false) ApplyDiffRequest request) {
        boolean force = request != null && Boolean.TRUE.equals(request.force());
        Artifact artifact = artifactApplicationService.getArtifact(artifactId);
        String actionType = force ? "FORCE_APPLY_DIFF" : "APPLY_DIFF";
        String approvalId = request == null ? null : request.approvalId();
        approvalApplicationService.validateApproved(
                approvalId,
                artifact.getConversationId(),
                actionType,
                "ARTIFACT",
                artifactId);
        ArtifactApplicationService.ApplyDiffResult result = artifactApplicationService.applyDiff(
                artifactId,
                force,
                request == null ? null : request.baseVersion(),
                request == null ? null : request.baseContentHash());
        approvalApplicationService.consume(approvalId);
        return ApiResponse.success(
                new ApplyDiffResponse(
                        result.appliedArtifact(),
                        result.baseArtifactId(),
                        result.revisionArtifactId(),
                        result.addedLines(),
                        result.removedLines(),
                        result.unchangedLines(),
                        result.changedLines(),
                        result.conflict(),
                        result.conflictReason(),
                        result.latestAppliedArtifactId(),
                        result.snapshotId(),
                        result.conflictBypassed()),
                "Artifact diff applied");
    }

    @PostMapping("/api/artifacts/{artifactId}/demo-revision")
    public ApiResponse<?> createDemoRevision(
            @PathVariable("artifactId") String artifactId,
            @Valid @RequestBody CreateArtifactRevisionRequest request) {
        TaskApplicationService.ArtifactRevisionResult result = taskApplicationService.createDemoArtifactRevision(
                request.conversationId(),
                artifactId,
                request.revisionInstruction());
        return ApiResponse.success(
                new ArtifactRevisionResponse(
                        result.taskRun(),
                        result.revisedArtifact(),
                        result.reviewArtifact()),
                "Artifact revision created");
    }
}

record CreateArtifactRevisionRequest(
        @NotBlank String conversationId,
        @NotBlank String revisionInstruction) {}

record ArtifactRevisionResponse(
        TaskRun taskRun,
        Artifact revisedArtifact,
        Artifact reviewArtifact) {}

record ApplyDiffResponse(
        Artifact appliedArtifact,
        String baseArtifactId,
        String revisionArtifactId,
        int addedLines,
        int removedLines,
        int unchangedLines,
        int changedLines,
        boolean conflict,
        String conflictReason,
        String latestAppliedArtifactId,
        String snapshotId,
        boolean conflictBypassed) {}

record ApplyDiffRequest(Boolean force, String approvalId, Integer baseVersion, String baseContentHash) {}

record RestoreSnapshotRequest(String approvalId, Integer baseVersion, String baseContentHash) {}
