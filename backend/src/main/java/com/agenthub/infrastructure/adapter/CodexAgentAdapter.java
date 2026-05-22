package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.cli.CliAgentAdapterSupport;
import com.agenthub.infrastructure.adapter.cli.CliAgentCommandRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CodexAgentAdapter extends CliAgentAdapterSupport {

    public CodexAgentAdapter(
            TimeProvider timeProvider,
            CliAgentCommandRunner commandRunner,
            @Value("${agenthub.adapters.codex.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.codex.command:codex}") String command,
            @Value("${agenthub.adapters.codex.args-template:}") String argsTemplate,
            @Value("${agenthub.adapters.codex.timeout-seconds:30}") int timeoutSeconds) {
        super(
                AgentAdapterType.CODEX,
                "Codex",
                timeProvider,
                commandRunner,
                enabled,
                command,
                argsTemplate,
                timeoutSeconds);
    }
}
