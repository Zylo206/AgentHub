package com.agenthub.application.auth;

import java.util.List;

public record AuthPrincipal(
        String userId,
        String username,
        String email,
        String displayName,
        String role,
        String status,
        List<String> orgTags) {

    public AuthPrincipal(String userId, String displayName, String role, List<String> orgTags) {
        this(userId, null, null, displayName, role, "ACTIVE", orgTags);
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(role);
    }

    public boolean belongsToOrg(String orgTag) {
        if (orgTag == null || orgTag.isBlank()) {
            return false;
        }
        return orgTags.stream().anyMatch(value -> value.equalsIgnoreCase(orgTag));
    }

    public String primaryOrgTag() {
        return orgTags.isEmpty() ? "DEFAULT" : orgTags.get(0);
    }
}
