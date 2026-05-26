package com.agenthub.application.context.embedding;

import java.util.Optional;

public interface EmbeddingProvider {

    Optional<EmbeddingResult> embed(String text);

    default String backendName() {
        return "EMBEDDING_DISABLED";
    }

    record EmbeddingResult(String embeddingJson, String backend, String explanation) {

        public EmbeddingResult {
            backend = backend == null || backend.isBlank() ? "EMBEDDING_DISABLED" : backend.trim();
            explanation = explanation == null || explanation.isBlank()
                    ? "Embedding provider returned a vector payload."
                    : explanation.trim();
        }
    }
}
