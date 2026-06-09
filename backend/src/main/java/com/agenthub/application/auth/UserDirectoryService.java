package com.agenthub.application.auth;

import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.user.UserAccount;
import com.agenthub.domain.user.UserAccountRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

@Service
public class UserDirectoryService {

    private final UserAccountRepository userAccountRepository;
    private final AuthSessionService authSessionService;

    public UserDirectoryService(
            ObjectProvider<UserAccountRepository> userAccountRepositoryProvider,
            AuthSessionService authSessionService) {
        this.userAccountRepository = userAccountRepositoryProvider.getIfAvailable();
        this.authSessionService = authSessionService;
    }

    public List<UserDirectoryItem> search(String query) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        if (authSessionService.isDemoMode() || userAccountRepository == null) {
            return demoDirectory().stream()
                    .filter(item -> matches(item, normalizedQuery))
                    .toList();
        }
        return userAccountRepository.findAll().stream()
                .map(this::toItem)
                .filter(item -> matches(item, normalizedQuery))
                .sorted(Comparator.comparing(UserDirectoryItem::username))
                .limit(20)
                .toList();
    }

    private boolean matches(UserDirectoryItem item, String normalizedQuery) {
        if (normalizedQuery.isBlank()) {
            return true;
        }
        return item.userId().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || item.username().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || item.displayName().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || item.email().toLowerCase(Locale.ROOT).contains(normalizedQuery);
    }

    private UserDirectoryItem toItem(UserAccount userAccount) {
        return new UserDirectoryItem(
                userAccount.id(),
                userAccount.username(),
                userAccount.email(),
                userAccount.displayName(),
                userAccount.isAdmin() ? "ADMIN" : "USER",
                userAccount.status().name(),
                userAccount.primaryOrgTag());
    }

    private List<UserDirectoryItem> demoDirectory() {
        return List.of(
                new UserDirectoryItem("demo-user", "demo", "demo@agenthub.local", "Demo User", "USER", "ACTIVE", Conversation.DEFAULT_ORG_TAG),
                new UserDirectoryItem("admin-user", "admin", "admin@agenthub.local", "Admin User", "ADMIN", "ACTIVE", Conversation.DEFAULT_ORG_TAG),
                new UserDirectoryItem("reviewer-user", "reviewer", "reviewer@agenthub.local", "Reviewer", "USER", "ACTIVE", Conversation.DEFAULT_ORG_TAG));
    }

    public record UserDirectoryItem(
            String userId,
            String username,
            String email,
            String displayName,
            String role,
            String status,
            String primaryOrgTag) {
    }
}
