package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.common.IdGenerator;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactSourceKind;
import com.agenthub.domain.artifact.ArtifactStatus;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskStep;
import com.agenthub.domain.task.TaskStepId;
import com.agenthub.domain.task.TaskStepStatus;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AgentStepExecutor {

    private final AgentExecutorService agentExecutorService;
    private final IdGenerator idGenerator;
    private final ArtifactRepository artifactRepository;
    private final AdapterArtifactExtractor adapterArtifactExtractor;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final String artifactGenerationMode;

    public AgentStepExecutor(
            AgentExecutorService agentExecutorService,
            IdGenerator idGenerator,
            ArtifactRepository artifactRepository,
            AdapterArtifactExtractor adapterArtifactExtractor,
            RealtimeEventPublisher realtimeEventPublisher,
            @Value("${agenthub.orchestrator.artifact-generation-mode:HYBRID_REAL}") String artifactGenerationMode) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
        this.artifactRepository = artifactRepository;
        this.adapterArtifactExtractor = adapterArtifactExtractor;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.artifactGenerationMode = normalizeArtifactGenerationMode(artifactGenerationMode);
    }

    public TaskStep execute(StepExecutionCommand command) {
        TaskStepId stepId = new TaskStepId(idGenerator.nextId("step"));
        AgentResponse adapterResponse = agentExecutorService.execute(
                command.preferredAdapterType(),
                new AgentRequest(
                        idGenerator.nextId("adapter_req"),
                        command.conversationId(),
                        command.taskRunId().value(),
                        stepId.value(),
                        command.agentId(),
                        command.agentName(),
                        command.userInput(),
                        command.systemPrompt(),
                        command.taskDescription(),
                        command.contextItems(),
                        command.artifactSummaries(),
                        Map.of(
                                "stepOrder", command.stepOrder(),
                                "requiredSkill", command.requiredSkill(),
                                "parallelGroupKey", command.parallelGroupKey(),
                                "dependsOnStepOrders", command.dependsOnStepOrders(),
                                "artifactGenerationMode", artifactGenerationMode,
                                "demoMode", true)));

        String adapterSummary = summarizeAdapterResponse(adapterResponse.content());
        List<ArtifactId> producedArtifactIds = appendAdapterOutputArtifactIfReal(command, stepId, adapterResponse);
        int realAdapterArtifactCount = producedArtifactIds.size() - command.producedArtifactIds().size();
        String outputContent = command.baseOutputContent()
                + "\n\nParallel scheduling: parallelGroupKey="
                + command.parallelGroupKey()
                + ", dependsOnStepOrders="
                + command.dependsOnStepOrders()
                + ", routingReason="
                + command.routingReason()
                + "\n\nAdapter execution:\n"
                + (adapterSummary == null ? "No adapter response summary recorded." : adapterSummary)
                + "\n\nReal Adapter Artifact Info:\n"
                + (realAdapterArtifactCount > 0
                        ? "Generated " + realAdapterArtifactCount + " artifact(s) from non-MOCK adapter output."
                        : "No real adapter artifact generated.")
                + " generationMode="
                + artifactGenerationMode;

        return new TaskStep(
                stepId,
                command.taskRunId(),
                command.stepOrder(),
                new AgentId(command.agentId()),
                command.taskDescription(),
                TaskStepStatus.COMPLETED,
                command.inputContext(),
                outputContent,
                command.preferredAdapterType().name(),
                adapterResponse.actualAdapterType() == null ? null : adapterResponse.actualAdapterType().name(),
                adapterResponse.status().name(),
                adapterSummary,
                adapterResponse.errorMessage(),
                command.parallelGroupKey(),
                command.dependsOnStepOrders(),
                command.routingReason(),
                producedArtifactIds,
                command.now(),
                command.now());
    }

    private String summarizeAdapterResponse(String responseContent) {
        if (responseContent == null || responseContent.isBlank()) {
            return null;
        }

        String normalized = responseContent.replace("\r", " ").replace("\n", " ").trim();
        if (normalized.length() <= 220) {
            return normalized;
        }

        return normalized.substring(0, 217) + "...";
    }

    private List<ArtifactId> appendAdapterOutputArtifactIfReal(
            StepExecutionCommand command,
            TaskStepId stepId,
            AgentResponse adapterResponse) {
        List<ArtifactId> producedArtifactIds = new ArrayList<>(command.producedArtifactIds());
        if (!shouldPersistAdapterOutput(adapterResponse) || "STATIC_TEMPLATE".equals(artifactGenerationMode)) {
            return List.copyOf(producedArtifactIds);
        }

        List<ArtifactId> adapterArtifactIds = new ArrayList<>();
        AdapterArtifactExtractor.ExtractionResult extractionResult = adapterArtifactExtractor.extract(
                adapterResponse.content(),
                new AdapterArtifactExtractor.ExtractionContext(
                        command.stepOrder(),
                        command.agentName(),
                        command.requiredSkill(),
                        command.taskDescription()));
        for (AdapterArtifactExtractor.AdapterArtifactSpec spec : extractionResult.artifacts()) {
            Artifact adapterOutputArtifact = new Artifact(
                    new ArtifactId(idGenerator.nextId("artifact")),
                    new ConversationId(command.conversationId()),
                    command.taskRunId(),
                    null,
                    buildAdapterRevisionInstruction(adapterResponse, extractionResult),
                    spec.title(),
                    spec.type(),
                    ArtifactStatus.CREATED,
                    spec.language(),
                    buildAdapterOutputArtifactContent(command, stepId, adapterResponse, spec, extractionResult),
                    1,
                    ArtifactSourceKind.REAL_ADAPTER,
                    adapterResponse.actualAdapterType() == null ? null : adapterResponse.actualAdapterType().name(),
                    stepId.value(),
                    artifactGenerationMode,
                    command.now(),
                    command.now());
            artifactRepository.save(adapterOutputArtifact);
            publishArtifactEvent(adapterOutputArtifact, RealtimeEventType.ARTIFACT_CREATED);
            adapterArtifactIds.add(adapterOutputArtifact.getId());
        }
        if ("REAL_FIRST".equals(artifactGenerationMode) && !adapterArtifactIds.isEmpty()) {
            archiveStaticFallbackArtifacts(command.producedArtifactIds(), command.now());
            List<ArtifactId> realFirstArtifactIds = new ArrayList<>(adapterArtifactIds);
            realFirstArtifactIds.addAll(producedArtifactIds);
            return List.copyOf(realFirstArtifactIds);
        }
        producedArtifactIds.addAll(adapterArtifactIds);
        return List.copyOf(producedArtifactIds);
    }

    private void archiveStaticFallbackArtifacts(List<ArtifactId> fallbackArtifactIds, Instant now) {
        for (ArtifactId fallbackArtifactId : fallbackArtifactIds) {
            artifactRepository.findById(fallbackArtifactId).ifPresent(artifact -> {
                Artifact archivedArtifact = new Artifact(
                        artifact.getId(),
                        artifact.getConversationId(),
                        artifact.getTaskRunId(),
                        artifact.getParentArtifactId(),
                        artifact.getRevisionInstruction(),
                        archivedFallbackTitle(artifact.getType()),
                        artifact.getType(),
                        ArtifactStatus.ARCHIVED,
                        artifact.getLanguage(),
                        artifact.getContent(),
                        artifact.getVersion(),
                        ArtifactSourceKind.STATIC_TEMPLATE,
                        artifact.getSourceAdapterType(),
                        artifact.getSourceTaskStepId(),
                        "REAL_FIRST_STATIC_FALLBACK",
                        artifact.getCreatedAt(),
                        now);
                artifactRepository.save(archivedArtifact);
                publishArtifactEvent(archivedArtifact, RealtimeEventType.ARTIFACT_UPDATED);
            });
        }
    }

    private void publishArtifactEvent(Artifact artifact, RealtimeEventType eventType) {
        realtimeEventPublisher.publish(
                artifact.getConversationId(),
                eventType,
                "ARTIFACT",
                artifact.getId().value(),
                Map.of(
                        "title", artifact.getTitle(),
                        "type", artifact.getType().name(),
                        "version", artifact.getVersion()));
    }

    private String archivedFallbackTitle(ArtifactType artifactType) {
        return switch (artifactType) {
            case CODE -> "Archived static fallback - code";
            case MARKDOWN -> "Archived static fallback - markdown";
            case FILE -> "Archived static fallback - file";
            case API_CONTRACT -> "Archived static fallback - api contract";
            case REVIEW_REPORT -> "Archived static fallback - review report";
            case DATA_MODEL -> "Archived static fallback - data model";
            case WEB_PREVIEW -> "Archived static fallback - web preview";
        };
    }

    private boolean shouldPersistAdapterOutput(AgentResponse adapterResponse) {
        return adapterResponse != null
                && adapterResponse.status() == AgentExecutionStatus.COMPLETED
                && !adapterResponse.fallbackUsed()
                && adapterResponse.actualAdapterType() != null
                && adapterResponse.actualAdapterType() != AgentAdapterType.MOCK
                && adapterResponse.content() != null
                && !adapterResponse.content().isBlank();
    }

    private String buildAdapterOutputArtifactContent(
            StepExecutionCommand command,
            TaskStepId stepId,
            AgentResponse adapterResponse,
            AdapterArtifactExtractor.AdapterArtifactSpec spec,
            AdapterArtifactExtractor.ExtractionResult extractionResult) {
        return """
                # Real Adapter Output

                - Agent: %s
                - TaskStep: %s
                - Preferred Adapter: %s
                - Actual Adapter: %s
                - Status: %s
                - Source Kind: REAL_ADAPTER
                - Generation Mode: %s
                - Persisted Because: actual adapter completed without MOCK fallback
                - Artifact Summary: %s
                - Extraction Fallback: %s

                ## Response

                %s
                """.formatted(
                command.agentName(),
                stepId.value(),
                adapterResponse.preferredAdapterType(),
                adapterResponse.actualAdapterType(),
                adapterResponse.status(),
                artifactGenerationMode,
                spec.summary() == null || spec.summary().isBlank() ? "N/A" : spec.summary(),
                extractionResult.fallbackReason() == null || extractionResult.fallbackReason().isBlank()
                        ? "none"
                        : extractionResult.fallbackReason(),
                spec.content());
    }

    private String buildAdapterRevisionInstruction(
            AgentResponse adapterResponse,
            AdapterArtifactExtractor.ExtractionResult extractionResult) {
        String assistantMessage = extractionResult.assistantMessage();
        if (assistantMessage != null && !assistantMessage.isBlank()) {
            return assistantMessage;
        }
        return "Persisted from " + adapterResponse.actualAdapterType() + " adapter output";
    }

    private String normalizeArtifactGenerationMode(String configuredMode) {
        if (configuredMode == null || configuredMode.isBlank()) {
            return "HYBRID_REAL";
        }
        String normalized = configuredMode.trim().toUpperCase();
        return switch (normalized) {
            case "STATIC_TEMPLATE", "HYBRID_REAL", "REAL_FIRST" -> normalized;
            default -> "HYBRID_REAL";
        };
    }

    public record StepExecutionCommand(
            String conversationId,
            TaskRunId taskRunId,
            int stepOrder,
            String agentId,
            String agentName,
            String userInput,
            String systemPrompt,
            String taskDescription,
            String requiredSkill,
            String inputContext,
            String baseOutputContent,
            List<String> contextItems,
            List<String> artifactSummaries,
            List<ArtifactId> producedArtifactIds,
            AgentAdapterType preferredAdapterType,
            String parallelGroupKey,
            List<Integer> dependsOnStepOrders,
            String routingReason,
            Instant now) {

        public StepExecutionCommand(
                String conversationId,
                TaskRunId taskRunId,
                int stepOrder,
                String agentId,
                String agentName,
                String userInput,
                String systemPrompt,
                String taskDescription,
                String requiredSkill,
                String inputContext,
                String baseOutputContent,
                List<String> contextItems,
                List<String> artifactSummaries,
                List<ArtifactId> producedArtifactIds,
                AgentAdapterType preferredAdapterType,
                Instant now) {
            this(
                    conversationId,
                    taskRunId,
                    stepOrder,
                    agentId,
                    agentName,
                    userInput,
                    systemPrompt,
                    taskDescription,
                    requiredSkill,
                    inputContext,
                    baseOutputContent,
                    contextItems,
                    artifactSummaries,
                    producedArtifactIds,
                    preferredAdapterType,
                    "GROUP_" + stepOrder,
                    List.of(),
                    "Rule-based routing",
                    now);
        }

        public StepExecutionCommand {
            contextItems = List.copyOf(contextItems);
            artifactSummaries = List.copyOf(artifactSummaries);
            producedArtifactIds = List.copyOf(producedArtifactIds);
            dependsOnStepOrders = dependsOnStepOrders == null ? List.of() : List.copyOf(dependsOnStepOrders);
        }
    }
}
