package com.agenthub.application.agent;

import java.time.Instant;
import java.util.Optional;

public interface OpenAICompatibleRuntimeConfigRepository {

    Optional<PersistedRuntimeConfig> find(String adapterType, String scopeType, String scopeId);

    PersistedRuntimeConfig save(PersistedRuntimeConfig config);

    record PersistedRuntimeConfig(
            String adapterType,
            String scopeType,
            String scopeId,
            boolean enabled,
            String providerName,
            String baseUrl,
            String apiKey,
            String model,
            Instant updatedAt,
            String updatedByUserId,
            String updatedByRole) {

        public PersistedRuntimeConfig {
            adapterType = normalizeRequired(adapterType, "adapterType");
            scopeType = normalizeRequired(scopeType, "scopeType");
            scopeId = normalizeRequired(scopeId, "scopeId");
            providerName = normalize(providerName);
            baseUrl = normalize(baseUrl);
            apiKey = normalize(apiKey);
            model = normalize(model);
            updatedByUserId = normalize(updatedByUserId);
            updatedByRole = normalize(updatedByRole);
        }

        public static PersistedRuntimeConfig empty(String adapterType, String scopeType, String scopeId) {
            return new PersistedRuntimeConfig(
                    adapterType,
                    scopeType,
                    scopeId,
                    false,
                    "",
                    "",
                    "",
                    "",
                    null,
                    "",
                    "");
        }

        private static String normalize(String value) {
            return value == null ? "" : value.trim();
        }

        private static String normalizeRequired(String value, String fieldName) {
            String normalized = normalize(value);
            if (normalized.isBlank()) {
                throw new IllegalArgumentException(fieldName + " must not be blank");
            }
            return normalized;
        }
    }
}
