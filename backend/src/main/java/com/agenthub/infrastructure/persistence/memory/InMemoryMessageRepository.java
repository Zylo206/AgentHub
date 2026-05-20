package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryMessageRepository implements MessageRepository {

    private final ConcurrentHashMap<String, Message> storage = new ConcurrentHashMap<>();

    @Override
    public Message save(Message message) {
        storage.put(message.getId().value(), message);
        return message;
    }

    @Override
    public Optional<Message> findById(MessageId messageId) {
        return Optional.ofNullable(storage.get(messageId.value()));
    }

    @Override
    public List<Message> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(message -> message.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(Message::getCreatedAt))
                .toList();
    }
}
