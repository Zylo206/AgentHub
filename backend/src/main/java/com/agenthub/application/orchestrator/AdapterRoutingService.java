package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.infrastructure.adapter.AgentAdapterDescriptor;
import com.agenthub.infrastructure.adapter.AgentAdapterRegistry.AdapterRouteStats;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AdapterRoutingService {

    private final AgentExecutorService agentExecutorService;

    public AdapterRoutingService(AgentExecutorService agentExecutorService) {
        this.agentExecutorService = agentExecutorService;
    }

    public AdapterRoutingDecision route(AgentAdapterType agentPreferredAdapterType) {
        AgentAdapterType preferred = agentPreferredAdapterType == null ? AgentAdapterType.MOCK : agentPreferredAdapterType;
        List<AdapterRoutingDecision.AdapterCandidateScore> scores = agentExecutorService.listAdapterDescriptors().stream()
                .map(descriptor -> score(descriptor, preferred))
                .sorted(Comparator.comparingDouble(AdapterRoutingDecision.AdapterCandidateScore::totalScore).reversed())
                .toList();

        AdapterRoutingDecision.AdapterCandidateScore selected = scores.stream()
                .findFirst()
                .orElse(new AdapterRoutingDecision.AdapterCandidateScore(
                        AgentAdapterType.MOCK,
                        0,
                        0,
                        0,
                        0,
                        0,
                        "MISSING"));
        String reason = "Adapter candidate pool selected "
                + selected.adapterType()
                + " from "
                + scores.size()
                + " candidate(s) using health 40%, success rate 25%, fallback penalty 20%, preferred bonus 15%.";
        return new AdapterRoutingDecision(selected.adapterType(), scores, reason, "STEP_FALLBACK_TO_MOCK");
    }

    private AdapterRoutingDecision.AdapterCandidateScore score(
            AgentAdapterDescriptor descriptor,
            AgentAdapterType preferredAdapterType) {
        AdapterRouteStats stats = agentExecutorService.routeStats(descriptor.adapterType());
        double health = healthScore(descriptor);
        double successRate = successRateScore(stats);
        double fallbackPenalty = fallbackPenaltyScore(stats);
        double preferredBonus = descriptor.adapterType() == preferredAdapterType ? 100.0 : 0.0;
        double total = health * 0.40 + successRate * 0.25 - fallbackPenalty * 0.20 + preferredBonus * 0.15;
        return new AdapterRoutingDecision.AdapterCandidateScore(
                descriptor.adapterType(),
                Math.max(0.0, total),
                health,
                successRate,
                fallbackPenalty,
                preferredBonus,
                descriptor.status().name());
    }

    private double healthScore(AgentAdapterDescriptor descriptor) {
        if (descriptor == null || !descriptor.enabled()) {
            return 0.0;
        }
        return switch (descriptor.status()) {
            case AVAILABLE -> 100.0;
            case PLACEHOLDER -> 55.0;
            case MISCONFIGURED -> 20.0;
            case ERROR -> 10.0;
            case DISABLED -> 0.0;
        };
    }

    private double successRateScore(AdapterRouteStats stats) {
        if (stats == null || stats.attempts() == 0) {
            return 50.0;
        }
        return stats.successes() * 100.0 / stats.attempts();
    }

    private double fallbackPenaltyScore(AdapterRouteStats stats) {
        if (stats == null || stats.attempts() == 0) {
            return 0.0;
        }
        return stats.fallbacks() * 100.0 / stats.attempts();
    }
}
