package com.agenthub.domain.user;

import java.time.Instant;

public record UserSession(
        String sessionId,
        String userId,
        String accessTokenHash,
        String refreshTokenHash,
        Instant accessExpiresAt,
        Instant refreshExpiresAt,
        Instant createdAt,
        Instant updatedAt,
        Instant lastUsedAt,
        Instant revokedAt,
        String clientIp,
        String userAgent) {

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public UserSession withLastUsedAt(Instant now) {
        return new UserSession(
                sessionId,
                userId,
                accessTokenHash,
                refreshTokenHash,
                accessExpiresAt,
                refreshExpiresAt,
                createdAt,
                now,
                now,
                revokedAt,
                clientIp,
                userAgent);
    }

    public UserSession withTokens(
            String nextAccessTokenHash,
            String nextRefreshTokenHash,
            Instant nextAccessExpiresAt,
            Instant nextRefreshExpiresAt,
            Instant now) {
        return new UserSession(
                sessionId,
                userId,
                nextAccessTokenHash,
                nextRefreshTokenHash,
                nextAccessExpiresAt,
                nextRefreshExpiresAt,
                createdAt,
                now,
                now,
                null,
                clientIp,
                userAgent);
    }

    public UserSession revoke(Instant now) {
        return new UserSession(
                sessionId,
                userId,
                accessTokenHash,
                refreshTokenHash,
                accessExpiresAt,
                refreshExpiresAt,
                createdAt,
                now,
                lastUsedAt,
                now,
                clientIp,
                userAgent);
    }
}
