package com.agenthub.application.agent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class OpenAICompatibleRuntimeConfigCryptoServiceTest {

    @Test
    void encryptsAndDecryptsRoundTrip() {
        OpenAICompatibleRuntimeConfigCryptoService cryptoService =
                new OpenAICompatibleRuntimeConfigCryptoService("test-runtime-config-secret");

        String encrypted = cryptoService.encryptForJdbc("sk-test-123456");

        assertEquals("sk-test-123456", cryptoService.decryptFromJdbc(encrypted));
    }

    @Test
    void rejectsJdbcEncryptionWithoutConfiguredKey() {
        OpenAICompatibleRuntimeConfigCryptoService cryptoService =
                new OpenAICompatibleRuntimeConfigCryptoService("");

        assertThrows(IllegalStateException.class, () -> cryptoService.encryptForJdbc("sk-test-123456"));
    }
}
