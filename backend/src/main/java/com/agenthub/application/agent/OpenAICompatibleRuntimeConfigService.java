package com.agenthub.application.agent;

import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.auth.AuthenticationRequiredException;
import com.agenthub.common.TimeProvider;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class OpenAICompatibleRuntimeConfigService {

    private static final String ADAPTER_TYPE = "OPENAI_COMPATIBLE";
    private static final String USER_SCOPE = "USER";
    private static final String GLOBAL_SCOPE = "GLOBAL";
    private static final String GLOBAL_SCOPE_ID = "GLOBAL";

    private final TimeProvider timeProvider;
    private final AuthSessionService authSessionService;
    private final OpenAICompatibleRuntimeConfigRepository repository;
    private final OpenAICompatibleRuntimeConfigCryptoService cryptoService;
    private final String persistenceMode;

    public OpenAICompatibleRuntimeConfigService(
            TimeProvider timeProvider,
            AuthSessionService authSessionService,
            OpenAICompatibleRuntimeConfigRepository repository,
            OpenAICompatibleRuntimeConfigCryptoService cryptoService,
            @org.springframework.beans.factory.annotation.Value("${agenthub.persistence.mode:memory}") String persistenceMode) {
        this.timeProvider = timeProvider;
        this.authSessionService = authSessionService;
        this.repository = repository;
        this.cryptoService = cryptoService;
        this.persistenceMode = persistenceMode == null ? "memory" : persistenceMode.trim().toLowerCase();
    }

    public synchronized RuntimeConfigView get() {
        AuthPrincipal principal = authSessionService.current();
        OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig config = loadCurrentUserConfig(principal);
        return toView(config, principal);
    }

    public synchronized RuntimeConfigView update(UpdateRuntimeConfigCommand command) {
        AuthPrincipal principal = authSessionService.current();
        OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig current = loadCurrentUserConfig(principal);
        String providerName = trimToDefault(command.providerName(), "Custom OpenAI-compatible");
        String baseUrl = trim(command.baseUrl());
        String model = trim(command.model());
        String apiKey = command.apiKey() == null || command.apiKey().isBlank()
                ? current.apiKey()
                : command.apiKey().trim();
        boolean enabled = command.enabled();
        OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig saved = repository.save(
                new OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig(
                        ADAPTER_TYPE,
                        USER_SCOPE,
                        principal.userId(),
                        enabled,
                        providerName,
                        baseUrl,
                        apiKey,
                        model,
                        timeProvider.now(),
                        principal.userId(),
                        principal.role()));
        return toView(saved, principal);
    }

    public synchronized RuntimeConfig snapshot() {
        try {
            AuthPrincipal principal = authSessionService.current();
            RuntimeConfig userConfig = toRuntimeConfig(loadCurrentUserConfig(principal));
            if (userConfig.complete() || userConfig.enabled()) {
                return userConfig;
            }
        } catch (AuthenticationRequiredException ignored) {
            // Some internal paths may not have an auth context. Fall back to global or env config.
        }
        return repository.find(ADAPTER_TYPE, GLOBAL_SCOPE, GLOBAL_SCOPE_ID)
                .map(this::toRuntimeConfig)
                .orElse(RuntimeConfig.empty());
    }

    private OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig loadCurrentUserConfig(AuthPrincipal principal) {
        return repository.find(ADAPTER_TYPE, USER_SCOPE, principal.userId())
                .orElse(OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig.empty(
                        ADAPTER_TYPE,
                        USER_SCOPE,
                        principal.userId()));
    }

    private RuntimeConfigView toView(
            OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig value,
            AuthPrincipal principal) {
        return new RuntimeConfigView(
                value.enabled(),
                value.providerName(),
                value.baseUrl(),
                value.model(),
                !value.apiKey().isBlank(),
                mask(value.apiKey()),
                value.updatedAt() == null ? null : value.updatedAt().toString(),
                value.scopeType(),
                value.scopeId(),
                principal.userId().equals(value.scopeId()) || principal.isAdmin(),
                "ADMIN_OR_SELF",
                apiKeyStorageMode(),
                value.updatedByUserId(),
                value.updatedByRole());
    }

    private RuntimeConfig toRuntimeConfig(OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig value) {
        return new RuntimeConfig(
                value.enabled(),
                value.providerName(),
                value.baseUrl(),
                value.apiKey(),
                value.model(),
                value.updatedAt());
    }

    private String apiKeyStorageMode() {
        if (!"jdbc".equalsIgnoreCase(persistenceMode)) {
            return "MEMORY_ONLY";
        }
        return cryptoService.encryptionConfigured() ? "ENCRYPTED_JDBC" : "JDBC_KEY_REQUIRED";
    }

    private String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private String trimToDefault(String value, String fallback) {
        String trimmed = trim(value);
        return trimmed.isBlank() ? fallback : trimmed;
    }

    private String mask(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        if (value.length() <= 8) {
            return "********";
        }
        return value.substring(0, 3) + "..." + value.substring(value.length() - 4);
    }

    public record RuntimeConfig(
            boolean enabled,
            String providerName,
            String baseUrl,
            String apiKey,
            String model,
            Instant updatedAt) {

        static RuntimeConfig empty() {
            return new RuntimeConfig(false, "", "", "", "", null);
        }

        public boolean complete() {
            return enabled && !baseUrl.isBlank() && !apiKey.isBlank() && !model.isBlank();
        }
    }

    public record RuntimeConfigView(
            boolean enabled,
            String providerName,
            String baseUrl,
            String model,
            boolean hasApiKey,
            String maskedApiKey,
            String updatedAt,
            String scopeType,
            String scopeId,
            boolean canManage,
            String managedByRole,
            String apiKeyStorageMode,
            String updatedByUserId,
            String updatedByRole) {
    }

    public record UpdateRuntimeConfigCommand(
            boolean enabled,
            String providerName,
            String baseUrl,
            String apiKey,
            String model) {
    }
}
