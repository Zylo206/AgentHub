package com.agenthub.domain.context;

public class RetrievedContextItem {

    private final String sourceType;
    private final String sourceId;
    private final String title;
    private final String content;
    private final double score;
    private final String reason;

    public RetrievedContextItem(
            String sourceType,
            String sourceId,
            String title,
            String content,
            double score,
            String reason) {
        this.sourceType = sourceType;
        this.sourceId = sourceId;
        this.title = title;
        this.content = content;
        this.score = score;
        this.reason = reason;
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
}
