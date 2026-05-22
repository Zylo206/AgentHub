package com.agenthub.api.deployment;

import com.agenthub.application.deployment.DeploymentApplicationService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DeploymentController {

    private final DeploymentApplicationService deploymentApplicationService;

    public DeploymentController(DeploymentApplicationService deploymentApplicationService) {
        this.deploymentApplicationService = deploymentApplicationService;
    }

    @PostMapping("/artifacts/{artifactId}/demo-deploy")
    public ApiResponse<?> createDemoDeployment(@PathVariable("artifactId") String artifactId) {
        return ApiResponse.success(
                deploymentApplicationService.createDemoDeployment(artifactId),
                "Demo deployment created");
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
}
