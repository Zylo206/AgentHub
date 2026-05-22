package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.cli.CliAgentAdapterSupport;
import com.agenthub.infrastructure.adapter.cli.CliAgentCommandRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ClaudeCodeAgentAdapter extends CliAgentAdapterSupport {

    public ClaudeCodeAgentAdapter(
            TimeProvider timeProvider,
            CliAgentCommandRunner commandRunner,
            @Value("${agenthub.adapters.claude-code.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.claude-code.command:claude}") String command,
            @Value("${agenthub.adapters.claude-code.args-template:}") String argsTemplate,
            @Value("${agenthub.adapters.claude-code.timeout-seconds:30}") int timeoutSeconds) {
        super(
                AgentAdapterType.CLAUDE_CODE,
                "Claude Code",
                timeProvider,
                commandRunner,
                enabled,
                command,
                argsTemplate,
                timeoutSeconds);
    }
}
