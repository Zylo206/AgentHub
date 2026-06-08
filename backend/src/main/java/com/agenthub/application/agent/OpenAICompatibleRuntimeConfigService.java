package com.agenthub.application.agent;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.AccessDeniedException;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.auth.AuthenticationRequiredException;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.conversation.ConversationId;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class OpenAICompatibleRuntimeConfigService {

    private static final String ADAPTER_TYPE = "OPENAI_COMPATIBLE";
    private static final String USER_SCOPE = "USER";
    private static final String ORG_SCOPE = "ORG";
    private static final String GLOBAL_SCOPE = "GLOBAL";
    private static final String GLOBAL_SCOPE_ID = "GLOBAL";
    private static final ConversationId AUDIT_CONVERSATION_ID = new ConversationId("system:adapter-runtime-config");

    private final TimeProvider timeProvider;
    private final AuthSessionService authSessionService;
    private final OpenAICompatibleRuntimeConfigRepository repository;
    private final OpenAICompatibleRuntimeConfigCryptoService cryptoService;
    private final ActionAuditService actionAuditService;
    private final String persistenceMode;

    public OpenAICompatibleRuntimeConfigService(
            TimeProvider timeProvider,
            AuthSessionService authSessionService,
            OpenAICompatibleRuntimeConfigRepository repository,
            OpenAICompatibleRuntimeConfigCryptoService cryptoService,
            ActionAuditService actionAuditService,
            @org.springframework.beans.factory.annotation.Value("${agenthub.persistence.mode:memory}") String persistenceMode) {
        this.timeProvider = timeProvider;
        this.authSessionService = authSessionService;
        this.repository = repository;
        this.cryptoService = cryptoService;
        this.actionAuditService = actionAuditService;
        this.persistenceMode = persistenceMode == null ? "memory" : persistenceMode.trim().toLowerCase();
    }

    public synchronized RuntimeConfigView get(String requestedScopeType) {
        AuthPrincipal principal = authSessionService.current();
        ScopeTarget scopeTarget = resolveScopeTarget(principal, requestedScopeType);
        OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig selected = repository.find(
                        ADAPTER_TYPE,
                        scopeTarget.scopeType(),
                        scopeTarget.scopeId())
                .orElse(OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig.empty(
                        ADAPTER_TYPE,
                        scopeTarget.scopeType(),
                        scopeTarget.scopeId()));
        ResolvedConfig effective = resolveEffectiveConfig(principal);
        return toView(selected, scopeTarget, effective, principal);
    }

    public synchronized RuntimeConfigView update(UpdateRuntimeConfigCommand command) {
        AuthPrincipal principal = authSessionService.current();
        ScopeTarget scopeTarget = resolveScopeTarget(principal, command.scopeType());
        OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig current = repository.find(
                        ADAPTER_TYPE,
                        scopeTarget.scopeType(),
                        scopeTarget.scopeId())
                .orElse(OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig.empty(
                        ADAPTER_TYPE,
                        scopeTarget.scopeType(),
                        scopeTarget.scopeId()));
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
                        scopeTarget.scopeType(),
                        scopeTarget.scopeId(),
                        enabled,
                        providerName,
                        baseUrl,
                        apiKey,
                        model,
                        timeProvider.now(),
                        principal.userId(),
                        principal.role()));
        actionAuditService.record(
                AUDIT_CONVERSATION_ID,
                "UPSERT_ADAPTER_RUNTIME_CONFIG",
                "ADAPTER_RUNTIME_CONFIG",
                ADAPTER_TYPE + ":" + scopeTarget.scopeType() + ":" + scopeTarget.scopeId(),
                "COMPLETED",
                "Updated OpenAI-compatible runtime config for scope "
                        + scopeTarget.scopeType() + ":" + scopeTarget.scopeId()
                        + " with provider " + providerName + " and model " + model + ".");
        ResolvedConfig effective = resolveEffectiveConfig(principal);
        return toView(saved, scopeTarget, effective, principal);
    }

    public synchronized RuntimeConfig snapshot() {
        try {
            AuthPrincipal principal = authSessionService.current();
            return toRuntimeConfig(resolveEffectiveConfig(principal).config());
        } catch (AuthenticationRequiredException ignored) {
            // Some internal paths may not have an auth context. Fall back to global or env config.
        }
        return repository.find(ADAPTER_TYPE, GLOBAL_SCOPE, GLOBAL_SCOPE_ID)
                .map(this::toRuntimeConfig)
                .orElse(RuntimeConfig.empty());
    }

    private RuntimeConfigView toView(
            OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig value,
            ScopeTarget scopeTarget,
            ResolvedConfig effective,
            AuthPrincipal principal) {
        return new RuntimeConfigView(
                new ScopeConfigView(
                        value.scopeType(),
                        value.scopeId(),
                        !value.providerName().isBlank() || !value.baseUrl().isBlank() || !value.model().isBlank()
                                || !value.apiKey().isBlank() || value.enabled(),
                        value.enabled(),
                        value.providerName(),
                        value.baseUrl(),
                        value.model(),
                        !value.apiKey().isBlank(),
                        mask(value.apiKey()),
                        value.updatedAt() == null ? null : value.updatedAt().toString(),
                        scopeTarget.canManage(),
                        scopeTarget.managedByRole(),
                        value.updatedByUserId(),
                        value.updatedByRole()),
                new ScopeConfigView(
                        effective.scopeType(),
                        effective.scopeId(),
                        isConfigured(effective.config()),
                        effective.config().enabled(),
                        effective.config().providerName(),
                        effective.config().baseUrl(),
                        effective.config().model(),
                        !effective.config().apiKey().isBlank(),
                        mask(effective.config().apiKey()),
                        effective.config().updatedAt() == null ? null : effective.config().updatedAt().toString(),
                        principal.isAdmin() || effective.scopeType().equals(USER_SCOPE),
                        "RESOLVED",
                        effective.config().updatedByUserId(),
                        effective.config().updatedByRole()),
                availableScopes(principal),
                apiKeyStorageMode());
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

    private ResolvedConfig resolveEffectiveConfig(AuthPrincipal principal) {
        Optional<OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig> userConfig = repository.find(
                ADAPTER_TYPE,
                USER_SCOPE,
                principal.userId());
        if (userConfig.isPresent()) {
            return new ResolvedConfig(USER_SCOPE, principal.userId(), userConfig.get());
        }
        for (String orgTag : principal.orgTags()) {
            Optional<OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig> orgConfig = repository.find(
                    ADAPTER_TYPE,
                    ORG_SCOPE,
                    orgTag);
            if (orgConfig.isPresent()) {
                return new ResolvedConfig(ORG_SCOPE, orgTag, orgConfig.get());
            }
        }
        return repository.find(ADAPTER_TYPE, GLOBAL_SCOPE, GLOBAL_SCOPE_ID)
                .map(config -> new ResolvedConfig(GLOBAL_SCOPE, GLOBAL_SCOPE_ID, config))
                .orElse(new ResolvedConfig(GLOBAL_SCOPE, GLOBAL_SCOPE_ID, OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig.empty(
                        ADAPTER_TYPE,
                        GLOBAL_SCOPE,
                        GLOBAL_SCOPE_ID)));
    }

    private ScopeTarget resolveScopeTarget(AuthPrincipal principal, String requestedScopeType) {
        String normalizedScope = requestedScopeType == null || requestedScopeType.isBlank()
                ? USER_SCOPE
                : requestedScopeType.trim().toUpperCase(Locale.ROOT);
        return switch (normalizedScope) {
            case USER_SCOPE -> new ScopeTarget(USER_SCOPE, principal.userId(), true, "SELF");
            case ORG_SCOPE -> {
                requireAdmin(principal, ORG_SCOPE);
                yield new ScopeTarget(ORG_SCOPE, principal.primaryOrgTag(), true, "ADMIN");
            }
            case GLOBAL_SCOPE -> {
                requireAdmin(principal, GLOBAL_SCOPE);
                yield new ScopeTarget(GLOBAL_SCOPE, GLOBAL_SCOPE_ID, true, "ADMIN");
            }
            default -> throw new IllegalArgumentException("Unsupported runtime config scope: " + requestedScopeType);
        };
    }

    private void requireAdmin(AuthPrincipal principal, String scopeType) {
        if (principal == null || !principal.isAdmin()) {
            throw new AccessDeniedException("Admin permission is required to manage " + scopeType + " runtime config.");
        }
    }

    private List<String> availableScopes(AuthPrincipal principal) {
        if (principal != null && principal.isAdmin()) {
            return List.of(USER_SCOPE, ORG_SCOPE, GLOBAL_SCOPE);
        }
        return List.of(USER_SCOPE);
    }

    private boolean isConfigured(OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig value) {
        return value != null
                && (value.enabled()
                || !value.providerName().isBlank()
                || !value.baseUrl().isBlank()
                || !value.apiKey().isBlank()
                || !value.model().isBlank());
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
            ScopeConfigView selectedScope,
            ScopeConfigView effectiveScope,
            List<String> availableScopes,
            String apiKeyStorageMode) {
    }

    public record ScopeConfigView(
            String scopeType,
            String scopeId,
            boolean configured,
            boolean enabled,
            String providerName,
            String baseUrl,
            String model,
            boolean hasApiKey,
            String maskedApiKey,
            String updatedAt,
            boolean canManage,
            String managedByRole,
            String updatedByUserId,
            String updatedByRole) {
    }

    public record UpdateRuntimeConfigCommand(
            String scopeType,
            boolean enabled,
            String providerName,
            String baseUrl,
            String apiKey,
            String model) {
    }

    private record ScopeTarget(
            String scopeType,
            String scopeId,
            boolean canManage,
            String managedByRole) {
    }

    private record ResolvedConfig(
            String scopeType,
            String scopeId,
            OpenAICompatibleRuntimeConfigRepository.PersistedRuntimeConfig config) {
    }
}
