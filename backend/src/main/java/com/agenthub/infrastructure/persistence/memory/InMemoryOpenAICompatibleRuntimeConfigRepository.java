package com.agenthub.infrastructure.persistence.memory;

import com.agenthub.application.agent.OpenAICompatibleRuntimeConfigRepository;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "agenthub.persistence.mode", havingValue = "memory", matchIfMissing = true)
public class InMemoryOpenAICompatibleRuntimeConfigRepository implements OpenAICompatibleRuntimeConfigRepository {

    private final ConcurrentHashMap<String, PersistedRuntimeConfig> storage = new ConcurrentHashMap<>();

    @Override
    public Optional<PersistedRuntimeConfig> find(String adapterType, String scopeType, String scopeId) {
        return Optional.ofNullable(storage.get(key(adapterType, scopeType, scopeId)));
    }

    @Override
    public PersistedRuntimeConfig save(PersistedRuntimeConfig config) {
        storage.put(key(config.adapterType(), config.scopeType(), config.scopeId()), config);
        return config;
    }

    private String key(String adapterType, String scopeType, String scopeId) {
        return adapterType + "::" + scopeType + "::" + scopeId;
    }
}
