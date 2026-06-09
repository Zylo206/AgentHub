package com.agenthub.application.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptGuard {

    private static final int MAX_FAILURES = 6;
    private static final Duration WINDOW = Duration.ofMinutes(10);
    private static final Duration BLOCK_DURATION = Duration.ofMinutes(10);

    private final ConcurrentHashMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public void checkAllowed(String usernameOrEmail, String clientIp, Instant now) {
        AttemptWindow window = attempts.get(key(usernameOrEmail, clientIp));
        if (window == null || window.blockedUntil == null || window.blockedUntil.isBefore(now)) {
            return;
        }
        throw new AuthenticationRequiredException("Too many login attempts. Please try again later.");
    }

    public void recordFailure(String usernameOrEmail, String clientIp, Instant now) {
        attempts.compute(key(usernameOrEmail, clientIp), (key, existing) -> {
            AttemptWindow window = existing;
            if (window == null || window.windowStartedAt.plus(WINDOW).isBefore(now)) {
                window = new AttemptWindow(now, 0, null);
            }
            int nextFailureCount = window.failureCount + 1;
            Instant blockedUntil = nextFailureCount >= MAX_FAILURES ? now.plus(BLOCK_DURATION) : window.blockedUntil;
            return new AttemptWindow(window.windowStartedAt, nextFailureCount, blockedUntil);
        });
    }

    public void recordSuccess(String usernameOrEmail, String clientIp) {
        attempts.remove(key(usernameOrEmail, clientIp));
    }

    private String key(String usernameOrEmail, String clientIp) {
        String normalizedUser = usernameOrEmail == null ? "" : usernameOrEmail.trim().toLowerCase(Locale.ROOT);
        String normalizedIp = clientIp == null ? "" : clientIp.trim();
        return normalizedUser + "|" + normalizedIp;
    }

    private record AttemptWindow(Instant windowStartedAt, int failureCount, Instant blockedUntil) {
    }
}
