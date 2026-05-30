package com.agenthub.api.agent;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.application.agent.NaturalLanguageAgentDraftService;
import com.agenthub.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agents")
public class AgentController {

    private final AgentApplicationService agentApplicationService;
    private final NaturalLanguageAgentDraftService naturalLanguageAgentDraftService;

    public AgentController(
            AgentApplicationService agentApplicationService,
            NaturalLanguageAgentDraftService naturalLanguageAgentDraftService) {
        this.agentApplicationService = agentApplicationService;
        this.naturalLanguageAgentDraftService = naturalLanguageAgentDraftService;
    }

    @GetMapping
    public ApiResponse<?> listAgents() {
        return ApiResponse.success(agentApplicationService.listAgents());
    }

    @GetMapping("/{agentId}")
    public ApiResponse<?> getAgent(@PathVariable("agentId") String agentId) {
        return ApiResponse.success(agentApplicationService.getAgent(agentId));
    }

    @PostMapping
    public ApiResponse<?> createAgent(@Valid @RequestBody CreateAgentRequest request) {
        return ApiResponse.success(
                agentApplicationService.createCustomAgent(
                        request.name(),
                        request.avatarUrl(),
                        request.systemPrompt(),
                        request.capabilityTags(),
                        request.toolTags(),
                        request.preferredAdapterType()),
                "Agent created");
    }

    @PostMapping("/draft")
    public ApiResponse<?> draftAgent(@Valid @RequestBody DraftAgentRequest request) {
        return ApiResponse.success(
                naturalLanguageAgentDraftService.draftFromNaturalLanguage(request.description()),
                "Agent draft created");
    }
}

record CreateAgentRequest(
        @NotBlank String name,
        String avatarUrl,
        String systemPrompt,
        List<String> capabilityTags,
        List<String> toolTags,
        String preferredAdapterType) {
}

record DraftAgentRequest(@NotBlank String description) {
}
