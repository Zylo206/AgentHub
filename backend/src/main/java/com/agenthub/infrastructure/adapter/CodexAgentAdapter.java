package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodexAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final boolean enabled;

    public CodexAgentAdapter(
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.codex.enabled:false}") boolean enabled) {
        this.timeProvider = timeProvider;
        this.enabled = enabled;
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.CODEX;
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        String content = enabled
                ? "Codex adapter is marked enabled in config, but this demo build does not perform any real external Codex call."
                : "Codex adapter is configured as a placeholder in this demo build. No real external Codex call was made.";

        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.CODEX,
                AgentAdapterType.CODEX,
                AgentAdapterType.CODEX,
                false,
                AgentExecutionStatus.FALLBACK_USED,
                content,
                List.of(),
                null,
                startedAt,
                timeProvider.now());
    }
}
