package com.agenthub.application.agent;

import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentId;
import com.agenthub.domain.agent.AgentRepository;
import java.util.List;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;

@Service
public class AgentApplicationService {

    private final AgentRepository agentRepository;

    public AgentApplicationService(AgentRepository agentRepository) {
        this.agentRepository = agentRepository;
    }

    public List<Agent> listAgents() {
        return agentRepository.findAll();
    }

    public Agent getAgent(String agentId) {
        return agentRepository.findById(new AgentId(agentId))
                .orElseThrow(() -> new NoSuchElementException("Agent not found: " + agentId));
    }
}
