package com.agenthub.domain.task;

import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.artifact.ArtifactId;
import java.time.Instant;
import java.util.List;

public class TaskStep {

    private final TaskStepId id;
    private final TaskRunId taskRunId;
    private final int stepOrder;
    private final AgentId assignedAgentId;
    private final String taskDescription;
    private final TaskStepStatus status;
    private final String inputContext;
    private final String outputContent;
    private final String preferredAdapterType;
    private final String actualAdapterType;
    private final String adapterType;
    private final String adapterStatus;
    private final String adapterResponseSummary;
    private final String adapterErrorMessage;
    private final String parallelGroupKey;
    private final List<Integer> dependsOnStepOrders;
    private final String routingReason;
    private final boolean realOutputUsed;
    private final String artifactParseStatus;
    private final String artifactBuildValidationStatus;
    private final String artifactBuildValidationReason;
    private final String artifactQualityStatus;
    private final Integer artifactQualityScore;
    private final String artifactQualityReason;
    private final List<ArtifactId> producedArtifactIds;
    private final Instant createdAt;
    private final Instant updatedAt;

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            String preferredAdapterType,
            String actualAdapterType,
            String adapterStatus,
            String adapterResponseSummary,
            String adapterErrorMessage,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                taskRunId,
                stepOrder,
                assignedAgentId,
                taskDescription,
                status,
                inputContext,
                outputContent,
                preferredAdapterType,
                actualAdapterType,
                adapterStatus,
                adapterResponseSummary,
                adapterErrorMessage,
                "GROUP_" + stepOrder,
                List.of(),
                "Rule-based routing",
                false,
                null,
                null,
                null,
                producedArtifactIds,
                createdAt,
                updatedAt);
    }

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            String preferredAdapterType,
            String actualAdapterType,
            String adapterStatus,
            String adapterResponseSummary,
            String adapterErrorMessage,
            String parallelGroupKey,
            List<Integer> dependsOnStepOrders,
            String routingReason,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                taskRunId,
                stepOrder,
                assignedAgentId,
                taskDescription,
                status,
                inputContext,
                outputContent,
                preferredAdapterType,
                actualAdapterType,
                adapterStatus,
                adapterResponseSummary,
                adapterErrorMessage,
                parallelGroupKey,
                dependsOnStepOrders,
                routingReason,
                false,
                null,
                null,
                null,
                producedArtifactIds,
                createdAt,
                updatedAt);
    }

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            String preferredAdapterType,
            String actualAdapterType,
            String adapterStatus,
            String adapterResponseSummary,
            String adapterErrorMessage,
            String parallelGroupKey,
            List<Integer> dependsOnStepOrders,
            String routingReason,
            boolean realOutputUsed,
            String artifactParseStatus,
            String artifactQualityStatus,
            String artifactQualityReason,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                taskRunId,
                stepOrder,
                assignedAgentId,
                taskDescription,
                status,
                inputContext,
                outputContent,
                preferredAdapterType,
                actualAdapterType,
                adapterStatus,
                adapterResponseSummary,
                adapterErrorMessage,
                parallelGroupKey,
                dependsOnStepOrders,
                routingReason,
                realOutputUsed,
                artifactParseStatus,
                null,
                null,
                artifactQualityStatus,
                null,
                artifactQualityReason,
                producedArtifactIds,
                createdAt,
                updatedAt);
    }

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            String preferredAdapterType,
            String actualAdapterType,
            String adapterStatus,
            String adapterResponseSummary,
            String adapterErrorMessage,
            String parallelGroupKey,
            List<Integer> dependsOnStepOrders,
            String routingReason,
            boolean realOutputUsed,
            String artifactParseStatus,
            String artifactBuildValidationStatus,
            String artifactQualityStatus,
            Integer artifactQualityScore,
            String artifactQualityReason,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                taskRunId,
                stepOrder,
                assignedAgentId,
                taskDescription,
                status,
                inputContext,
                outputContent,
                preferredAdapterType,
                actualAdapterType,
                adapterStatus,
                adapterResponseSummary,
                adapterErrorMessage,
                parallelGroupKey,
                dependsOnStepOrders,
                routingReason,
                realOutputUsed,
                artifactParseStatus,
                artifactBuildValidationStatus,
                extractBuildValidationReason(artifactQualityReason),
                artifactQualityStatus,
                artifactQualityScore,
                artifactQualityReason,
                producedArtifactIds,
                createdAt,
                updatedAt);
    }

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            String preferredAdapterType,
            String actualAdapterType,
            String adapterStatus,
            String adapterResponseSummary,
            String adapterErrorMessage,
            String parallelGroupKey,
            List<Integer> dependsOnStepOrders,
            String routingReason,
            boolean realOutputUsed,
            String artifactParseStatus,
            String artifactBuildValidationStatus,
            String artifactBuildValidationReason,
            String artifactQualityStatus,
            Integer artifactQualityScore,
            String artifactQualityReason,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.taskRunId = taskRunId;
        this.stepOrder = stepOrder;
        this.assignedAgentId = assignedAgentId;
        this.taskDescription = taskDescription;
        this.status = status;
        this.inputContext = inputContext;
        this.outputContent = outputContent;
        this.preferredAdapterType = preferredAdapterType;
        this.actualAdapterType = actualAdapterType;
        this.adapterType = actualAdapterType;
        this.adapterStatus = adapterStatus;
        this.adapterResponseSummary = adapterResponseSummary;
        this.adapterErrorMessage = adapterErrorMessage;
        this.parallelGroupKey = parallelGroupKey;
        this.dependsOnStepOrders = dependsOnStepOrders == null ? List.of() : List.copyOf(dependsOnStepOrders);
        this.routingReason = routingReason;
        this.realOutputUsed = realOutputUsed;
        this.artifactParseStatus = artifactParseStatus;
        this.artifactBuildValidationStatus = artifactBuildValidationStatus;
        this.artifactBuildValidationReason = artifactBuildValidationReason;
        this.artifactQualityStatus = artifactQualityStatus;
        this.artifactQualityScore = artifactQualityScore;
        this.artifactQualityReason = artifactQualityReason;
        this.producedArtifactIds = List.copyOf(producedArtifactIds);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public TaskStep(
            TaskStepId id,
            TaskRunId taskRunId,
            int stepOrder,
            AgentId assignedAgentId,
            String taskDescription,
            TaskStepStatus status,
            String inputContext,
            String outputContent,
            List<ArtifactId> producedArtifactIds,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                taskRunId,
                stepOrder,
                assignedAgentId,
                taskDescription,
                status,
                inputContext,
                outputContent,
                null,
                null,
                null,
                null,
                null,
                producedArtifactIds,
                createdAt,
                updatedAt);
    }

    public TaskStepId getId() {
        return id;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public AgentId getAssignedAgentId() {
        return assignedAgentId;
    }

    public String getTaskDescription() {
        return taskDescription;
    }

    public TaskStepStatus getStatus() {
        return status;
    }

    public String getInputContext() {
        return inputContext;
    }

    public String getOutputContent() {
        return outputContent;
    }

    public String getAdapterType() {
        return adapterType;
    }

    public String getPreferredAdapterType() {
        return preferredAdapterType;
    }

    public String getActualAdapterType() {
        return actualAdapterType;
    }

    public String getAdapterStatus() {
        return adapterStatus;
    }

    public String getAdapterResponseSummary() {
        return adapterResponseSummary;
    }

    public String getAdapterErrorMessage() {
        return adapterErrorMessage;
    }

    public String getParallelGroupKey() {
        return parallelGroupKey;
    }

    public List<Integer> getDependsOnStepOrders() {
        return dependsOnStepOrders;
    }

    public String getRoutingReason() {
        return routingReason;
    }

    public boolean isRealOutputUsed() {
        return realOutputUsed;
    }

    public String getArtifactParseStatus() {
        return artifactParseStatus;
    }

    public String getArtifactBuildValidationStatus() {
        return artifactBuildValidationStatus;
    }

    public String getArtifactBuildValidationReason() {
        return artifactBuildValidationReason;
    }

    public String getArtifactQualityStatus() {
        return artifactQualityStatus;
    }

    public Integer getArtifactQualityScore() {
        return artifactQualityScore;
    }

    public String getArtifactQualityReason() {
        return artifactQualityReason;
    }

    public String getRealAdapterOutcome() {
        if (isFailureStatus(artifactParseStatus, "PARSE_FAILED", "INVALID_JSON", "MALFORMED_JSON")) {
            return "PARSE_FAILED";
        }
        if (isFailureStatus(artifactBuildValidationStatus, "BUILD_FAILED", "FAILED")) {
            return "BUILD_FAILED";
        }
        if (isFailureStatus(artifactQualityStatus, "QUALITY_FAILED", "REJECTED")) {
            return "QUALITY_FAILED";
        }
        if (realOutputUsed) {
            return "ACCEPTED";
        }
        return "FALLBACK";
    }

    private static boolean isFailureStatus(String value, String... markers) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.toUpperCase();
        for (String marker : markers) {
            if (normalized.contains(marker)) {
                return true;
            }
        }
        return false;
    }

    private static String extractBuildValidationReason(String qualityReason) {
        if (qualityReason == null || qualityReason.isBlank()) {
            return null;
        }
        String marker = "buildLintReason=";
        int start = qualityReason.indexOf(marker);
        if (start < 0) {
            return null;
        }
        int valueStart = start + marker.length();
        int end = qualityReason.indexOf("; ", valueStart);
        String value = end >= 0 ? qualityReason.substring(valueStart, end) : qualityReason.substring(valueStart);
        return value.isBlank() ? null : value;
    }

    public List<ArtifactId> getProducedArtifactIds() {
        return producedArtifactIds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
