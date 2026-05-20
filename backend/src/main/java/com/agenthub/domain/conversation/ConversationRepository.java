package com.agenthub.domain.conversation;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository {

    Conversation save(Conversation conversation);

    Optional<Conversation> findById(ConversationId conversationId);

    List<Conversation> findAll();

    void deleteById(ConversationId conversationId);
}
