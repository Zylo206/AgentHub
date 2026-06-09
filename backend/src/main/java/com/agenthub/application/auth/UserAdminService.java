package com.agenthub.application.auth;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.application.audit.ActionAuditService;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountRepository;
import com.agenthub.domain.user.UserAccountStatus;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class UserAdminService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordHashService passwordHashService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final AuthSessionService authSessionService;
    private final ActionAuditService actionAuditService;

    public UserAdminService(
            ObjectProvider<UserAccountRepository> userAccountRepositoryProvider,
            PasswordHashService passwordHashService,
            IdGenerator idGenerator,
            TimeProvider timeProvider,
            AuthSessionService authSessionService,
            ActionAuditService actionAuditService) {
        this.userAccountRepository = userAccountRepositoryProvider.getIfAvailable();
        this.passwordHashService = passwordHashService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
        this.authSessionService = authSessionService;
        this.actionAuditService = actionAuditService;
    }

    public List<UserAccount> listUsers() {
        requireAdmin();
        return requireRepository().findAll();
    }

    public UserAccount createUser(String username, String email, String password, boolean isAdmin, String primaryOrgTag) {
        requireAdmin();
        validate(username, email, password);
        UserAccountRepository repository = requireRepository();
        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (repository.findByUsername(normalizedUsername).isPresent() || repository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Username or email already exists.");
        }
        Instant now = timeProvider.now();
        UserAccount userAccount = new UserAccount(
                idGenerator.nextId("user"),
                normalizedUsername,
                normalizedEmail,
                username.trim(),
                passwordHashService.hash(password),
                UserAccountStatus.ACTIVE,
                isAdmin,
                primaryOrgTag == null || primaryOrgTag.isBlank() ? Conversation.DEFAULT_ORG_TAG : primaryOrgTag.trim(),
                now,
                now,
                null);
        UserAccount saved = repository.save(userAccount);
        recordAudit("CREATE_USER", saved.id(), "SUCCEEDED", "Admin created user.");
        return saved;
    }

    public UserAccount updateStatus(String userId, UserAccountStatus status) {
        requireAdmin();
        UserAccount userAccount = findUser(userId);
        UserAccount saved = requireRepository().save(userAccount.withStatus(status, timeProvider.now()));
        recordAudit("UPDATE_USER_STATUS", saved.id(), "SUCCEEDED", "Admin updated user status to " + status.name() + ".");
        return saved;
    }

    public UserAccount resetPassword(String userId, String newPassword) {
        requireAdmin();
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters.");
        }
        UserAccount userAccount = findUser(userId);
        UserAccount saved = requireRepository().save(
                userAccount.withPasswordHash(passwordHashService.hash(newPassword), timeProvider.now()));
        recordAudit("RESET_USER_PASSWORD", saved.id(), "SUCCEEDED", "Admin reset user password.");
        return saved;
    }

    public UserAccount updateAdmin(String userId, boolean isAdmin) {
        requireAdmin();
        UserAccount userAccount = findUser(userId);
        UserAccount saved = requireRepository().save(userAccount.withAdmin(isAdmin, timeProvider.now()));
        recordAudit("UPDATE_USER_ADMIN", saved.id(), "SUCCEEDED", isAdmin ? "Admin granted admin role." : "Admin removed admin role.");
        return saved;
    }

    private UserAccount findUser(String userId) {
        return requireRepository().findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found: " + userId));
    }

    private void validate(String username, String email, String password) {
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

    private void requireAdmin() {
        if (!authSessionService.current().isAdmin()) {
            throw new AccessDeniedException("Admin permission is required.");
        }
    }

    private UserAccountRepository requireRepository() {
        if (userAccountRepository == null) {
            throw new IllegalStateException("Real auth mode requires JDBC user repository.");
        }
        return userAccountRepository;
    }

    private void recordAudit(String actionType, String targetId, String status, String summary) {
        actionAuditService.record(
                new ConversationId(AuthSessionService.AUTH_SYSTEM_CONVERSATION_ID),
                actionType,
                "USER",
                targetId,
                status,
                summary);
    }
}
