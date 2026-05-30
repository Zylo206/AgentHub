package com.agenthub.application.conversation;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.conversation.ConversationType;
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
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ConversationApplicationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public Conversation createConversation(String title, ConversationType type) {
        Instant now = timeProvider.now();
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
        return conversationRepository.findAll().stream()
                .filter(conversation -> includeArchived || !conversation.isArchived())
                .filter(conversation -> matchesQuery(conversation, normalizedQuery))
                .sorted(conversationComparator())
                .toList();
    }

    public Conversation getConversation(String conversationId) {
        return conversationRepository.findById(new ConversationId(conversationId))
                .orElseThrow(() -> new NoSuchElementException("Conversation not found: " + conversationId));
    }

    public Conversation addParticipantAgents(String conversationId, List<String> agentIds) {
        Conversation conversation = getConversation(conversationId);
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
        Conversation conversation = getConversation(conversationId);
        return conversationRepository.save(conversation.withPinned(true, timeProvider.now()));
    }

    public Conversation unpinConversation(String conversationId) {
        Conversation conversation = getConversation(conversationId);
        return conversationRepository.save(conversation.withPinned(false, timeProvider.now()));
    }

    public Conversation archiveConversation(String conversationId) {
        Conversation conversation = getConversation(conversationId);
        return conversationRepository.save(conversation.withArchived(true, timeProvider.now()));
    }

    public Conversation unarchiveConversation(String conversationId) {
        Conversation conversation = getConversation(conversationId);
        return conversationRepository.save(conversation.withArchived(false, timeProvider.now()));
    }

    public Conversation markConversationRead(String conversationId) {
        Conversation conversation = getConversation(conversationId);
        return conversationRepository.save(conversation.markRead(timeProvider.now()));
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
