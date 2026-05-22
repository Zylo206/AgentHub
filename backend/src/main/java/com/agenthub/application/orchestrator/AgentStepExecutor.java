package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.common.IdGenerator;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.artifact.ArtifactId;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskStep;
import com.agenthub.domain.task.TaskStepId;
import com.agenthub.domain.task.TaskStepStatus;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AgentStepExecutor {

    private final AgentExecutorService agentExecutorService;
    private final IdGenerator idGenerator;

    public AgentStepExecutor(AgentExecutorService agentExecutorService, IdGenerator idGenerator) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
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
                                "demoMode", true)));

        String adapterSummary = summarizeAdapterResponse(adapterResponse.content());
        String outputContent = command.baseOutputContent()
                + "\n\nAdapter 执行信息：\n"
                + (adapterSummary == null ? "未记录 Adapter 响应。" : adapterSummary);

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
                command.producedArtifactIds(),
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
            Instant now) {

        public StepExecutionCommand {
            contextItems = List.copyOf(contextItems);
            artifactSummaries = List.copyOf(artifactSummaries);
            producedArtifactIds = List.copyOf(producedArtifactIds);
        }
    }
}
