package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.deployment.DeploymentRecord;
import com.agenthub.domain.deployment.DeploymentRepository;
import com.agenthub.domain.deployment.DeploymentStatus;
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
public class JdbcDeploymentRepository implements DeploymentRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcDeploymentRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public DeploymentRecord save(DeploymentRecord deploymentRecord) {
        String sql = """
                REPLACE INTO agenthub_deployments
                (deployment_id, artifact_id, conversation_id, task_run_id, artifact_title,
                 deploy_target, status, preview_url, message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, deploymentRecord.getDeploymentId());
            statement.setString(2, deploymentRecord.getArtifactId().value());
            statement.setString(3, deploymentRecord.getConversationId().value());
            statement.setString(4, deploymentRecord.getTaskRunId() == null ? null : deploymentRecord.getTaskRunId().value());
            statement.setString(5, deploymentRecord.getArtifactTitle());
            statement.setString(6, deploymentRecord.getDeployTarget());
            statement.setString(7, deploymentRecord.getStatus().name());
            statement.setString(8, deploymentRecord.getPreviewUrl());
            statement.setString(9, deploymentRecord.getMessage());
            statement.setTimestamp(10, JdbcSerializationSupport.timestamp(deploymentRecord.getCreatedAt()));
            statement.executeUpdate();
            return deploymentRecord;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save deployment", exception);
        }
    }

    @Override
    public Optional<DeploymentRecord> findById(String deploymentId) {
        return queryMany("SELECT * FROM agenthub_deployments WHERE deployment_id = ?", deploymentId)
                .stream()
                .findFirst();
    }

    @Override
    public List<DeploymentRecord> findByArtifactId(ArtifactId artifactId) {
        return queryMany(
                "SELECT * FROM agenthub_deployments WHERE artifact_id = ? ORDER BY created_at DESC",
                artifactId.value());
    }

    @Override
    public List<DeploymentRecord> findByConversationId(ConversationId conversationId) {
        return queryMany(
                "SELECT * FROM agenthub_deployments WHERE conversation_id = ? ORDER BY created_at DESC",
                conversationId.value());
    }

    private List<DeploymentRecord> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<DeploymentRecord> deployments = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    deployments.add(map(resultSet));
                }
                return deployments;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query deployments", exception);
        }
    }

    private DeploymentRecord map(ResultSet resultSet) throws SQLException {
        String taskRunId = resultSet.getString("task_run_id");
        return new DeploymentRecord(
                resultSet.getString("deployment_id"),
                new ArtifactId(resultSet.getString("artifact_id")),
                new ConversationId(resultSet.getString("conversation_id")),
                taskRunId == null ? null : new TaskRunId(taskRunId),
                resultSet.getString("artifact_title"),
                resultSet.getString("deploy_target"),
                DeploymentStatus.valueOf(resultSet.getString("status")),
                resultSet.getString("preview_url"),
                resultSet.getString("message"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_deployments (
                        deployment_id VARCHAR(128) PRIMARY KEY,
                        artifact_id VARCHAR(128) NOT NULL,
                        conversation_id VARCHAR(128) NOT NULL,
                        task_run_id VARCHAR(128) NULL,
                        artifact_title VARCHAR(255) NOT NULL,
                        deploy_target VARCHAR(64) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        preview_url VARCHAR(512) NOT NULL,
                        message TEXT,
                        created_at TIMESTAMP NULL,
                        INDEX idx_agenthub_deployments_conversation_created (conversation_id, created_at),
                        INDEX idx_agenthub_deployments_artifact_created (artifact_id, created_at)
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize deployment schema", exception);
        }
    }
}
