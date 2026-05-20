package com.agenthub.application.agent;

import com.agenthub.common.IdGenerator;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AgentAdapterApplicationService {

    private final AgentExecutorService agentExecutorService;
    private final IdGenerator idGenerator;
    private final AgentAdapterType defaultAdapterType;

    public AgentAdapterApplicationService(
            AgentExecutorService agentExecutorService,
            IdGenerator idGenerator,
            @Value("${agenthub.adapters.default-type:MOCK}") String defaultAdapterType) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
        this.defaultAdapterType = parseAdapterType(defaultAdapterType);
    }

    public List<AvailableAdapterView> listAdapters() {
        List<AgentAdapterType> availableTypes = agentExecutorService.listAvailableAdapters();

        return List.of(AgentAdapterType.values()).stream()
                .map(type -> new AvailableAdapterView(
                        type.name(),
                        availableTypes.contains(type),
                        type != AgentAdapterType.MOCK,
                        describeAdapter(type),
                        type == defaultAdapterType))
                .toList();
    }

    public AgentResponse execute(String adapterType, ExecuteAgentAdapterCommand command) {
        if ((command.userInput() == null || command.userInput().isBlank())
                && (command.taskDescription() == null || command.taskDescription().isBlank())) {
            throw new IllegalArgumentException("Either userInput or taskDescription must be provided.");
        }

        AgentAdapterType preferredType = parseAdapterType(adapterType);

        AgentRequest request = new AgentRequest(
                idGenerator.nextId("adapter_req"),
                command.conversationId(),
                command.taskRunId(),
                command.taskStepId(),
                command.agentId(),
                command.agentName(),
                command.userInput(),
                command.systemPrompt(),
                command.taskDescription(),
                command.contextItems(),
                command.artifactSummaries(),
                command.metadata() == null ? Map.of() : command.metadata());

        return agentExecutorService.execute(preferredType, request);
    }

    private AgentAdapterType parseAdapterType(String value) {
        try {
            return AgentAdapterType.valueOf(value.trim().toUpperCase(Locale.ROOT).replace('-', '_'));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported adapterType: " + value);
        }
    }

    private String describeAdapter(AgentAdapterType adapterType) {
        return switch (adapterType) {
            case MOCK -> "Stable local mock adapter for deterministic demo responses.";
            case CODEX -> "Placeholder adapter for future Codex integration. No external call is made in this build.";
            case CLAUDE_CODE -> "Placeholder adapter for future Claude Code integration. No external call is made in this build.";
            case OPEN_CODE -> "Reserved adapter type for future OpenCode integration.";
        };
    }

    public record ExecuteAgentAdapterCommand(
            String conversationId,
            String taskRunId,
            String taskStepId,
            String agentId,
            String agentName,
            String userInput,
            String systemPrompt,
            String taskDescription,
            List<String> contextItems,
            List<String> artifactSummaries,
            Map<String, Object> metadata) {
    }

    public record AvailableAdapterView(
            String type,
            boolean available,
            boolean placeholder,
            String description,
            boolean isDefault) {
    }
}
