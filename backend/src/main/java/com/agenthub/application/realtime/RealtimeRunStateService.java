package com.agenthub.application.realtime;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RealtimeRunStateService {

    private final ConcurrentMap<String, RealtimeRunState> statesByTaskRunId = new ConcurrentHashMap<>();
    private final ConcurrentMap<String, String> activeTaskRunIdByConversationId = new ConcurrentHashMap<>();
    private final Duration ttl;

    public RealtimeRunStateService(
            @Value("${agenthub.realtime.run-state-ttl-minutes:30}") long ttlMinutes) {
        this.ttl = Duration.ofMinutes(Math.max(1, ttlMinutes));
    }

    public RealtimeRunState start(
            String conversationId,
            String taskRunId,
            String sourceMessageId,
            String lastEventId,
            Instant now) {
        cleanup(now);
        RealtimeRunState state = new RealtimeRunState(
                taskRunId,
                conversationId,
                sourceMessageId,
                "STREAMING",
                lastEventId,
                "Task run started and realtime state snapshot is available.",
                List.of(),
                now,
                now,
                null);
        statesByTaskRunId.put(taskRunId, state);
        activeTaskRunIdByConversationId.put(conversationId, taskRunId);
        return state;
    }

    public RealtimeRunState complete(
            String conversationId,
            String taskRunId,
            String sourceMessageId,
            String status,
            String lastEventId,
            String summary,
            List<String> resourceRefs,
            Instant now) {
        cleanup(now);
        RealtimeRunState previous = statesByTaskRunId.get(taskRunId);
        String resolvedSourceMessageId = sourceMessageId == null || sourceMessageId.isBlank()
                ? (previous == null ? null : previous.getSourceMessageId())
                : sourceMessageId;
        RealtimeRunState state = new RealtimeRunState(
                taskRunId,
                conversationId,
                resolvedSourceMessageId,
                status,
                lastEventId,
                summary,
                resourceRefs,
                previous == null ? now : previous.getCreatedAt(),
                now,
                null);
        statesByTaskRunId.put(taskRunId, state);
        activeTaskRunIdByConversationId.put(conversationId, taskRunId);
        return state;
    }

    public RealtimeRunState fail(
            String conversationId,
            String taskRunId,
            String sourceMessageId,
            String lastEventId,
            String errorMessage,
            Instant now) {
        cleanup(now);
        RealtimeRunState previous = statesByTaskRunId.get(taskRunId);
        RealtimeRunState state = new RealtimeRunState(
                taskRunId,
                conversationId,
                sourceMessageId,
                "FAILED",
                lastEventId,
                "Task run failed.",
                List.of(),
                previous == null ? now : previous.getCreatedAt(),
                now,
                errorMessage);
        statesByTaskRunId.put(taskRunId, state);
        activeTaskRunIdByConversationId.put(conversationId, taskRunId);
        return state;
    }

    public Optional<RealtimeRunState> findByTaskRunId(String taskRunId) {
        cleanup(Instant.now());
        return Optional.ofNullable(statesByTaskRunId.get(taskRunId));
    }

    public Optional<RealtimeRunState> findActiveByConversationId(String conversationId) {
        cleanup(Instant.now());
        String taskRunId = activeTaskRunIdByConversationId.get(conversationId);
        return taskRunId == null ? Optional.empty() : Optional.ofNullable(statesByTaskRunId.get(taskRunId));
    }

    private void cleanup(Instant now) {
        statesByTaskRunId.entrySet().removeIf(entry -> entry.getValue().getUpdatedAt().plus(ttl).isBefore(now));
        activeTaskRunIdByConversationId.entrySet().removeIf(entry -> !statesByTaskRunId.containsKey(entry.getValue()));
    }
}
