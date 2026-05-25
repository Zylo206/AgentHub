package com.agenthub.domain.context;

public class RetrievedContextItem {

    private final String sourceType;
    private final String sourceId;
    private final String title;
    private final String content;
    private final double score;
    private final String reason;
    private final int sourceRank;
    private final double baseScore;
    private final double keywordScore;
    private final double recencyScore;
    private final double importanceScore;
    private final double semanticScore;
    private final String semanticBackend;
    private final String semanticExplanation;
    private final java.util.List<String> matchedTokens;
    private final String windowPolicy;

    public RetrievedContextItem(
            String sourceType,
            String sourceId,
            String title,
            String content,
            double score,
            String reason) {
        this(
                sourceType,
                sourceId,
                title,
                content,
                score,
                reason,
                0,
                score,
                0,
                0,
                0,
                0,
                "HEURISTIC",
                "Legacy retrieved context item did not record semantic backend details.",
                java.util.List.of(),
                "LEGACY");
    }

    public RetrievedContextItem(
            String sourceType,
            String sourceId,
            String title,
            String content,
            double score,
            String reason,
            int sourceRank,
            double baseScore,
            double keywordScore,
            double recencyScore,
            double importanceScore,
            double semanticScore,
            String semanticBackend,
            String semanticExplanation,
            java.util.List<String> matchedTokens,
            String windowPolicy) {
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.title = title;
        this.content = content;
        this.score = score;
        this.reason = reason;
        this.sourceRank = sourceRank;
        this.baseScore = baseScore;
        this.keywordScore = keywordScore;
        this.recencyScore = recencyScore;
        this.importanceScore = importanceScore;
        this.semanticScore = semanticScore;
        this.semanticBackend = semanticBackend == null || semanticBackend.isBlank() ? "HEURISTIC" : semanticBackend;
        this.semanticExplanation = semanticExplanation == null || semanticExplanation.isBlank()
                ? "Semantic score was computed by the configured backend."
                : semanticExplanation;
        this.matchedTokens = matchedTokens == null ? java.util.List.of() : java.util.List.copyOf(matchedTokens);
        this.windowPolicy = windowPolicy;
    }

    public RetrievedContextItem withSourceRank(int nextSourceRank) {
        return new RetrievedContextItem(
                sourceType,
                sourceId,
                title,
                content,
                score,
                reason,
                nextSourceRank,
                baseScore,
                keywordScore,
                recencyScore,
                importanceScore,
                semanticScore,
                semanticBackend,
                semanticExplanation,
                matchedTokens,
                windowPolicy);
    }

    public String getSourceType() {
        return sourceType;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public double getScore() {
        return score;
    }

    public String getReason() {
        return reason;
    }

    public int getSourceRank() {
        return sourceRank;
    }

    public double getBaseScore() {
        return baseScore;
    }

    public double getKeywordScore() {
        return keywordScore;
    }

    public double getRecencyScore() {
        return recencyScore;
    }

    public double getImportanceScore() {
        return importanceScore;
    }

    public double getSemanticScore() {
        return semanticScore;
    }

    public String getSemanticBackend() {
        return semanticBackend;
    }

    public String getSemanticExplanation() {
        return semanticExplanation;
    }

    public java.util.List<String> getMatchedTokens() {
        return matchedTokens;
    }

    public String getWindowPolicy() {
        return windowPolicy;
    }
}
