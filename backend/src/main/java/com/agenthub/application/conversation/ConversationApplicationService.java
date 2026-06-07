package com.agenthub.application.conversation;

import com.agenthub.application.auth.AuthPrincipal;
import com.agenthub.application.auth.AuthSessionService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.conversation.ConversationType;
import com.agenthub.domain.conversation.ConversationVisibility;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ConversationApplicationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AuthSessionService authSessionService;
    private final ConversationAccessService conversationAccessService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ConversationApplicationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            AuthSessionService authSessionService,
            ConversationAccessService conversationAccessService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.authSessionService = authSessionService;
        this.conversationAccessService = conversationAccessService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public Conversation createConversation(String title, ConversationType type) {
        Instant now = timeProvider.now();
        AuthPrincipal principal = authSessionService.current();
        List<AgentId> participantAgentIds = new ArrayList<>();
        if (type == ConversationType.GROUP) {
            participantAgentIds.add(new AgentId(BuiltInAgentIds.ORCHESTRATOR));
            participantAgentIds.add(new AgentId(BuiltInAgentIds.FRONTEND_BUILDER));
            participantAgentIds.add(new AgentId(BuiltInAgentIds.BACKEND_WORKER));
            participantAgentIds.add(new AgentId(BuiltInAgentIds.REVIEWER));
        }
        Conversation conversation = new Conversation(
                new ConversationId(idGenerator.nextId("conv")),
                title,
                type,
                participantAgentIds,
                principal.userId(),
                principal.primaryOrgTag(),
                ConversationVisibility.PRIVATE,
                java.util.Map.of(principal.userId(), "OWNER"),
                false,
                false,
                0,
                null,
                now,
                now,
                now);
        return conversationRepository.save(conversation);
    }

    public List<Conversation> listConversations(String query, boolean includeArchived) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        return conversationAccessService.filterReadable(conversationRepository.findAll()).stream()
                .filter(conversation -> includeArchived || !conversation.isArchived())
                .filter(conversation -> matchesQuery(conversation, normalizedQuery))
                .sorted(conversationComparator())
                .toList();
    }

    public Conversation getConversation(String conversationId) {
        return conversationAccessService.requireReadable(conversationId);
    }

    public Conversation addParticipantAgents(String conversationId, List<String> agentIds) {
        Conversation conversation = conversationAccessService.requireWritable(conversationId);
        Set<String> participantIds = new LinkedHashSet<>();
        conversation.getParticipantAgentIds().forEach(agentId -> participantIds.add(agentId.value()));
        if (agentIds != null) {
            agentIds.stream()
                    .filter(agentId -> agentId != null && !agentId.isBlank())
                    .map(String::trim)
                    .forEach(participantIds::add);
        }

        return conversationRepository.save(conversation.withParticipantAgentIds(
                participantIds.stream().map(AgentId::new).toList(),
                timeProvider.now()));
    }

    public Conversation pinConversation(String conversationId) {
        Conversation conversation = conversationAccessService.requireWritable(conversationId);
        return conversationRepository.save(conversation.withPinned(true, timeProvider.now()));
    }

    public Conversation unpinConversation(String conversationId) {
        Conversation conversation = conversationAccessService.requireWritable(conversationId);
        return conversationRepository.save(conversation.withPinned(false, timeProvider.now()));
    }

    public Conversation archiveConversation(String conversationId) {
        Conversation conversation = conversationAccessService.requireWritable(conversationId);
        return conversationRepository.save(conversation.withArchived(true, timeProvider.now()));
    }

    public Conversation unarchiveConversation(String conversationId) {
        Conversation conversation = conversationAccessService.requireWritable(conversationId);
        return conversationRepository.save(conversation.withArchived(false, timeProvider.now()));
    }

    public Conversation markConversationRead(String conversationId) {
        Conversation conversation = conversationAccessService.requireReadable(conversationId);
        return conversationRepository.save(conversation.markRead(timeProvider.now()));
    }

    public Conversation updateConversationVisibility(
            String conversationId,
            ConversationVisibility visibility,
            String orgTag) {
        Conversation conversation = conversationAccessService.requireManage(conversationId);
        return conversationRepository.save(conversation.withVisibility(visibility, orgTag, timeProvider.now()));
    }

    public Conversation upsertConversationMember(
            String conversationId,
            String userId,
            String memberRole) {
        Conversation conversation = conversationAccessService.requireManage(conversationId);
        return conversationRepository.save(conversation.withMemberRole(userId, memberRole, timeProvider.now()));
    }

    public Conversation removeConversationMember(String conversationId, String userId) {
        Conversation conversation = conversationAccessService.requireManage(conversationId);
        return conversationRepository.save(conversation.withoutMember(userId, timeProvider.now()));
    }

    private boolean matchesQuery(Conversation conversation, String normalizedQuery) {
        if (normalizedQuery == null || normalizedQuery.isBlank()) {
            return true;
        }
        return conversation.getTitle().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || conversation.getType().name().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || conversation.getId().value().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                || conversation.getParticipantAgentIds().stream()
                        .map(AgentId::value)
                        .anyMatch(agentId -> agentId.toLowerCase(Locale.ROOT).contains(normalizedQuery))
                || messageRepository.findByConversationId(conversation.getId()).stream()
                        .map(Message::getContent)
                        .filter(content -> content != null && !content.isBlank())
                        .anyMatch(content -> content.toLowerCase(Locale.ROOT).contains(normalizedQuery));
    }

    private Comparator<Conversation> conversationComparator() {
        return Comparator
                .comparing(Conversation::isPinned).reversed()
                .thenComparing((Conversation conversation) -> effectiveActivityAt(conversation), Comparator.reverseOrder())
                .thenComparing(conversation -> conversation.getCreatedAt(), Comparator.reverseOrder());
    }

    private Instant effectiveActivityAt(Conversation conversation) {
        if (conversation.getLastMessageAt() != null) {
            return conversation.getLastMessageAt();
        }
        if (conversation.getUpdatedAt() != null) {
            return conversation.getUpdatedAt();
        }
        return conversation.getCreatedAt();
    }
}
