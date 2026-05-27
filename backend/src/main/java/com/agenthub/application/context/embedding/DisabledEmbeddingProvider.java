package com.agenthub.application.context.embedding;

import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class DisabledEmbeddingProvider implements EmbeddingProvider {

    @Override
    public Optional<EmbeddingResult> embed(String text) {
        return Optional.empty();
    }

    @Override
    public String backendName() {
        return "EMBEDDING_DISABLED";
    }
}
