package com.agenthub.application.orchestrator;

import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AgentRouter {

    private final AgentRoutingService agentRoutingService;

    public AgentRouter(AgentRoutingService agentRoutingService) {
        this.agentRoutingService = agentRoutingService;
    }

    public RoutedAgent route(OrchestratorStepPlan stepPlan, Agent selectedAgent) {
        if (selectedAgent != null && stepPlan.stepOrder() == 1) {
            return new RoutedAgent(
                    selectedAgent.getId().value(),
                    selectedAgent.getName(),
                    selectedAgent.getSystemPrompt(),
                    agentRoutingService.resolvePreferredAdapterForAgent(selectedAgent));
        }

        AgentAdapterType preferredAdapterType = resolveStepPreferredAdapter(stepPlan);
        return new RoutedAgent(
                stepPlan.agentId(),
                stepPlan.agentName(),
                defaultSystemPrompt(stepPlan.agentRole()),
                preferredAdapterType);
    }

    private AgentAdapterType resolveStepPreferredAdapter(OrchestratorStepPlan stepPlan) {
        String configuredAdapter = stepPlan.preferredAdapterType();
        if (configuredAdapter != null && !configuredAdapter.isBlank()) {
            try {
                return AgentAdapterType.valueOf(configuredAdapter.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                return AgentAdapterType.MOCK;
            }
        }

        AgentRole role = AgentRole.valueOf(stepPlan.agentRole());
        return agentRoutingService.resolvePreferredAdapterForAgentRole(role);
    }

    private String defaultSystemPrompt(String agentRole) {
        return switch (agentRole) {
            case "FRONTEND_BUILDER" -> "你负责 AgentHub Demo 中的前端实现。";
            case "BACKEND_WORKER" -> "你负责 AgentHub Demo 中的 API 契约和后端结构说明。";
            case "REVIEWER" -> "你负责 AgentHub Demo 中的评审和验收检查。";
            default -> "你是 AgentHub Demo 中的协作 Agent。";
        };
    }

    public record RoutedAgent(
            String agentId,
            String agentName,
            String systemPrompt,
            AgentAdapterType preferredAdapterType) {
    }
}
