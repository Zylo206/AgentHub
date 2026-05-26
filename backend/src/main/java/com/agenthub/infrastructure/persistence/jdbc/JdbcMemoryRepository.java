package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
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
public class JdbcMemoryRepository implements MemoryRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcMemoryRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public MemoryItem save(MemoryItem memoryItem) {
        String sql = """
                REPLACE INTO agenthub_memory_items
                (memory_id, conversation_id, source_type, source_id, scope, category, content, embedding_json,
                 importance, created_at, updated_at, last_used_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, memoryItem.getMemoryId());
            statement.setString(2, memoryItem.getConversationId().value());
            statement.setString(3, memoryItem.getSourceType());
            statement.setString(4, memoryItem.getSourceId());
            statement.setString(5, memoryItem.getScope());
            statement.setString(6, memoryItem.getCategory());
            statement.setString(7, memoryItem.getContent());
            statement.setString(8, memoryItem.getEmbeddingJson());
            statement.setInt(9, memoryItem.getImportance());
            statement.setTimestamp(10, JdbcSerializationSupport.timestamp(memoryItem.getCreatedAt()));
            statement.setTimestamp(11, JdbcSerializationSupport.timestamp(memoryItem.getUpdatedAt()));
            statement.setTimestamp(12, JdbcSerializationSupport.timestamp(memoryItem.getLastUsedAt()));
            statement.executeUpdate();
            return memoryItem;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save memory item", exception);
        }
    }

    @Override
    public Optional<MemoryItem> findById(String memoryId) {
        List<MemoryItem> memoryItems = queryMany("SELECT * FROM agenthub_memory_items WHERE memory_id = ?", memoryId);
        return memoryItems.stream().findFirst();
    }

    @Override
    public Optional<MemoryItem> findBySource(ConversationId conversationId, String sourceType, String sourceId) {
        String sql = """
                SELECT * FROM agenthub_memory_items
                WHERE conversation_id = ? AND source_type = ? AND source_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId.value());
            statement.setString(2, sourceType);
            statement.setString(3, sourceId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to find memory item by source", exception);
        }
    }

    @Override
    public List<MemoryItem> findByConversationId(ConversationId conversationId) {
        return queryMany("""
                SELECT * FROM agenthub_memory_items
                WHERE conversation_id = ?
                ORDER BY updated_at DESC
                """, conversationId.value());
    }

    @Override
    public List<MemoryItem> findRelevantForConversation(ConversationId conversationId, int limit) {
        String sql = """
                SELECT * FROM agenthub_memory_items
                WHERE conversation_id = ? OR UPPER(scope) = 'GLOBAL'
                ORDER BY
                    CASE UPPER(scope)
                        WHEN 'CONVERSATION' THEN 3
                        WHEN 'AGENT' THEN 2
                        WHEN 'GLOBAL' THEN 1
                        ELSE 0
                    END DESC,
                    CASE UPPER(category)
                        WHEN 'CONSTRAINT' THEN 5
                        WHEN 'DECISION' THEN 4
                        WHEN 'PROJECT_FACT' THEN 3
                        WHEN 'USER_PREFERENCE' THEN 2
                        WHEN 'ARTIFACT_NOTE' THEN 1
                        ELSE 0
                    END DESC,
                    importance DESC,
                    last_used_at DESC,
                    updated_at DESC
                LIMIT ?
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversationId.value());
            statement.setInt(2, Math.max(1, Math.min(20, limit)));
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<MemoryItem> memoryItems = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    memoryItems.add(map(resultSet));
                }
                return memoryItems;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to list relevant memory items", exception);
        }
    }

    @Override
    public Optional<MemoryItem> markUsed(String memoryId, Instant usedAt) {
        Optional<MemoryItem> current = findById(memoryId);
        if (current.isEmpty()) {
            return Optional.empty();
        }
        MemoryItem updated = current.get().withLastUsedAt(usedAt);
        return Optional.of(save(updated));
    }

    @Override
    public void deleteById(String memoryId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("DELETE FROM agenthub_memory_items WHERE memory_id = ?")) {
            statement.setString(1, memoryId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to delete memory item", exception);
        }
    }

    private List<MemoryItem> queryMany(String sql, String value) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, value);
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<MemoryItem> memoryItems = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    memoryItems.add(map(resultSet));
                }
                return memoryItems;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to query memory items", exception);
        }
    }

    private MemoryItem map(ResultSet resultSet) throws SQLException {
        return new MemoryItem(
                resultSet.getString("memory_id"),
                new ConversationId(resultSet.getString("conversation_id")),
                resultSet.getString("source_type"),
                resultSet.getString("source_id"),
                resultSet.getString("scope"),
                resultSet.getString("category"),
                resultSet.getString("content"),
                readOptionalColumn(resultSet, "embedding_json"),
                resultSet.getInt("importance"),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("last_used_at")));
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
                    CREATE TABLE IF NOT EXISTS agenthub_memory_items (
                        memory_id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        source_type VARCHAR(128),
                        source_id VARCHAR(128),
                        scope VARCHAR(64),
                        category VARCHAR(128),
                        content LONGTEXT,
                        embedding_json LONGTEXT,
                        importance INT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP,
                        last_used_at TIMESTAMP,
                        UNIQUE KEY uq_agenthub_memory_source (conversation_id, source_type, source_id),
                        INDEX idx_agenthub_memory_conversation_updated (conversation_id, updated_at),
                        INDEX idx_agenthub_memory_scope_updated (scope, updated_at)
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize memory schema", exception);
        }
    }
}
