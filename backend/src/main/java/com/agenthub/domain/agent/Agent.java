package com.agenthub.domain.agent;

import java.time.Instant;
import java.util.List;

public class Agent {

    private final AgentId id;
    private final String name;
    private final String avatarUrl;
    private final AgentRole role;
    private final String description;
    private final String systemPrompt;
    private final String preferredAdapterType;
    private final List<String> capabilityTags;
    private final List<String> toolTags;
    private final AgentStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Agent(
            AgentId id,
            String name,
            String avatarUrl,
            AgentRole role,
            String description,
            String systemPrompt,
            String preferredAdapterType,
            List<String> capabilityTags,
            List<String> toolTags,
            AgentStatus status,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.role = role;
        this.description = description;
        this.systemPrompt = systemPrompt;
        this.preferredAdapterType = preferredAdapterType;
        this.capabilityTags = List.copyOf(capabilityTags);
        this.toolTags = List.copyOf(toolTags);
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public AgentId getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public AgentRole getRole() {
        return role;
    }

    public String getDescription() {
        return description;
    }

    public String getSystemPrompt() {
        return systemPrompt;
    }

    public String getPreferredAdapterType() {
        return preferredAdapterType;
    }

    public List<String> getCapabilityTags() {
        return capabilityTags;
    }

    public List<String> getToolTags() {
        return toolTags;
    }

    public AgentStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
