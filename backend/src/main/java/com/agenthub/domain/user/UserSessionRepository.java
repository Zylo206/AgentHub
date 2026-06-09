package com.agenthub.domain.user;

import java.util.Optional;

public interface UserSessionRepository {

    UserSession save(UserSession userSession);

    Optional<UserSession> findByAccessTokenHash(String accessTokenHash);

    Optional<UserSession> findByRefreshTokenHash(String refreshTokenHash);

    void revokeBySessionId(String sessionId);
}
