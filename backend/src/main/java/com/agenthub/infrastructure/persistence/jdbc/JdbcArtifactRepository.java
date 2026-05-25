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
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcArtifactRepository implements ArtifactRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcArtifactRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public Artifact save(Artifact artifact) {
        String sql = """
                REPLACE INTO agenthub_artifacts
                (id, conversation_id, task_run_id, parent_artifact_id, revision_instruction, title, type, status,
                 language, content, version, source_kind, source_adapter_type, source_task_step_id, generation_mode,
                 quality_status, quality_reason, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            statement.setString(16, artifact.getQualityStatus());
            statement.setString(17, artifact.getQualityReason());
            statement.setTimestamp(18, JdbcSerializationSupport.timestamp(artifact.getCreatedAt()));
            statement.setTimestamp(19, JdbcSerializationSupport.timestamp(artifact.getUpdatedAt()));
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
                readOptionalColumn(resultSet, "quality_status"),
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
                        quality_status VARCHAR(64),
                        quality_reason TEXT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize artifact schema", exception);
        }
    }
}
