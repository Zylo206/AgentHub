package com.agenthub.application.message;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.orchestrator.AdapterArtifactExtractor;
import com.agenthub.application.orchestrator.AgentRoutingService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactSourceKind;
import com.agenthub.domain.artifact.ArtifactStatus;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageSenderType;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DirectAgentReplyService {

    private final MessageApplicationService messageApplicationService;
    private final AgentApplicationService agentApplicationService;
    private final AgentRoutingService agentRoutingService;
    private final AgentExecutorService agentExecutorService;
    private final AdapterArtifactExtractor adapterArtifactExtractor;
    private final ArtifactRepository artifactRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final ConversationAccessService conversationAccessService;
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public DirectAgentReplyService(
            MessageApplicationService messageApplicationService,
            AgentApplicationService agentApplicationService,
            AgentRoutingService agentRoutingService,
            AgentExecutorService agentExecutorService,
            AdapterArtifactExtractor adapterArtifactExtractor,
            ArtifactRepository artifactRepository,
            RealtimeEventPublisher realtimeEventPublisher,
            ConversationAccessService conversationAccessService,
            IdGenerator idGenerator,
            TimeProvider timeProvider) {
        this.messageApplicationService = messageApplicationService;
        this.agentApplicationService = agentApplicationService;
        this.agentRoutingService = agentRoutingService;
        this.agentExecutorService = agentExecutorService;
        this.adapterArtifactExtractor = adapterArtifactExtractor;
        this.artifactRepository = artifactRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.conversationAccessService = conversationAccessService;
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public DirectAgentReplyResult reply(String conversationId, String messageId) {
        conversationAccessService.requireWritable(conversationId);
        Message sourceMessage = messageApplicationService.getMessage(messageId);
        if (!sourceMessage.getConversationId().equals(new ConversationId(conversationId))) {
            throw new IllegalArgumentException("Message does not belong to conversation: " + messageId);
        }
        if (sourceMessage.getSenderType() != MessageSenderType.USER) {
            throw new IllegalArgumentException("Only user messages can trigger direct agent replies.");
        }

        String agentId = resolveTargetAgentId(sourceMessage);
        Agent agent = agentApplicationService.getAgent(agentId);
        AgentAdapterType preferredAdapterType = agentRoutingService.resolvePreferredAdapterForAgent(agent);
        AgentResponse response = agentExecutorService.execute(preferredAdapterType, buildRequest(conversationId, sourceMessage, agent));
        if (response.status() != AgentExecutionStatus.COMPLETED
                || response.actualAdapterType() == null
                || response.fallbackUsed()) {
            String failure = response.errorMessage() == null || response.errorMessage().isBlank()
                    ? "Direct IM agent reply did not complete successfully."
                    : response.errorMessage();
            throw new IllegalStateException(failure);
        }

        AdapterArtifactExtractor.ExtractionResult extractionResult = adapterArtifactExtractor.extract(
                response.content(),
                new AdapterArtifactExtractor.ExtractionContext(
                        0,
                        agent.getName(),
                        "DIRECT_IM",
                        "Direct IM remote Q&A reply"));
        List<ArtifactId> artifactIds = persistArtifacts(conversationId, response, extractionResult);
        String replyContent = extractionResult.assistantMessage();
        if (replyContent == null || replyContent.isBlank()) {
            replyContent = response.content();
        }
        Message replyMessage = messageApplicationService.appendAgentMessage(
                conversationId,
                agent.getId().value(),
                replyContent,
                artifactIds);
        return new DirectAgentReplyResult(
                replyMessage,
                response.actualAdapterType().name(),
                response.preferredAdapterType() == null ? preferredAdapterType.name() : response.preferredAdapterType().name(),
                response.fallbackUsed(),
                artifactIds.stream().map(ArtifactId::value).toList(),
                extractionResult.assistantMessage() != null && !extractionResult.assistantMessage().isBlank());
    }

    private AgentRequest buildRequest(String conversationId, Message sourceMessage, Agent agent) {
        return new AgentRequest(
                idGenerator.nextId("adapter_req"),
                conversationId,
                null,
                null,
                agent.getId().value(),
                agent.getName(),
                sourceMessage.getContent(),
                agent.getSystemPrompt(),
                "Direct IM remote Q&A reply",
                buildContextItems(conversationId, sourceMessage),
                List.of(),
                buildMetadata(sourceMessage));
    }

    private List<String> buildContextItems(String conversationId, Message sourceMessage) {
        List<Message> conversationMessages = messageApplicationService.listMessages(conversationId);
        List<String> context = conversationMessages.stream()
                .filter(message -> !message.getId().equals(sourceMessage.getId()))
                .skip(Math.max(0, conversationMessages.size() - 6))
                .map(message -> message.getSenderType().name() + ": " + message.getContent())
                .toList();
        if (sourceMessage.getQuotedMessageContent() != null && !sourceMessage.getQuotedMessageContent().isBlank()) {
            List<String> withQuote = new ArrayList<>(context);
            withQuote.add("QUOTED: " + sourceMessage.getQuotedMessageContent());
            return List.copyOf(withQuote);
        }
        return context;
    }

    private Map<String, Object> buildMetadata(Message sourceMessage) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("mode", "DIRECT_IM_REMOTE_QA");
        metadata.put("sourceMessageId", sourceMessage.getId().value());
        metadata.put("targetAgentId", sourceMessage.getTargetAgentId());
        metadata.put("mentionedAgentIds", sourceMessage.getMentionedAgentIds());
        if (sourceMessage.getReplyToMessageId() != null) {
            metadata.put("replyToMessageId", sourceMessage.getReplyToMessageId());
        }
        if (sourceMessage.getQuotedMessageId() != null) {
            metadata.put("quotedMessageId", sourceMessage.getQuotedMessageId());
        }
        return Map.copyOf(metadata);
    }

    private List<ArtifactId> persistArtifacts(
            String conversationId,
            AgentResponse response,
            AdapterArtifactExtractor.ExtractionResult extractionResult) {
        List<ArtifactId> artifactIds = new ArrayList<>();
        for (AdapterArtifactExtractor.AdapterArtifactSpec spec : extractionResult.artifacts()) {
            ArtifactId artifactId = new ArtifactId(idGenerator.nextId("artifact"));
            Artifact artifact = new Artifact(
                    artifactId,
                    new ConversationId(conversationId),
                    null,
                    null,
                    extractionResult.assistantMessage(),
                    spec.title(),
                    spec.type(),
                    ArtifactStatus.CREATED,
                    spec.language(),
                    spec.content(),
                    1,
                    ArtifactSourceKind.REAL_ADAPTER,
                    response.actualAdapterType().name(),
                    null,
                    "DIRECT_IM_REMOTE_QA",
                    "ACCEPTED",
                    spec.summary(),
                    timeProvider.now(),
                    timeProvider.now());
            artifactRepository.save(artifact);
            artifactIds.add(artifactId);
            realtimeEventPublisher.publish(
                    artifact.getConversationId(),
                    RealtimeEventType.ARTIFACT_CREATED,
                    "ARTIFACT",
                    artifactId.value(),
                    Map.of(
                            "title", artifact.getTitle(),
                            "type", artifact.getType().name(),
                            "version", artifact.getVersion()));
        }
        return List.copyOf(artifactIds);
    }

    private String resolveTargetAgentId(Message sourceMessage) {
        if (sourceMessage.getTargetAgentId() != null && !sourceMessage.getTargetAgentId().isBlank()) {
            return sourceMessage.getTargetAgentId();
        }
        if (sourceMessage.getMentionedAgentIds().size() == 1) {
            return sourceMessage.getMentionedAgentIds().get(0);
        }
        throw new IllegalArgumentException("Direct IM agent reply requires exactly one target agent.");
    }

    public record DirectAgentReplyResult(
            Message message,
            String actualAdapterType,
            String preferredAdapterType,
            boolean fallbackUsed,
            List<String> producedArtifactIds,
            boolean usedAssistantMessage) {
    }
}
