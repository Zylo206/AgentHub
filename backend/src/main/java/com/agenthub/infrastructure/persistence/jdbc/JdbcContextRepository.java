package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.ContextSnapshot;
import com.agenthub.domain.context.ContextSnapshotId;
import com.agenthub.domain.context.HandoffSummary;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.context.RetrievedContextItem;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskStepId;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcContextRepository implements ContextRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final ObjectMapper objectMapper;

    public JdbcContextRepository(JdbcConnectionFactory connectionFactory, ObjectMapper objectMapper) {
        this.connectionFactory = connectionFactory;
        this.objectMapper = objectMapper;
        initSchema();
    }

    @Override
    public ContextSnapshot saveContextSnapshot(ContextSnapshot snapshot) {
        String sql = """
                REPLACE INTO agenthub_context_snapshots
                (id, conversation_id, task_run_id, included_message_ids_json, included_artifact_ids_json,
                 pinned_context_items_json, retrieved_context_items_json, summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, snapshot.getId().value());
            statement.setString(2, snapshot.getConversationId().value());
            statement.setString(3, snapshot.getTaskRunId().value());
            statement.setString(4, JdbcSerializationSupport.toJson(
                    snapshot.getIncludedMessageIds().stream().map(MessageId::value).toList()));
            statement.setString(5, JdbcSerializationSupport.artifactIdsJson(snapshot.getIncludedArtifactIds()));
            statement.setString(6, JdbcSerializationSupport.toJson(snapshot.getPinnedContextItems()));
            statement.setString(7, writeRetrievedContextItems(snapshot.getRetrievedContextItems()));
            statement.setString(8, snapshot.getSummary());
            statement.setTimestamp(9, JdbcSerializationSupport.timestamp(snapshot.getCreatedAt()));
            statement.executeUpdate();
            return snapshot;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save context snapshot", exception);
        }
    }

    @Override
    public Optional<ContextSnapshot> findContextSnapshotById(ContextSnapshotId id) {
        return querySnapshots("SELECT * FROM agenthub_context_snapshots WHERE id = ?", id.value()).stream().findFirst();
    }

    @Override
    public List<ContextSnapshot> findContextSnapshotsByConversationId(ConversationId conversationId) {
        return querySnapshots(
                "SELECT * FROM agenthub_context_snapshots WHERE conversation_id = ? ORDER BY created_at",
                conversationId.value());
    }

    @Override
    public List<ContextSnapshot> findContextSnapshotsByTaskRunId(TaskRunId taskRunId) {
        return querySnapshots(
                "SELECT * FROM agenthub_context_snapshots WHERE task_run_id = ? ORDER BY created_at",
                taskRunId.value());
    }

    @Override
    public PinnedContext savePinnedContext(PinnedContext pinnedContext) {
        String sql = """
                REPLACE INTO agenthub_pinned_contexts
                (id, conversation_id, content, source_type, source_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, pinnedContext.getId());
            statement.setString(2, pinnedContext.getConversationId().value());
            statement.setString(3, pinnedContext.getContent());
            statement.setString(4, pinnedContext.getSourceType());
            statement.setString(5, pinnedContext.getSourceId());
            statement.setTimestamp(6, JdbcSerializationSupport.timestamp(pinnedContext.getCreatedAt()));
            statement.executeUpdate();
            return pinnedContext;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save pinned context", exception);
        }
    }

    @Override
    public Optional<PinnedContext> findPinnedContextById(String pinnedContextId) {
        return queryPinnedContexts("SELECT * FROM agenthub_pinned_contexts WHERE id = ?", pinnedContextId).stream().findFirst();
    }

    @Override
    public Optional<PinnedContext> findPinnedContextBySource(
            ConversationId conversationId,
            String sourceType,
            String sourceId) {
        String sql = """
                SELECT * FROM agenthub_pinned_contexts
                WHERE conversation_id = ? AND source_type = ? AND source_id = ?
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId.value());
            statement.setString(2, sourceType);
            statement.setString(3, sourceId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(mapPinnedContext(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query pinned context by source", exception);
        }
    }

    @Override
    public List<PinnedContext> findPinnedContextsByConversationId(ConversationId conversationId) {
        return queryPinnedContexts(
                "SELECT * FROM agenthub_pinned_contexts WHERE conversation_id = ? ORDER BY created_at",
                conversationId.value());
    }

    @Override
    public void deletePinnedContext(String pinnedContextId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("DELETE FROM agenthub_pinned_contexts WHERE id = ?")) {
            statement.setString(1, pinnedContextId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to delete pinned context", exception);
        }
    }

    @Override
    public HandoffSummary saveHandoffSummary(HandoffSummary summary) {
        String sql = """
                REPLACE INTO agenthub_handoff_summaries
                (id, task_run_id, source_step_id, target_step_id, source_agent_id, target_agent_id,
                 passed_artifact_ids_json, key_decisions_json, open_issues_json, summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, summary.getId());
            statement.setString(2, summary.getTaskRunId().value());
            statement.setString(3, summary.getSourceStepId().value());
            statement.setString(4, summary.getTargetStepId().value());
            statement.setString(5, summary.getSourceAgentId());
            statement.setString(6, summary.getTargetAgentId());
            statement.setString(7, JdbcSerializationSupport.artifactIdsJson(summary.getPassedArtifactIds()));
            statement.setString(8, JdbcSerializationSupport.toJson(summary.getKeyDecisions()));
            statement.setString(9, JdbcSerializationSupport.toJson(summary.getOpenIssues()));
            statement.setString(10, summary.getSummary());
            statement.setTimestamp(11, JdbcSerializationSupport.timestamp(summary.getCreatedAt()));
            statement.executeUpdate();
            return summary;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save handoff summary", exception);
        }
    }

    @Override
    public List<HandoffSummary> findHandoffSummariesByTaskRunId(TaskRunId taskRunId) {
        return queryHandoffSummaries(
                "SELECT * FROM agenthub_handoff_summaries WHERE task_run_id = ? ORDER BY created_at",
                taskRunId.value());
    }

    private List<ContextSnapshot> querySnapshots(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<ContextSnapshot> snapshots = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    snapshots.add(mapContextSnapshot(resultSet));
                }
                return snapshots;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query context snapshots", exception);
        }
    }

    private List<PinnedContext> queryPinnedContexts(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<PinnedContext> contexts = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    contexts.add(mapPinnedContext(resultSet));
                }
                return contexts.stream().sorted(Comparator.comparing(PinnedContext::getCreatedAt)).toList();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query pinned contexts", exception);
        }
    }

    private List<HandoffSummary> queryHandoffSummaries(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<HandoffSummary> summaries = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    summaries.add(mapHandoffSummary(resultSet));
                }
                return summaries;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query handoff summaries", exception);
        }
    }

    private ContextSnapshot mapContextSnapshot(ResultSet resultSet) throws SQLException {
        return new ContextSnapshot(
                new ContextSnapshotId(resultSet.getString("id")),
                new ConversationId(resultSet.getString("conversation_id")),
                new TaskRunId(resultSet.getString("task_run_id")),
                JdbcSerializationSupport.stringList(resultSet.getString("included_message_ids_json")).stream()
                        .map(MessageId::new)
                        .toList(),
                JdbcSerializationSupport.artifactIds(resultSet.getString("included_artifact_ids_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("pinned_context_items_json")),
                readRetrievedContextItems(resultSet.getString("retrieved_context_items_json")),
                resultSet.getString("summary"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private PinnedContext mapPinnedContext(ResultSet resultSet) throws SQLException {
        return new PinnedContext(
                resultSet.getString("id"),
                new ConversationId(resultSet.getString("conversation_id")),
                resultSet.getString("content"),
                resultSet.getString("source_type"),
                resultSet.getString("source_id"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private HandoffSummary mapHandoffSummary(ResultSet resultSet) throws SQLException {
        return new HandoffSummary(
                resultSet.getString("id"),
                new TaskRunId(resultSet.getString("task_run_id")),
                new TaskStepId(resultSet.getString("source_step_id")),
                new TaskStepId(resultSet.getString("target_step_id")),
                resultSet.getString("source_agent_id"),
                resultSet.getString("target_agent_id"),
                JdbcSerializationSupport.artifactIds(resultSet.getString("passed_artifact_ids_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("key_decisions_json")),
                JdbcSerializationSupport.stringList(resultSet.getString("open_issues_json")),
                resultSet.getString("summary"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private String writeRetrievedContextItems(List<RetrievedContextItem> items) {
        try {
            return objectMapper.writeValueAsString(items == null ? List.of() : items);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to serialize retrieved context items", exception);
        }
    }

    private List<RetrievedContextItem> readRetrievedContextItems(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.isArray()) {
                return List.of();
            }
            java.util.ArrayList<RetrievedContextItem> items = new java.util.ArrayList<>();
            for (JsonNode node : root) {
                items.add(new RetrievedContextItem(
                        node.path("sourceType").asText("UNKNOWN"),
                        node.path("sourceId").asText(""),
                        node.path("title").asText(""),
                        node.path("content").asText(""),
                        node.path("score").asDouble(0),
                        node.path("reason").asText(""),
                        node.path("sourceRank").asInt(0),
                        node.path("baseScore").asDouble(0),
                        node.path("keywordScore").asDouble(0),
                        node.path("recencyScore").asDouble(0),
                        node.path("importanceScore").asDouble(0),
                        node.path("semanticScore").asDouble(0),
                        node.path("semanticBackend").asText("HEURISTIC"),
                        node.path("semanticExplanation").asText("Loaded from JDBC context snapshot."),
                        readStringArray(node.path("matchedTokens")),
                        node.path("windowPolicy").asText("JDBC"),
                        node.path("searchStage").asText("UNKNOWN")));
            }
            return items;
        } catch (Exception exception) {
            return List.of();
        }
    }

    private List<String> readStringArray(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        java.util.ArrayList<String> values = new java.util.ArrayList<>();
        node.forEach(value -> values.add(value.asText("")));
        return values;
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_context_snapshots (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        task_run_id VARCHAR(128) NOT NULL,
                        included_message_ids_json TEXT,
                        included_artifact_ids_json TEXT,
                        pinned_context_items_json TEXT,
                        retrieved_context_items_json LONGTEXT,
                        summary TEXT,
                        created_at TIMESTAMP
                    )
                    """);
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_pinned_contexts (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        content LONGTEXT,
                        source_type VARCHAR(128),
                        source_id VARCHAR(128),
                        created_at TIMESTAMP,
                        UNIQUE KEY uq_pinned_context_source (conversation_id, source_type, source_id)
                    )
                    """);
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_handoff_summaries (
                        id VARCHAR(128) PRIMARY KEY,
                        task_run_id VARCHAR(128) NOT NULL,
                        source_step_id VARCHAR(128),
                        target_step_id VARCHAR(128),
                        source_agent_id VARCHAR(128),
                        target_agent_id VARCHAR(128),
                        passed_artifact_ids_json TEXT,
                        key_decisions_json TEXT,
                        open_issues_json TEXT,
                        summary TEXT,
                        created_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize context schema", exception);
        }
    }
}
