package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactSourceKind;
import com.agenthub.domain.artifact.ArtifactStatus;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcArtifactRepository implements ArtifactRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final boolean fulltextEnabled;

    public JdbcArtifactRepository(
            JdbcConnectionFactory connectionFactory,
            @Value("${agenthub.context.search.fulltext-enabled:false}") boolean fulltextEnabled) {
        this.connectionFactory = connectionFactory;
        this.fulltextEnabled = fulltextEnabled;
        initSchema();
    }

    @Override
    public Artifact save(Artifact artifact) {
        String sql = """
                REPLACE INTO agenthub_artifacts
                (id, conversation_id, task_run_id, parent_artifact_id, revision_instruction, title, type, status,
                 language, content, version, source_kind, source_adapter_type, source_task_step_id, generation_mode,
                 build_validation_status, build_validation_reason, quality_status, quality_score, quality_reason, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, artifact.getId().value());
            statement.setString(2, artifact.getConversationId().value());
            statement.setString(3, artifact.getTaskRunId() == null ? null : artifact.getTaskRunId().value());
            statement.setString(4, artifact.getParentArtifactId());
            statement.setString(5, artifact.getRevisionInstruction());
            statement.setString(6, artifact.getTitle());
            statement.setString(7, artifact.getType().name());
            statement.setString(8, artifact.getStatus().name());
            statement.setString(9, artifact.getLanguage());
            statement.setString(10, artifact.getContent());
            statement.setInt(11, artifact.getVersion());
            statement.setString(12, artifact.getSourceKind().name());
            statement.setString(13, artifact.getSourceAdapterType());
            statement.setString(14, artifact.getSourceTaskStepId());
            statement.setString(15, artifact.getGenerationMode());
            statement.setString(16, artifact.getBuildValidationStatus());
            statement.setString(17, artifact.getBuildValidationReason());
            statement.setString(18, artifact.getQualityStatus());
            if (artifact.getQualityScore() == null) {
                statement.setObject(19, null);
            } else {
                statement.setInt(19, artifact.getQualityScore());
            }
            statement.setString(20, artifact.getQualityReason());
            statement.setTimestamp(21, JdbcSerializationSupport.timestamp(artifact.getCreatedAt()));
            statement.setTimestamp(22, JdbcSerializationSupport.timestamp(artifact.getUpdatedAt()));
            statement.executeUpdate();
            return artifact;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save artifact", exception);
        }
    }

    @Override
    public Optional<Artifact> findById(ArtifactId artifactId) {
        List<Artifact> artifacts = queryMany("SELECT * FROM agenthub_artifacts WHERE id = ?", artifactId.value());
        return artifacts.stream().findFirst();
    }

    @Override
    public List<Artifact> findByConversationId(ConversationId conversationId) {
        return queryMany("SELECT * FROM agenthub_artifacts WHERE conversation_id = ? ORDER BY created_at", conversationId.value());
    }

    @Override
    public List<Artifact> findByTaskRunId(TaskRunId taskRunId) {
        return queryMany("SELECT * FROM agenthub_artifacts WHERE task_run_id = ? ORDER BY created_at", taskRunId.value());
    }

    @Override
    public List<Artifact> findRecentByConversationId(ConversationId conversationId, int limit) {
        List<Artifact> artifacts = queryMany(
                "SELECT * FROM agenthub_artifacts WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
                conversationId.value(),
                Math.max(0, limit));
        Collections.reverse(artifacts);
        return artifacts;
    }

    @Override
    public List<Artifact> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        if (fulltextEnabled) {
            String sql = """
                    SELECT * FROM agenthub_artifacts
                    WHERE conversation_id = ? AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
                    ORDER BY created_at DESC
                    LIMIT ?
                    """;
            List<Artifact> artifacts = queryMany(
                    sql,
                    conversationId.value(),
                    toFulltextQuery(normalizedKeywords),
                    Math.max(0, limit));
            Collections.reverse(artifacts);
            return artifacts;
        }
        String where = likeWhere("LOWER(CONCAT(COALESCE(title, ''), ' ', COALESCE(content, '')))", normalizedKeywords.size());
        String sql = "SELECT * FROM agenthub_artifacts WHERE conversation_id = ? AND (" + where
                + ") ORDER BY created_at DESC LIMIT ?";
        List<Artifact> artifacts = queryMany(sql, conversationId.value(), normalizedKeywords, Math.max(0, limit));
        Collections.reverse(artifacts);
        return artifacts;
    }

    private List<Artifact> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Artifact> artifacts = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    artifacts.add(map(resultSet));
                }
                return artifacts;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query artifacts", exception);
        }
    }

    private List<Artifact> queryMany(String sql, String value, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            statement.setInt(2, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Artifact> artifacts = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    artifacts.add(map(resultSet));
                }
                return artifacts;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query artifacts", exception);
        }
    }

    private List<Artifact> queryMany(String sql, String conversationId, List<String> keywords, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            int index = 2;
            for (String keyword : keywords) {
                statement.setString(index++, "%" + keyword + "%");
            }
            statement.setInt(index, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Artifact> artifacts = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    artifacts.add(map(resultSet));
                }
                return artifacts;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to search artifacts", exception);
        }
    }

    private List<Artifact> queryMany(String sql, String conversationId, String fulltextQuery, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            statement.setString(2, fulltextQuery);
            statement.setInt(3, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Artifact> artifacts = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    artifacts.add(map(resultSet));
                }
                return artifacts;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to fulltext search artifacts", exception);
        }
    }

    private String likeWhere(String columnExpression, int keywordCount) {
        return java.util.stream.IntStream.range(0, keywordCount)
                .mapToObj(index -> columnExpression + " LIKE ?")
                .collect(java.util.stream.Collectors.joining(" OR "));
    }

    private List<String> normalizeKeywords(List<String> keywords) {
        if (keywords == null) {
            return List.of();
        }
        return keywords.stream()
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();
    }

    private String toFulltextQuery(List<String> keywords) {
        return String.join(" ", keywords);
    }

    private Artifact map(ResultSet resultSet) throws SQLException {
        String taskRunId = resultSet.getString("task_run_id");
        return new Artifact(
                new ArtifactId(resultSet.getString("id")),
                new ConversationId(resultSet.getString("conversation_id")),
                taskRunId == null ? null : new TaskRunId(taskRunId),
                resultSet.getString("parent_artifact_id"),
                resultSet.getString("revision_instruction"),
                resultSet.getString("title"),
                ArtifactType.valueOf(resultSet.getString("type")),
                ArtifactStatus.valueOf(resultSet.getString("status")),
                resultSet.getString("language"),
                resultSet.getString("content"),
                resultSet.getInt("version"),
                ArtifactSourceKind.valueOf(resultSet.getString("source_kind")),
                resultSet.getString("source_adapter_type"),
                resultSet.getString("source_task_step_id"),
                resultSet.getString("generation_mode"),
                readOptionalColumn(resultSet, "build_validation_status"),
                readOptionalColumn(resultSet, "build_validation_reason"),
                readOptionalColumn(resultSet, "quality_status"),
                readOptionalInteger(resultSet, "quality_score"),
                readOptionalColumn(resultSet, "quality_reason"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private String readOptionalColumn(ResultSet resultSet, String columnName) {
        try {
            return resultSet.getString(columnName);
        } catch (SQLException ignored) {
            return null;
        }
    }

    private Integer readOptionalInteger(ResultSet resultSet, String columnName) {
        try {
            int value = resultSet.getInt(columnName);
            return resultSet.wasNull() ? null : value;
        } catch (SQLException ignored) {
            return null;
        }
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_artifacts (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        task_run_id VARCHAR(128),
                        parent_artifact_id VARCHAR(128),
                        revision_instruction TEXT,
                        title VARCHAR(512) NOT NULL,
                        type VARCHAR(64) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        language VARCHAR(64),
                        content LONGTEXT,
                        version INT,
                        source_kind VARCHAR(64),
                        source_adapter_type VARCHAR(64),
                        source_task_step_id VARCHAR(128),
                        generation_mode VARCHAR(64),
                        build_validation_status VARCHAR(64),
                        build_validation_reason TEXT,
                        quality_status VARCHAR(64),
                        quality_score INT,
                        quality_reason TEXT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
            ensureColumn(connection, "agenthub_artifacts", "build_validation_reason", "TEXT");
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize artifact schema", exception);
        }
    }

    private void ensureColumn(Connection connection, String tableName, String columnName, String columnDefinition)
            throws SQLException {
        try (ResultSet columns = connection.getMetaData().getColumns(null, null, tableName, columnName)) {
            if (columns.next()) {
                return;
            }
        }
        try (var statement = connection.createStatement()) {
            statement.executeUpdate("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDefinition);
        }
    }
}
