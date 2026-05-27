package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.audit.ActionAuditLog;
import com.agenthub.domain.audit.ActionAuditRepository;
import com.agenthub.domain.conversation.ConversationId;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcActionAuditRepository implements ActionAuditRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcActionAuditRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public ActionAuditLog save(ActionAuditLog auditLog) {
        String sql = """
                REPLACE INTO agenthub_action_audits
                (audit_id, conversation_id, action_type, target_type, target_id, status, summary, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, auditLog.getAuditId());
            statement.setString(2, auditLog.getConversationId().value());
            statement.setString(3, auditLog.getActionType());
            statement.setString(4, auditLog.getTargetType());
            statement.setString(5, auditLog.getTargetId());
            statement.setString(6, auditLog.getStatus());
            statement.setString(7, auditLog.getSummary());
            statement.setTimestamp(8, JdbcSerializationSupport.timestamp(auditLog.getCreatedAt()));
            statement.executeUpdate();
            return auditLog;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save action audit", exception);
        }
    }

    @Override
    public List<ActionAuditLog> findByConversationId(ConversationId conversationId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(
                        "SELECT * FROM agenthub_action_audits WHERE conversation_id = ? ORDER BY created_at")) {
            statement.setString(1, conversationId.value());
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<ActionAuditLog> audits = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    audits.add(map(resultSet));
                }
                return audits;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query action audits", exception);
        }
    }

    private ActionAuditLog map(ResultSet resultSet) throws SQLException {
        return new ActionAuditLog(
                resultSet.getString("audit_id"),
                new ConversationId(resultSet.getString("conversation_id")),
                resultSet.getString("action_type"),
                resultSet.getString("target_type"),
                resultSet.getString("target_id"),
                resultSet.getString("status"),
                resultSet.getString("summary"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_action_audits (
                        audit_id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        action_type VARCHAR(128) NOT NULL,
                        target_type VARCHAR(128) NOT NULL,
                        target_id VARCHAR(128) NOT NULL,
                        status VARCHAR(64) NOT NULL,
                        summary TEXT,
                        created_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize action audit schema", exception);
        }
    }
}
