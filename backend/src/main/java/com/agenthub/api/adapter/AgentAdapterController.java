package com.agenthub.api.adapter;

import com.agenthub.application.agent.AgentAdapterApplicationService;
import com.agenthub.application.agent.AgentAdapterApplicationService.ExecuteAgentAdapterCommand;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/adapters")
public class AgentAdapterController {

    private final AgentAdapterApplicationService agentAdapterApplicationService;

    public AgentAdapterController(AgentAdapterApplicationService agentAdapterApplicationService) {
        this.agentAdapterApplicationService = agentAdapterApplicationService;
    }

    @GetMapping
    public ApiResponse<?> listAdapters() {
        return ApiResponse.success(agentAdapterApplicationService.listAdapters());
    }

    @GetMapping("/quality-metrics")
    public ApiResponse<?> listQualityMetrics() {
        return ApiResponse.success(agentAdapterApplicationService.listQualityMetrics());
    }

    @PostMapping("/{adapterType}/execute")
    public ApiResponse<?> execute(
            @PathVariable("adapterType") String adapterType,
            @Valid @RequestBody ExecuteAdapterRequest request) {
        return ApiResponse.success(
                agentAdapterApplicationService.execute(
                        adapterType,
                        new ExecuteAgentAdapterCommand(
                                request.conversationId(),
                                request.taskRunId(),
                                request.taskStepId(),
                                request.agentId(),
                                request.agentName(),
                                request.userInput(),
                                request.systemPrompt(),
                                request.taskDescription(),
                                request.contextItems(),
                                request.artifactSummaries(),
                                request.metadata())),
                "Adapter execution completed");
    }
}

record ExecuteAdapterRequest(
        @NotBlank String conversationId,
        String taskRunId,
        String taskStepId,
        @NotBlank String agentId,
        @NotBlank String agentName,
        String userInput,
        String systemPrompt,
        String taskDescription,
        List<String> contextItems,
        List<String> artifactSummaries,
        Map<String, Object> metadata) {
}
