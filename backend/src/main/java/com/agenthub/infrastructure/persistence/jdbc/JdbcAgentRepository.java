package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.AgentRepository;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.AgentStatus;
import com.agenthub.domain.agent.BuiltInAgentIds;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcAgentRepository implements AgentRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final TimeProvider timeProvider;

    public JdbcAgentRepository(JdbcConnectionFactory connectionFactory, TimeProvider timeProvider) {
        this.connectionFactory = connectionFactory;
        this.timeProvider = timeProvider;
        initSchema();
        seedBuiltInAgents();
    }

    @Override
    public Agent save(Agent agent) {
        String sql = """
                REPLACE INTO agenthub_agents
                (id, name, avatar_url, role, description, system_prompt, preferred_adapter_type,
                 capability_tags_json, tool_tags_json, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, agent.getId().value());
            statement.setString(2, agent.getName());
            statement.setString(3, agent.getAvatarUrl());
            statement.setString(4, agent.getRole().name());
            statement.setString(5, agent.getDescription());
            statement.setString(6, agent.getSystemPrompt());
            statement.setString(7, agent.getPreferredAdapterType());
            statement.setString(8, JdbcSerializationSupport.toJson(agent.getCapabilityTags()));
            statement.setString(9, JdbcSerializationSupport.toJson(agent.getToolTags()));
            statement.setString(10, agent.getStatus().name());
            statement.setTimestamp(11, JdbcSerializationSupport.timestamp(agent.getCreatedAt()));
            statement.setTimestamp(12, JdbcSerializationSupport.timestamp(agent.getUpdatedAt()));
            statement.executeUpdate();
            return agent;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save agent", exception);
        }
    }

    @Override
    public Optional<Agent> findById(AgentId agentId) {
        List<Agent> agents = queryMany("SELECT * FROM agenthub_agents WHERE id = ?", agentId.value());
        return agents.stream().findFirst();
    }

    @Override
    public List<Agent> findAll() {
        return queryMany("SELECT * FROM agenthub_agents ORDER BY created_at, id");
    }

    @Override
    public List<Agent> findByRole(AgentRole role) {
        return queryMany("SELECT * FROM agenthub_agents WHERE role = ? ORDER BY created_at, id", role.name());
    }

    @Override
    public void deleteById(AgentId agentId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("DELETE FROM agenthub_agents WHERE id = ?")) {
            statement.setString(1, agentId.value());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to delete agent", exception);
        }
    }

    private List<Agent> queryMany(String sql, String... values) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < values.length; index++) {
                statement.setString(index + 1, values[index]);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Agent> agents = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    agents.add(map(resultSet));
                }
                return agents;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query agents", exception);
        }
    }

    private Agent map(ResultSet resultSet) throws SQLException {
        return new Agent(
                new AgentId(resultSet.getString("id")),
                resultSet.getString("name"),
                resultSet.getString("avatar_url"),
                AgentRole.valueOf(resultSet.getString("role")),
                resultSet.getString("description"),
                resultSet.getString("system_prompt"),
                resultSet.getString("preferred_adapter_type"),
                JdbcSerializationSupport.stringList(resultSet.getString("capability_tags_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("tool_tags_json")),
                AgentStatus.valueOf(resultSet.getString("status")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private void seedBuiltInAgents() {
        Instant now = timeProvider.now();
        seedIfMissing(new Agent(
                new AgentId(BuiltInAgentIds.ORCHESTRATOR),
                "Orchestrator",
                null,
                AgentRole.ORCHESTRATOR,
                "Plans, routes, and aggregates multi-agent collaboration results.",
                "You are the AgentHub Orchestrator. Plan work, route steps, and aggregate outcomes.",
                "MOCK",
                List.of("planning", "routing", "aggregation"),
                List.of("task_planner", "task_router"),
                AgentStatus.ACTIVE,
                now,
                now));
        seedIfMissing(new Agent(
                new AgentId(BuiltInAgentIds.FRONTEND_BUILDER),
                "Frontend Builder",
                null,
                AgentRole.FRONTEND_BUILDER,
                "Builds pages, components, styles, and interaction drafts.",
                "You are the frontend builder Agent. Turn requirements into previewable frontend artifacts.",
                "CODEX",
                List.of("frontend", "ui", "react"),
                List.of("code_editor", "preview"),
                AgentStatus.ACTIVE,
                now,
                now));
        seedIfMissing(new Agent(
                new AgentId(BuiltInAgentIds.BACKEND_WORKER),
                "Backend Worker",
                null,
                AgentRole.BACKEND_WORKER,
                "Designs API contracts, data models, and backend service drafts.",
                "You are the backend worker Agent. Align frontend artifacts with APIs and data structures.",
                "MOCK",
                List.of("backend", "api", "data-model"),
                List.of("contract_writer", "schema_designer"),
                AgentStatus.ACTIVE,
                now,
                now));
        seedIfMissing(new Agent(
                new AgentId(BuiltInAgentIds.REVIEWER),
                "Reviewer",
                null,
                AgentRole.REVIEWER,
                "Checks acceptance criteria, quality risks, and remaining issues.",
                "You are the reviewer Agent. Evaluate artifact quality and acceptance risk.",
                "CLAUDE_CODE",
                List.of("review", "quality", "acceptance"),
                List.of("review_checker"),
                AgentStatus.ACTIVE,
                now,
                now));
    }

    private void seedIfMissing(Agent agent) {
        if (findById(agent.getId()).isEmpty()) {
            save(agent);
        }
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_agents (
                        id VARCHAR(128) PRIMARY KEY,
                        name VARCHAR(256) NOT NULL,
                        avatar_url TEXT,
                        role VARCHAR(64) NOT NULL,
                        description TEXT,
                        system_prompt LONGTEXT,
                        preferred_adapter_type VARCHAR(64),
                        capability_tags_json TEXT,
                        tool_tags_json TEXT,
                        status VARCHAR(64) NOT NULL,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize agent schema", exception);
        }
    }
}
