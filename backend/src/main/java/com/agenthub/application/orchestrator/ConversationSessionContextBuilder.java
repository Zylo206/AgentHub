package com.agenthub.application.orchestrator;

import com.agenthub.domain.artifact.Artifact;
import com.agenthub.domain.artifact.ArtifactRepository;
import com.agenthub.domain.artifact.ArtifactType;
import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.Message;
import com.agenthub.domain.message.MessageId;
import com.agenthub.domain.message.MessageRepository;
import com.agenthub.domain.task.TaskRepository;
import com.agenthub.domain.task.TaskRun;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ConversationSessionContextBuilder {

    private static final int RECENT_MESSAGE_LIMIT = 6;
    private static final int RECENT_ARTIFACT_LIMIT = 6;
    private static final int RECENT_TASK_RUN_LIMIT = 3;
    private static final int REVIEW_ARTIFACT_LIMIT = 3;
    private static final int ITEM_MAX_CHARS = 320;

    private final MessageRepository messageRepository;
    private final ArtifactRepository artifactRepository;
    private final TaskRepository taskRepository;

    public ConversationSessionContextBuilder(
            MessageRepository messageRepository,
            ArtifactRepository artifactRepository,
            TaskRepository taskRepository) {
        this.messageRepository = messageRepository;
        this.artifactRepository = artifactRepository;
        this.taskRepository = taskRepository;
    }

    public SessionContext build(
            ConversationId conversationId,
            String agentId,
            MessageId sourceMessageId,
            Instant now) {
        List<String> contextItems = new ArrayList<>();
        List<String> artifactSummaries = new ArrayList<>();

        if (agentId != null && !agentId.isBlank()) {
            contextItems.add("AgentHub-managed multi-turn session: current agentId="
                    + agentId
                    + "; externalCliSessionKey="
                    + buildExternalCliSessionKey(conversationId, agentId)
                    + "; reuse conversation history, artifacts, review results, and previous run summaries as the durable session context.");
        } else {
            contextItems.add("AgentHub-managed multi-turn session: reuse conversation history, artifacts, review results, and previous run summaries as the durable session context.");
        }

        List<Message> recentMessages = messageRepository.findRecentByConversationId(
                conversationId,
                RECENT_MESSAGE_LIMIT);
        recentMessages.stream()
                .filter(message -> sourceMessageId == null || !message.getId().equals(sourceMessageId))
                .forEach(message -> contextItems.add(formatMessage(message)));

        List<Artifact> recentArtifacts = artifactRepository.findRecentByConversationId(
                        conversationId,
                        RECENT_ARTIFACT_LIMIT)
                .stream()
                .filter(artifact -> artifact.getCreatedAt() == null || artifact.getCreatedAt().isBefore(now))
                .toList();
        recentArtifacts.forEach(artifact -> {
            String summary = formatArtifact(artifact);
            contextItems.add(summary);
            artifactSummaries.add(summary);
        });

        recentArtifacts.stream()
                .filter(artifact -> artifact.getType() == ArtifactType.REVIEW_REPORT)
                .limit(REVIEW_ARTIFACT_LIMIT)
                .forEach(artifact -> contextItems.add(formatReviewArtifact(artifact)));

        List<TaskRun> recentRuns = taskRepository.findRecentTaskRunsByConversationId(
                conversationId,
                RECENT_TASK_RUN_LIMIT);
        recentRuns.forEach(taskRun -> contextItems.add(formatTaskRun(taskRun)));

        String inputContextSummary = " AgentHub-managed multi-turn session context: injected "
                + recentMessages.size()
                + " recent messages, "
                + recentArtifacts.size()
                + " artifacts, "
                + recentRuns.size()
                + " previous TaskRuns at "
                + now
                + ". Use this to continue, revise, or optimize prior work.";

        return new SessionContext(
                contextItems.stream().map(item -> clip(item, ITEM_MAX_CHARS)).toList(),
                artifactSummaries.stream().map(item -> clip(item, ITEM_MAX_CHARS)).toList(),
                inputContextSummary);
    }

    private String formatMessage(Message message) {
        return "Session recent message: messageId="
                + message.getId().value()
                + ", senderType="
                + message.getSenderType()
                + ", senderId="
                + nullToBlank(message.getSenderId())
                + ", type="
                + message.getMessageType()
                + ", content="
                + clip(message.getContent(), 220);
    }

    private String formatArtifact(Artifact artifact) {
        return "Session artifact: artifactId="
                + artifact.getId().value()
                + ", title="
                + artifact.getTitle()
                + ", type="
                + artifact.getType()
                + ", version=v"
                + artifact.getVersion()
                + ", status="
                + artifact.getStatus()
                + ", source="
                + artifact.getSourceKind()
                + ", adapter="
                + nullToBlank(artifact.getSourceAdapterType())
                + ", quality="
                + nullToBlank(artifact.getQualityStatus())
                + ", build="
                + nullToBlank(artifact.getBuildValidationStatus())
                + ", preview="
                + clip(artifact.getContent(), 160);
    }

    private String formatReviewArtifact(Artifact artifact) {
        return "Session review result: artifactId="
                + artifact.getId().value()
                + ", status="
                + artifact.getStatus()
                + ", quality="
                + nullToBlank(artifact.getQualityStatus())
                + ", reason="
                + clip(artifact.getQualityReason(), 180)
                + ", content="
                + clip(artifact.getContent(), 180);
    }

    private String formatTaskRun(TaskRun taskRun) {
        return "Session previous TaskRun: taskRunId="
                + taskRun.getId().value()
                + ", status="
                + taskRun.getStatus()
                + ", summary="
                + clip(taskRun.getResultSummary(), 220);
    }

    private static String clip(String value, int maxChars) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = value.replace('\r', ' ').replace('\n', ' ').trim();
        if (normalized.length() <= maxChars) {
            return normalized;
        }
        return normalized.substring(0, Math.max(0, maxChars - 3)) + "...";
    }

    private static String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private static String buildExternalCliSessionKey(ConversationId conversationId, String agentId) {
        String conversationValue = conversationId == null ? "conversation" : conversationId.value();
        String agentValue = agentId == null || agentId.isBlank() ? "agent" : agentId;
        return "agenthub:" + conversationValue + ":" + agentValue;
    }

    public record SessionContext(
            List<String> contextItems,
            List<String> artifactSummaries,
            String inputContextSummary) {}
}
