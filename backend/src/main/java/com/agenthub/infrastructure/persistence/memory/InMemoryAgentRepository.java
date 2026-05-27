package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.AgentRepository;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.AgentStatus;
import com.agenthub.domain.agent.BuiltInAgentIds;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryAgentRepository implements AgentRepository {

    private final ConcurrentHashMap<String, Agent> storage = new ConcurrentHashMap<>();

    public InMemoryAgentRepository(TimeProvider timeProvider) {
        Instant now = timeProvider.now();
        save(new Agent(
                new AgentId(BuiltInAgentIds.ORCHESTRATOR),
                "Orchestrator",
                null,
                AgentRole.ORCHESTRATOR,
                "负责理解任务、拆解步骤、路由 Agent 并聚合结果。",
                "你是 AgentHub 的 Orchestrator，负责把用户目标拆解成可执行协作流程。",
                "MOCK",
                List.of("planning", "routing", "aggregation"),
                List.of("task_planner", "task_router"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.FRONTEND_BUILDER),
                "Frontend Builder",
                null,
                AgentRole.FRONTEND_BUILDER,
                "负责页面、组件、样式和交互草案。",
                "你是前端构建 Agent，负责把任务需求转成可预览的前端产物。",
                "CODEX",
                List.of("frontend", "ui", "react"),
                List.of("code_editor", "preview"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.BACKEND_WORKER),
                "Backend Worker",
                null,
                AgentRole.BACKEND_WORKER,
                "负责 API 契约、数据模型和服务草案。",
                "你是后端协作 Agent，负责为前端产物补齐接口和数据结构假设。",
                "MOCK",
                List.of("backend", "api", "data-model"),
                List.of("contract_writer", "schema_designer"),
                AgentStatus.ACTIVE,
                now,
                now));
        save(new Agent(
                new AgentId(BuiltInAgentIds.REVIEWER),
                "Reviewer",
                null,
                AgentRole.REVIEWER,
                "负责检查验收标准、问题和质量风险。",
                "你是评审 Agent，负责基于验收标准检查产物质量和剩余风险。",
                "CLAUDE_CODE",
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
        return storage.values().stream()
                .sorted(Comparator.comparing(Agent::getCreatedAt).thenComparing(agent -> agent.getId().value()))
                .toList();
    }

    @Override
    public List<Agent> findByRole(AgentRole role) {
        return storage.values().stream()
                .filter(agent -> agent.getRole() == role)
                .sorted(Comparator.comparing(Agent::getCreatedAt).thenComparing(agent -> agent.getId().value()))
                .toList();
    }
}
