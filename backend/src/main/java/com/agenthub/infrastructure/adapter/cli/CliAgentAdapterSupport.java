package com.agenthub.infrastructure.adapter.cli;

import com.agenthub.common.TimeProvider;
import com.agenthub.infrastructure.adapter.AgentAdapter;
import com.agenthub.infrastructure.adapter.AgentAdapterDescriptor;
import com.agenthub.infrastructure.adapter.AgentAdapterHealthStatus;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.time.Instant;
import java.util.List;

public abstract class CliAgentAdapterSupport implements AgentAdapter {

    private final AgentAdapterType type;
    private final String displayName;
    private final TimeProvider timeProvider;
    private final CliAgentCommandRunner commandRunner;
    private final boolean enabled;
    private final String command;
    private final String argsTemplate;
    private final int timeoutSeconds;

    protected CliAgentAdapterSupport(
            AgentAdapterType type,
            String displayName,
            TimeProvider timeProvider,
            CliAgentCommandRunner commandRunner,
            boolean enabled,
            String command,
            String argsTemplate,
            int timeoutSeconds) {
        this.type = type;
        this.displayName = displayName;
        this.timeProvider = timeProvider;
        this.commandRunner = commandRunner;
        this.enabled = enabled;
        this.command = command == null ? "" : command.trim();
        this.argsTemplate = argsTemplate == null ? "" : argsTemplate.trim();
        this.timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
    }

    @Override
    public AgentAdapterType type() {
        return type;
    }

    @Override
    public AgentAdapterDescriptor describe() {
        if (!enabled) {
            return new AgentAdapterDescriptor(
                    type,
                    AgentAdapterHealthStatus.DISABLED,
                    false,
                    false,
                    displayName + " CLI adapter is disabled.",
                    "Set the corresponding enabled configuration to true to enable CLI probing.");
        }

        CliAgentCommandRunner.CliAvailability availability = commandRunner.checkAvailable(command);
        if (!availability.available()) {
            return new AgentAdapterDescriptor(
                    type,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    displayName + " CLI command is not available.",
                    availability.failureReason());
        }

        if (argsTemplate.isBlank()) {
            return new AgentAdapterDescriptor(
                    type,
                    AgentAdapterHealthStatus.MISCONFIGURED,
                    true,
                    false,
                    displayName + " CLI command is available but execution args-template is not configured.",
                    "CLI command is available but args-template is not configured.");
        }

        return new AgentAdapterDescriptor(
                type,
                AgentAdapterHealthStatus.AVAILABLE,
                true,
                false,
                displayName + " CLI adapter is configured for non-interactive command execution.",
                null);
    }

    @Override
    public AgentResponse execute(AgentRequest request) {
        Instant startedAt = timeProvider.now();
        AgentAdapterDescriptor descriptor = describe();
        if (descriptor.status() != AgentAdapterHealthStatus.AVAILABLE) {
            return failedResponse(
                    request,
                    startedAt,
                    descriptor.description(),
                    descriptor.failureReason());
        }

        CliAgentCommandRunner.CliCommandResult result =
                commandRunner.execute(command, argsTemplate, request, timeoutSeconds);
        if (!result.success()) {
            String reason = buildFailureReason(result);
            return failedResponse(
                    request,
                    startedAt,
                    displayName + " CLI adapter could not complete the request.",
                    reason);
        }

        String content = result.stdout() == null ? "" : result.stdout().trim();
        if (content.isBlank()) {
            return failedResponse(
                    request,
                    startedAt,
                    displayName + " CLI adapter returned empty stdout.",
                    "CLI command completed but stdout was empty.");
        }

        String stderr = result.stderr() == null || result.stderr().isBlank() ? null : result.stderr().trim();
        return new AgentResponse(
                request.requestId(),
                type,
                type,
                type,
                false,
                AgentExecutionStatus.COMPLETED,
                content,
                List.of("TEXT:" + type.name().toLowerCase() + "-cli-response"),
                stderr,
                startedAt,
                timeProvider.now());
    }

    private AgentResponse failedResponse(
            AgentRequest request,
            Instant startedAt,
            String content,
            String errorMessage) {
        return new AgentResponse(
                request.requestId(),
                type,
                type,
                type,
                false,
                AgentExecutionStatus.FAILED,
                content,
                List.of(),
                errorMessage,
                startedAt,
                timeProvider.now());
    }

    private String buildFailureReason(CliAgentCommandRunner.CliCommandResult result) {
        if (result.timedOut()) {
            return "CLI command timed out.";
        }
        String stderr = result.stderr() == null ? "" : result.stderr().trim();
        if (!stderr.isBlank()) {
            return "CLI command failed with exit code " + result.exitCode() + ": " + stderr;
        }
        String stdout = result.stdout() == null ? "" : result.stdout().trim();
        if (!stdout.isBlank()) {
            return "CLI command failed with exit code " + result.exitCode() + ": " + stdout;
        }
        return "CLI command failed with exit code " + result.exitCode() + ".";
    }
}
