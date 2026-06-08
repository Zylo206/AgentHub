package com.agenthub.application.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventStore;
import com.agenthub.application.realtime.SseConnectionRegistry;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.persistence.memory.InMemoryActionAuditRepository;
import com.agenthub.infrastructure.persistence.memory.InMemoryOpenAICompatibleRuntimeConfigRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OpenAICompatibleRuntimeConfigServiceTest {

    @Test
    void persistsConfigByCurrentUserScopeInMemoryMode() {
        AuthSessionService authSessionService = new AuthSessionService(false);
        authSessionService.bind(new AuthPrincipal("user-1", "User One", "USER", List.of("DEFAULT")));
        OpenAICompatibleRuntimeConfigService service = new OpenAICompatibleRuntimeConfigService(
                new FixedTimeProvider(),
                authSessionService,
                new InMemoryOpenAICompatibleRuntimeConfigRepository(),
                new OpenAICompatibleRuntimeConfigCryptoService(""),
                buildAuditService("1"),
                "memory");

        OpenAICompatibleRuntimeConfigService.RuntimeConfigView view = service.update(
                new OpenAICompatibleRuntimeConfigService.UpdateRuntimeConfigCommand(
                        "USER",
                        true,
                        "DeepSeek",
                        "https://api.deepseek.com",
                        "sk-test-abc",
                        "deepseek-chat"));

        assertEquals("USER", view.selectedScope().scopeType());
        assertEquals("user-1", view.selectedScope().scopeId());
        assertTrue(view.selectedScope().canManage());
        assertEquals("MEMORY_ONLY", view.apiKeyStorageMode());
        assertEquals("DeepSeek", service.snapshot().providerName());
        assertEquals("https://api.deepseek.com", service.snapshot().baseUrl());
    }

    @Test
    void resolvesOrgAndGlobalScopesByPriority() {
        AuthSessionService authSessionService = new AuthSessionService(false);
        InMemoryOpenAICompatibleRuntimeConfigRepository repository = new InMemoryOpenAICompatibleRuntimeConfigRepository();
        ActionAuditService auditService = new ActionAuditService(
                new InMemoryActionAuditRepository(),
                new RealtimeEventPublisher(
                        new RealtimeEventStore(200),
                        new SseConnectionRegistry(25),
                        fixedIdGenerator("evt"),
                        new FixedTimeProvider(),
                        false),
                fixedIdGenerator("2"),
                new FixedTimeProvider());
        OpenAICompatibleRuntimeConfigService service = new OpenAICompatibleRuntimeConfigService(
                new FixedTimeProvider(),
                authSessionService,
                repository,
                new OpenAICompatibleRuntimeConfigCryptoService(""),
                auditService,
                "memory");

        authSessionService.bind(new AuthPrincipal("admin-user", "Admin", "ADMIN", List.of("TEAM_A")));
        service.update(new OpenAICompatibleRuntimeConfigService.UpdateRuntimeConfigCommand(
                "GLOBAL",
                true,
                "OpenAI",
                "https://api.openai.com/v1",
                "sk-global",
                "gpt-4.1-mini"));
        service.update(new OpenAICompatibleRuntimeConfigService.UpdateRuntimeConfigCommand(
                "ORG",
                true,
                "DeepSeek Team",
                "https://api.deepseek.com",
                "sk-org",
                "deepseek-v4-flash"));

        authSessionService.bind(new AuthPrincipal("user-1", "User One", "USER", List.of("TEAM_A")));
        assertEquals("DeepSeek Team", service.snapshot().providerName());

        service.update(new OpenAICompatibleRuntimeConfigService.UpdateRuntimeConfigCommand(
                "USER",
                true,
                "Personal",
                "https://example.com/v1",
                "sk-user",
                "personal-model"));
        assertEquals("Personal", service.snapshot().providerName());
    }

    private static class FixedTimeProvider extends TimeProvider {

        @Override
        public Instant now() {
            return Instant.parse("2026-06-08T00:00:00Z");
        }
    }

    private ActionAuditService buildAuditService(String suffix) {
        return new ActionAuditService(
                new InMemoryActionAuditRepository(),
                new RealtimeEventPublisher(
                        new RealtimeEventStore(200),
                        new SseConnectionRegistry(25),
                        fixedIdGenerator("evt_" + suffix),
                        new FixedTimeProvider(),
                        false),
                fixedIdGenerator(suffix),
                new FixedTimeProvider());
    }

    private IdGenerator fixedIdGenerator(String suffix) {
        return new IdGenerator() {
            @Override
            public String nextId(String prefix) {
                return prefix + "_" + suffix;
            }
        };
    }
}
