package com.agenthub.infrastructure.adapter.stats;

import com.agenthub.infrastructure.adapter.AgentAdapterRegistry.AdapterRouteStats;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.Map;

public interface AgentAdapterStatsRepository {

    Map<AgentAdapterType, AdapterRouteStats> load();

    void save(Map<AgentAdapterType, AdapterRouteStats> stats);
}
