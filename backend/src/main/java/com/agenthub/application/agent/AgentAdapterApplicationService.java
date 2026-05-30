package com.agenthub.application.agent;

import com.agenthub.common.IdGenerator;
import com.agenthub.infrastructure.adapter.AgentAdapterDescriptor;
import com.agenthub.infrastructure.adapter.AgentAdapterRegistry.AdapterRouteStats;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import com.agenthub.infrastructure.adapter.AdapterArtifactContractValidator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AgentAdapterApplicationService {

    private final AgentExecutorService agentExecutorService;
    private final AdapterQualityMetricsService adapterQualityMetricsService;
    private final AdapterArtifactContractValidator artifactContractValidator;
    private final IdGenerator idGenerator;
    private final AgentAdapterType defaultAdapterType;

    public AgentAdapterApplicationService(
            AgentExecutorService agentExecutorService,
            AdapterQualityMetricsService adapterQualityMetricsService,
            AdapterArtifactContractValidator artifactContractValidator,
            IdGenerator idGenerator,
            @Value("${agenthub.adapters.default-type:MOCK}") String defaultAdapterType) {
        this.agentExecutorService = agentExecutorService;
        this.adapterQualityMetricsService = adapterQualityMetricsService;
        this.artifactContractValidator = artifactContractValidator;
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
                            stats.successRate(),
                            descriptor.supportedModes(),
                            descriptor.safetyPolicies(),
                            descriptor.capabilityDetails());
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

        AgentResponse response = agentExecutorService.execute(preferredType, request);
        recordDirectExecuteQuality(preferredType, response);
        return response;
    }

    private void recordDirectExecuteQuality(AgentAdapterType preferredType, AgentResponse response) {
        if (preferredType == AgentAdapterType.MOCK) {
            return;
        }
        boolean completed = response != null && response.status() == AgentExecutionStatus.COMPLETED;
        boolean fallbackUsed = response != null
                && (response.fallbackUsed() || response.actualAdapterType() != preferredType);
        boolean preferredCompleted = completed && !fallbackUsed;

        String parseStatus = "NOT_ATTEMPTED";
        String qualityStatus = preferredCompleted ? "ACCEPTED" : "FALLBACK";
        String qualityReason = response == null ? "Direct execute returned no response." : response.errorMessage();
        boolean realOutputAccepted = false;

        if (preferredCompleted) {
            AdapterArtifactContractValidator.ValidationResult validation =
                    artifactContractValidator.validate(response.content());
            if (validation.valid()) {
                parseStatus = "VALID_JSON_ARTIFACTS";
                realOutputAccepted = true;
                qualityReason = "Direct execute returned a valid AgentHub Artifact JSON contract.";
            } else {
                parseStatus = "PARSE_FAILED";
                qualityStatus = "REJECTED";
                qualityReason = validation.errorMessage();
                realOutputAccepted = false;
            }
        } else if (isContractFailure(response)) {
            parseStatus = "PARSE_FAILED";
            qualityStatus = "REJECTED";
        }

        adapterQualityMetricsService.record(new AdapterQualityMetricsService.QualityObservation(
                preferredType,
                preferredCompleted,
                fallbackUsed,
                realOutputAccepted,
                parseStatus,
                "NOT_ATTEMPTED",
                qualityStatus,
                qualityReason));
    }

    private boolean isContractFailure(AgentResponse response) {
        String diagnostic = response == null
                ? ""
                : ((response.errorMessage() == null ? "" : response.errorMessage())
                + "\n"
                + (response.content() == null ? "" : response.content()));
        String normalized = diagnostic.toLowerCase(Locale.ROOT);
        return normalized.contains("failuretype=contract_invalid")
                || normalized.contains("parse_failed")
                || normalized.contains("artifact json schema")
                || normalized.contains("artifact contract")
                || normalized.contains("invalid json")
                || normalized.contains("not valid json");
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
            double successRate,
            List<String> supportedModes,
            List<String> safetyPolicies,
            Map<String, Object> capabilityDetails) {
    }
}
