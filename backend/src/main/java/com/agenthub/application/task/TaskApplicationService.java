package com.agenthub.application.task;

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

    public TaskApplicationService(
            TaskRepository taskRepository,
            OrchestratorService orchestratorService) {
        this.taskRepository = taskRepository;
        this.orchestratorService = orchestratorService;
    }

    public TaskRun createDemoTaskFromMessage(String conversationId, String messageId, String userInput) {
        return orchestratorService.createDemoTaskFromMessage(conversationId, messageId, userInput);
    }

    public TaskSpec getTaskSpec(String taskSpecId) {
        return taskRepository.findTaskSpecById(new TaskSpecId(taskSpecId))
                .orElseThrow(() -> new NoSuchElementException("TaskSpec not found: " + taskSpecId));
    }

    public List<TaskSpec> listTaskSpecsByConversation(String conversationId) {
        return taskRepository.findTaskSpecsByConversationId(new ConversationId(conversationId));
    }

    public TaskRun getTaskRun(String taskRunId) {
        return taskRepository.findTaskRunById(new TaskRunId(taskRunId))
                .orElseThrow(() -> new NoSuchElementException("TaskRun not found: " + taskRunId));
    }

    public List<TaskRun> listTaskRunsByConversation(String conversationId) {
        return taskRepository.findTaskRunsByConversationId(new ConversationId(conversationId));
    }

    public ArtifactRevisionResult createDemoArtifactRevision(
            String conversationId,
            String artifactId,
            String revisionInstruction) {
        return orchestratorService.createDemoArtifactRevision(conversationId, artifactId, revisionInstruction);
    }

    public record ArtifactRevisionResult(
            TaskRun taskRun,
            com.agenthub.domain.artifact.Artifact revisedArtifact,
            com.agenthub.domain.artifact.Artifact reviewArtifact) {
    }
}
