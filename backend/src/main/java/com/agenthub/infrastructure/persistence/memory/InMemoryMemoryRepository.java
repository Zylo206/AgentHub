package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryMemoryRepository implements MemoryRepository {

    private final ConcurrentHashMap<String, MemoryItem> storage = new ConcurrentHashMap<>();

    @Override
    public MemoryItem save(MemoryItem memoryItem) {
        storage.put(memoryItem.getMemoryId(), memoryItem);
        return memoryItem;
    }

    @Override
    public Optional<MemoryItem> findById(String memoryId) {
        return Optional.ofNullable(storage.get(memoryId));
    }

    @Override
    public Optional<MemoryItem> findBySource(ConversationId conversationId, String sourceType, String sourceId) {
        return storage.values().stream()
                .filter(memoryItem -> memoryItem.getConversationId().equals(conversationId))
                .filter(memoryItem -> memoryItem.getSourceType().equals(sourceType))
                .filter(memoryItem -> memoryItem.getSourceId().equals(sourceId))
                .findFirst();
    }

    @Override
    public List<MemoryItem> findByConversationId(ConversationId conversationId) {
        return storage.values().stream()
                .filter(memoryItem -> memoryItem.getConversationId().equals(conversationId))
                .sorted(Comparator.comparing(MemoryItem::getImportance).reversed()
                        .thenComparing(MemoryItem::getUpdatedAt).reversed())
                .toList();
    }

    @Override
    public void deleteById(String memoryId) {
        storage.remove(memoryId);
    }
}
