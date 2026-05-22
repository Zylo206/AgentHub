package com.agenthub.api.artifact;

import com.agenthub.application.artifact.ArtifactApplicationService;
import com.agenthub.application.task.TaskApplicationService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.task.TaskRun;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ArtifactController {

    private final ArtifactApplicationService artifactApplicationService;
    private final TaskApplicationService taskApplicationService;

    public ArtifactController(
            ArtifactApplicationService artifactApplicationService,
            TaskApplicationService taskApplicationService) {
        this.artifactApplicationService = artifactApplicationService;
        this.taskApplicationService = taskApplicationService;
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
