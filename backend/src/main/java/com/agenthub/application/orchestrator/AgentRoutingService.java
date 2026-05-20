package com.agenthub.application.orchestrator;

import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AgentRoutingService {

    public AgentAdapterType resolvePreferredAdapterForAgentRole(AgentRole role) {
        return switch (role) {
            case ORCHESTRATOR -> AgentAdapterType.MOCK;
            case FRONTEND_BUILDER -> AgentAdapterType.CODEX;
            case BACKEND_WORKER -> AgentAdapterType.MOCK;
            case REVIEWER -> AgentAdapterType.CLAUDE_CODE;
            case CUSTOM -> AgentAdapterType.MOCK;
        };
    }

    public AgentAdapterType resolvePreferredAdapterForAgent(Agent agent) {
        if (agent == null) {
            return AgentAdapterType.MOCK;
        }

        if (agent.getPreferredAdapterType() != null && !agent.getPreferredAdapterType().isBlank()) {
            try {
                return AgentAdapterType.valueOf(agent.getPreferredAdapterType().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                return AgentAdapterType.MOCK;
            }
        }

        return resolvePreferredAdapterForAgentRole(agent.getRole());
    }

    public AgentAdapterType resolvePreferredAdapterForStep(String agentId, String taskDescription) {
        AgentRole role = resolveAgentRole(agentId, taskDescription);
        return resolvePreferredAdapterForAgentRole(role);
    }

    public AgentRole resolveAgentRole(String agentId, String taskDescription) {
        if (BuiltInAgentIds.ORCHESTRATOR.equals(agentId)) {
            return AgentRole.ORCHESTRATOR;
        }
        if (BuiltInAgentIds.FRONTEND_BUILDER.equals(agentId)) {
            return AgentRole.FRONTEND_BUILDER;
        }
        if (BuiltInAgentIds.BACKEND_WORKER.equals(agentId)) {
            return AgentRole.BACKEND_WORKER;
        }
        if (BuiltInAgentIds.REVIEWER.equals(agentId)) {
            return AgentRole.REVIEWER;
        }

        String normalized = taskDescription == null ? "" : taskDescription.toLowerCase(Locale.ROOT);
        if (normalized.contains("review") || normalized.contains("check") || normalized.contains("acceptance")) {
            return AgentRole.REVIEWER;
        }
        if (normalized.contains("api") || normalized.contains("backend") || normalized.contains("contract")) {
            return AgentRole.BACKEND_WORKER;
        }
        if (normalized.contains("react") || normalized.contains("frontend") || normalized.contains("page")) {
            return AgentRole.FRONTEND_BUILDER;
        }
        return AgentRole.CUSTOM;
    }
}
