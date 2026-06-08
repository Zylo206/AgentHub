package com.agenthub.application.agent;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OpenAICompatibleRuntimeConfigCryptoService {

    private static final String PREFIX = "enc:v1:";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    private final SecureRandom secureRandom = new SecureRandom();
    private final String encryptionKey;

    public OpenAICompatibleRuntimeConfigCryptoService(
            @Value("${agenthub.adapters.openai-compatible.runtime-config.encryption-key:}") String encryptionKey) {
        this.encryptionKey = encryptionKey == null ? "" : encryptionKey.trim();
    }

    public boolean encryptionConfigured() {
        return !encryptionKey.isBlank();
    }

    public String encryptForJdbc(String plainText) {
        String normalized = plainText == null ? "" : plainText.trim();
        if (normalized.isBlank()) {
            return "";
        }
        if (!encryptionConfigured()) {
            throw new IllegalStateException(
                    "agenthub.adapters.openai-compatible.runtime-config.encryption-key must be configured when persisting API keys with JDBC.");
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(deriveKey(), "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(normalized.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            return PREFIX + Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Failed to encrypt OpenAI-compatible runtime API key.", exception);
        }
    }

    public String decryptFromJdbc(String storedValue) {
        String normalized = storedValue == null ? "" : storedValue.trim();
        if (normalized.isBlank()) {
            return "";
        }
        if (!normalized.startsWith(PREFIX)) {
            return normalized;
        }
        if (!encryptionConfigured()) {
            throw new IllegalStateException(
                    "agenthub.adapters.openai-compatible.runtime-config.encryption-key must be configured to read persisted API keys.");
        }
        try {
            byte[] combined = Base64.getDecoder().decode(normalized.substring(PREFIX.length()));
            if (combined.length <= IV_BYTES) {
                throw new IllegalStateException("Persisted API key payload is truncated.");
            }
            byte[] iv = java.util.Arrays.copyOfRange(combined, 0, IV_BYTES);
            byte[] encrypted = java.util.Arrays.copyOfRange(combined, IV_BYTES, combined.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(deriveKey(), "AES"), new GCMParameterSpec(GCM_TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (IllegalStateException exception) {
            throw exception;
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Failed to decrypt persisted OpenAI-compatible runtime API key.", exception);
        }
    }

    private byte[] deriveKey() {
        try {
            return MessageDigest.getInstance("SHA-256").digest(encryptionKey.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Failed to derive runtime-config encryption key.", exception);
        }
    }
}
