package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClaudeCodeAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final boolean enabled;

    public ClaudeCodeAgentAdapter(
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.claude-code.enabled:false}") boolean enabled) {
        this.timeProvider = timeProvider;
        this.enabled = enabled;
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.CLAUDE_CODE;
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        String content = enabled
                ? "Claude Code adapter is marked enabled in config, but this demo build does not perform any real external Claude Code call."
                : "Claude Code adapter is configured as a placeholder in this demo build. No real external Claude Code call was made.";

        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.CLAUDE_CODE,
                AgentAdapterType.CLAUDE_CODE,
                AgentAdapterType.CLAUDE_CODE,
                false,
                AgentExecutionStatus.FALLBACK_USED,
                content,
                List.of(),
                null,
                startedAt,
                timeProvider.now());
    }
}
