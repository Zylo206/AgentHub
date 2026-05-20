package com.agenthub.application.agent;

import com.agenthub.infrastructure.adapter.AgentAdapterRegistry;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentExecutorService {

    private final AgentAdapterRegistry agentAdapterRegistry;

    public AgentExecutorService(AgentAdapterRegistry agentAdapterRegistry) {
        this.agentAdapterRegistry = agentAdapterRegistry;
    }

    public AgentResponse execute(AgentAdapterType adapterType, AgentRequest request) {
        return agentAdapterRegistry.executeWithFallback(adapterType, request);
    }

    public AgentResponse executeWithMock(AgentRequest request) {
        return agentAdapterRegistry.getDefaultAdapter().execute(request);
    }

    public List<AgentAdapterType> listAvailableAdapters() {
        return agentAdapterRegistry.listAdapters();
    }
}
