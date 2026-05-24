package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
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
public class JdbcAttachmentRepository implements AttachmentRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcAttachmentRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public AttachmentRecord save(AttachmentRecord attachmentRecord) {
        String sql = """
                REPLACE INTO agenthub_attachments
                (attachment_id, conversation_id, message_id, file_name, content_type, size_bytes, storage_path,
                 storage_key, checksum_sha256, visibility, owner_user_id, scan_status, content_preview, created_at, deleted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, attachmentRecord.getAttachmentId());
            statement.setString(2, attachmentRecord.getConversationId().value());
            statement.setString(3, attachmentRecord.getMessageId());
            statement.setString(4, attachmentRecord.getFileName());
            statement.setString(5, attachmentRecord.getContentType());
            statement.setLong(6, attachmentRecord.getSizeBytes());
            statement.setString(7, attachmentRecord.getStoragePath());
            statement.setString(8, attachmentRecord.getStorageKey());
            statement.setString(9, attachmentRecord.getChecksumSha256());
            statement.setString(10, attachmentRecord.getVisibility());
            statement.setString(11, attachmentRecord.getOwnerUserId());
            statement.setString(12, attachmentRecord.getScanStatus());
            statement.setString(13, attachmentRecord.getContentPreview());
            statement.setTimestamp(14, JdbcSerializationSupport.timestamp(attachmentRecord.getCreatedAt()));
            statement.setTimestamp(15, JdbcSerializationSupport.timestamp(attachmentRecord.getDeletedAt()));
            statement.executeUpdate();
            return attachmentRecord;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save attachment", exception);
        }
    }

    @Override
    public Optional<AttachmentRecord> findById(String attachmentId) {
        return queryOne("SELECT * FROM agenthub_attachments WHERE attachment_id = ?", attachmentId);
    }

    @Override
    public List<AttachmentRecord> findByConversationId(ConversationId conversationId) {
        return queryMany("SELECT * FROM agenthub_attachments WHERE conversation_id = ? ORDER BY created_at", conversationId.value());
    }

    @Override
    public List<AttachmentRecord> findByMessageId(String messageId) {
        return queryMany("SELECT * FROM agenthub_attachments WHERE message_id = ? ORDER BY created_at", messageId);
    }

    private Optional<AttachmentRecord> queryOne(String sql, String value) {
        List<AttachmentRecord> records = queryMany(sql, value);
        return records.stream().findFirst();
    }

    private List<AttachmentRecord> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<AttachmentRecord> records = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    records.add(map(resultSet));
                }
                return records;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query attachments", exception);
        }
    }

    private AttachmentRecord map(ResultSet resultSet) throws SQLException {
        return new AttachmentRecord(
                resultSet.getString("attachment_id"),
                new ConversationId(resultSet.getString("conversation_id")),
                resultSet.getString("message_id"),
                resultSet.getString("file_name"),
                resultSet.getString("content_type"),
                resultSet.getLong("size_bytes"),
                resultSet.getString("storage_path"),
                resultSet.getString("storage_key"),
                resultSet.getString("checksum_sha256"),
                resultSet.getString("visibility"),
                resultSet.getString("owner_user_id"),
                resultSet.getString("scan_status"),
                resultSet.getString("content_preview"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("deleted_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_attachments (
                        attachment_id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        message_id VARCHAR(128),
                        file_name VARCHAR(512) NOT NULL,
                        content_type VARCHAR(256),
                        size_bytes BIGINT NOT NULL,
                        storage_path TEXT NOT NULL,
                        storage_key TEXT,
                        checksum_sha256 VARCHAR(128),
                        visibility VARCHAR(64),
                        owner_user_id VARCHAR(128),
                        scan_status VARCHAR(64),
                        content_preview TEXT,
                        created_at TIMESTAMP,
                        deleted_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize attachment schema", exception);
        }
    }
}
