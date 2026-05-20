package com.agenthub.api.agent;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentApplicationService agentApplicationService;

    public AgentController(AgentApplicationService agentApplicationService) {
        this.agentApplicationService = agentApplicationService;
    }

    @GetMapping
    public ApiResponse<?> listAgents() {
        return ApiResponse.success(agentApplicationService.listAgents());
    }

    @GetMapping("/{agentId}")
    public ApiResponse<?> getAgent(@PathVariable String agentId) {
        return ApiResponse.success(agentApplicationService.getAgent(agentId));
    }
}
