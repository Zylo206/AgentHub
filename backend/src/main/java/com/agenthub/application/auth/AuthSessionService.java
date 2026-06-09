package com.agenthub.application.auth;

import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountRepository;
import com.agenthub.domain.user.UserAccountStatus;
import com.agenthub.domain.user.UserSession;
import com.agenthub.domain.user.UserSessionRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionService {

    public static final String AUTH_SYSTEM_CONVERSATION_ID = "system-auth";

    private static final AuthPrincipal DEMO_PRINCIPAL = new AuthPrincipal(
            Conversation.DEFAULT_OWNER_USER_ID,
            "demo",
            "demo@agenthub.local",
            "Demo User",
            "USER",
            "ACTIVE",
            List.of(Conversation.DEFAULT_ORG_TAG));

    private final ThreadLocal<AuthPrincipal> currentPrincipal = new ThreadLocal<>();
    private final SecureRandom secureRandom = new SecureRandom();
    private final UserAccountRepository userAccountRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordHashService passwordHashService;
    private final LoginAttemptGuard loginAttemptGuard;
    private final ActionAuditService actionAuditService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final String authMode;
    private final Duration accessTokenTtl;
    private final Duration refreshTokenTtl;

    @Autowired
    public AuthSessionService(
            @Value("${agenthub.auth.mode:demo}") String authMode,
            @Value("${agenthub.auth.access-token-ttl-seconds:900}") long accessTokenTtlSeconds,
            @Value("${agenthub.auth.refresh-token-ttl-days:14}") long refreshTokenTtlDays,
            ObjectProvider<UserAccountRepository> userAccountRepositoryProvider,
            ObjectProvider<UserSessionRepository> userSessionRepositoryProvider,
            PasswordHashService passwordHashService,
            LoginAttemptGuard loginAttemptGuard,
            ActionAuditService actionAuditService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.authMode = normalizeAuthMode(authMode);
        this.accessTokenTtl = Duration.ofSeconds(Math.max(60, accessTokenTtlSeconds));
        this.refreshTokenTtl = Duration.ofDays(Math.max(1, refreshTokenTtlDays));
        this.userAccountRepository = userAccountRepositoryProvider.getIfAvailable();
        this.userSessionRepository = userSessionRepositoryProvider.getIfAvailable();
        this.passwordHashService = passwordHashService;
        this.loginAttemptGuard = loginAttemptGuard;
        this.actionAuditService = actionAuditService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public AuthSessionService(boolean enabled) {
        this.authMode = enabled ? "real" : "demo";
        this.accessTokenTtl = Duration.ofMinutes(15);
        this.refreshTokenTtl = Duration.ofDays(14);
        this.userAccountRepository = null;
        this.userSessionRepository = null;
        this.passwordHashService = null;
        this.loginAttemptGuard = new LoginAttemptGuard();
        this.actionAuditService = null;
        this.idGenerator = new IdGenerator();
        this.timeProvider = new TimeProvider();
    }

    public boolean isEnabled() {
        return isRealMode();
    }

    public boolean isDemoMode() {
        return "demo".equals(authMode);
    }

    public boolean isRealMode() {
        return "real".equals(authMode);
    }

    public LoginResult register(String username, String email, String password, String clientIp, String userAgent) {
        if (isDemoMode()) {
            throw new AuthenticationRequiredException("Registration is unavailable in demo auth mode.");
        }
        Instant now = timeProvider.now();
        validateRegistration(username, email, password);
        UserAccountRepository userRepository = requireUserAccountRepository();
        if (userRepository.findByUsername(normalizeUsername(username)).isPresent()
                || userRepository.findByEmail(normalizeEmail(email)).isPresent()) {
            recordAudit("REGISTER", "USER", normalizeUsername(username), "REJECTED", "Registration rejected.");
            throw new AuthenticationRequiredException("Registration failed. Please use another username or email.");
        }
        UserAccount account = new UserAccount(
                idGenerator.nextId("user"),
                normalizeUsername(username),
                normalizeEmail(email),
                username.trim(),
                passwordHashService.hash(password),
                UserAccountStatus.ACTIVE,
                false,
                Conversation.DEFAULT_ORG_TAG,
                now,
                now,
                null);
        userRepository.save(account);
        recordAudit("REGISTER", "USER", account.id(), "SUCCEEDED", "User registered.");
        return createLoginResult(account, clientIp, userAgent, now);
    }

    public LoginResult login(String usernameOrEmail, String password, String clientIp, String userAgent) {
        if (isDemoMode()) {
            return loginDemo(usernameOrEmail, password);
        }
        Instant now = timeProvider.now();
        loginAttemptGuard.checkAllowed(usernameOrEmail, clientIp, now);
        Optional<UserAccount> accountOptional = findByUsernameOrEmail(usernameOrEmail);
        if (accountOptional.isEmpty()) {
            recordFailedLogin(usernameOrEmail, clientIp, now, "Account not found.");
            throw new AuthenticationRequiredException("Invalid username/email or password.");
        }
        UserAccount account = accountOptional.get();
        if (!passwordHashService.matches(password, account.passwordHash())) {
            recordFailedLogin(usernameOrEmail, clientIp, now, "Password mismatch.");
            throw new AuthenticationRequiredException("Invalid username/email or password.");
        }
        requireActive(account);
        loginAttemptGuard.recordSuccess(usernameOrEmail, clientIp);
        return createLoginResult(account, clientIp, userAgent, now);
    }

    public LoginResult refresh(String refreshToken, String clientIp, String userAgent) {
        if (isDemoMode()) {
            return loginDemo("demo", "demo");
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthenticationRequiredException("Refresh token is required.");
        }
        UserSessionRepository sessionRepository = requireUserSessionRepository();
        Instant now = timeProvider.now();
        UserSession session = sessionRepository.findByRefreshTokenHash(hashToken(refreshToken))
                .orElseThrow(() -> new AuthenticationRequiredException("Invalid or expired refresh token."));
        if (session.isRevoked() || session.refreshExpiresAt() == null || session.refreshExpiresAt().isBefore(now)) {
            sessionRepository.revokeBySessionId(session.sessionId());
            throw new AuthenticationRequiredException("Invalid or expired refresh token.");
        }
        UserAccount account = requireUserAccountRepository().findById(session.userId())
                .orElseThrow(() -> new AuthenticationRequiredException("Invalid or expired refresh token."));
        requireActive(account);
        String nextAccessToken = issueToken("ah_access");
        String nextRefreshToken = issueToken("ah_refresh");
        UserSession rotated = session.withTokens(
                hashToken(nextAccessToken),
                hashToken(nextRefreshToken),
                now.plus(accessTokenTtl),
                now.plus(refreshTokenTtl),
                now);
        sessionRepository.save(rotated);
        return new LoginResult(
                nextAccessToken,
                nextRefreshToken,
                toPrincipal(account),
                rotated.accessExpiresAt(),
                rotated.refreshExpiresAt());
    }

    public AuthPrincipal resolve(String token) {
        if (isDemoMode()) {
            return DEMO_PRINCIPAL;
        }
        if (token == null || token.isBlank()) {
            throw new AuthenticationRequiredException("Login required.");
        }
        UserSession session = requireUserSessionRepository().findByAccessTokenHash(hashToken(token))
                .orElseThrow(() -> new AuthenticationRequiredException("Invalid or expired login token."));
        Instant now = timeProvider.now();
        if (session.isRevoked() || session.accessExpiresAt() == null || session.accessExpiresAt().isBefore(now)) {
            requireUserSessionRepository().revokeBySessionId(session.sessionId());
            throw new AuthenticationRequiredException("Invalid or expired login token.");
        }
        UserAccount account = requireUserAccountRepository().findById(session.userId())
                .orElseThrow(() -> new AuthenticationRequiredException("Invalid or expired login token."));
        requireActive(account);
        requireUserSessionRepository().save(session.withLastUsedAt(now));
        return toPrincipal(account);
    }

    public void logout(String accessToken, String refreshToken) {
        if (isDemoMode()) {
            return;
        }
        UserSessionRepository sessionRepository = requireUserSessionRepository();
        if (accessToken != null && !accessToken.isBlank()) {
            sessionRepository.findByAccessTokenHash(hashToken(accessToken))
                    .ifPresent(session -> sessionRepository.revokeBySessionId(session.sessionId()));
        }
        if (refreshToken != null && !refreshToken.isBlank()) {
            sessionRepository.findByRefreshTokenHash(hashToken(refreshToken))
                    .ifPresent(session -> sessionRepository.revokeBySessionId(session.sessionId()));
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
        if (isDemoMode()) {
            return DEMO_PRINCIPAL;
        }
        throw new AuthenticationRequiredException("Login required.");
    }

    private LoginResult loginDemo(String usernameOrEmail, String password) {
        String normalizedUsername = usernameOrEmail == null ? "" : usernameOrEmail.trim().toLowerCase(Locale.ROOT);
        String normalizedPassword = password == null ? "" : password.trim();
        Map<String, AuthPrincipal> demoUsers = Map.of(
                "demo", DEMO_PRINCIPAL,
                "admin", new AuthPrincipal("admin-user", "admin", "admin@agenthub.local", "Admin User", "ADMIN", "ACTIVE", List.of(Conversation.DEFAULT_ORG_TAG)),
                "reviewer", new AuthPrincipal("reviewer-user", "reviewer", "reviewer@agenthub.local", "Reviewer", "USER", "ACTIVE", List.of(Conversation.DEFAULT_ORG_TAG)));
        AuthPrincipal principal = demoUsers.get(normalizedUsername);
        if (principal == null || !normalizedPassword.equals(normalizedUsername)) {
            throw new AuthenticationRequiredException("Invalid username/email or password.");
        }
        Instant now = timeProvider.now();
        return new LoginResult(
                issueToken("ah_demo_access"),
                issueToken("ah_demo_refresh"),
                principal,
                now.plus(accessTokenTtl),
                now.plus(refreshTokenTtl));
    }

    private LoginResult createLoginResult(UserAccount account, String clientIp, String userAgent, Instant now) {
        String accessToken = issueToken("ah_access");
        String refreshToken = issueToken("ah_refresh");
        UserSession session = new UserSession(
                idGenerator.nextId("sess"),
                account.id(),
                hashToken(accessToken),
                hashToken(refreshToken),
                now.plus(accessTokenTtl),
                now.plus(refreshTokenTtl),
                now,
                now,
                now,
                null,
                normalizeNullable(clientIp),
                normalizeNullable(userAgent));
        requireUserSessionRepository().save(session);
        requireUserAccountRepository().save(account.withLastLoginAt(now));
        recordAudit("LOGIN_SUCCESS", "USER", account.id(), "SUCCEEDED", "User login succeeded.");
        return new LoginResult(accessToken, refreshToken, toPrincipal(account), session.accessExpiresAt(), session.refreshExpiresAt());
    }

    private Optional<UserAccount> findByUsernameOrEmail(String usernameOrEmail) {
        UserAccountRepository userRepository = requireUserAccountRepository();
        String normalized = usernameOrEmail == null ? "" : usernameOrEmail.trim();
        if (normalized.contains("@")) {
            Optional<UserAccount> byEmail = userRepository.findByEmail(normalizeEmail(normalized));
            if (byEmail.isPresent()) {
                return byEmail;
            }
        }
        return userRepository.findByUsername(normalizeUsername(normalized));
    }

    private void validateRegistration(String username, String email, String password) {
        if (username == null || username.trim().length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 characters.");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Email format is invalid.");
        }
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
    }

    private void requireActive(UserAccount account) {
        if (account.status() == UserAccountStatus.ACTIVE) {
            return;
        }
        throw new AuthenticationRequiredException(
                account.status() == UserAccountStatus.LOCKED
                        ? "Account is locked."
                        : "Account is disabled.");
    }

    private void recordFailedLogin(String usernameOrEmail, String clientIp, Instant now, String summary) {
        loginAttemptGuard.recordFailure(usernameOrEmail, clientIp, now);
        recordAudit("LOGIN_FAILED", "USER", normalizeNullable(usernameOrEmail), "REJECTED", summary);
    }

    private void recordAudit(String actionType, String targetType, String targetId, String status, String summary) {
        if (actionAuditService == null) {
            return;
        }
        actionAuditService.record(
                new ConversationId(AUTH_SYSTEM_CONVERSATION_ID),
                actionType,
                targetType,
                targetId == null || targetId.isBlank() ? "n/a" : targetId,
                status,
                summary);
    }

    private String issueToken(String prefix) {
        return prefix + "_" + randomHex(24);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private String randomHex(int byteCount) {
        byte[] bytes = new byte[byteCount];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private UserAccountRepository requireUserAccountRepository() {
        if (userAccountRepository == null) {
            throw new IllegalStateException("Real auth mode requires JDBC user account repository.");
        }
        return userAccountRepository;
    }

    private UserSessionRepository requireUserSessionRepository() {
        if (userSessionRepository == null) {
            throw new IllegalStateException("Real auth mode requires JDBC user session repository.");
        }
        return userSessionRepository;
    }

    private AuthPrincipal toPrincipal(UserAccount account) {
        return new AuthPrincipal(
                account.id(),
                account.username(),
                account.email(),
                account.displayName(),
                account.isAdmin() ? "ADMIN" : "USER",
                account.status().name(),
                List.of(account.primaryOrgTag()));
    }

    private String normalizeAuthMode(String rawMode) {
        String normalized = rawMode == null ? "demo" : rawMode.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("real") ? "real" : "demo";
    }

    private String normalizeUsername(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record LoginResult(
            String token,
            String refreshToken,
            AuthPrincipal user,
            Instant accessExpiresAt,
            Instant refreshExpiresAt) {
    }
}
