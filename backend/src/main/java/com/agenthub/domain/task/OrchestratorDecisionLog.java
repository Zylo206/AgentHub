package com.agenthub.domain.task;

public class OrchestratorDecisionLog {

    private final String decisionMode;
    private final String plannerDecision;
    private final String routingDecision;
    private final String executionDecision;
    private final String aggregationDecision;
    private final String fallbackDecision;
    private final String summary;

    public OrchestratorDecisionLog(
            String decisionMode,
            String plannerDecision,
            String routingDecision,
            String executionDecision,
            String aggregationDecision,
            String fallbackDecision,
            String summary) {
        this.decisionMode = normalize(decisionMode, "RULE_BASED_DEMO");
        this.plannerDecision = normalize(plannerDecision, "Planner decision not recorded.");
        this.routingDecision = normalize(routingDecision, "Routing decision not recorded.");
        this.executionDecision = normalize(executionDecision, "Execution decision not recorded.");
        this.aggregationDecision = normalize(aggregationDecision, "Aggregation decision not recorded.");
        this.fallbackDecision = normalize(fallbackDecision, "Fallback decision not recorded.");
        this.summary = normalize(summary, "Orchestrator decision log is available.");
    }

    public static OrchestratorDecisionLog minimal(String summary) {
        return new OrchestratorDecisionLog(
                "RULE_BASED_DEMO",
                summary,
                summary,
                summary,
                summary,
                "No fallback decision recorded.",
                summary);
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public String getDecisionMode() {
        return decisionMode;
    }

    public String getPlannerDecision() {
        return plannerDecision;
    }

    public String getRoutingDecision() {
        return routingDecision;
    }

    public String getExecutionDecision() {
        return executionDecision;
    }

    public String getAggregationDecision() {
        return aggregationDecision;
    }

    public String getFallbackDecision() {
        return fallbackDecision;
    }

    public String getSummary() {
        return summary;
    }
}
