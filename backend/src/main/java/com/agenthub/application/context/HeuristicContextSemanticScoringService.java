package com.agenthub.application.context;

import com.agenthub.application.context.embedding.EmbeddingProvider;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class HeuristicContextSemanticScoringService implements ContextSemanticScoringService {

    private final String semanticBackendMode;
    private final EmbeddingProvider embeddingProvider;

    public HeuristicContextSemanticScoringService(
            @Value("${agenthub.context.semantic.backend:heuristic}") String semanticBackendMode,
            EmbeddingProvider embeddingProvider) {
        this.semanticBackendMode = semanticBackendMode == null || semanticBackendMode.isBlank()
                ? "heuristic"
                : semanticBackendMode.trim().toLowerCase(Locale.ROOT);
        this.embeddingProvider = embeddingProvider;
    }

    @Override
    public SemanticScore score(String query, String content) {
        if ("embedding".equals(semanticBackendMode)) {
            return scoreWithEmbeddingBoundary(query, content);
        }
        if (!"heuristic".equals(semanticBackendMode)) {
            return scoreHeuristically(
                    query,
                    content,
                    "HEURISTIC",
                    "Unknown semantic backend '" + semanticBackendMode + "'; heuristic semantic overlap was used.");
        }
        return scoreHeuristically(
                query,
                content,
                "HEURISTIC",
                "Embedding backend is optional; heuristic semantic overlap was used.");
    }

    private SemanticScore scoreWithEmbeddingBoundary(String query, String content) {
        String explanation = "Embedding backend is configured but no provider is wired in this build; heuristic semantic overlap was used.";
        if (query == null || query.isBlank() || content == null || content.isBlank()) {
            return scoreHeuristically(query, content, "EMBEDDING_DISABLED", explanation);
        }
        if (embeddingProvider.embed(query).isPresent() && embeddingProvider.embed(content).isPresent()) {
            explanation = "Embedding provider is available, but vector similarity execution is not enabled in this build; heuristic semantic overlap was used.";
        }
        return scoreHeuristically(query, content, "EMBEDDING_DISABLED", explanation);
    }

    private SemanticScore scoreHeuristically(String query, String content, String backendLabel, String explanation) {
        if (query == null || query.isBlank() || content == null || content.isBlank()) {
            return new SemanticScore(0.0, backendLabel, "No query/content for semantic scoring. " + explanation);
        }

        Set<String> queryTokens = new LinkedHashSet<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[^\\p{IsAlphabetic}\\p{IsDigit}]+")) {
            if (token.length() >= 2) {
                queryTokens.add(token);
            }
        }
        if (queryTokens.isEmpty()) {
            return new SemanticScore(0.0, backendLabel, "No meaningful query tokens. " + explanation);
        }

        String normalizedContent = content.toLowerCase(Locale.ROOT);
        long softMatches = queryTokens.stream()
                .filter(token -> matchesSemanticToken(normalizedContent, token))
                .count();
        return new SemanticScore(
                Math.min(20.0, softMatches * 3.0),
                backendLabel,
                explanation);
    }

    private boolean matchesSemanticToken(String normalizedContent, String token) {
        if (normalizedContent.contains(token)) {
            return true;
        }
        return switch (token) {
            case "login" -> normalizedContent.contains("\u767b\u5f55");
            case "review" -> normalizedContent.contains("\u68c0\u67e5") || normalizedContent.contains("\u8bc4\u5ba1");
            case "deploy" -> normalizedContent.contains("\u90e8\u7f72");
            case "artifact" -> normalizedContent.contains("\u4ea7\u7269");
            default -> false;
        };
    }
}
