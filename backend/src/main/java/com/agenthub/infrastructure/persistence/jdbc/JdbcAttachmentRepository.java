package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.attachment.AttachmentRecord;
import com.agenthub.domain.attachment.AttachmentRepository;
import com.agenthub.domain.conversation.ConversationId;
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
public class JdbcAttachmentRepository implements AttachmentRepository {

    private final JdbcConnectionFactory connectionFactory;
    private final boolean fulltextEnabled;

    public JdbcAttachmentRepository(
            JdbcConnectionFactory connectionFactory,
            @Value("${agenthub.context.search.fulltext-enabled:false}") boolean fulltextEnabled) {
        this.connectionFactory = connectionFactory;
        this.fulltextEnabled = fulltextEnabled;
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

    @Override
    public List<AttachmentRecord> findRecentByConversationId(ConversationId conversationId, int limit) {
        List<AttachmentRecord> records = queryMany(
                "SELECT * FROM agenthub_attachments WHERE conversation_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?",
                conversationId.value(),
                Math.max(0, limit));
        Collections.reverse(records);
        return records;
    }

    @Override
    public List<AttachmentRecord> searchByConversationId(ConversationId conversationId, List<String> keywords, int limit) {
        List<String> normalizedKeywords = normalizeKeywords(keywords);
        if (normalizedKeywords.isEmpty()) {
            return List.of();
        }
        if (fulltextEnabled) {
            String sql = """
                    SELECT * FROM agenthub_attachments
                    WHERE conversation_id = ? AND deleted_at IS NULL
                      AND MATCH(file_name, content_preview) AGAINST (? IN NATURAL LANGUAGE MODE)
                    ORDER BY created_at DESC
                    LIMIT ?
                    """;
            List<AttachmentRecord> records = queryMany(
                    sql,
                    conversationId.value(),
                    toFulltextQuery(normalizedKeywords),
                    Math.max(0, limit));
            Collections.reverse(records);
            return records;
        }
        String where = likeWhere("LOWER(CONCAT(COALESCE(file_name, ''), ' ', COALESCE(content_preview, '')))", normalizedKeywords.size());
        String sql = "SELECT * FROM agenthub_attachments WHERE conversation_id = ? AND deleted_at IS NULL AND (" + where
                + ") ORDER BY created_at DESC LIMIT ?";
        List<AttachmentRecord> records = queryMany(sql, conversationId.value(), normalizedKeywords, Math.max(0, limit));
        Collections.reverse(records);
        return records;
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

    private List<AttachmentRecord> queryMany(String sql, String value, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            statement.setInt(2, limit);
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

    private List<AttachmentRecord> queryMany(String sql, String conversationId, List<String> keywords, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            int index = 2;
            for (String keyword : keywords) {
                statement.setString(index++, "%" + keyword + "%");
            }
            statement.setInt(index, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<AttachmentRecord> records = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    records.add(map(resultSet));
                }
                return records;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to search attachments", exception);
        }
    }

    private List<AttachmentRecord> queryMany(String sql, String conversationId, String fulltextQuery, int limit) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId);
            statement.setString(2, fulltextQuery);
            statement.setInt(3, limit);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<AttachmentRecord> records = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    records.add(map(resultSet));
                }
                return records;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to fulltext search attachments", exception);
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
