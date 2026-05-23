package com.agenthub.domain.memory;

import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MemoryRepository {

    MemoryItem save(MemoryItem memoryItem);

    Optional<MemoryItem> findById(String memoryId);

    Optional<MemoryItem> findBySource(ConversationId conversationId, String sourceType, String sourceId);

    List<MemoryItem> findByConversationId(ConversationId conversationId);

    List<MemoryItem> findRelevantForConversation(ConversationId conversationId, int limit);

    Optional<MemoryItem> markUsed(String memoryId, Instant usedAt);

    void deleteById(String memoryId);
}
