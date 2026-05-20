package com.agenthub.domain.task;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.message.MessageId;
import java.time.Instant;
import java.util.List;

public class TaskSpec {

    private final TaskSpecId id;
    private final ConversationId conversationId;
    private final MessageId sourceMessageId;
    private final String title;
    private final String userGoal;
    private final String userInput;
    private final List<String> scope;
    private final List<String> nonGoals;
    private final List<String> acceptanceCriteria;
    private final List<String> requiredSkills;
    private final List<String> expectedArtifacts;
    private final TaskSpecStatus status;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TaskSpec(
            TaskSpecId id,
            ConversationId conversationId,
            MessageId sourceMessageId,
            String title,
            String userGoal,
            String userInput,
            List<String> scope,
            List<String> nonGoals,
            List<String> acceptanceCriteria,
            List<String> requiredSkills,
            List<String> expectedArtifacts,
            TaskSpecStatus status,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.sourceMessageId = sourceMessageId;
        this.title = title;
        this.userGoal = userGoal;
        this.userInput = userInput;
        this.scope = List.copyOf(scope);
        this.nonGoals = List.copyOf(nonGoals);
        this.acceptanceCriteria = List.copyOf(acceptanceCriteria);
        this.requiredSkills = List.copyOf(requiredSkills);
        this.expectedArtifacts = List.copyOf(expectedArtifacts);
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public TaskSpecId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public MessageId getSourceMessageId() {
        return sourceMessageId;
    }

    public String getTitle() {
        return title;
    }

    public String getUserGoal() {
        return userGoal;
    }

    public String getUserInput() {
        return userInput;
    }

    public List<String> getScope() {
        return scope;
    }

    public List<String> getNonGoals() {
        return nonGoals;
    }

    public List<String> getAcceptanceCriteria() {
        return acceptanceCriteria;
    }

    public List<String> getRequiredSkills() {
        return requiredSkills;
    }

    public List<String> getExpectedArtifacts() {
        return expectedArtifacts;
    }

    public TaskSpecStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
