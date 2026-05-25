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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContextRetrievalService {

    private final ContextRepository contextRepository;
    private final MemoryRepository memoryRepository;
    private final MessageRepository messageRepository;
    private final ArtifactRepository artifactRepository;
    private final TaskRepository taskRepository;
    private final ContextSemanticScoringService semanticScoringService;
    private final int defaultLimit;

    public ContextRetrievalService(
            ContextRepository contextRepository,
            MemoryRepository memoryRepository,
            MessageRepository messageRepository,
            ArtifactRepository artifactRepository,
            TaskRepository taskRepository,
            ContextSemanticScoringService semanticScoringService,
            @Value("${agenthub.context.retrieval.limit:8}") int defaultLimit) {
        this.contextRepository = contextRepository;
        this.memoryRepository = memoryRepository;
        this.messageRepository = messageRepository;
        this.artifactRepository = artifactRepository;
        this.taskRepository = taskRepository;
        this.semanticScoringService = semanticScoringService;
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

        List<Artifact> artifacts = artifactRepository.findByConversationId(conversationId);
        artifacts.stream()
                .skip(Math.max(0, artifacts.size() - 8))
                .map(artifact -> fromArtifact(artifact, query))
                .forEach(item -> putBest(candidates, item));

        List<TaskRun> taskRuns = taskRepository.findTaskRunsByConversationId(conversationId);
        taskRuns.stream()
                .skip(Math.max(0, taskRuns.size() - 5))
                .map(taskRun -> fromTaskRun(taskRun, query))
                .forEach(item -> putBest(candidates, item));

        List<RetrievedContextItem> ranked = candidates.values().stream()
                .filter(item -> item.getContent() != null && !item.getContent().isBlank())
                .sorted(Comparator.comparingDouble(RetrievedContextItem::getScore).reversed())
                .limit(Math.max(1, limit))
                .toList();

        List<RetrievedContextItem> withRank = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index++) {
            withRank.add(ranked.get(index).withSourceRank(index + 1));
        }
        return List.copyOf(withRank);
    }

    private RetrievedContextItem fromPinnedContext(PinnedContext pinnedContext, String query) {
        ScoreBreakdown scores = score(100, query, pinnedContext.getContent(), 10, 0);
        return item(
                "PINNED_MESSAGE",
                pinnedContext.getSourceId(),
                "Pinned context",
                pinnedContext.getContent(),
                scores,
                "Manual pinned context has highest priority.",
                "PINNED_CONTEXT_ALL");
    }

    private RetrievedContextItem fromMemory(MemoryItem memoryItem, String query) {
        ScoreBreakdown scores = score(80, query, memoryItem.getContent(), 8, memoryItem.getImportance() * 2.0);
        return item(
                "MEMORY",
                memoryItem.getMemoryId(),
                memoryItem.getCategory() + " / " + memoryItem.getScope(),
                memoryItem.getContent(),
                scores,
                "Long-term memory matched by importance, recency, and query keywords.",
                "TOP_RELEVANT_MEMORY");
    }

    private RetrievedContextItem fromMessage(Message message, String query) {
        ScoreBreakdown scores = score(45, query, message.getContent(), 6, 0);
        return item(
                "RECENT_MESSAGE",
                message.getId().value(),
                message.getSenderType() + " message",
                message.getContent(),
                scores,
                "Recent conversation history matched by recency and query keywords.",
                "LAST_8_MESSAGES");
    }

    private RetrievedContextItem fromArtifact(Artifact artifact, String query) {
        String searchableContent = artifact.getTitle() + " " + artifact.getContent();
        ScoreBreakdown scores = score(35, query, searchableContent, 4, 0);
        return item(
                "ARTIFACT",
                artifact.getId().value(),
                artifact.getTitle() + " v" + artifact.getVersion(),
                artifact.getContent(),
                scores,
                "Artifact context matched by title/content and latest conversation artifacts.",
                "LAST_8_ARTIFACTS");
    }

    private RetrievedContextItem fromTaskRun(TaskRun taskRun, String query) {
        ScoreBreakdown scores = score(25, query, taskRun.getResultSummary(), 3, 0);
        return item(
                "TASK_RUN_SUMMARY",
                taskRun.getId().value(),
                "Previous TaskRun",
                taskRun.getResultSummary(),
                scores,
                "Previous TaskRun summary matched by recency and query keywords.",
                "LAST_5_TASK_RUNS");
    }

    private RetrievedContextItem item(
            String sourceType,
            String sourceId,
            String title,
            String content,
            ScoreBreakdown scores,
            String reason,
            String windowPolicy) {
        return new RetrievedContextItem(
                sourceType,
                sourceId,
                title,
                truncate(content),
                scores.totalScore(),
                reason,
                0,
                scores.baseScore(),
                scores.keywordScore(),
                scores.recencyScore(),
                scores.importanceScore(),
                scores.semanticScore(),
                scores.semanticBackend(),
                scores.semanticExplanation(),
                scores.matchedTokens(),
                windowPolicy);
    }

    private void putBest(Map<String, RetrievedContextItem> candidates, RetrievedContextItem item) {
        String key = item.getSourceType() + ":" + item.getSourceId();
        RetrievedContextItem existing = candidates.get(key);
        if (existing == null || item.getScore() > existing.getScore()) {
            candidates.put(key, item);
        }
    }

    private ScoreBreakdown score(
            double baseScore,
            String query,
            String content,
            double recencyScore,
            double importanceScore) {
        List<String> matchedTokens = matchedTokens(query, content);
        double keywordScore = matchedTokens.size() * 4.0;
        ContextSemanticScoringService.SemanticScore semanticScore = semanticScoringService.score(query, content);
        return new ScoreBreakdown(
                baseScore,
                keywordScore,
                recencyScore,
                importanceScore,
                semanticScore.score(),
                semanticScore.backend(),
                semanticScore.explanation(),
                baseScore + keywordScore + recencyScore + importanceScore + semanticScore.score(),
                matchedTokens);
    }

    private List<String> matchedTokens(String query, String content) {
        if (query == null || query.isBlank() || content == null || content.isBlank()) {
            return List.of();
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        Set<String> tokens = new LinkedHashSet<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[\\s,，。；;：:！？?、/\\\\]+")) {
            if (token.length() >= 2) {
                tokens.add(token);
            }
        }
        return tokens.stream().filter(normalizedContent::contains).toList();
    }

    private String truncate(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.replace("\r", " ").replace("\n", " ").trim();
        return normalized.length() <= 260 ? normalized : normalized.substring(0, 257) + "...";
    }

    private record ScoreBreakdown(
            double baseScore,
            double keywordScore,
            double recencyScore,
            double importanceScore,
            double semanticScore,
            String semanticBackend,
            String semanticExplanation,
            double totalScore,
            List<String> matchedTokens) {
    }
}
