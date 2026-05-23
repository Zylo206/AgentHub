package com.agenthub.application.orchestrator;

import com.agenthub.domain.agent.Agent;
import com.agenthub.domain.agent.BuiltInAgentIds;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TaskPlanner {

    private final String plannerType;
    private final boolean fallbackToRuleBased;

    public TaskPlanner(
            @Value("${agenthub.orchestrator.planner.type:RULE_BASED}") String plannerType,
            @Value("${agenthub.orchestrator.planner.fallback-to-rule-based:true}") boolean fallbackToRuleBased) {
        this.plannerType = plannerType;
        this.fallbackToRuleBased = fallbackToRuleBased;
    }

    public OrchestratorPlan planDemoTask(String userInput, Agent selectedAgent) {
        return planDemoTask(userInput, selectedAgent, List.of());
    }

    public OrchestratorPlan planDemoTask(String userInput, Agent selectedAgent, List<Agent> mentionedAgents) {
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
        if (needsFrontend) {
            steps.add(frontendStep(steps.size() + 1, selectedAgent));
        }
        if (needsBackend) {
            steps.add(backendStep(steps.size() + 1));
        }
        if (needsReview) {
            steps.add(reviewStep(steps.size() + 1));
        }

        if (steps.isEmpty()) {
            steps.add(frontendStep(1, selectedAgent));
            steps.add(backendStep(2));
            steps.add(reviewStep(3));
        }

        String normalizedPlannerType = plannerType == null ? "RULE_BASED" : plannerType.trim().toUpperCase(Locale.ROOT);
        String planningMode = "LLM".equals(normalizedPlannerType) && fallbackToRuleBased
                ? "RULE_BASED_FALLBACK"
                : "RULE_BASED_DEMO";
        String fallbackReason = "LLM".equals(normalizedPlannerType)
                ? "LLM planner is configured but this MVP uses rule-based fallback unless a validated planner output is available."
                : null;
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

    private OrchestratorStepPlan frontendStep(int stepOrder, Agent selectedAgent) {
        if (selectedAgent != null) {
            return new OrchestratorStepPlan(
                    stepOrder,
                    selectedAgent.getId().value(),
                    selectedAgent.getName(),
                    selectedAgent.getRole().name(),
                    "由用户选择的 Agent 执行前端产物生成。",
                    "FRONTEND_ARTIFACT_GENERATION",
                    List.of("CODE", "MARKDOWN"),
                    selectedAgent.getPreferredAdapterType(),
                    List.of("TaskSpec", "用户原始需求", "selectedAgent 配置"));
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
                List.of("TaskSpec", "用户原始需求", "Artifact iteration 目标"));
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
                List.of("TaskSpec", "前端产物摘要", "API 扩展点"));
    }

    private OrchestratorStepPlan reviewStep(int stepOrder) {
        return new OrchestratorStepPlan(
                stepOrder,
                BuiltInAgentIds.REVIEWER,
                "评审 Agent",
                "REVIEWER",
                "检查生成的页面、README、API 契约和验收标准。",
                "QUALITY_REVIEW",
                List.of("REVIEW_REPORT"),
                AgentAdapterType.CLAUDE_CODE.name(),
                List.of("TaskSpec acceptanceCriteria", "全部相关 Artifact", "handoff summaries"));
    }

    private boolean containsAny(String input, String... keywords) {
        for (String keyword : keywords) {
            if (input.contains(keyword.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}
