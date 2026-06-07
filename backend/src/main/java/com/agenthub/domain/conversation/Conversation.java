package com.agenthub.domain.conversation;

import com.agenthub.domain.agent.AgentId;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public class Conversation {

    public static final String DEFAULT_OWNER_USER_ID = "demo-user";
    public static final String DEFAULT_ORG_TAG = "DEFAULT";

    private final ConversationId id;
    private final String title;
    private final ConversationType type;
    private final List<AgentId> participantAgentIds;
    private final String ownerUserId;
    private final String orgTag;
    private final ConversationVisibility visibility;
    private final Map<String, String> memberRoles;
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
        this(
                id,
                title,
                type,
                participantAgentIds,
                DEFAULT_OWNER_USER_ID,
                DEFAULT_ORG_TAG,
                ConversationVisibility.PRIVATE,
                Map.of(DEFAULT_OWNER_USER_ID, "OWNER"),
                pinned,
                archived,
                unreadCount,
                lastReadAt,
                lastMessageAt,
                createdAt,
                updatedAt);
    }

    public Conversation(
            ConversationId id,
            String title,
            ConversationType type,
            List<AgentId> participantAgentIds,
            String ownerUserId,
            String orgTag,
            ConversationVisibility visibility,
            Map<String, String> memberRoles,
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
        this.ownerUserId = ownerUserId == null || ownerUserId.isBlank() ? DEFAULT_OWNER_USER_ID : ownerUserId;
        this.orgTag = orgTag == null || orgTag.isBlank() ? DEFAULT_ORG_TAG : orgTag;
        this.visibility = visibility == null ? ConversationVisibility.PRIVATE : visibility;
        Map<String, String> normalizedRoles = memberRoles == null ? Map.of() : Map.copyOf(memberRoles);
        this.memberRoles = normalizedRoles.containsKey(this.ownerUserId)
                ? normalizedRoles
                : mergeOwnerRole(normalizedRoles, this.ownerUserId);
        this.pinned = pinned;
        this.archived = archived;
        this.unreadCount = Math.max(0, unreadCount);
        this.lastReadAt = lastReadAt;
        this.lastMessageAt = lastMessageAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    private static Map<String, String> mergeOwnerRole(Map<String, String> memberRoles, String ownerUserId) {
        java.util.LinkedHashMap<String, String> merged = new java.util.LinkedHashMap<>(memberRoles);
        merged.put(ownerUserId, "OWNER");
        return Map.copyOf(merged);
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

    public String getOwnerUserId() {
        return ownerUserId;
    }

    public String getOrgTag() {
        return orgTag;
    }

    public ConversationVisibility getVisibility() {
        return visibility;
    }

    public Map<String, String> getMemberRoles() {
        return memberRoles;
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

    public Conversation withVisibility(ConversationVisibility nextVisibility, String nextOrgTag, Instant now) {
        return new Conversation(
                id,
                title,
                type,
                participantAgentIds,
                ownerUserId,
                nextOrgTag == null || nextOrgTag.isBlank() ? orgTag : nextOrgTag,
                nextVisibility == null ? visibility : nextVisibility,
                memberRoles,
                pinned,
                archived,
                unreadCount,
                lastReadAt,
                lastMessageAt,
                createdAt,
                now);
    }

    public Conversation withMemberRole(String userId, String memberRole, Instant now) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("userId must not be blank.");
        }
        if (memberRole == null || memberRole.isBlank()) {
            throw new IllegalArgumentException("memberRole must not be blank.");
        }
        java.util.LinkedHashMap<String, String> nextRoles = new java.util.LinkedHashMap<>(memberRoles);
        nextRoles.put(userId.trim(), memberRole.trim().toUpperCase(java.util.Locale.ROOT));
        return new Conversation(
                id,
                title,
                type,
                participantAgentIds,
                ownerUserId,
                orgTag,
                visibility,
                nextRoles,
                pinned,
                archived,
                unreadCount,
                lastReadAt,
                lastMessageAt,
                createdAt,
                now);
    }

    public Conversation withoutMember(String userId, Instant now) {
        if (userId == null || userId.isBlank() || ownerUserId.equals(userId.trim())) {
            return this;
        }
        java.util.LinkedHashMap<String, String> nextRoles = new java.util.LinkedHashMap<>(memberRoles);
        nextRoles.remove(userId.trim());
        return new Conversation(
                id,
                title,
                type,
                participantAgentIds,
                ownerUserId,
                orgTag,
                visibility,
                nextRoles,
                pinned,
                archived,
                unreadCount,
                lastReadAt,
                lastMessageAt,
                createdAt,
                now);
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
                ownerUserId,
                orgTag,
                visibility,
                memberRoles,
                nextPinned,
                nextArchived,
                nextUnreadCount,
                nextLastReadAt,
                nextLastMessageAt,
                createdAt,
                nextUpdatedAt);
    }
}
