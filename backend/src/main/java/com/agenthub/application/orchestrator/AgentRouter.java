package com.agenthub.application.orchestrator;

import com.agenthub.application.agent.AgentApplicationService;
import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.AgentRole;
import com.agenthub.domain.agent.AgentStatus;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.Comparator;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AgentRouter {

    private final AgentApplicationService agentApplicationService;
    private final AgentRoutingService agentRoutingService;
    private final ToolCapabilityRegistry toolCapabilityRegistry;
    private final AdapterRoutingService adapterRoutingService;

    public AgentRouter(
            AgentApplicationService agentApplicationService,
            AgentRoutingService agentRoutingService,
            ToolCapabilityRegistry toolCapabilityRegistry,
            AdapterRoutingService adapterRoutingService) {
        this.agentApplicationService = agentApplicationService;
        this.agentRoutingService = agentRoutingService;
        this.toolCapabilityRegistry = toolCapabilityRegistry;
        this.adapterRoutingService = adapterRoutingService;
    }

    public RoutedAgent route(OrchestratorStepPlan stepPlan, Agent selectedAgent) {
        if (selectedAgent != null && stepPlan.stepOrder() == 1) {
            boolean supportsSkill = toolCapabilityRegistry.supportsRequiredSkill(selectedAgent, stepPlan.requiredSkill());
            RouteScores scores = scoreAgent(selectedAgent, stepPlan.requiredSkill());
            return new RoutedAgent(
                    selectedAgent.getId().value(),
                    selectedAgent.getName(),
                    enrichSystemPromptWithToolCapabilities(selectedAgent.getSystemPrompt(), selectedAgent),
                    scores.preferredAdapterType(),
                    (supportsSkill
                            ? "Selected Agent matched the required skill through tool capability mapping."
                            : "Selected Agent is explicit but tool tags do not clearly match the required skill; execution still proceeds with adapter fallback protection.")
                            + " "
                            + scores.describe(),
                    toolCapabilityRegistry.describeCapabilities(selectedAgent));
        }

        Optional<AgentMatch> capabilityMatch = findCapabilityMatchedAgent(stepPlan);
        if (capabilityMatch.isPresent()) {
            AgentMatch match = capabilityMatch.get();
            Agent matchedAgent = match.agent();
            return new RoutedAgent(
                    matchedAgent.getId().value(),
                    matchedAgent.getName(),
                    enrichSystemPromptWithToolCapabilities(matchedAgent.getSystemPrompt(), matchedAgent),
                    match.scores().preferredAdapterType(),
                    "Tool capability router selected Agent for requiredSkill="
                            + stepPlan.requiredSkill()
                            + ". "
                            + match.scores().describe()
                            + ", originalPlanAgent="
                            + stepPlan.agentName()
                            + ".",
                    toolCapabilityRegistry.describeCapabilities(matchedAgent));
        }

        AgentAdapterType preferredAdapterType = resolveStepPreferredAdapter(stepPlan);
        RouteScores fallbackScores = scoreAdapter(0, preferredAdapterType);
        return new RoutedAgent(
                stepPlan.agentId(),
                stepPlan.agentName(),
                defaultSystemPrompt(stepPlan.agentRole()),
                preferredAdapterType,
                stepPlan.routingReason() + " " + fallbackScores.describe(),
                "Built-in Agent route; static tool capability mapping is not required.");
    }

    private Optional<AgentMatch> findCapabilityMatchedAgent(OrchestratorStepPlan stepPlan) {
        return agentApplicationService.listAgents().stream()
                .filter(agent -> agent.getStatus() == AgentStatus.ACTIVE)
                .filter(agent -> !BuiltInAgentIds.ORCHESTRATOR.equals(agent.getId().value()))
                .map(agent -> new AgentMatch(agent, scoreAgent(agent, stepPlan.requiredSkill())))
                .filter(match -> match.scores().capabilityScore() > 0)
                .max(Comparator
                        .comparingInt((AgentMatch match) -> match.scores().totalScore())
                        .thenComparingInt(match -> match.agent().getRole() == AgentRole.CUSTOM ? 1 : 0)
                        .thenComparing(match -> match.agent().getUpdatedAt()));
    }

    private RouteScores scoreAgent(Agent agent, String requiredSkill) {
        int capabilityScore = toolCapabilityRegistry.matchScore(agent, requiredSkill);
        AgentAdapterType preferredAdapterType = agentRoutingService.resolvePreferredAdapterForAgent(agent);
        return scoreAdapter(capabilityScore, preferredAdapterType);
    }

    private RouteScores scoreAdapter(int capabilityScore, AgentAdapterType preferredAdapterType) {
        AdapterRoutingDecision adapterDecision = adapterRoutingService.route(preferredAdapterType);
        AdapterRoutingDecision.AdapterCandidateScore selectedScore = adapterDecision.selectedScore();
        int adapterCandidateScore = selectedScore == null ? 0 : (int) Math.round(selectedScore.totalScore());
        int totalScore = (int) Math.round(
                capabilityScore * 0.55
                        + adapterCandidateScore * 0.45);
        return new RouteScores(
                adapterDecision.selectedAdapterType(),
                capabilityScore,
                adapterCandidateScore,
                adapterDecision.describe(),
                Math.max(0, totalScore));
    }

    private AgentAdapterType resolveStepPreferredAdapter(OrchestratorStepPlan stepPlan) {
        String configuredAdapter = stepPlan.preferredAdapterType();
        if (configuredAdapter != null && !configuredAdapter.isBlank()) {
            try {
                return AgentAdapterType.valueOf(configuredAdapter.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                return AgentAdapterType.MOCK;
            }
        }

        AgentRole role = AgentRole.valueOf(stepPlan.agentRole());
        return agentRoutingService.resolvePreferredAdapterForAgentRole(role);
    }

    private String defaultSystemPrompt(String agentRole) {
        return switch (agentRole) {
            case "FRONTEND_BUILDER" -> "你负责 AgentHub Demo 中的前端实现。";
            case "BACKEND_WORKER" -> "你负责 AgentHub Demo 中的 API 契约和后端结构说明。";
            case "REVIEWER" -> "你负责 AgentHub Demo 中的评审和验收检查。";
            default -> "你是 AgentHub Demo 中的协作 Agent。";
        };
    }

    private String enrichSystemPromptWithToolCapabilities(String systemPrompt, Agent agent) {
        String basePrompt = systemPrompt == null || systemPrompt.isBlank()
                ? "你是 AgentHub 中的自定义协作 Agent。"
                : systemPrompt;
        return basePrompt + "\n\n" + toolCapabilityRegistry.describeCapabilities(agent);
    }

    public record RoutedAgent(
            String agentId,
            String agentName,
            String systemPrompt,
            AgentAdapterType preferredAdapterType,
            String routingReason,
            String toolCapabilitySummary) {
    }

    private record RouteScores(
            AgentAdapterType preferredAdapterType,
            int capabilityScore,
            int adapterCandidateScore,
            String adapterDecisionSummary,
            int totalScore) {

        private String describe() {
            return "score="
                    + totalScore
                    + ", capabilityScore="
                    + capabilityScore
                    + ", adapterCandidateScore="
                    + adapterCandidateScore
                    + ", selectedAdapter="
                    + preferredAdapterType
                    + ", preferredAdapter="
                    + preferredAdapterType
                    + ", adapterDecision="
                    + adapterDecisionSummary
                    + ".";
        }
    }

    private record AgentMatch(Agent agent, RouteScores scores) {
    }
}
