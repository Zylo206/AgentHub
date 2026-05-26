package com.agenthub.application.context.search;

import java.time.Instant;

public record ContextSearchCandidate(
        ContextSearchSourceType sourceType,
        String sourceId,
        String title,
        String content,
        double baseScore,
        double recencyScore,
        double importanceScore,
        String reason,
        String windowPolicy,
        Instant createdAt) {
}
