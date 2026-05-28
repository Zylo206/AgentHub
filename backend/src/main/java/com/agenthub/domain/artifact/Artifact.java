package com.agenthub.domain.artifact;

import com.agenthub.domain.conversation.ConversationId;
import com.agenthub.domain.task.TaskRunId;
import java.time.Instant;

public class Artifact {

    private final ArtifactId id;
    private final ConversationId conversationId;
    private final TaskRunId taskRunId;
    private final String parentArtifactId;
    private final String revisionInstruction;
    private final String title;
    private final ArtifactType type;
    private final ArtifactStatus status;
    private final String language;
    private final String content;
    private final int version;
    private final ArtifactSourceKind sourceKind;
    private final String sourceAdapterType;
    private final String sourceTaskStepId;
    private final String generationMode;
    private final String buildValidationStatus;
    private final String buildValidationReason;
    private final String qualityStatus;
    private final Integer qualityScore;
    private final String qualityReason;
    private final Instant createdAt;
    private final Instant updatedAt;

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                null,
                null,
                title,
                type,
                status,
                language,
                content,
                version,
                ArtifactSourceKind.STATIC_TEMPLATE,
                null,
                null,
                ArtifactSourceKind.STATIC_TEMPLATE.name(),
                null,
                null,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                parentArtifactId,
                revisionInstruction,
                title,
                type,
                status,
                language,
                content,
                version,
                defaultSourceKind(parentArtifactId, revisionInstruction),
                null,
                null,
                defaultSourceKind(parentArtifactId, revisionInstruction).name(),
                null,
                null,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            ArtifactSourceKind sourceKind,
            String sourceAdapterType,
            String sourceTaskStepId,
            String generationMode,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                parentArtifactId,
                revisionInstruction,
                title,
                type,
                status,
                language,
                content,
                version,
                sourceKind,
                sourceAdapterType,
                sourceTaskStepId,
                generationMode,
                null,
                null,
                null,
                null,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            ArtifactSourceKind sourceKind,
            String sourceAdapterType,
            String sourceTaskStepId,
            String generationMode,
            String qualityStatus,
            String qualityReason,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                parentArtifactId,
                revisionInstruction,
                title,
                type,
                status,
                language,
                content,
                version,
                sourceKind,
                sourceAdapterType,
                sourceTaskStepId,
                generationMode,
                null,
                qualityStatus,
                null,
                qualityReason,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            ArtifactSourceKind sourceKind,
            String sourceAdapterType,
            String sourceTaskStepId,
            String generationMode,
            String buildValidationStatus,
            String qualityStatus,
            Integer qualityScore,
            String qualityReason,
            Instant createdAt,
            Instant updatedAt) {
        this(
                id,
                conversationId,
                taskRunId,
                parentArtifactId,
                revisionInstruction,
                title,
                type,
                status,
                language,
                content,
                version,
                sourceKind,
                sourceAdapterType,
                sourceTaskStepId,
                generationMode,
                buildValidationStatus,
                extractBuildValidationReason(qualityReason),
                qualityStatus,
                qualityScore,
                qualityReason,
                createdAt,
                updatedAt);
    }

    public Artifact(
            ArtifactId id,
            ConversationId conversationId,
            TaskRunId taskRunId,
            String parentArtifactId,
            String revisionInstruction,
            String title,
            ArtifactType type,
            ArtifactStatus status,
            String language,
            String content,
            int version,
            ArtifactSourceKind sourceKind,
            String sourceAdapterType,
            String sourceTaskStepId,
            String generationMode,
            String buildValidationStatus,
            String buildValidationReason,
            String qualityStatus,
            Integer qualityScore,
            String qualityReason,
            Instant createdAt,
            Instant updatedAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.taskRunId = taskRunId;
        this.parentArtifactId = parentArtifactId;
        this.revisionInstruction = revisionInstruction;
        this.title = title;
        this.type = type;
        this.status = status;
        this.language = language;
        this.content = content;
        this.version = version;
        this.sourceKind = sourceKind == null ? ArtifactSourceKind.STATIC_TEMPLATE : sourceKind;
        this.sourceAdapterType = sourceAdapterType;
        this.sourceTaskStepId = sourceTaskStepId;
        this.generationMode = generationMode == null || generationMode.isBlank()
                ? this.sourceKind.name()
                : generationMode;
        this.buildValidationStatus = buildValidationStatus;
        this.buildValidationReason = buildValidationReason;
        this.qualityStatus = qualityStatus;
        this.qualityScore = qualityScore;
        this.qualityReason = qualityReason;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    private static ArtifactSourceKind defaultSourceKind(String parentArtifactId, String revisionInstruction) {
        if ((parentArtifactId != null && !parentArtifactId.isBlank())
                || (revisionInstruction != null && !revisionInstruction.isBlank())) {
            return ArtifactSourceKind.USER_REVISION;
        }
        return ArtifactSourceKind.STATIC_TEMPLATE;
    }

    public ArtifactId getId() {
        return id;
    }

    public ConversationId getConversationId() {
        return conversationId;
    }

    public TaskRunId getTaskRunId() {
        return taskRunId;
    }

    public String getParentArtifactId() {
        return parentArtifactId;
    }

    public String getRevisionInstruction() {
        return revisionInstruction;
    }

    public String getTitle() {
        return title;
    }

    public ArtifactType getType() {
        return type;
    }

    public ArtifactStatus getStatus() {
        return status;
    }

    public String getLanguage() {
        return language;
    }

    public String getContent() {
        return content;
    }

    public int getVersion() {
        return version;
    }

    public ArtifactSourceKind getSourceKind() {
        return sourceKind;
    }

    public String getSourceAdapterType() {
        return sourceAdapterType;
    }

    public String getSourceTaskStepId() {
        return sourceTaskStepId;
    }

    public String getGenerationMode() {
        return generationMode;
    }

    public String getBuildValidationStatus() {
        return buildValidationStatus;
    }

    public String getBuildValidationReason() {
        return buildValidationReason;
    }

    public String getQualityStatus() {
        return qualityStatus;
    }

    public Integer getQualityScore() {
        return qualityScore;
    }

    public String getQualityReason() {
        return qualityReason;
    }

    public String getRealAdapterOutcome() {
        if (isFailureStatus(buildValidationStatus, "BUILD_FAILED", "FAILED")) {
            return "BUILD_FAILED";
        }
        if (isFailureStatus(qualityStatus, "QUALITY_FAILED", "REJECTED")) {
            return "QUALITY_FAILED";
        }
        if (sourceKind == ArtifactSourceKind.REAL_ADAPTER) {
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
