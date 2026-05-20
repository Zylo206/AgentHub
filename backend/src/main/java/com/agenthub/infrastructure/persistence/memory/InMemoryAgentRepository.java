package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.AgentRepository;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.AgentStatus;
import com.agenthub.domain.agent.BuiltInAgentIds;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryAgentRepository implements AgentRepository {

    private final ConcurrentHashMap<String, Agent> storage = new ConcurrentHashMap<>();

    public InMemoryAgentRepository(TimeProvider timeProvider) {
        Instant now = timeProvider.now();
        save(new Agent(
                new AgentId(BuiltInAgentIds.ORCHESTRATOR),
                "Orchestrator",
                AgentRole.ORCHESTRATOR,
                "Coordinates task understanding, routing, and aggregation.",
                "You are the orchestrator.",
                List.of("planning", "routing", "aggregation"),
                List.of("task_planner", "task_router"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.FRONTEND_BUILDER),
                "Frontend Builder",
                AgentRole.FRONTEND_BUILDER,
                "Builds pages, components, styles, and interaction drafts.",
                "You are the frontend builder.",
                List.of("frontend", "ui", "react"),
                List.of("code_editor", "preview"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.BACKEND_WORKER),
                "Backend Worker",
                AgentRole.BACKEND_WORKER,
                "Builds API contracts, data models, and service drafts.",
                "You are the backend worker.",
                List.of("backend", "api", "data-model"),
                List.of("contract_writer", "schema_designer"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.REVIEWER),
                "Reviewer",
                AgentRole.REVIEWER,
                "Checks acceptance criteria, issues, and quality risks.",
                "You are the reviewer.",
                List.of("review", "quality", "acceptance"),
                List.of("review_checker"),
                AgentStatus.ACTIVE,
                now,
                now));
    }

    @Override
    public Agent save(Agent agent) {
        storage.put(agent.getId().value(), agent);
        return agent;
    }

    @Override
    public Optional<Agent> findById(AgentId agentId) {
        return Optional.ofNullable(storage.get(agentId.value()));
    }

    @Override
    public List<Agent> findAll() {
        return storage.values().stream().toList();
    }

    @Override
    public List<Agent> findByRole(AgentRole role) {
        return storage.values().stream()
                .filter(agent -> agent.getRole() == role)
                .toList();
    }
}
