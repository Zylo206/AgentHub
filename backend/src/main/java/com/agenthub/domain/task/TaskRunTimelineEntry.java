package com.agenthub.domain.task;

import java.time.Instant;

public class TaskRunTimelineEntry {

    private final String timelineId;
    private final String entryType;
    private final String taskRunId;
    private final String taskStepId;
    private final String nodeId;
    private final String title;
    private final String detail;
    private final String status;
    private final String failureType;
    private final Instant createdAt;

    public TaskRunTimelineEntry(
            String timelineId,
            String entryType,
            String taskRunId,
            String taskStepId,
            String nodeId,
            String title,
            String detail,
            String status,
            String failureType,
            Instant createdAt) {
        this.timelineId = timelineId;
        this.entryType = entryType;
        this.taskRunId = taskRunId;
        this.taskStepId = taskStepId;
        this.nodeId = nodeId;
        this.title = title;
        this.detail = detail;
        this.status = status;
        this.failureType = failureType;
        this.createdAt = createdAt;
    }

    public String getTimelineId() {
        return timelineId;
    }

    public String getEntryType() {
        return entryType;
    }

    public String getTaskRunId() {
        return taskRunId;
    }

    public String getTaskStepId() {
        return taskStepId;
    }

    public String getNodeId() {
        return nodeId;
    }

    public String getTitle() {
        return title;
    }

    public String getDetail() {
        return detail;
    }

    public String getStatus() {
        return status;
    }

    public String getFailureType() {
        return failureType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
