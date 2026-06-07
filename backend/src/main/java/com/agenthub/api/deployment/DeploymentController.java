package com.agenthub.api.deployment;

import com.agenthub.application.approval.ApprovalApplicationService;
import com.agenthub.application.artifact.ArtifactApplicationService;
import com.agenthub.application.deployment.DeploymentApplicationService;
import com.agenthub.common.ApiResponse;
import com.agenthub.domain.artifact.Artifact;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DeploymentController {

    private final DeploymentApplicationService deploymentApplicationService;
    private final ArtifactApplicationService artifactApplicationService;
    private final ApprovalApplicationService approvalApplicationService;

    public DeploymentController(
            DeploymentApplicationService deploymentApplicationService,
            ArtifactApplicationService artifactApplicationService,
            ApprovalApplicationService approvalApplicationService) {
        this.deploymentApplicationService = deploymentApplicationService;
        this.artifactApplicationService = artifactApplicationService;
        this.approvalApplicationService = approvalApplicationService;
    }

    @PostMapping("/artifacts/{artifactId}/demo-deploy")
    public ApiResponse<?> createDemoDeployment(
            @PathVariable("artifactId") String artifactId,
            @RequestBody(required = false) CreateDemoDeploymentRequest request) {
        Artifact artifact = artifactApplicationService.getArtifact(artifactId);
        String approvalId = request == null ? null : request.approvalId();
        approvalApplicationService.validateApproved(
                approvalId,
                artifact.getConversationId(),
                "DEMO_DEPLOY",
                "ARTIFACT",
                artifactId);
        artifactApplicationService.validateExpectedArtifactState(
                artifact,
                request == null ? null : request.baseVersion(),
                request == null ? null : request.baseContentHash(),
                "create local preview");
        Object deployment = deploymentApplicationService.createDemoDeployment(artifactId);
        approvalApplicationService.consume(approvalId);
        return ApiResponse.success(deployment, "Demo deployment created");
    }

    @GetMapping("/conversations/{conversationId}/deployments")
    public ApiResponse<?> listDeploymentsByConversation(@PathVariable("conversationId") String conversationId) {
        return ApiResponse.success(deploymentApplicationService.listDeploymentsByConversation(conversationId));
    }

    @GetMapping("/artifacts/{artifactId}/deployments")
    public ApiResponse<?> listDeploymentsByArtifact(@PathVariable("artifactId") String artifactId) {
        return ApiResponse.success(deploymentApplicationService.listDeploymentsByArtifact(artifactId));
    }

    @GetMapping("/deployments/{deploymentId}")
    public ApiResponse<?> getDeployment(@PathVariable("deploymentId") String deploymentId) {
        return ApiResponse.success(deploymentApplicationService.getDeployment(deploymentId));
    }

    public record CreateDemoDeploymentRequest(String approvalId, Integer baseVersion, String baseContentHash) {
    }
}
