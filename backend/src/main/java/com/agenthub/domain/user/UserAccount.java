package com.agenthub.domain.user;

import java.time.Instant;

public record UserAccount(
        String id,
        String username,
        String email,
        String displayName,
        String passwordHash,
        UserAccountStatus status,
        boolean isAdmin,
        String primaryOrgTag,
        Instant createdAt,
        Instant updatedAt,
        Instant lastLoginAt) {

    public UserAccount withPasswordHash(String nextPasswordHash, Instant now) {
        return new UserAccount(
                id,
                username,
                email,
                displayName,
                nextPasswordHash,
                status,
                isAdmin,
                primaryOrgTag,
                createdAt,
                now,
                lastLoginAt);
    }

    public UserAccount withStatus(UserAccountStatus nextStatus, Instant now) {
        return new UserAccount(
                id,
                username,
                email,
                displayName,
                passwordHash,
                nextStatus,
                isAdmin,
                primaryOrgTag,
                createdAt,
                now,
                lastLoginAt);
    }

    public UserAccount withAdmin(boolean nextIsAdmin, Instant now) {
        return new UserAccount(
                id,
                username,
                email,
                displayName,
                passwordHash,
                status,
                nextIsAdmin,
                primaryOrgTag,
                createdAt,
                now,
                lastLoginAt);
    }

    public UserAccount withLastLoginAt(Instant now) {
        return new UserAccount(
                id,
                username,
                email,
                displayName,
                passwordHash,
                status,
                isAdmin,
                primaryOrgTag,
                createdAt,
                now,
                now);
    }
}
