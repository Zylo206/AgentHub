package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.common.IdGenerator;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.artifact.ArtifactRepository;
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
import org.springframework.stereotype.Service;

@Service
public class AgentStepExecutor {

    private final AgentExecutorService agentExecutorService;
    private final IdGenerator idGenerator;
    private final ArtifactRepository artifactRepository;

    public AgentStepExecutor(
            AgentExecutorService agentExecutorService,
            IdGenerator idGenerator,
            ArtifactRepository artifactRepository) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
        this.artifactRepository = artifactRepository;
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
                                "demoMode", true)));

        String adapterSummary = summarizeAdapterResponse(adapterResponse.content());
        String outputContent = command.baseOutputContent()
                + "\n\n并行调度信息：parallelGroupKey="
                + command.parallelGroupKey()
                + "，dependsOnStepOrders="
                + command.dependsOnStepOrders()
                + "，routingReason="
                + command.routingReason()
                + "\n\nAdapter 执行信息：\n"
                + (adapterSummary == null ? "未记录 Adapter 响应。" : adapterSummary);

        List<ArtifactId> producedArtifactIds = appendAdapterOutputArtifactIfReal(command, stepId, adapterResponse);

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
        if (!shouldPersistAdapterOutput(adapterResponse)) {
            return List.copyOf(producedArtifactIds);
        }

        Artifact adapterOutputArtifact = new Artifact(
                new ArtifactId(idGenerator.nextId("artifact")),
                new ConversationId(command.conversationId()),
                command.taskRunId(),
                "Adapter Output - " + command.agentName() + " - Step " + command.stepOrder() + ".md",
                resolveAdapterOutputArtifactType(command),
                ArtifactStatus.CREATED,
                "md",
                buildAdapterOutputArtifactContent(command, stepId, adapterResponse),
                1,
                command.now(),
                command.now());
        artifactRepository.save(adapterOutputArtifact);
        producedArtifactIds.add(adapterOutputArtifact.getId());
        return List.copyOf(producedArtifactIds);
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

    private ArtifactType resolveAdapterOutputArtifactType(StepExecutionCommand command) {
        String normalizedSkill = command.requiredSkill() == null ? "" : command.requiredSkill().toLowerCase();
        String normalizedTask = command.taskDescription() == null ? "" : command.taskDescription().toLowerCase();
        if (normalizedSkill.contains("review") || normalizedTask.contains("review") || normalizedTask.contains("检查")) {
            return ArtifactType.REVIEW_REPORT;
        }
        return ArtifactType.MARKDOWN;
    }

    private String buildAdapterOutputArtifactContent(
            StepExecutionCommand command,
            TaskStepId stepId,
            AgentResponse adapterResponse) {
        return """
                # Adapter Output

                - Agent: %s
                - TaskStep: %s
                - Preferred Adapter: %s
                - Actual Adapter: %s
                - Status: %s
                - Persisted Because: actual adapter completed without MOCK fallback

                ## Response

                %s
                """.formatted(
                command.agentName(),
                stepId.value(),
                adapterResponse.preferredAdapterType(),
                adapterResponse.actualAdapterType(),
                adapterResponse.status(),
                adapterResponse.content());
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
