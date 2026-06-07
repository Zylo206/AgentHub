package com.agenthub.application.task;

import com.agenthub.application.auth.ConversationAccessService;
import com.agenthub.application.orchestrator.OrchestratorService;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import com.agenthub.domain.task.TaskRunId;
import com.agenthub.domain.task.TaskSpec;
import com.agenthub.domain.task.TaskSpecId;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class TaskApplicationService {

    private final TaskRepository taskRepository;
    private final OrchestratorService orchestratorService;
    private final ConversationAccessService conversationAccessService;

    public TaskApplicationService(
            TaskRepository taskRepository,
            OrchestratorService orchestratorService,
            ConversationAccessService conversationAccessService) {
        this.taskRepository = taskRepository;
        this.orchestratorService = orchestratorService;
        this.conversationAccessService = conversationAccessService;
    }

    public TaskRun createDemoTaskFromMessage(String conversationId, String messageId, String userInput) {
        return orchestratorService.createDemoTaskFromMessage(conversationId, messageId, userInput, null);
    }

    public TaskRun createDemoTaskFromMessage(
            String conversationId,
            String messageId,
            String userInput,
            String selectedAgentId) {
        conversationAccessService.requireWritable(conversationId);
        return orchestratorService.createDemoTaskFromMessage(
                conversationId,
                messageId,
                userInput,
                selectedAgentId);
    }

    public TaskSpec getTaskSpec(String taskSpecId) {
        TaskSpec taskSpec = taskRepository.findTaskSpecById(new TaskSpecId(taskSpecId))
                .orElseThrow(() -> new NoSuchElementException("TaskSpec not found: " + taskSpecId));
        conversationAccessService.requireReadable(taskSpec.getConversationId().value());
        return taskSpec;
    }

    public List<TaskSpec> listTaskSpecsByConversation(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return taskRepository.findTaskSpecsByConversationId(new ConversationId(conversationId));
    }

    public TaskRun getTaskRun(String taskRunId) {
        TaskRun taskRun = taskRepository.findTaskRunById(new TaskRunId(taskRunId))
                .orElseThrow(() -> new NoSuchElementException("TaskRun not found: " + taskRunId));
        conversationAccessService.requireReadable(taskRun.getConversationId().value());
        return taskRun;
    }

    public List<TaskRun> listTaskRunsByConversation(String conversationId) {
        conversationAccessService.requireReadable(conversationId);
        return taskRepository.findTaskRunsByConversationId(new ConversationId(conversationId));
    }

    public ArtifactRevisionResult createDemoArtifactRevision(
            String conversationId,
            String artifactId,
            String revisionInstruction) {
        conversationAccessService.requireWritable(conversationId);
        return orchestratorService.createDemoArtifactRevision(conversationId, artifactId, revisionInstruction);
    }

    public record ArtifactRevisionResult(
            TaskRun taskRun,
            com.agenthub.domain.artifact.Artifact revisedArtifact,
            com.agenthub.domain.artifact.Artifact reviewArtifact) {
    }
}
