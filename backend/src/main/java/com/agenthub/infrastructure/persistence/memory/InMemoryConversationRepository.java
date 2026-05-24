package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryConversationRepository implements ConversationRepository {

    private final ConcurrentHashMap<String, Conversation> storage = new ConcurrentHashMap<>();

    @Override
    public Conversation save(Conversation conversation) {
        storage.put(conversation.getId().value(), conversation);
        return conversation;
    }

    @Override
    public Optional<Conversation> findById(ConversationId conversationId) {
        return Optional.ofNullable(storage.get(conversationId.value()));
    }

    @Override
    public List<Conversation> findAll() {
        return storage.values().stream().toList();
    }

    @Override
    public void deleteById(ConversationId conversationId) {
        storage.remove(conversationId.value());
    }
}
