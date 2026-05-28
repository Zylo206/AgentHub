package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactSnapshot;
import com.agenthub.domain.artifact.ArtifactSnapshotRepository;
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
public class JdbcArtifactSnapshotRepository implements ArtifactSnapshotRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcArtifactSnapshotRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public ArtifactSnapshot save(ArtifactSnapshot snapshot) {
        String sql = """
                REPLACE INTO agenthub_artifact_snapshots
                (snapshot_id, artifact_id, conversation_id, task_run_id, title, type, status,
                 language, content, version, operation_type, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, snapshot.getSnapshotId());
            statement.setString(2, snapshot.getArtifactId().value());
            statement.setString(3, snapshot.getConversationId().value());
            statement.setString(4, snapshot.getTaskRunId() == null ? null : snapshot.getTaskRunId().value());
            statement.setString(5, snapshot.getTitle());
            statement.setString(6, snapshot.getType().name());
            statement.setString(7, snapshot.getStatus().name());
            statement.setString(8, snapshot.getLanguage());
            statement.setString(9, snapshot.getContent());
            statement.setInt(10, snapshot.getVersion());
            statement.setString(11, snapshot.getOperationType());
            statement.setTimestamp(12, JdbcSerializationSupport.timestamp(snapshot.getCreatedAt()));
            statement.executeUpdate();
            return snapshot;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save artifact snapshot", exception);
        }
    }

    @Override
    public Optional<ArtifactSnapshot> findById(String snapshotId) {
        return queryMany("SELECT * FROM agenthub_artifact_snapshots WHERE snapshot_id = ?", snapshotId)
                .stream()
                .findFirst();
    }

    @Override
    public List<ArtifactSnapshot> findByArtifactId(ArtifactId artifactId) {
        return queryMany(
                "SELECT * FROM agenthub_artifact_snapshots WHERE artifact_id = ? ORDER BY created_at",
                artifactId.value());
    }

    @Override
    public List<ArtifactSnapshot> findByConversationId(ConversationId conversationId) {
        return queryMany(
                "SELECT * FROM agenthub_artifact_snapshots WHERE conversation_id = ? ORDER BY created_at",
                conversationId.value());
    }

    private List<ArtifactSnapshot> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<ArtifactSnapshot> snapshots = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    snapshots.add(map(resultSet));
                }
                return snapshots;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query artifact snapshots", exception);
        }
    }

    private ArtifactSnapshot map(ResultSet resultSet) throws SQLException {
        String taskRunId = resultSet.getString("task_run_id");
        return new ArtifactSnapshot(
                resultSet.getString("snapshot_id"),
                new ArtifactId(resultSet.getString("artifact_id")),
                new ConversationId(resultSet.getString("conversation_id")),
                taskRunId == null ? null : new TaskRunId(taskRunId),
                resultSet.getString("title"),
                ArtifactType.valueOf(resultSet.getString("type")),
                ArtifactStatus.valueOf(resultSet.getString("status")),
                resultSet.getString("language"),
                resultSet.getString("content"),
                resultSet.getInt("version"),
                resultSet.getString("operation_type"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_artifact_snapshots (
                        snapshot_id VARCHAR(128) PRIMARY KEY,
                        artifact_id VARCHAR(128) NOT NULL,
                        conversation_id VARCHAR(128) NOT NULL,
                        task_run_id VARCHAR(128) NULL,
                        title VARCHAR(255) NOT NULL,
                        type VARCHAR(64) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        language VARCHAR(64) NULL,
                        content MEDIUMTEXT,
                        version INT NOT NULL,
                        operation_type VARCHAR(64) NOT NULL,
                        created_at TIMESTAMP NULL,
                        INDEX idx_agenthub_artifact_snapshots_conversation_created (conversation_id, created_at),
                        INDEX idx_agenthub_artifact_snapshots_artifact_created (artifact_id, created_at)
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize artifact snapshot schema", exception);
        }
    }
}
