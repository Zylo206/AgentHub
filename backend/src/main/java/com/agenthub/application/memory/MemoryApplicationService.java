package com.agenthub.application.memory;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class MemoryApplicationService {

    private final MemoryRepository memoryRepository;
    private final MessageRepository messageRepository;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public MemoryApplicationService(
            MemoryRepository memoryRepository,
            MessageRepository messageRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.memoryRepository = memoryRepository;
        this.messageRepository = messageRepository;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public List<MemoryItem> listMemoriesByConversation(String conversationId) {
        return memoryRepository.findByConversationId(new ConversationId(conversationId));
    }

    public List<MemoryItem> listRelevantMemories(String conversationId, int limit) {
        return memoryRepository.findRelevantForConversation(new ConversationId(conversationId), limit);
    }

    public List<MemoryItem> markMemoriesUsed(List<MemoryItem> memoryItems) {
        Instant now = timeProvider.now();
        return memoryItems.stream()
                .map(memoryItem -> memoryRepository.markUsed(memoryItem.getMemoryId(), now).orElse(memoryItem))
                .toList();
    }

    public MemoryItem saveMessageAsMemory(
            String conversationId,
            String messageId,
            String category,
            String scope,
            Integer importance,
            String content) {
        ConversationId conversationRef = new ConversationId(conversationId);
        Message message = messageRepository.findById(new MessageId(messageId))
                .orElseThrow(() -> new NoSuchElementException("Message not found: " + messageId));
        if (!message.getConversationId().equals(conversationRef)) {
            throw new IllegalArgumentException("Message does not belong to the provided conversation.");
        }

        return memoryRepository.findBySource(conversationRef, "MESSAGE", messageId)
                .orElseGet(() -> {
                    Instant now = timeProvider.now();
                    return memoryRepository.save(new MemoryItem(
                            idGenerator.nextId("mem"),
                            conversationRef,
                            "MESSAGE",
                            messageId,
                            normalizeScope(scope),
                            normalizeCategory(category),
                            content == null || content.isBlank() ? buildMemoryContent(message) : content.trim(),
                            normalizeImportance(importance),
                            now,
                            now,
                            now));
                });
    }

    public MemoryItem updateMemory(String memoryId, String category, String scope, String content, Integer importance) {
        MemoryItem current = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new NoSuchElementException("MemoryItem not found: " + memoryId));
        Instant now = timeProvider.now();
        return memoryRepository.save(current.withUpdatedFields(
                scope == null || scope.isBlank() ? current.getScope() : normalizeScope(scope),
                category == null || category.isBlank() ? current.getCategory() : normalizeCategory(category),
                content == null || content.isBlank() ? current.getContent() : content.trim(),
                importance == null ? current.getImportance() : normalizeImportance(importance),
                now));
    }

    public MemoryItem deleteMemory(String memoryId) {
        MemoryItem current = memoryRepository.findById(memoryId)
                .orElseThrow(() -> new NoSuchElementException("MemoryItem not found: " + memoryId));
        memoryRepository.deleteById(memoryId);
        return current;
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "PROJECT_FACT";
        }
        String normalized = category.trim().toUpperCase().replace('-', '_');
        return switch (normalized) {
            case "USER_PREFERENCE", "PROJECT_FACT", "DECISION", "CONSTRAINT", "ARTIFACT_NOTE" -> normalized;
            default -> "PROJECT_FACT";
        };
    }

    private String normalizeScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return "CONVERSATION";
        }
        String normalized = scope.trim().toUpperCase().replace('-', '_');
        return switch (normalized) {
            case "CONVERSATION", "AGENT", "GLOBAL" -> normalized;
            default -> "CONVERSATION";
        };
    }

    private int normalizeImportance(Integer importance) {
        return importance == null ? 5 : Math.max(1, Math.min(10, importance));
    }

    private String buildMemoryContent(Message message) {
        return "Memory from " + message.getSenderType()
                + " (" + message.getSenderId() + "): "
                + message.getContent();
    }
}
