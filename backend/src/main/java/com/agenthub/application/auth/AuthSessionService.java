package com.agenthub.application.auth;

import com.agenthub.domain.conversation.Conversation;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionService {

    private static final AuthPrincipal DEMO_PRINCIPAL = new AuthPrincipal(
            Conversation.DEFAULT_OWNER_USER_ID,
            "Demo User",
            "USER",
            List.of(Conversation.DEFAULT_ORG_TAG));

    private final ConcurrentHashMap<String, AuthPrincipal> sessions = new ConcurrentHashMap<>();
    private final ThreadLocal<AuthPrincipal> currentPrincipal = new ThreadLocal<>();
    private final SecureRandom secureRandom = new SecureRandom();
    private final boolean enabled;

    public AuthSessionService(@Value("${agenthub.auth.enabled:true}") boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public LoginResult login(String username, String password) {
        AuthPrincipal principal = authenticate(username, password);
        String token = "ah_" + randomHex(24);
        sessions.put(token, principal);
        return new LoginResult(token, principal);
    }

    public AuthPrincipal resolve(String token) {
        if (!enabled) {
            return DEMO_PRINCIPAL;
        }
        if (token == null || token.isBlank()) {
            throw new AuthenticationRequiredException("Login required.");
        }
        AuthPrincipal principal = sessions.get(token);
        if (principal == null) {
            throw new AuthenticationRequiredException("Invalid or expired login token.");
        }
        return principal;
    }

    public void logout(String token) {
        if (token != null && !token.isBlank()) {
            sessions.remove(token);
        }
    }

    public void bind(AuthPrincipal principal) {
        currentPrincipal.set(principal == null ? DEMO_PRINCIPAL : principal);
    }

    public void clear() {
        currentPrincipal.remove();
    }

    public AuthPrincipal current() {
        AuthPrincipal principal = currentPrincipal.get();
        if (principal != null) {
            return principal;
        }
        if (!enabled) {
            return DEMO_PRINCIPAL;
        }
        throw new AuthenticationRequiredException("Login required.");
    }

    private AuthPrincipal authenticate(String username, String password) {
        String normalizedUsername = username == null ? "" : username.trim().toLowerCase();
        String normalizedPassword = password == null ? "" : password.trim();
        Map<String, AuthPrincipal> users = Map.of(
                "demo", DEMO_PRINCIPAL,
                "admin", new AuthPrincipal("admin-user", "Admin User", "ADMIN", List.of(Conversation.DEFAULT_ORG_TAG)),
                "reviewer", new AuthPrincipal("reviewer-user", "Reviewer", "REVIEWER", List.of(Conversation.DEFAULT_ORG_TAG)));
        AuthPrincipal principal = users.get(normalizedUsername);
        if (principal == null || !isAcceptedPassword(normalizedUsername, normalizedPassword)) {
            throw new AuthenticationRequiredException("Invalid username or password.");
        }
        return principal;
    }

    private boolean isAcceptedPassword(String username, String password) {
        return password.equals(username) || password.equals("agenthub");
    }

    private String randomHex(int byteCount) {
        byte[] bytes = new byte[byteCount];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    public record LoginResult(String token, AuthPrincipal user) {
    }
}
