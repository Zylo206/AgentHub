package com.agenthub.application.orchestrator;

import com.agenthub.common.IdGenerator;
import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

@Service
public class TaskStepExecutionRegistry {

    private final ConcurrentMap<String, LeaseState> leases = new ConcurrentHashMap<>();
    private final IdGenerator idGenerator;
    private final TimeProvider timeProvider;

    public TaskStepExecutionRegistry(IdGenerator idGenerator, TimeProvider timeProvider) {
        this.idGenerator = idGenerator;
        this.timeProvider = timeProvider;
    }

    public LeaseTicket begin(String taskRunId, String idempotencyKey, Integer timeoutSeconds) {
        String key = buildKey(taskRunId, idempotencyKey);
        Instant now = timeProvider.now();
        LeaseState state = leases.compute(key, (ignored, existing) -> {
            if (existing != null && existing.active && !existing.expired(now)) {
                return existing;
            }
            int nextLeaseVersion = existing == null ? 1 : existing.leaseVersion + 1;
            return new LeaseState(
                    idGenerator.nextId("lease"),
                    taskRunId,
                    idempotencyKey,
                    nextLeaseVersion,
                    timeoutSeconds,
                    now,
                    true);
        });
        boolean accepted = state.active && state.createdAt.equals(now);
        return new LeaseTicket(
                accepted,
                state.executionToken,
                state.leaseVersion,
                state.timeoutSeconds,
                state.createdAt,
                state.deadline());
    }

    public boolean isActive(String taskRunId, String idempotencyKey, String executionToken) {
        LeaseState state = leases.get(buildKey(taskRunId, idempotencyKey));
        if (state == null || !state.active) {
            return false;
        }
        if (!state.executionToken.equals(executionToken)) {
            return false;
        }
        return !state.expired(timeProvider.now());
    }

    public Optional<String> failureType(String taskRunId, String idempotencyKey, String executionToken) {
        LeaseState state = leases.get(buildKey(taskRunId, idempotencyKey));
        if (state == null) {
            return Optional.of("LEASE_EXPIRED");
        }
        if (!state.executionToken.equals(executionToken)) {
            return Optional.of("DUPLICATE_SUBMISSION_REJECTED");
        }
        if (state.expired(timeProvider.now())) {
            return Optional.of("LEASE_EXPIRED");
        }
        return Optional.empty();
    }

    public void complete(String taskRunId, String idempotencyKey, String executionToken) {
        String key = buildKey(taskRunId, idempotencyKey);
        leases.computeIfPresent(key, (ignored, existing) -> {
            if (existing.executionToken.equals(executionToken)) {
                return existing.completed();
            }
            return existing;
        });
    }

    private String buildKey(String taskRunId, String idempotencyKey) {
        return (taskRunId == null ? "" : taskRunId) + "::" + (idempotencyKey == null ? "" : idempotencyKey);
    }

    public record LeaseTicket(
            boolean accepted,
            String executionToken,
            Integer leaseVersion,
            Integer timeoutSeconds,
            Instant startedAt,
            Instant deadline) {
    }

    private record LeaseState(
            String executionToken,
            String taskRunId,
            String idempotencyKey,
            int leaseVersion,
            Integer timeoutSeconds,
            Instant createdAt,
            boolean active) {

        private boolean expired(Instant now) {
            if (timeoutSeconds == null || timeoutSeconds <= 0 || now == null || createdAt == null) {
                return false;
            }
            return createdAt.plusSeconds(timeoutSeconds).isBefore(now);
        }

        private Instant deadline() {
            if (timeoutSeconds == null || timeoutSeconds <= 0 || createdAt == null) {
                return null;
            }
            return createdAt.plusSeconds(timeoutSeconds);
        }

        private LeaseState completed() {
            return new LeaseState(
                    executionToken,
                    taskRunId,
                    idempotencyKey,
                    leaseVersion,
                    timeoutSeconds,
                    createdAt,
                    false);
        }
    }
}
