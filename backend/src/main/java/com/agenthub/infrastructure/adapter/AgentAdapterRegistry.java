package com.agenthub.infrastructure.adapter;

import com.agenthub.common.TimeProvider;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AgentAdapterRegistry {

    private final Map<AgentAdapterType, AgentAdapter> adapterMap;
    private final AgentAdapterType defaultAdapterType;
    private final TimeProvider timeProvider;

    public AgentAdapterRegistry(
            List<AgentAdapter> adapters,
            TimeProvider timeProvider,
            @Value("${agenthub.adapters.default-type:MOCK}") String defaultAdapterType) {
        this.timeProvider = timeProvider;
        this.defaultAdapterType = parseAdapterType(defaultAdapterType);
        this.adapterMap = new EnumMap<>(AgentAdapterType.class);

        for (AgentAdapter adapter : adapters) {
            this.adapterMap.put(adapter.type(), adapter);
        }

        if (!this.adapterMap.containsKey(AgentAdapterType.MOCK)) {
            throw new IllegalStateException("MOCK adapter must be registered.");
        }
    }

    public List<AgentAdapterType> listAdapters() {
        List<AgentAdapterType> adapterTypes = new ArrayList<>(adapterMap.keySet());
        adapterTypes.sort(Comparator.comparing(Enum::name));
        return List.copyOf(adapterTypes);
    }

    public AgentAdapter getAdapter(AgentAdapterType type) {
        AgentAdapter adapter = adapterMap.get(type);
        if (adapter == null) {
            throw new IllegalArgumentException("Adapter not registered: " + type);
        }
        return adapter;
    }

    public AgentAdapter getDefaultAdapter() {
        return getAdapter(defaultAdapterType);
    }

    public AgentResponse executeWithFallback(AgentAdapterType preferredType, AgentRequest request) {
        if (preferredType == defaultAdapterType) {
            AgentResponse defaultResponse = getDefaultAdapter().execute(request);
            return buildDirectResponse(preferredType, defaultAdapterType, defaultResponse);
        }

        AgentAdapter preferredAdapter = adapterMap.get(preferredType);
        if (preferredAdapter == null) {
            return buildFallbackResponse(
                    preferredType,
                    "Preferred adapter is not registered in this demo build.",
                    request);
        }

        AgentResponse preferredResponse = preferredAdapter.execute(request);
        if (preferredResponse.status() == AgentExecutionStatus.COMPLETED) {
            return buildDirectResponse(preferredType, preferredType, preferredResponse);
        }

        return buildFallbackResponse(preferredType, preferredResponse.content(), request);
    }

    private AgentResponse buildDirectResponse(
            AgentAdapterType preferredType,
            AgentAdapterType actualType,
            AgentResponse response) {
        return new AgentResponse(
                response.requestId(),
                preferredType,
                actualType,
                actualType,
                false,
                response.status(),
                response.content(),
                response.producedArtifactHints(),
                response.errorMessage(),
                response.startedAt(),
                response.completedAt());
    }

    private AgentResponse buildFallbackResponse(
            AgentAdapterType preferredType,
            String reason,
            AgentRequest request) {
        AgentResponse mockResponse = getDefaultAdapter().execute(request);
        String content = "Preferred adapter " + preferredType
                + " is unavailable in this demo build. Falling back to " + defaultAdapterType + ".\n\n"
                + (reason == null ? "" : reason + "\n\n")
                + mockResponse.content();

        return new AgentResponse(
                request.requestId(),
                preferredType,
                defaultAdapterType,
                defaultAdapterType,
                true,
                AgentExecutionStatus.FALLBACK_USED,
                content,
                mockResponse.producedArtifactHints(),
                mockResponse.errorMessage(),
                mockResponse.startedAt() == null ? timeProvider.now() : mockResponse.startedAt(),
                timeProvider.now());
    }

    private AgentAdapterType parseAdapterType(String value) {
        try {
            return AgentAdapterType.valueOf(value.trim().toUpperCase().replace('-', '_'));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Invalid default adapter type: " + value);
        }
    }
}
