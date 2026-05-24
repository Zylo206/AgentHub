package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.conversation.ConversationType;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcConversationRepository implements ConversationRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcConversationRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public Conversation save(Conversation conversation) {
        String sql = """
                REPLACE INTO agenthub_conversations
                (id, title, type, participant_agent_ids_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, conversation.getId().value());
            statement.setString(2, conversation.getTitle());
            statement.setString(3, conversation.getType().name());
            statement.setString(4, JdbcSerializationSupport.toJson(
                    conversation.getParticipantAgentIds().stream().map(AgentId::value).toList()));
            statement.setTimestamp(5, JdbcSerializationSupport.timestamp(conversation.getCreatedAt()));
            statement.setTimestamp(6, JdbcSerializationSupport.timestamp(conversation.getUpdatedAt()));
            statement.executeUpdate();
            return conversation;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save conversation", exception);
        }
    }

    @Override
    public Optional<Conversation> findById(ConversationId conversationId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("SELECT * FROM agenthub_conversations WHERE id = ?")) {
            statement.setString(1, conversationId.value());
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to find conversation", exception);
        }
    }

    @Override
    public List<Conversation> findAll() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("SELECT * FROM agenthub_conversations ORDER BY updated_at DESC");
                ResultSet resultSet = statement.executeQuery()) {
            java.util.ArrayList<Conversation> conversations = new java.util.ArrayList<>();
            while (resultSet.next()) {
                conversations.add(map(resultSet));
            }
            return conversations;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to list conversations", exception);
        }
    }

    @Override
    public void deleteById(ConversationId conversationId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("DELETE FROM agenthub_conversations WHERE id = ?")) {
            statement.setString(1, conversationId.value());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to delete conversation", exception);
        }
    }

    private Conversation map(ResultSet resultSet) throws SQLException {
        return new Conversation(
                new ConversationId(resultSet.getString("id")),
                resultSet.getString("title"),
                ConversationType.valueOf(resultSet.getString("type")),
                JdbcSerializationSupport.stringList(resultSet.getString("participant_agent_ids_json")).stream()
                        .map(AgentId::new)
                        .toList(),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("updated_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_conversations (
                        id VARCHAR(128) PRIMARY KEY,
                        title VARCHAR(512) NOT NULL,
                        type VARCHAR(64) NOT NULL,
                        participant_agent_ids_json TEXT,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize conversation schema", exception);
        }
    }
}
