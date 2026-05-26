package com.agenthub.application.agent;

import com.agenthub.common.IdGenerator;
import com.agenthub.infrastructure.adapter.AgentAdapterDescriptor;
import com.agenthub.infrastructure.adapter.AgentAdapterRegistry.AdapterRouteStats;
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
    private final AdapterQualityMetricsService adapterQualityMetricsService;
    private final IdGenerator idGenerator;
    private final AgentAdapterType defaultAdapterType;

    public AgentAdapterApplicationService(
            AgentExecutorService agentExecutorService,
            AdapterQualityMetricsService adapterQualityMetricsService,
            IdGenerator idGenerator,
            @Value("${agenthub.adapters.default-type:MOCK}") String defaultAdapterType) {
        this.agentExecutorService = agentExecutorService;
        this.adapterQualityMetricsService = adapterQualityMetricsService;
        this.idGenerator = idGenerator;
        this.defaultAdapterType = parseAdapterType(defaultAdapterType);
    }

    public List<AvailableAdapterView> listAdapters() {
        return agentExecutorService.listAdapterDescriptors().stream()
                .map(descriptor -> {
                    AdapterRouteStats stats = agentExecutorService.routeStats(descriptor.adapterType());
                    return new AvailableAdapterView(
                            descriptor.adapterType().name(),
                            descriptor.status().name(),
                            descriptor.enabled(),
                            descriptor.placeholder(),
                            descriptor.description(),
                            descriptor.failureReason(),
                            descriptor.adapterType() == defaultAdapterType,
                            stats.attempts(),
                            stats.successes(),
                            stats.fallbacks(),
                            stats.failures(),
                            stats.fallbackRate(),
                            stats.successRate());
                })
                .toList();
    }

    public List<AdapterQualityMetricsService.AdapterQualityMetricsView> listQualityMetrics() {
        return adapterQualityMetricsService.listMetrics();
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
            String adapterType,
            String status,
            boolean enabled,
            boolean placeholder,
            String description,
            String failureReason,
            boolean isDefault,
            long routeAttempts,
            long routeSuccesses,
            long routeFallbacks,
            long routeFailures,
            double fallbackRate,
            double successRate) {
    }
}
