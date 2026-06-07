package com.agenthub.application.auth;

import java.util.List;

public record AuthPrincipal(
        String userId,
        String displayName,
        String role,
        List<String> orgTags) {

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
