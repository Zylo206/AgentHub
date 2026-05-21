package com.agenthub.application.message;

import com.agenthub.application.agent.AgentApplicationService;
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
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class MessageApplicationService {

    private final MessageRepository messageRepository;
    private final AgentApplicationService agentApplicationService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public MessageApplicationService(
            MessageRepository messageRepository,
            AgentApplicationService agentApplicationService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.messageRepository = messageRepository;
        this.agentApplicationService = agentApplicationService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public Message sendUserMessage(String conversationId, String content) {
        return sendUserMessage(conversationId, content, null);
    }

    public Message sendUserMessage(String conversationId, String content, String targetAgentId) {
        String normalizedTargetAgentId = normalizeTargetAgentId(targetAgentId);
        if (normalizedTargetAgentId != null) {
            agentApplicationService.getAgent(normalizedTargetAgentId);
        }

        Message message = new Message(
                new MessageId(idGenerator.nextId("msg")),
                new ConversationId(conversationId),
                MessageSenderType.USER,
                "user",
                normalizedTargetAgentId,
                MessageType.TEXT,
                content,
                List.of(),
                timeProvider.now());
        return messageRepository.save(message);
    }

    public List<Message> listMessages(String conversationId) {
        return messageRepository.findByConversationId(new ConversationId(conversationId));
    }

    public Message getMessage(String messageId) {
        return messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
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

    private String normalizeTargetAgentId(String targetAgentId) {
        if (targetAgentId == null) {
            return null;
        }

        String normalized = targetAgentId.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
