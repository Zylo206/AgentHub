package com.agenthub.domain.message;

import com.agenthub.domain.conversation.ConversationId;
import java.util.List;
import java.util.Optional;

public interface MessageRepository {

    Message save(Message message);

    Optional<Message> findById(MessageId messageId);

    List<Message> findByConversationId(ConversationId conversationId);
}
