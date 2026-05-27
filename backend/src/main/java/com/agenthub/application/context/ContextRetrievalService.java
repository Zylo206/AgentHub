package com.agenthub.application.context;

import com.agenthub.application.context.search.ContextSearchResult;
import com.agenthub.application.context.search.ContextSearchService;
import com.agenthub.domain.context.RetrievedContextItem;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.MessageId;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ContextRetrievalService {

    private final ContextSearchService contextSearchService;
    private final ContextSemanticScoringService semanticScoringService;
    private final int defaultLimit;

    public ContextRetrievalService(
            ContextSearchService contextSearchService,
            ContextSemanticScoringService semanticScoringService,
            @Value("${agenthub.context.retrieval.limit:8}") int defaultLimit) {
        this.contextSearchService = contextSearchService;
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

        contextSearchService.search(conversationId, query, sourceMessageId, limit, now).stream()
                .map(result -> fromSearchResult(result, query))
                .forEach(item -> putBest(candidates, item));

        List<RetrievedContextItem> rankedCandidates = candidates.values().stream()
                .filter(item -> item.getContent() != null && !item.getContent().isBlank())
                .sorted(Comparator.comparingDouble(RetrievedContextItem::getScore).reversed())
                .toList();
        List<RetrievedContextItem> ranked = diversifySources(rankedCandidates, Math.max(1, limit)).stream()
                .limit(Math.max(1, limit))
                .toList();

        List<RetrievedContextItem> withRank = new ArrayList<>();
        for (int index = 0; index < ranked.size(); index++) {
            withRank.add(ranked.get(index).withSourceRank(index + 1));
        }
        return List.copyOf(withRank);
    }

    private RetrievedContextItem fromSearchResult(ContextSearchResult result, String query) {
        ScoreBreakdown scores = score(
                result.candidate().baseScore(),
                query,
                result.candidate().content(),
                result.candidate().recencyScore(),
                result.candidate().importanceScore(),
                result.matchedTokens());
        return item(
                sourceType(result),
                result.candidate().sourceId(),
                result.candidate().title(),
                result.candidate().content(),
                scores,
                result.candidate().reason() + " Search stage: " + result.searchStage() + ".",
                result.candidate().windowPolicy(),
                result.searchStage());
    }

    private RetrievedContextItem item(
            String sourceType,
            String sourceId,
            String title,
            String content,
            ScoreBreakdown scores,
            String reason,
            String windowPolicy,
            String searchStage) {
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
                windowPolicy,
                searchStage);
    }

    private List<RetrievedContextItem> diversifySources(List<RetrievedContextItem> rankedCandidates, int limit) {
        Map<String, RetrievedContextItem> topBySource = new LinkedHashMap<>();
        for (RetrievedContextItem item : rankedCandidates) {
            topBySource.putIfAbsent(item.getSourceType(), item);
        }

        Map<String, RetrievedContextItem> selected = new LinkedHashMap<>();
        topBySource.values().stream()
                .sorted(Comparator.comparingDouble(RetrievedContextItem::getScore).reversed())
                .limit(limit)
                .forEach(item -> selected.put(key(item), item));
        rankedCandidates.stream()
                .filter(item -> !selected.containsKey(key(item)))
                .limit(Math.max(0, limit - selected.size()))
                .forEach(item -> selected.put(key(item), item));

        return selected.values().stream()
                .sorted(Comparator.comparingDouble(RetrievedContextItem::getScore).reversed())
                .toList();
    }

    private void putBest(Map<String, RetrievedContextItem> candidates, RetrievedContextItem item) {
        RetrievedContextItem existing = candidates.get(key(item));
        if (existing == null || item.getScore() > existing.getScore()) {
            candidates.put(key(item), item);
        }
    }

    private String key(RetrievedContextItem item) {
        return item.getSourceType() + ":" + item.getSourceId();
    }

    private ScoreBreakdown score(
            double baseScore,
            String query,
            String content,
            double recencyScore,
            double importanceScore,
            List<String> matchedTokens) {
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

    private String sourceType(ContextSearchResult result) {
        return switch (result.candidate().sourceType()) {
            case PINNED_CONTEXT -> "PINNED_MESSAGE";
            case MEMORY -> "MEMORY";
            case MESSAGE -> "RECENT_MESSAGE";
            case ARTIFACT -> "ARTIFACT";
            case ATTACHMENT -> "ATTACHMENT";
            case TASK_RUN -> "TASK_RUN_SUMMARY";
        };
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
