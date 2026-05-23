package com.agenthub.application.orchestrator;

import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.application.agent.AgentExecutorService;
import com.agenthub.common.IdGenerator;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TaskPlanner {

    private final String plannerType;
    private final boolean fallbackToRuleBased;
    private final AgentExecutorService agentExecutorService;
    private final ObjectMapper objectMapper;
    private final IdGenerator idGenerator;
    private final PlannerPromptBuilder plannerPromptBuilder;

    public TaskPlanner(
            @Value("${agenthub.orchestrator.planner.type:RULE_BASED}") String plannerType,
            @Value("${agenthub.orchestrator.planner.fallback-to-rule-based:true}") boolean fallbackToRuleBased,
            AgentExecutorService agentExecutorService,
            ObjectMapper objectMapper,
            IdGenerator idGenerator,
            PlannerPromptBuilder plannerPromptBuilder) {
        this.plannerType = plannerType;
        this.fallbackToRuleBased = fallbackToRuleBased;
        this.agentExecutorService = agentExecutorService;
        this.objectMapper = objectMapper;
        this.idGenerator = idGenerator;
        this.plannerPromptBuilder = plannerPromptBuilder;
    }

    public OrchestratorPlan planDemoTask(String userInput, Agent selectedAgent) {
        return planDemoTask(userInput, selectedAgent, List.of());
    }

    public OrchestratorPlan planDemoTask(String userInput, Agent selectedAgent, List<Agent> mentionedAgents) {
        String normalizedPlannerType = plannerType == null ? "RULE_BASED" : plannerType.trim().toUpperCase(Locale.ROOT);
        if ("LLM".equals(normalizedPlannerType)) {
            PlannerAttempt plannerAttempt = tryCreateLlmPlan(userInput, selectedAgent, mentionedAgents);
            if (plannerAttempt.plan() != null) {
                return plannerAttempt.plan();
            }
            if (!fallbackToRuleBased) {
                throw new IllegalStateException("LLM planner failed and rule-based fallback is disabled: "
                        + plannerAttempt.failureReason());
            }
            return buildRuleBasedPlan(userInput, selectedAgent, mentionedAgents, "RULE_BASED_FALLBACK",
                    plannerAttempt.failureReason());
        }

        return buildRuleBasedPlan(userInput, selectedAgent, mentionedAgents, "RULE_BASED_DEMO", null);
    }

    private OrchestratorPlan buildRuleBasedPlan(
            String userInput,
            Agent selectedAgent,
            List<Agent> mentionedAgents,
            String planningMode,
            String fallbackReason) {
        String normalizedInput = userInput == null ? "" : userInput.toLowerCase(Locale.ROOT);
        boolean needsFrontend = containsAny(normalizedInput, "react", "页面", "登录", "ui", "前端", "frontend", "page");
        boolean needsBackend = containsAny(normalizedInput, "api", "接口", "后端", "数据结构", "backend", "contract");
        boolean needsReview = containsAny(normalizedInput, "检查", "review", "质量", "建议", "验收", "quality");

        if (needsFrontend) {
            needsBackend = true;
            needsReview = true;
        }

        needsFrontend = true;
        needsBackend = true;
        needsReview = true;

        if (!needsFrontend && !needsBackend && !needsReview) {
            needsFrontend = true;
            needsBackend = true;
            needsReview = true;
        }

        List<OrchestratorStepPlan> steps = new ArrayList<>();
        boolean hasParallelMentionGroup = mentionedAgents != null && mentionedAgents.size() > 1;
        if (needsFrontend) {
            steps.add(frontendStep(steps.size() + 1, selectedAgent, hasParallelMentionGroup));
        }
        if (needsBackend) {
            steps.add(backendStep(steps.size() + 1));
        }
        if (needsReview) {
            steps.add(reviewStep(steps.size() + 1, hasParallelMentionGroup));
        }

        if (steps.isEmpty()) {
            steps.add(frontendStep(1, selectedAgent, hasParallelMentionGroup));
            steps.add(backendStep(2));
            steps.add(reviewStep(3, hasParallelMentionGroup));
        }

        List<String> parallelGroups = mentionedAgents == null || mentionedAgents.size() <= 1
                ? List.of("GROUP_FRONTEND", "GROUP_BACKEND", "GROUP_REVIEW")
                : List.of("MENTIONED_AGENT_GROUP", "GROUP_BACKEND", "GROUP_REVIEW");

        return new OrchestratorPlan(
                "生成登录页、说明文档、API 契约和评审产物。",
                steps,
                List.of(
                        "支持邮箱登录和验证码登录",
                        "README 包含使用说明和扩展点",
                        "提供 API 契约产物",
                        "评审报告包含问题、建议和风险等级"),
                List.of("CODE", "MARKDOWN", "API_CONTRACT", "REVIEW_REPORT"),
                planningMode,
                parallelGroups,
                "Rule-based planner generated a stable demo plan from user input, selected agent, mentioned agents, and acceptance criteria.",
                fallbackReason);
    }

    private PlannerAttempt tryCreateLlmPlan(String userInput, Agent selectedAgent, List<Agent> mentionedAgents) {
        PlannerPromptBuilder.LayeredPlannerPrompt plannerPrompt =
                plannerPromptBuilder.build(userInput, selectedAgent, mentionedAgents);
        AgentResponse response = agentExecutorService.execute(
                AgentAdapterType.OPENAI_COMPATIBLE,
                new AgentRequest(
                        idGenerator.nextId("planner_req"),
                        "planner",
                        "planner",
                        "planner",
                        BuiltInAgentIds.ORCHESTRATOR,
                        "Orchestrator Planner",
                        plannerPrompt.userPrompt(),
                        plannerPrompt.systemPrompt(),
                        "Generate an AgentHub OrchestratorPlan JSON object only.",
                        plannerPrompt.contextItems(),
                        plannerPrompt.artifactSummaries(),
                        plannerPrompt.metadata()));

        if (response.status() != AgentExecutionStatus.COMPLETED
                || response.fallbackUsed()
                || response.actualAdapterType() == null
                || response.actualAdapterType() != AgentAdapterType.OPENAI_COMPATIBLE) {
            return new PlannerAttempt(null, "LLM planner unavailable or fell back: "
                    + (response.errorMessage() == null ? response.status().name() : response.errorMessage()));
        }

        try {
            return new PlannerAttempt(parseAndValidateLlmPlan(response.content(), selectedAgent, mentionedAgents), null);
        } catch (Exception exception) {
            String message = exception.getMessage() == null || exception.getMessage().isBlank()
                    ? exception.getClass().getSimpleName()
                    : exception.getMessage();
            return new PlannerAttempt(null, "LLM planner output failed schema validation: " + message);
        }
    }

    private OrchestratorPlan parseAndValidateLlmPlan(
            String rawContent,
            Agent selectedAgent,
            List<Agent> mentionedAgents) throws Exception {
        JsonNode root = objectMapper.readTree(extractJsonObject(rawContent));
        String goal = requireText(root, "goal");
        JsonNode stepsNode = requireArray(root, "steps");
        List<OrchestratorStepPlan> steps = new ArrayList<>();
        Set<Integer> stepOrders = new HashSet<>();
        boolean hasFrontend = false;
        boolean hasBackend = false;
        boolean hasReviewer = false;
        for (JsonNode stepNode : stepsNode) {
            String role = requireText(stepNode, "role").trim().toUpperCase(Locale.ROOT);
            int stepOrder = requirePositiveInt(stepNode, "stepOrder");
            if (!stepOrders.add(stepOrder)) {
                throw new IllegalArgumentException("Duplicate planner stepOrder: " + stepOrder);
            }
            String taskDescription = requireText(stepNode, "taskDescription");
            String requiredSkill = requireText(stepNode, "requiredSkill");
            String parallelGroupKey = optionalText(stepNode, "parallelGroupKey", "GROUP_" + stepOrder);
            List<Integer> dependsOnStepOrders = readIntegerArray(stepNode.path("dependsOnStepOrders"));
            String routingReason = optionalText(stepNode, "routingReason", "LLM planner routing");

            switch (role) {
                case "FRONTEND" -> {
                    hasFrontend = true;
                    steps.add(new OrchestratorStepPlan(
                            stepOrder,
                            selectedAgent == null ? BuiltInAgentIds.FRONTEND_BUILDER : selectedAgent.getId().value(),
                            selectedAgent == null ? "前端构建 Agent" : selectedAgent.getName(),
                            selectedAgent == null ? "FRONTEND_BUILDER" : selectedAgent.getRole().name(),
                            taskDescription,
                            requiredSkill,
                            List.of("CODE", "MARKDOWN"),
                            selectedAgent == null ? AgentAdapterType.CODEX.name() : preferredAdapterName(selectedAgent),
                            List.of("LLM planner", "TaskSpec", "用户原始需求"),
                            parallelGroupKey,
                            dependsOnStepOrders,
                            routingReason));
                }
                case "BACKEND" -> {
                    hasBackend = true;
                    steps.add(new OrchestratorStepPlan(
                            stepOrder,
                            BuiltInAgentIds.BACKEND_WORKER,
                            "后端协作 Agent",
                            "BACKEND_WORKER",
                            taskDescription,
                            requiredSkill,
                            List.of("API_CONTRACT"),
                            AgentAdapterType.MOCK.name(),
                            List.of("LLM planner", "前端产物摘要", "API 扩展点"),
                            parallelGroupKey,
                            dependsOnStepOrders,
                            routingReason));
                }
                case "REVIEWER" -> {
                    hasReviewer = true;
                    steps.add(new OrchestratorStepPlan(
                            stepOrder,
                            BuiltInAgentIds.REVIEWER,
                            "评审 Agent",
                            "REVIEWER",
                            taskDescription,
                            requiredSkill,
                            List.of("REVIEW_REPORT"),
                            AgentAdapterType.CLAUDE_CODE.name(),
                            List.of("LLM planner", "全部相关 Artifact", "验收标准"),
                            parallelGroupKey,
                            dependsOnStepOrders,
                            routingReason));
                }
                default -> throw new IllegalArgumentException("Unsupported planner step role: " + role);
            }
        }

        if (!hasFrontend || !hasBackend || !hasReviewer || steps.size() != 3) {
            throw new IllegalArgumentException("Planner output must contain exactly FRONTEND, BACKEND, REVIEWER steps.");
        }

        steps.sort((left, right) -> Integer.compare(left.stepOrder(), right.stepOrder()));
        return new OrchestratorPlan(
                goal,
                steps,
                readTextArray(root.path("acceptanceCriteria"), List.of(
                        "支持邮箱登录和验证码登录",
                        "README 包含使用说明和扩展点",
                        "提供 API 契约产物",
                        "评审报告包含问题、建议和风险等级")),
                readTextArray(root.path("expectedArtifacts"), List.of("CODE", "MARKDOWN", "API_CONTRACT", "REVIEW_REPORT")),
                "LLM_PLANNER",
                readTextArray(root.path("parallelGroups"), inferParallelGroups(steps, mentionedAgents)),
                optionalText(root, "plannerReasoningSummary", "LLM planner generated a schema-valid OrchestratorPlan."),
                null);
    }

    private String extractJsonObject(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            throw new IllegalArgumentException("Planner response content is empty.");
        }
        String trimmed = rawContent.trim();
        if (trimmed.startsWith("```")) {
            trimmed = trimmed.replaceFirst("^```(?:json)?", "").replaceFirst("```$", "").trim();
        }
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new IllegalArgumentException("Planner response does not contain a JSON object.");
        }
        return trimmed.substring(start, end + 1);
    }

    private String requireText(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText(null);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing required text field: " + fieldName);
        }
        return value;
    }

    private String optionalText(JsonNode node, String fieldName, String fallback) {
        String value = node.path(fieldName).asText(null);
        return value == null || value.isBlank() ? fallback : value;
    }

    private int requirePositiveInt(JsonNode node, String fieldName) {
        if (!node.path(fieldName).canConvertToInt() || node.path(fieldName).asInt() <= 0) {
            throw new IllegalArgumentException("Missing required positive integer field: " + fieldName);
        }
        return node.path(fieldName).asInt();
    }

    private JsonNode requireArray(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (!value.isArray() || value.isEmpty()) {
            throw new IllegalArgumentException("Missing required array field: " + fieldName);
        }
        return value;
    }

    private List<String> readTextArray(JsonNode node, List<String> fallback) {
        if (!node.isArray() || node.isEmpty()) {
            return fallback;
        }
        List<String> values = new ArrayList<>();
        node.forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) {
                values.add(item.asText());
            }
        });
        return values.isEmpty() ? fallback : List.copyOf(values);
    }

    private List<Integer> readIntegerArray(JsonNode node) {
        if (!node.isArray() || node.isEmpty()) {
            return List.of();
        }
        List<Integer> values = new ArrayList<>();
        node.forEach(item -> {
            if (item.canConvertToInt() && item.asInt() > 0) {
                values.add(item.asInt());
            }
        });
        return List.copyOf(values);
    }

    private List<String> inferParallelGroups(List<OrchestratorStepPlan> steps, List<Agent> mentionedAgents) {
        List<String> groups = steps.stream()
                .map(OrchestratorStepPlan::parallelGroupKey)
                .filter(group -> group != null && !group.isBlank())
                .distinct()
                .toList();
        if (!groups.isEmpty()) {
            return groups;
        }
        return mentionedAgents == null || mentionedAgents.size() <= 1
                ? List.of("GROUP_FRONTEND", "GROUP_BACKEND", "GROUP_REVIEW")
                : List.of("MENTIONED_AGENT_GROUP", "GROUP_BACKEND", "GROUP_REVIEW");
    }

    private record PlannerAttempt(OrchestratorPlan plan, String failureReason) {
    }

    private OrchestratorStepPlan frontendStep(int stepOrder, Agent selectedAgent, boolean parallelMentionGroup) {
        String parallelGroupKey = parallelMentionGroup ? "MENTIONED_AGENT_GROUP" : "GROUP_FRONTEND";
        String routingReason = parallelMentionGroup
                ? "Multiple mentioned agents detected; frontend specialist is scheduled in the same parallel group."
                : "Rule-based routing selected the frontend specialist as the first demo step.";
        if (selectedAgent != null) {
            return new OrchestratorStepPlan(
                    stepOrder,
                    selectedAgent.getId().value(),
                    selectedAgent.getName(),
                    selectedAgent.getRole().name(),
                    "由用户选择的 Agent 执行前端产物生成。",
                    "FRONTEND_ARTIFACT_GENERATION",
                    List.of("CODE", "MARKDOWN"),
                    preferredAdapterName(selectedAgent),
                    List.of("TaskSpec", "用户原始需求", "selectedAgent 配置"),
                    parallelGroupKey,
                    List.of(),
                    routingReason);
        }

        return new OrchestratorStepPlan(
                stepOrder,
                BuiltInAgentIds.FRONTEND_BUILDER,
                "前端构建 Agent",
                "FRONTEND_BUILDER",
                "生成 React 登录页面和初始 README 草稿。",
                "FRONTEND_ARTIFACT_GENERATION",
                List.of("CODE", "MARKDOWN"),
                AgentAdapterType.CODEX.name(),
                List.of("TaskSpec", "用户原始需求", "Artifact iteration 目标"),
                parallelGroupKey,
                List.of(),
                routingReason);
    }

    private OrchestratorStepPlan backendStep(int stepOrder) {
        return new OrchestratorStepPlan(
                stepOrder,
                BuiltInAgentIds.BACKEND_WORKER,
                "后端协作 Agent",
                "BACKEND_WORKER",
                "根据页面字段和任务范围生成登录 API 契约。",
                "API_CONTRACT_DESIGN",
                List.of("API_CONTRACT"),
                AgentAdapterType.MOCK.name(),
                List.of("TaskSpec", "前端产物摘要", "API 扩展点"),
                "GROUP_BACKEND",
                List.of(1),
                "Backend Worker depends on the frontend step output and is scheduled after Step 1.");
    }

    private OrchestratorStepPlan reviewStep(int stepOrder, boolean parallelMentionGroup) {
        String parallelGroupKey = parallelMentionGroup ? "MENTIONED_AGENT_GROUP" : "GROUP_REVIEW";
        List<Integer> dependsOnStepOrders = parallelMentionGroup ? List.of() : List.of(1, 2);
        String routingReason = parallelMentionGroup
                ? "Reviewer was explicitly mentioned and is scheduled in the same parallel group for early review."
                : "Reviewer depends on frontend and backend outputs in the default demo plan.";
        return new OrchestratorStepPlan(
                stepOrder,
                BuiltInAgentIds.REVIEWER,
                "评审 Agent",
                "REVIEWER",
                "检查生成的页面、README、API 契约和验收标准。",
                "QUALITY_REVIEW",
                List.of("REVIEW_REPORT"),
                AgentAdapterType.CLAUDE_CODE.name(),
                List.of("TaskSpec acceptanceCriteria", "全部相关 Artifact", "handoff summaries"),
                parallelGroupKey,
                dependsOnStepOrders,
                routingReason);
    }

    private boolean containsAny(String input, String... keywords) {
        for (String keyword : keywords) {
            if (input.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String preferredAdapterName(Agent agent) {
        if (agent == null || agent.getPreferredAdapterType() == null || agent.getPreferredAdapterType().isBlank()) {
            return AgentAdapterType.MOCK.name();
        }
        return agent.getPreferredAdapterType();
    }
}
