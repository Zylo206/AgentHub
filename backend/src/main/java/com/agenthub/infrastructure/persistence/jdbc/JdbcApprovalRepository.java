package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.approval.ApprovalRepository;
import com.agenthub.domain.approval.ApprovalRequest;
import com.agenthub.domain.approval.ApprovalStatus;
import com.agenthub.domain.conversation.ConversationId;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcApprovalRepository implements ApprovalRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcApprovalRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public ApprovalRequest save(ApprovalRequest approvalRequest) {
        String sql = """
                REPLACE INTO agenthub_approval_requests
                (approval_id, conversation_id, action_type, target_type, target_id, risk_level, summary,
                 affected_items_json, status, created_at, resolved_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, approvalRequest.getApprovalId());
            statement.setString(2, approvalRequest.getConversationId().value());
            statement.setString(3, approvalRequest.getActionType());
            statement.setString(4, approvalRequest.getTargetType());
            statement.setString(5, approvalRequest.getTargetId());
            statement.setString(6, approvalRequest.getRiskLevel());
            statement.setString(7, approvalRequest.getSummary());
            statement.setString(8, JdbcSerializationSupport.toJson(approvalRequest.getAffectedItems()));
            statement.setString(9, approvalRequest.getStatus().name());
            statement.setTimestamp(10, JdbcSerializationSupport.timestamp(approvalRequest.getCreatedAt()));
            statement.setTimestamp(11, JdbcSerializationSupport.timestamp(approvalRequest.getResolvedAt()));
            statement.setTimestamp(12, JdbcSerializationSupport.timestamp(approvalRequest.getExpiresAt()));
            statement.executeUpdate();
            return approvalRequest;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save approval request", exception);
        }
    }

    @Override
    public Optional<ApprovalRequest> findById(String approvalId) {
        List<ApprovalRequest> approvals = queryMany("SELECT * FROM agenthub_approval_requests WHERE approval_id = ?", approvalId);
        return approvals.stream().findFirst();
    }

    @Override
    public List<ApprovalRequest> findByConversationId(ConversationId conversationId) {
        return queryMany(
                "SELECT * FROM agenthub_approval_requests WHERE conversation_id = ? ORDER BY created_at DESC",
                conversationId.value());
    }

    private List<ApprovalRequest> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<ApprovalRequest> approvals = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    approvals.add(map(resultSet));
                }
                return approvals;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query approval requests", exception);
        }
    }

    private ApprovalRequest map(ResultSet resultSet) throws SQLException {
        return new ApprovalRequest(
                resultSet.getString("approval_id"),
                new ConversationId(resultSet.getString("conversation_id")),
                resultSet.getString("action_type"),
                resultSet.getString("target_type"),
                resultSet.getString("target_id"),
                resultSet.getString("risk_level"),
                resultSet.getString("summary"),
                JdbcSerializationSupport.stringList(resultSet.getString("affected_items_json")),
                ApprovalStatus.valueOf(resultSet.getString("status")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("resolved_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("expires_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_approval_requests (
                        approval_id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        action_type VARCHAR(128) NOT NULL,
                        target_type VARCHAR(128) NOT NULL,
                        target_id VARCHAR(128) NOT NULL,
                        risk_level VARCHAR(64),
                        summary TEXT,
                        affected_items_json TEXT,
                        status VARCHAR(64) NOT NULL,
                        created_at TIMESTAMP,
                        resolved_at TIMESTAMP,
                        expires_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize approval schema", exception);
        }
    }
}
