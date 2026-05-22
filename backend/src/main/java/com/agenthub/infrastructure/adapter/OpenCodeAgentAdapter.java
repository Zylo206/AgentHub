package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.cli.CliAgentAdapterSupport;
import com.agenthub.infrastructure.adapter.cli.CliAgentCommandRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OpenCodeAgentAdapter extends CliAgentAdapterSupport {

    public OpenCodeAgentAdapter(
            TimeProvider timeProvider,
            CliAgentCommandRunner commandRunner,
            @Value("${agenthub.adapters.open-code.enabled:false}") boolean enabled,
            @Value("${agenthub.adapters.open-code.command:opencode}") String command,
            @Value("${agenthub.adapters.open-code.args-template:}") String argsTemplate,
            @Value("${agenthub.adapters.open-code.timeout-seconds:30}") int timeoutSeconds) {
        super(
                AgentAdapterType.OPEN_CODE,
                "OpenCode",
                timeProvider,
                commandRunner,
                enabled,
                command,
                argsTemplate,
                timeoutSeconds);
    }
}
