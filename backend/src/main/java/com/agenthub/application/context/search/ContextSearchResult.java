package com.agenthub.application.context.search;

import java.util.List;

public record ContextSearchResult(
        ContextSearchCandidate candidate,
        List<String> matchedTokens,
        String searchStage) {
}
