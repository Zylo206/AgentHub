package com.agenthub.application.auth;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountRepository;
import com.agenthub.domain.user.UserAccountStatus;
import java.time.Instant;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "agenthub.auth.mode", havingValue = "real")
public class AuthBootstrapService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordHashService passwordHashService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;
    private final String adminUsername;
    private final String adminEmail;
    private final String adminPassword;
    private final String demoUsername;
    private final String demoEmail;
    private final String demoPassword;

    public AuthBootstrapService(
            ObjectProvider<UserAccountRepository> userAccountRepositoryProvider,
            PasswordHashService passwordHashService,
            IdGenerator idGenerator,
            TimeProvider timeProvider,
            @Value("${agenthub.auth.bootstrap.admin-username:admin}") String adminUsername,
            @Value("${agenthub.auth.bootstrap.admin-email:admin@agenthub.local}") String adminEmail,
            @Value("${agenthub.auth.bootstrap.admin-password:Admin123!}") String adminPassword,
            @Value("${agenthub.auth.bootstrap.demo-username:demo}") String demoUsername,
            @Value("${agenthub.auth.bootstrap.demo-email:demo@agenthub.local}") String demoEmail,
            @Value("${agenthub.auth.bootstrap.demo-password:demo}") String demoPassword) {
        this.userAccountRepository = userAccountRepositoryProvider.getIfAvailable();
        this.passwordHashService = passwordHashService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
        this.adminUsername = adminUsername;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.demoUsername = demoUsername;
        this.demoEmail = demoEmail;
        this.demoPassword = demoPassword;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureBootstrapUsers() {
        if (userAccountRepository == null) {
            throw new IllegalStateException("Real auth mode requires JDBC user account repository.");
        }
        ensureUser(adminUsername, adminEmail, adminPassword, true, "Administrator");
        ensureUser(demoUsername, demoEmail, demoPassword, false, "Demo User");
    }

    private void ensureUser(
            String username,
            String email,
            String password,
            boolean isAdmin,
            String defaultDisplayName) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return;
        }
        String normalizedUsername = username.trim().toLowerCase(java.util.Locale.ROOT);
        if (userAccountRepository.findByUsername(normalizedUsername).isPresent()) {
            return;
        }
        Instant now = timeProvider.now();
        userAccountRepository.save(new UserAccount(
                idGenerator.nextId("user"),
                normalizedUsername,
                email == null || email.isBlank() ? normalizedUsername + "@agenthub.local" : email.trim().toLowerCase(java.util.Locale.ROOT),
                defaultDisplayName,
                passwordHashService.hash(password),
                UserAccountStatus.ACTIVE,
                isAdmin,
                Conversation.DEFAULT_ORG_TAG,
                now,
                now,
                null));
    }
}
