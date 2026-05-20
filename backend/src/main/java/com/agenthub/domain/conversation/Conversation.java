package com.agenthub.domain.conversation;

import com.agenthub.domain.agent.AgentId;
import java.time.Instant;
import java.util.List;

public class Conversation {

    private final ConversationId id;
    private final String title;
    private final ConversationType type;
    private final List<AgentId> participantAgentIds;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Conversation(
            ConversationId id,
            String title,
            ConversationType type,
            List<AgentId> participantAgentIds,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.participantAgentIds = List.copyOf(participantAgentIds);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public ConversationId getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public ConversationType getType() {
        return type;
    }

    public List<AgentId> getParticipantAgentIds() {
        return participantAgentIds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
