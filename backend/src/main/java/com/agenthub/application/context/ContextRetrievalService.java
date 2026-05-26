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
                result.candidate().windowPolicy());
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
