package com.agenthub.domain.conversation;

import com.agenthub.domain.agent.AgentId;
import java.time.Instant;
import java.util.List;

public class Conversation {

    private final ConversationId id;
    private final String title;
    private final ConversationType type;
    private final List<AgentId> participantAgentIds;
    private final boolean pinned;
    private final boolean archived;
    private final int unreadCount;
    private final Instant lastReadAt;
    private final Instant lastMessageAt;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Conversation(
            ConversationId id,
            String title,
            ConversationType type,
            List<AgentId> participantAgentIds,
            Instant createdAt,
            Instant updatedAt) {
        this(id, title, type, participantAgentIds, false, false, 0, null, updatedAt, createdAt, updatedAt);
    }

    public Conversation(
            ConversationId id,
            String title,
            ConversationType type,
            List<AgentId> participantAgentIds,
            boolean pinned,
            boolean archived,
            int unreadCount,
            Instant lastReadAt,
            Instant lastMessageAt,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.participantAgentIds = List.copyOf(participantAgentIds);
        this.pinned = pinned;
        this.archived = archived;
        this.unreadCount = Math.max(0, unreadCount);
        this.lastReadAt = lastReadAt;
        this.lastMessageAt = lastMessageAt;
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

    public boolean isPinned() {
        return pinned;
    }

    public boolean isArchived() {
        return archived;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public Instant getLastReadAt() {
        return lastReadAt;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Conversation withParticipantAgentIds(List<AgentId> nextParticipantAgentIds, Instant now) {
        return copy(nextParticipantAgentIds, pinned, archived, unreadCount, lastReadAt, lastMessageAt, now);
    }

    public Conversation withPinned(boolean nextPinned, Instant now) {
        return copy(participantAgentIds, nextPinned, archived, unreadCount, lastReadAt, lastMessageAt, now);
    }

    public Conversation withArchived(boolean nextArchived, Instant now) {
        return copy(participantAgentIds, pinned, nextArchived, unreadCount, lastReadAt, lastMessageAt, now);
    }

    public Conversation markRead(Instant now) {
        return copy(participantAgentIds, pinned, archived, 0, now, lastMessageAt, now);
    }

    public Conversation touchMessageActivity(Instant messageAt, boolean incrementUnread) {
        int nextUnreadCount = incrementUnread ? unreadCount + 1 : unreadCount;
        return copy(participantAgentIds, pinned, archived, nextUnreadCount, lastReadAt, messageAt, messageAt);
    }

    private Conversation copy(
            List<AgentId> nextParticipantAgentIds,
            boolean nextPinned,
            boolean nextArchived,
            int nextUnreadCount,
            Instant nextLastReadAt,
            Instant nextLastMessageAt,
            Instant nextUpdatedAt) {
        return new Conversation(
                id,
                title,
                type,
                nextParticipantAgentIds,
                nextPinned,
                nextArchived,
                nextUnreadCount,
                nextLastReadAt,
                nextLastMessageAt,
                createdAt,
                nextUpdatedAt);
    }
}
