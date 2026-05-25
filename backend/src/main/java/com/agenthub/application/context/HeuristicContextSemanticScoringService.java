package com.agenthub.application.context;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class HeuristicContextSemanticScoringService implements ContextSemanticScoringService {

    @Override
    public SemanticScore score(String query, String content) {
        if (query == null || query.isBlank() || content == null || content.isBlank()) {
            return new SemanticScore(0.0, "HEURISTIC", "No query/content for semantic scoring.");
        }
        Set<String> queryTokens = new LinkedHashSet<>();
        for (String token : query.toLowerCase(Locale.ROOT).split("[^\\p{IsAlphabetic}\\p{IsDigit}]+")) {
            if (token.length() >= 2) {
                queryTokens.add(token);
            }
        }
        if (queryTokens.isEmpty()) {
            return new SemanticScore(0.0, "HEURISTIC", "No meaningful query tokens.");
        }
        String normalizedContent = content.toLowerCase(Locale.ROOT);
        long softMatches = queryTokens.stream()
                .filter(token -> normalizedContent.contains(token)
                        || normalizedContent.contains(token.replace("login", "登录"))
                        || normalizedContent.contains(token.replace("review", "检查")))
                .count();
        return new SemanticScore(
                Math.min(20.0, softMatches * 3.0),
                "HEURISTIC",
                "Embedding backend is optional; heuristic semantic overlap was used.");
    }
}
