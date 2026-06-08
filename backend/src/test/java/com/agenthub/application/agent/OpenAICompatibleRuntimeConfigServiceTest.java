package com.agenthub.application.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.common.TimeProvider;
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
                "memory");

        OpenAICompatibleRuntimeConfigService.RuntimeConfigView view = service.update(
                new OpenAICompatibleRuntimeConfigService.UpdateRuntimeConfigCommand(
                        true,
                        "DeepSeek",
                        "https://api.deepseek.com",
                        "sk-test-abc",
                        "deepseek-chat"));

        assertEquals("USER", view.scopeType());
        assertEquals("user-1", view.scopeId());
        assertTrue(view.canManage());
        assertEquals("MEMORY_ONLY", view.apiKeyStorageMode());
        assertEquals("DeepSeek", service.snapshot().providerName());
        assertEquals("https://api.deepseek.com", service.snapshot().baseUrl());
    }

    private static class FixedTimeProvider extends TimeProvider {

        @Override
        public Instant now() {
            return Instant.parse("2026-06-08T00:00:00Z");
        }
    }
}
