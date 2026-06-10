package com.agenthub.application.agent;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.AgentRepository;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.AgentStatus;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class AgentApplicationService {

    private final AgentRepository agentRepository;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public AgentApplicationService(
            AgentRepository agentRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.agentRepository = agentRepository;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public List<Agent> listAgents() {
        return agentRepository.findAll();
    }

    public Agent getAgent(String agentId) {
        return agentRepository.findById(new AgentId(agentId))
                .orElseThrow(() -> new NoSuchElementException("Agent not found: " + agentId));
    }

    public Agent createCustomAgent(
            String name,
            String avatarUrl,
            String systemPrompt,
            List<String> capabilityTags,
            List<String> toolTags,
            String preferredAdapterType) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Agent name cannot be blank.");
        }

        Instant now = timeProvider.now();
        String normalizedPreferredAdapter = normalizePreferredAdapterType(preferredAdapterType);
        String normalizedAvatarUrl = normalizeOptionalText(avatarUrl);
        String normalizedPrompt = normalizeOptionalText(systemPrompt);

        Agent agent = new Agent(
                new AgentId(idGenerator.nextId("agent")),
                name.trim(),
                normalizedAvatarUrl,
                AgentRole.CUSTOM,
                "User-created custom agent for the AgentHub demo workspace.",
                normalizedPrompt,
                normalizedPreferredAdapter,
                capabilityTags == null ? List.of() : capabilityTags.stream().map(String::trim).filter(tag -> !tag.isBlank()).toList(),
                toolTags == null ? List.of() : toolTags.stream().map(String::trim).filter(tag -> !tag.isBlank()).toList(),
                AgentStatus.ACTIVE,
                now,
                now);
        return agentRepository.save(agent);
    }

    public boolean deleteAgent(String agentId) {
        if (agentId == null || agentId.isBlank()) {
            throw new IllegalArgumentException("Agent id cannot be blank.");
        }

        if (isBuiltInAgent(agentId)) {
            throw new IllegalArgumentException("Built-in agents cannot be deleted.");
        }

        AgentId normalizedId = new AgentId(agentId);
        Agent agent = agentRepository.findById(normalizedId)
                .orElseThrow(() -> new NoSuchElementException("Agent not found: " + agentId));
        if (agent.getRole() != AgentRole.CUSTOM) {
            throw new IllegalArgumentException("Only custom agents can be deleted.");
        }

        agentRepository.deleteById(normalizedId);
        return true;
    }

    private String normalizePreferredAdapterType(String preferredAdapterType) {
        if (preferredAdapterType == null || preferredAdapterType.isBlank()) {
            return AgentAdapterType.MOCK.name();
        }

        try {
            return AgentAdapterType.valueOf(preferredAdapterType.trim().toUpperCase(Locale.ROOT)).name();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported preferredAdapterType: " + preferredAdapterType);
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private boolean isBuiltInAgent(String agentId) {
        return BuiltInAgentIds.ORCHESTRATOR.equals(agentId)
                || BuiltInAgentIds.FRONTEND_BUILDER.equals(agentId)
                || BuiltInAgentIds.BACKEND_WORKER.equals(agentId)
                || BuiltInAgentIds.REVIEWER.equals(agentId);
    }
}
