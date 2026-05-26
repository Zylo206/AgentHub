package com.agenthub.application.realtime;

import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.stereotype.Service;

@Service
public class RunCancellationRegistry {

    private final ConcurrentMap<String, RunCancellationToken> tokens = new ConcurrentHashMap<>();
    private final TimeProvider timeProvider;

    public RunCancellationRegistry(TimeProvider timeProvider) {
        this.timeProvider = timeProvider;
    }

    public RunCancellationToken register(String conversationId, String taskRunId) {
        RunCancellationToken token = new RunCancellationToken(conversationId, taskRunId);
        tokens.put(taskRunId, token);
        return token;
    }

    public Optional<RunCancellationToken> find(String taskRunId) {
        if (taskRunId == null || taskRunId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(tokens.get(taskRunId));
    }

    public RunCancellationToken request(String conversationId, String taskRunId, String action, String reason) {
        RunCancellationToken token = tokens.computeIfAbsent(taskRunId, ignored -> new RunCancellationToken(conversationId, taskRunId));
        token.request(action, reason, timeProvider.now());
        return token;
    }

    public boolean isCancellationRequested(String taskRunId) {
        return find(taskRunId).map(RunCancellationToken::isCancellationRequested).orElse(false);
    }

    public void clear(String taskRunId) {
        if (taskRunId != null) {
            tokens.remove(taskRunId);
        }
    }

    public static class RunCancellationToken {
        private final String conversationId;
        private final String taskRunId;
        private volatile boolean cancellationRequested;
        private volatile String action;
        private volatile String reason;
        private volatile Instant requestedAt;

        private RunCancellationToken(String conversationId, String taskRunId) {
            this.conversationId = conversationId;
            this.taskRunId = taskRunId;
        }

        public void request(String action, String reason, Instant requestedAt) {
            this.cancellationRequested = true;
            this.action = action;
            this.reason = reason;
            this.requestedAt = requestedAt;
        }

        public boolean isCancellationRequested() {
            return cancellationRequested;
        }

        public String getConversationId() {
            return conversationId;
        }

        public String getTaskRunId() {
            return taskRunId;
        }

        public String getAction() {
            return action;
        }

        public String getReason() {
            return reason;
        }

        public Instant getRequestedAt() {
            return requestedAt;
        }

        public String summary() {
            String normalizedAction = action == null || action.isBlank() ? "CANCEL_RUN" : action;
            return normalizedAction + " requested"
                    + (reason == null || reason.isBlank() ? "." : ". Reason: " + reason);
        }
    }
}
