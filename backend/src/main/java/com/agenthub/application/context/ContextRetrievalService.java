package com.agenthub.application.context;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.context.ContextRepository;
import com.agenthub.domain.context.PinnedContext;
import com.agenthub.domain.context.RetrievedContextItem;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.memory.MemoryItem;
import com.agenthub.domain.memory.MemoryRepository;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContextRetrievalService {

    private final ContextRepository contextRepository;
    private final MemoryRepository memoryRepository;
    private final MessageRepository messageRepository;
    private final ArtifactRepository artifactRepository;
    private final TaskRepository taskRepository;
    private final int defaultLimit;

    public ContextRetrievalService(
            ContextRepository contextRepository,
            MemoryRepository memoryRepository,
            MessageRepository messageRepository,
            ArtifactRepository artifactRepository,
            TaskRepository taskRepository,
            @Value("${agenthub.context.retrieval.limit:8}") int defaultLimit) {
        this.contextRepository = contextRepository;
        this.memoryRepository = memoryRepository;
        this.messageRepository = messageRepository;
        this.artifactRepository = artifactRepository;
        this.taskRepository = taskRepository;
        this.defaultLimit = defaultLimit;
    }

    public List<RetrievedContextItem> retrieveForTask(
            ConversationId conversationId,
            String query,
            MessageId sourceMessageId,
            Instant now) {
        return retrieveForTask(conversationId, query, sourceMessageId, defaultLimit, now);
    }

    public List<RetrievedContextItem> retrieveForTask(
            ConversationId conversationId,
            String query,
            MessageId sourceMessageId,
            int limit,
            Instant now) {
        Map<String, RetrievedContextItem> candidates = new LinkedHashMap<>();

        contextRepository.findPinnedContextsByConversationId(conversationId)
                .forEach(item -> putBest(candidates, fromPinnedContext(item, query)));

        memoryRepository.findRelevantForConversation(conversationId, Math.max(limit, 6)).stream()
                .map(item -> memoryRepository.markUsed(item.getMemoryId(), now).orElse(item))
                .map(item -> fromMemory(item, query))
                .forEach(item -> putBest(candidates, item));

        List<Message> messages = messageRepository.findByConversationId(conversationId);
        messages.stream()
                .filter(message -> sourceMessageId == null || !message.getId().equals(sourceMessageId))
                .skip(Math.max(0, messages.size() - 8))
                .map(message -> fromMessage(message, query))
                .forEach(item -> putBest(candidates, item));

        artifactRepository.findByConversationId(conversationId).stream()
                .skip(Math.max(0, artifactRepository.findByConversationId(conversationId).size() - 8))
                .map(artifact -> fromArtifact(artifact, query))
                .forEach(item -> putBest(candidates, item));

        taskRepository.findTaskRunsByConversationId(conversationId).stream()
                .skip(Math.max(0, taskRepository.findTaskRunsByConversationId(conversationId).size() - 5))
                .map(taskRun -> fromTaskRun(taskRun, query))
                .forEach(item -> putBest(candidates, item));

        return candidates.values().stream()
                .filter(item -> item.getContent() != null && !item.getContent().isBlank())
                .sorted(Comparator.comparingDouble(RetrievedContextItem::getScore).reversed())
                .limit(Math.max(1, limit))
                .toList();
    }

    private RetrievedContextItem fromPinnedContext(PinnedContext pinnedContext, String query) {
        double score = 100 + keywordScore(query, pinnedContext.getContent());
        return new RetrievedContextItem(
                "PINNED_MESSAGE",
                pinnedContext.getSourceId(),
                "Pinned context",
                truncate(pinnedContext.getContent()),
                score,
                "Manual pinned context has highest priority.");
    }

    private RetrievedContextItem fromMemory(MemoryItem memoryItem, String query) {
        double score = 80 + memoryItem.getImportance() * 2 + keywordScore(query, memoryItem.getContent());
        return new RetrievedContextItem(
                "MEMORY",
                memoryItem.getMemoryId(),
                memoryItem.getCategory() + " / " + memoryItem.getScope(),
                truncate(memoryItem.getContent()),
                score,
                "Long-term memory matched by importance, recency, and query keywords.");
    }

    private RetrievedContextItem fromMessage(Message message, String query) {
        double score = 45 + keywordScore(query, message.getContent());
        return new RetrievedContextItem(
                "RECENT_MESSAGE",
                message.getId().value(),
                message.getSenderType() + " message",
                truncate(message.getContent()),
                score,
                "Recent conversation history matched by recency and query keywords.");
    }

    private RetrievedContextItem fromArtifact(Artifact artifact, String query) {
        double score = 35 + keywordScore(query, artifact.getTitle() + " " + artifact.getContent());
        return new RetrievedContextItem(
                "ARTIFACT",
                artifact.getId().value(),
                artifact.getTitle() + " v" + artifact.getVersion(),
                truncate(artifact.getContent()),
                score,
                "Artifact context matched by title/content and latest conversation artifacts.");
    }

    private RetrievedContextItem fromTaskRun(TaskRun taskRun, String query) {
        double score = 25 + keywordScore(query, taskRun.getResultSummary());
        return new RetrievedContextItem(
                "TASK_RUN_SUMMARY",
                taskRun.getId().value(),
                "Previous TaskRun",
                truncate(taskRun.getResultSummary()),
                score,
                "Previous TaskRun summary matched by recency and query keywords.");
    }

    private void putBest(Map<String, RetrievedContextItem> candidates, RetrievedContextItem item) {
        String key = item.getSourceType() + ":" + item.getSourceId();
        RetrievedContextItem existing = candidates.get(key);
        if (existing == null || item.getScore() > existing.getScore()) {
            candidates.put(key, item);
        }
    }

    private double keywordScore(String query, String content) {
        if (query == null || query.isBlank() || content == null || content.isBlank()) {
            return 0;
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        List<String> tokens = new ArrayList<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[\\s,，。.;；:：!?！？/\\\\]+")) {
            if (token.length() >= 2) {
                tokens.add(token);
            }
        }
        return tokens.stream().filter(normalizedContent::contains).count() * 4.0;
    }

    private String truncate(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.replace("\r", " ").replace("\n", " ").trim();
        return normalized.length() <= 260 ? normalized : normalized.substring(0, 257) + "...";
    }
}
