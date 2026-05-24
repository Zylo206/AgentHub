package com.agenthub.infrastructure.persistence.jdbc;

import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.message.MessageSenderType;
import com.agenthub.domain.message.MessageType;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "jdbc")
public class JdbcMessageRepository implements MessageRepository {

    private final JdbcConnectionFactory connectionFactory;

    public JdbcMessageRepository(JdbcConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
        initSchema();
    }

    @Override
    public Message save(Message message) {
        String sql = """
                REPLACE INTO agenthub_messages
                (id, conversation_id, sender_type, sender_id, target_agent_id, mentioned_agent_ids_json,
                 reply_to_message_id, quoted_message_id, quoted_message_content, message_type, content,
                 artifact_ids_json, attachments_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(sql)) {
            statement.setString(1, message.getId().value());
            statement.setString(2, message.getConversationId().value());
            statement.setString(3, message.getSenderType().name());
            statement.setString(4, message.getSenderId());
            statement.setString(5, message.getTargetAgentId());
            statement.setString(6, JdbcSerializationSupport.toJson(message.getMentionedAgentIds()));
            statement.setString(7, message.getReplyToMessageId());
            statement.setString(8, message.getQuotedMessageId());
            statement.setString(9, message.getQuotedMessageContent());
            statement.setString(10, message.getMessageType().name());
            statement.setString(11, message.getContent());
            statement.setString(12, JdbcSerializationSupport.artifactIdsJson(message.getArtifactIds()));
            statement.setString(13, JdbcSerializationSupport.toJson(message.getAttachments()));
            statement.setTimestamp(14, JdbcSerializationSupport.timestamp(message.getCreatedAt()));
            statement.executeUpdate();
            return message;
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to save message", exception);
        }
    }

    @Override
    public Optional<Message> findById(MessageId messageId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement("SELECT * FROM agenthub_messages WHERE id = ?")) {
            statement.setString(1, messageId.value());
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? Optional.of(map(resultSet)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to find message", exception);
        }
    }

    @Override
    public List<Message> findByConversationId(ConversationId conversationId) {
        try (Connection connection = connectionFactory.open();
                var statement = connection.prepareStatement(
                        "SELECT * FROM agenthub_messages WHERE conversation_id = ? ORDER BY created_at")) {
            statement.setString(1, conversationId.value());
            try (ResultSet resultSet = statement.executeQuery()) {
                java.util.ArrayList<Message> messages = new java.util.ArrayList<>();
                while (resultSet.next()) {
                    messages.add(map(resultSet));
                }
                return messages;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to list messages", exception);
        }
    }

    private Message map(ResultSet resultSet) throws SQLException {
        List<ArtifactId> artifactIds = JdbcSerializationSupport.artifactIds(resultSet.getString("artifact_ids_json"));
        return new Message(
                new MessageId(resultSet.getString("id")),
                new ConversationId(resultSet.getString("conversation_id")),
                MessageSenderType.valueOf(resultSet.getString("sender_type")),
                resultSet.getString("sender_id"),
                resultSet.getString("target_agent_id"),
                JdbcSerializationSupport.stringList(resultSet.getString("mentioned_agent_ids_json")),
                resultSet.getString("reply_to_message_id"),
                resultSet.getString("quoted_message_id"),
                resultSet.getString("quoted_message_content"),
                MessageType.valueOf(resultSet.getString("message_type")),
                resultSet.getString("content"),
                artifactIds,
                JdbcSerializationSupport.attachmentList(resultSet.getString("attachments_json")),
                JdbcSerializationSupport.instant(resultSet.getTimestamp("created_at")));
    }

    private void initSchema() {
        try (Connection connection = connectionFactory.open();
                var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS agenthub_messages (
                        id VARCHAR(128) PRIMARY KEY,
                        conversation_id VARCHAR(128) NOT NULL,
                        sender_type VARCHAR(64) NOT NULL,
                        sender_id VARCHAR(128),
                        target_agent_id VARCHAR(128),
                        mentioned_agent_ids_json TEXT,
                        reply_to_message_id VARCHAR(128),
                        quoted_message_id VARCHAR(128),
                        quoted_message_content TEXT,
                        message_type VARCHAR(64) NOT NULL,
                        content LONGTEXT,
                        artifact_ids_json TEXT,
                        attachments_json TEXT,
                        created_at TIMESTAMP
                    )
                    """);
        } catch (SQLException exception) {
            throw new IllegalStateException("Failed to initialize message schema", exception);
        }
    }
}
