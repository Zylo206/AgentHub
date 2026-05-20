package com.agenthub.application.message;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.message.MessageSenderType;
import com.agenthub.domain.message.MessageType;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MessageApplicationService {

    private final MessageRepository messageRepository;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public MessageApplicationService(
            MessageRepository messageRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.messageRepository = messageRepository;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public Message sendUserMessage(String conversationId, String content) {
        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.USER,
                "user",
                MessageType.TEXT,
                content,
                List.of(),
                timeProvider.now());
        return messageRepository.save(message);
    }

    public List<Message> listMessages(String conversationId) {
        return messageRepository.findByConversationId(new ConversationId(conversationId));
    }

    public Message appendAgentMessage(String conversationId, String agentId, String content) {
        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.AGENT,
                agentId,
                MessageType.TEXT,
                content,
                List.of(),
                timeProvider.now());
        return messageRepository.save(message);
    }

    public Message appendSystemMessage(
            String conversationId,
            MessageType messageType,
            String content,
            List<ArtifactId> artifactIds) {
        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.SYSTEM,
                "system",
                messageType,
                content,
                artifactIds,
                timeProvider.now());
        return messageRepository.save(message);
    }
}
