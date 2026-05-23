package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryMemoryRepository implements MemoryRepository {

    private final ConcurrentHashMap<String, MemoryItem> storage = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final boolean persistenceEnabled;
    private final Path persistencePath;

    public InMemoryMemoryRepository(
            ObjectMapper objectMapper,
            @Value("${agenthub.memory.persistence.enabled:true}") boolean persistenceEnabled,
            @Value("${agenthub.memory.persistence.path:./.agenthub/memories.json}") String persistencePath) {
        this.objectMapper = objectMapper;
        this.persistenceEnabled = persistenceEnabled;
        this.persistencePath = Path.of(persistencePath);
    }

    @PostConstruct
    public void loadPersistedMemories() {
        if (!persistenceEnabled || !Files.exists(persistencePath)) {
            return;
        }

        try {
            List<PersistedMemoryItem> persistedItems = objectMapper.readValue(
                    persistencePath.toFile(),
                    new TypeReference<>() {});
            persistedItems.forEach(item -> storage.put(item.memoryId(), item.toDomain()));
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load persisted memory items from " + persistencePath, exception);
        }
    }

    @Override
    public MemoryItem save(MemoryItem memoryItem) {
        storage.put(memoryItem.getMemoryId(), memoryItem);
        persist();
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
                .sorted(memoryRanking())
                .toList();
    }

    @Override
    public List<MemoryItem> findRelevantForConversation(ConversationId conversationId, int limit) {
        int safeLimit = Math.max(1, Math.min(20, limit));
        return storage.values().stream()
                .filter(memoryItem -> memoryItem.getConversationId().equals(conversationId)
                        || "GLOBAL".equalsIgnoreCase(memoryItem.getScope()))
                .sorted(memoryRanking())
                .limit(safeLimit)
                .toList();
    }

    @Override
    public Optional<MemoryItem> markUsed(String memoryId, Instant usedAt) {
        MemoryItem current = storage.get(memoryId);
        if (current == null) {
            return Optional.empty();
        }
        MemoryItem updated = current.withLastUsedAt(usedAt);
        storage.put(memoryId, updated);
        persist();
        return Optional.of(updated);
    }

    @Override
    public void deleteById(String memoryId) {
        storage.remove(memoryId);
        persist();
    }

    private Comparator<MemoryItem> memoryRanking() {
        return Comparator
                .comparingInt((MemoryItem memoryItem) -> scopeWeight(memoryItem.getScope())).reversed()
                .thenComparingInt(memoryItem -> categoryWeight(memoryItem.getCategory())).reversed()
                .thenComparingInt(MemoryItem::getImportance).reversed()
                .thenComparing(MemoryItem::getLastUsedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(MemoryItem::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
    }

    private int scopeWeight(String scope) {
        if ("CONVERSATION".equalsIgnoreCase(scope)) {
            return 3;
        }
        if ("AGENT".equalsIgnoreCase(scope)) {
            return 2;
        }
        if ("GLOBAL".equalsIgnoreCase(scope)) {
            return 1;
        }
        return 0;
    }

    private int categoryWeight(String category) {
        if ("CONSTRAINT".equalsIgnoreCase(category)) {
            return 5;
        }
        if ("DECISION".equalsIgnoreCase(category)) {
            return 4;
        }
        if ("PROJECT_FACT".equalsIgnoreCase(category)) {
            return 3;
        }
        if ("USER_PREFERENCE".equalsIgnoreCase(category)) {
            return 2;
        }
        if ("ARTIFACT_NOTE".equalsIgnoreCase(category)) {
            return 1;
        }
        return 0;
    }

    private void persist() {
        if (!persistenceEnabled) {
            return;
        }
        try {
            Path parent = persistencePath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            List<PersistedMemoryItem> persistedItems = storage.values().stream()
                    .sorted(Comparator.comparing(MemoryItem::getCreatedAt))
                    .map(PersistedMemoryItem::fromDomain)
                    .toList();
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(persistencePath.toFile(), persistedItems);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to persist memory items to " + persistencePath, exception);
        }
    }

    private record PersistedMemoryItem(
            String memoryId,
            String conversationId,
            String sourceType,
            String sourceId,
            String scope,
            String category,
            String content,
            int importance,
            Instant createdAt,
            Instant updatedAt,
            Instant lastUsedAt) {

        static PersistedMemoryItem fromDomain(MemoryItem memoryItem) {
            return new PersistedMemoryItem(
                    memoryItem.getMemoryId(),
                    memoryItem.getConversationId().value(),
                    memoryItem.getSourceType(),
                    memoryItem.getSourceId(),
                    memoryItem.getScope(),
                    memoryItem.getCategory(),
                    memoryItem.getContent(),
                    memoryItem.getImportance(),
                    memoryItem.getCreatedAt(),
                    memoryItem.getUpdatedAt(),
                    memoryItem.getLastUsedAt());
        }

        MemoryItem toDomain() {
            return new MemoryItem(
                    memoryId,
                    new ConversationId(conversationId),
                    sourceType,
                    sourceId,
                    scope,
                    category,
                    content,
                    importance,
                    createdAt,
                    updatedAt,
                    lastUsedAt);
        }
    }
}
