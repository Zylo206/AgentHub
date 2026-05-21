package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenCodeAgentAdapter implements AgentAdapter {

    private final TimeProvider timeProvider;
    private final boolean enabled;

    public OpenCodeAgentAdapter(
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.open-code.enabled:false}") boolean enabled) {
        this.timeProvider = timeProvider;
        this.enabled = enabled;
    }

    @Override
    public AgentAdapterType type() {
        return AgentAdapterType.OPEN_CODE;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        return new AgentAdapterDescriptor(
                AgentAdapterType.OPEN_CODE,
                AgentAdapterHealthStatus.PLACEHOLDER,
                enabled,
                true,
                enabled
                        ? "OpenCode adapter is enabled in config, but this build still uses a placeholder implementation."
                        : "OpenCode adapter is a placeholder in this demo build.",
                "No real external OpenCode call is implemented in this build.");
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        String content = enabled
                ? "OpenCode adapter is marked enabled in config, but this demo build does not perform any real external OpenCode call."
                : "OpenCode adapter is configured as a placeholder in this demo build. No real external OpenCode call was made.";

        return new AgentResponse(
                request.requestId(),
                AgentAdapterType.OPEN_CODE,
                AgentAdapterType.OPEN_CODE,
                AgentAdapterType.OPEN_CODE,
                false,
                AgentExecutionStatus.FALLBACK_USED,
                content,
                List.of(),
                null,
                startedAt,
                timeProvider.now());
    }
}
