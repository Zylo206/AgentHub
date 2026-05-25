package com.agenthub.application.context;

public interface ContextSemanticScoringService {

    SemanticScore score(String query, String content);

    record SemanticScore(double score, String backend, String explanation) {

        public SemanticScore {
            backend = backend == null || backend.isBlank() ? "HEURISTIC" : backend.trim();
            explanation = explanation == null || explanation.isBlank()
                    ? "Semantic score was computed by the configured backend."
                    : explanation.trim();
        }
    }
}
