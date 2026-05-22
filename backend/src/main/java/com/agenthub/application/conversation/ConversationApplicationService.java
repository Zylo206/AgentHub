package com.agenthub.application.conversation;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.domain.conversation.Conversation;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.conversation.ConversationRepository;
import com.agenthub.domain.conversation.ConversationType;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ConversationApplicationService {

    private final ConversationRepository conversationRepository;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public ConversationApplicationService(
            ConversationRepository conversationRepository,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.conversationRepository = conversationRepository;
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
                now,
                now);
        return conversationRepository.save(conversation);
    }

    public List<Conversation> listConversations() {
        return conversationRepository.findAll();
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

        Conversation updatedConversation = new Conversation(
                conversation.getId(),
                conversation.getTitle(),
                conversation.getType(),
                participantIds.stream().map(AgentId::new).toList(),
                conversation.getCreatedAt(),
                timeProvider.now());
        return conversationRepository.save(updatedConversation);
    }
}
