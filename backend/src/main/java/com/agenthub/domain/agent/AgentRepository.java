package com.agenthub.domain.agent;

import java.util.List;
import java.util.Optional;

public interface AgentRepository {

    Agent save(Agent agent);

    Optional<Agent> findById(AgentId agentId);

    List<Agent> findAll();

    List<Agent> findByRole(AgentRole role);

    void deleteById(AgentId agentId);
}
