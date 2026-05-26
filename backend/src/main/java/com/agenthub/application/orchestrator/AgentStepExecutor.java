package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.application.agent.AdapterQualityMetricsService;
import com.agenthub.application.realtime.RealtimeEventPublisher;
import com.agenthub.application.realtime.RealtimeEventType;
import com.agenthub.application.realtime.RunCancellationRegistry;
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
    private final AdapterArtifactQualityEvaluator adapterArtifactQualityEvaluator;
    private final AdapterQualityMetricsService adapterQualityMetricsService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final RunCancellationRegistry runCancellationRegistry;
    private final String artifactGenerationMode;
    private final long stepDelayMillis;

    public AgentStepExecutor(
            AgentExecutorService agentExecutorService,
            IdGenerator idGenerator,
            ArtifactRepository artifactRepository,
            AdapterArtifactExtractor adapterArtifactExtractor,
            AdapterArtifactQualityEvaluator adapterArtifactQualityEvaluator,
            AdapterQualityMetricsService adapterQualityMetricsService,
            RealtimeEventPublisher realtimeEventPublisher,
            RunCancellationRegistry runCancellationRegistry,
            @Value("${agenthub.orchestrator.artifact-generation-mode:HYBRID_REAL}") String artifactGenerationMode,
            @Value("${agenthub.orchestrator.step-delay-millis:0}") long stepDelayMillis) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
        this.artifactRepository = artifactRepository;
        this.adapterArtifactExtractor = adapterArtifactExtractor;
        this.adapterArtifactQualityEvaluator = adapterArtifactQualityEvaluator;
        this.adapterQualityMetricsService = adapterQualityMetricsService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.runCancellationRegistry = runCancellationRegistry;
        this.artifactGenerationMode = normalizeArtifactGenerationMode(artifactGenerationMode);
        this.stepDelayMillis = Math.max(0, stepDelayMillis);
    }

    public TaskStep execute(StepExecutionCommand command) {
        TaskStepId stepId = new TaskStepId(idGenerator.nextId("step"));
        if (isCancellationRequested(command)) {
            return cancelledStep(command, stepId, "Step skipped before adapter execution because run cancellation was requested.");
        }
        applyOptionalStepDelay(command, stepId);
        if (isCancellationRequested(command)) {
            return cancelledStep(command, stepId, "Step skipped after configured delay because run cancellation was requested.");
        }
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
        if (isCancellationRequested(command)) {
            return cancelledStep(command, stepId, "Step result discarded because run cancellation was requested after adapter execution.");
        }

        String adapterSummary = summarizeAdapterResponse(adapterResponse.content());
        AdapterArtifactAppendResult adapterArtifactResult = appendAdapterOutputArtifactIfReal(command, stepId, adapterResponse);
        recordAdapterQualityObservation(command, adapterResponse, adapterArtifactResult);
        List<ArtifactId> producedArtifactIds = adapterArtifactResult.producedArtifactIds();
        int realAdapterArtifactCount = adapterArtifactResult.adapterArtifactIds().size();
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
                + artifactGenerationMode
                + ", parseStatus="
                + nullSafe(adapterArtifactResult.parseStatus(), "NOT_ATTEMPTED")
                + ", buildValidationStatus="
                + nullSafe(adapterArtifactResult.buildValidationStatus(), "NOT_EVALUATED")
                + ", qualityStatus="
                + nullSafe(adapterArtifactResult.qualityStatus(), "NOT_EVALUATED")
                + ", qualityScore="
                + (adapterArtifactResult.qualityScore() == null ? "N/A" : adapterArtifactResult.qualityScore())
                + ", qualityReason="
                + nullSafe(adapterArtifactResult.qualityReason(), "No quality evaluation recorded.");

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
                realAdapterArtifactCount > 0,
                nullSafe(adapterArtifactResult.parseStatus(), "NOT_ATTEMPTED"),
                nullSafe(adapterArtifactResult.buildValidationStatus(), "NOT_EVALUATED"),
                nullSafe(adapterArtifactResult.qualityStatus(), "NOT_EVALUATED"),
                adapterArtifactResult.qualityScore(),
                nullSafe(adapterArtifactResult.qualityReason(), "No quality evaluation recorded."),
                producedArtifactIds,
                command.now(),
                command.now());
    }

    private void applyOptionalStepDelay(StepExecutionCommand command, TaskStepId stepId) {
        if (stepDelayMillis <= 0) {
            return;
        }
        try {
            Thread.sleep(stepDelayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            runCancellationRegistry.request(
                    command.conversationId(),
                    command.taskRunId().value(),
                    "CANCEL_RUN",
                    "Step thread was interrupted before adapter execution.");
        }
    }

    private boolean isCancellationRequested(StepExecutionCommand command) {
        return command != null
                && command.taskRunId() != null
                && runCancellationRegistry.isCancellationRequested(command.taskRunId().value());
    }

    private TaskStep cancelledStep(StepExecutionCommand command, TaskStepId stepId, String reason) {
        return new TaskStep(
                stepId,
                command.taskRunId(),
                command.stepOrder(),
                new AgentId(command.agentId()),
                command.taskDescription(),
                TaskStepStatus.SKIPPED,
                command.inputContext(),
                command.baseOutputContent() + "\n\nCancellation:\n" + reason,
                command.preferredAdapterType().name(),
                null,
                "CANCELLED",
                null,
                reason,
                command.parallelGroupKey(),
                command.dependsOnStepOrders(),
                command.routingReason(),
                false,
                "SKIPPED",
                "SKIPPED",
                "SKIPPED",
                null,
                reason,
                List.of(),
                command.now(),
                command.now());
    }

    private void recordAdapterQualityObservation(
            StepExecutionCommand command,
            AgentResponse adapterResponse,
            AdapterArtifactAppendResult adapterArtifactResult) {
        AgentAdapterType adapterType = command.preferredAdapterType();
        boolean adapterExecutionSucceeded = adapterResponse != null
                && adapterResponse.status() == AgentExecutionStatus.COMPLETED
                && !adapterResponse.fallbackUsed();
        boolean fallbackUsed = adapterResponse != null && adapterResponse.fallbackUsed();
        boolean realOutputAccepted = adapterArtifactResult != null && !adapterArtifactResult.adapterArtifactIds().isEmpty();
        adapterQualityMetricsService.record(new AdapterQualityMetricsService.QualityObservation(
                adapterType,
                adapterExecutionSucceeded,
                fallbackUsed,
                realOutputAccepted,
                adapterArtifactResult == null ? null : adapterArtifactResult.parseStatus(),
                adapterArtifactResult == null ? null : adapterArtifactResult.buildValidationStatus(),
                adapterArtifactResult == null ? null : adapterArtifactResult.qualityStatus(),
                adapterArtifactResult == null ? null : adapterArtifactResult.qualityReason()));
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

    private AdapterArtifactAppendResult appendAdapterOutputArtifactIfReal(
            StepExecutionCommand command,
            TaskStepId stepId,
            AgentResponse adapterResponse) {
        List<ArtifactId> producedArtifactIds = new ArrayList<>(command.producedArtifactIds());
        if (!shouldPersistAdapterOutput(adapterResponse) || "STATIC_TEMPLATE".equals(artifactGenerationMode)) {
            String status = adapterResponse == null || adapterResponse.content() == null || adapterResponse.content().isBlank()
                    ? "EMPTY"
                    : "NOT_ATTEMPTED";
            String reason = "STATIC_TEMPLATE".equals(artifactGenerationMode)
                    ? "Artifact generation mode is STATIC_TEMPLATE."
                    : "Adapter output was not persisted because adapter execution was MOCK, fallback, failed, or empty.";
            return new AdapterArtifactAppendResult(
                    List.copyOf(producedArtifactIds),
                    List.of(),
                    status,
                    "NOT_EVALUATED",
                    "NOT_EVALUATED",
                    null,
                    reason);
        }

        List<ArtifactId> adapterArtifactIds = new ArrayList<>();
        AdapterArtifactExtractor.ExtractionResult extractionResult = adapterArtifactExtractor.extract(
                adapterResponse.content(),
                new AdapterArtifactExtractor.ExtractionContext(
                        command.stepOrder(),
                        command.agentName(),
                        command.requiredSkill(),
                        command.taskDescription()));
        AdapterArtifactQualityEvaluator.QualityReport qualityReport =
                adapterArtifactQualityEvaluator.evaluate(extractionResult);
        boolean realFirstRequiresValidJson = "REAL_FIRST".equals(artifactGenerationMode)
                && !"VALID_JSON_ARTIFACTS".equals(qualityReport.parseStatus());
        boolean realFirstRequiresBuildPass = "REAL_FIRST".equals(artifactGenerationMode)
                && "FAILED".equals(qualityReport.buildValidationStatus());
        if (realFirstRequiresValidJson || realFirstRequiresBuildPass || !qualityReport.hasAcceptedArtifacts()) {
            return new AdapterArtifactAppendResult(
                    List.copyOf(producedArtifactIds),
                    List.of(),
                    qualityReport.parseStatus(),
                    qualityReport.buildValidationStatus(),
                    "REJECTED",
                    qualityReport.qualityScore(),
                    buildStepQualityReason(qualityReport));
        }

        for (AdapterArtifactQualityEvaluator.ArtifactQuality artifactQuality : qualityReport.artifactQualities()) {
            if (!"ACCEPTED".equals(artifactQuality.qualityStatus())) {
                continue;
            }
            AdapterArtifactExtractor.AdapterArtifactSpec spec = artifactQuality.spec();
            if ("FAILED".equals(artifactQuality.buildValidationStatus())) {
                continue;
            }
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
                    artifactQuality.buildValidationStatus(),
                    artifactQuality.qualityStatus(),
                    artifactQuality.qualityScore(),
                    buildArtifactQualityReason(artifactQuality),
                    command.now(),
                    command.now());
            artifactRepository.save(adapterOutputArtifact);
            publishArtifactEvent(adapterOutputArtifact, RealtimeEventType.ARTIFACT_CREATED);
            adapterArtifactIds.add(adapterOutputArtifact.getId());
        }
        if (adapterArtifactIds.isEmpty()) {
            return new AdapterArtifactAppendResult(
                    List.copyOf(producedArtifactIds),
                    List.of(),
                    qualityReport.parseStatus(),
                    qualityReport.buildValidationStatus(),
                    "REJECTED",
                    qualityReport.qualityScore(),
                    "All extracted adapter artifacts failed quality/build checks. "
                            + buildStepQualityReason(qualityReport));
        }
        if ("REAL_FIRST".equals(artifactGenerationMode) && !adapterArtifactIds.isEmpty()) {
            archiveStaticFallbackArtifacts(command.producedArtifactIds(), command.now());
            List<ArtifactId> realFirstArtifactIds = new ArrayList<>(adapterArtifactIds);
            realFirstArtifactIds.addAll(producedArtifactIds);
            return new AdapterArtifactAppendResult(
                    List.copyOf(realFirstArtifactIds),
                    List.copyOf(adapterArtifactIds),
                    qualityReport.parseStatus(),
                    qualityReport.buildValidationStatus(),
                    qualityReport.qualityStatus(),
                    qualityReport.qualityScore(),
                    buildStepQualityReason(qualityReport));
        }
        producedArtifactIds.addAll(adapterArtifactIds);
        return new AdapterArtifactAppendResult(
                List.copyOf(producedArtifactIds),
                List.copyOf(adapterArtifactIds),
                qualityReport.parseStatus(),
                qualityReport.buildValidationStatus(),
                qualityReport.qualityStatus(),
                qualityReport.qualityScore(),
                buildStepQualityReason(qualityReport));
    }

    private String buildStepQualityReason(AdapterArtifactQualityEvaluator.QualityReport qualityReport) {
        return qualityReport.qualityReason()
                + "; buildLintStatus=" + qualityReport.buildValidationStatus()
                + "; buildLintReason=" + qualityReport.buildValidationReason()
                + "; buildLintMode=STATIC_NO_EXTERNAL_NPM";
    }

    private String buildArtifactQualityReason(AdapterArtifactQualityEvaluator.ArtifactQuality artifactQuality) {
        return artifactQuality.qualityReason()
                + "; buildLintStatus=" + artifactQuality.buildValidationStatus()
                + "; buildLintReason=" + artifactQuality.buildValidationReason();
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
                        artifact.getBuildValidationStatus(),
                        artifact.getQualityStatus(),
                        artifact.getQualityScore(),
                        artifact.getQualityReason(),
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
        return spec.content();
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

    private String nullSafe(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record AdapterArtifactAppendResult(
            List<ArtifactId> producedArtifactIds,
            List<ArtifactId> adapterArtifactIds,
            String parseStatus,
            String buildValidationStatus,
            String qualityStatus,
            Integer qualityScore,
            String qualityReason) {

        private AdapterArtifactAppendResult {
            producedArtifactIds = producedArtifactIds == null ? List.of() : List.copyOf(producedArtifactIds);
            adapterArtifactIds = adapterArtifactIds == null ? List.of() : List.copyOf(adapterArtifactIds);
        }
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
