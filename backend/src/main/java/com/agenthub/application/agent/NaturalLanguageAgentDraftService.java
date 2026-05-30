package com.agenthub.application.agent;

import com.agenthub.common.IdGenerator;
import com.agenthub.infrastructure.adapter.AgentAdapterDescriptor;
import com.agenthub.infrastructure.adapter.AgentAdapterType;
import com.agenthub.infrastructure.adapter.AgentExecutionStatus;
import com.agenthub.infrastructure.adapter.AgentRequest;
import com.agenthub.infrastructure.adapter.AgentResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NaturalLanguageAgentDraftService {

    private static final Logger logger = LoggerFactory.getLogger(NaturalLanguageAgentDraftService.class);

    private final AgentExecutorService agentExecutorService;
    private final IdGenerator idGenerator;
    private final ObjectMapper objectMapper;

    public NaturalLanguageAgentDraftService(
            AgentExecutorService agentExecutorService,
            IdGenerator idGenerator,
            ObjectMapper objectMapper) {
        this.agentExecutorService = agentExecutorService;
        this.idGenerator = idGenerator;
        this.objectMapper = objectMapper;
    }

    public AgentDraftView draftFromNaturalLanguage(String description) {
        if (description == null || description.isBlank()) {
            throw new IllegalArgumentException("description cannot be blank.");
        }

        String normalized = description.trim();
        AgentDraftView llmDraft = tryBuildWithOpenAiCompatible(normalized);
        if (llmDraft != null) {
            return llmDraft;
        }
        return buildRuleBasedDraft(normalized, "OpenAI-compatible draft unavailable or invalid; used deterministic fallback.");
    }

    private AgentDraftView tryBuildWithOpenAiCompatible(String description) {
        boolean openAiAvailable = agentExecutorService.listAdapterDescriptors().stream()
                .filter(descriptor -> descriptor.adapterType() == AgentAdapterType.OPENAI_COMPATIBLE)
                .findFirst()
                .map(this::isAvailable)
                .orElse(false);
        if (!openAiAvailable) {
            return null;
        }

        AgentRequest request = new AgentRequest(
                idGenerator.nextId("agent_draft_req"),
                "agent-draft",
                "agent-draft",
                "agent-draft-step",
                "agent_builder",
                "Agent Builder",
                description,
                buildSystemPrompt(),
                "Create a custom AgentHub Agent draft from natural language.",
                List.of("Return JSON only. Do not include markdown fences."),
                List.of("Agent draft schema: name, avatarUrl, systemPrompt, capabilityTags, toolTags, preferredAdapterType, reasoning"),
                Map.of("source", "NaturalLanguageAgentDraftService"));

        try {
            AgentResponse response = agentExecutorService.execute(AgentAdapterType.OPENAI_COMPATIBLE, request);
            if (response.status() != AgentExecutionStatus.COMPLETED
                    || response.actualAdapterType() != AgentAdapterType.OPENAI_COMPATIBLE) {
                return null;
            }
            return parseLlmDraft(response.content());
        } catch (RuntimeException exception) {
            logger.warn("Failed to create natural-language Agent draft with OPENAI_COMPATIBLE.", exception);
            return null;
        }
    }

    private boolean isAvailable(AgentAdapterDescriptor descriptor) {
        return descriptor != null && descriptor.status().name().equals("AVAILABLE");
    }

    private String buildSystemPrompt() {
        return """
                You are AgentHub Agent Builder.
                Convert the user's natural-language request into one custom Agent draft.
                Return AgentHub Artifact JSON only, no markdown fences, no explanations.
                The response must match this outer contract:
                {
                  "assistantMessage": "Agent draft created.",
                  "artifacts": [
                    {
                      "title": "Agent Draft",
                      "type": "DATA_MODEL",
                      "language": "json",
                      "summary": "Custom Agent draft",
                      "content": "{\\"name\\":\\"string\\",\\"avatarUrl\\":\\"\\",\\"systemPrompt\\":\\"string\\",\\"capabilityTags\\":[\\"string\\"],\\"toolTags\\":[\\"code\\"],\\"preferredAdapterType\\":\\"OPENAI_COMPATIBLE\\",\\"reasoning\\":[\\"short Chinese reason\\"]}"
                    }
                  ]
                }
                The artifact content must be a JSON string containing the Agent draft object.
                Agent draft schema:
                - name: string, Chinese preferred if user writes Chinese.
                - avatarUrl: string or empty.
                - systemPrompt: concrete behavior instructions for this Agent.
                - capabilityTags: string array.
                - toolTags: only code, preview, review, deploy, api, schema, task_planner, task_router.
                - preferredAdapterType: OPENAI_COMPATIBLE, CLAUDE_CODE, CODEX, or MOCK.
                - reasoning: short Chinese reasons.
                Rules:
                - Do not use OPEN_CODE.
                - Prefer CLAUDE_CODE when user asks for Claude or Anthropic.
                - Prefer CODEX when user asks for Codex or coding CLI.
                - Prefer OPENAI_COMPATIBLE when user asks for OpenAI, DeepSeek, GPT, general LLM, or no specific CLI.
                - toolTags must only use the allowed enum values.
                - systemPrompt must explain responsibilities, output expectations, and fallback transparency.
                """;
    }

    private AgentDraftView parseLlmDraft(String content) {
        try {
            JsonNode root = unwrapDraftRoot(objectMapper.readTree(stripJsonFence(content)));
            String name = text(root, "name");
            String systemPrompt = text(root, "systemPrompt");
            if (name.isBlank() || systemPrompt.isBlank()) {
                return null;
            }

            List<String> toolTags = sanitizeToolTags(array(root, "toolTags"));
            if (toolTags.isEmpty()) {
                toolTags = List.of("code", "review");
            }

            String preferredAdapterType = sanitizeAdapter(text(root, "preferredAdapterType"));
            return new AgentDraftView(
                    name,
                    text(root, "avatarUrl"),
                    systemPrompt,
                    nonEmpty(array(root, "capabilityTags"), List.of("协作 Agent", "任务执行")),
                    toolTags,
                    preferredAdapterType,
                    nonEmpty(array(root, "reasoning"), List.of("由 OpenAI-compatible 根据自然语言请求生成。")),
                    "LLM_OPENAI_COMPATIBLE",
                    null);
        } catch (Exception exception) {
            logger.warn("Invalid natural-language Agent draft JSON from OPENAI_COMPATIBLE.", exception);
            return null;
        }
    }

    private JsonNode unwrapDraftRoot(JsonNode root) throws Exception {
        JsonNode artifacts = root == null ? null : root.get("artifacts");
        if (artifacts != null && artifacts.isArray() && !artifacts.isEmpty()) {
            String draftContent = artifacts.get(0).path("content").asText("");
            if (!draftContent.isBlank()) {
                return objectMapper.readTree(stripJsonFence(draftContent));
            }
        }
        return root;
    }

    private AgentDraftView buildRuleBasedDraft(String description, String fallbackReason) {
        String normalized = description.toLowerCase(Locale.ROOT);
        Set<String> toolTags = new LinkedHashSet<>();
        Set<String> capabilityTags = new LinkedHashSet<>();
        List<String> reasoning = new ArrayList<>();

        if (containsAny(normalized, "react", "ui", "tsx", "前端", "组件", "页面", "代码", "code")) {
            toolTags.add("code");
            toolTags.add("preview");
            capabilityTags.addAll(List.of("React", "UI", "代码生成"));
            reasoning.add("识别到前端 / 代码任务，加入 code 与 preview 能力。");
        }
        if (containsAny(normalized, "review", "质量", "评审", "安全", "审计", "blocker", "不通过")) {
            toolTags.add("review");
            capabilityTags.addAll(List.of("质量评审", "安全审查"));
            reasoning.add("识别到评审 / 安全任务，加入 review 能力。");
        }
        if (containsAny(normalized, "api", "接口", "后端", "schema", "数据模型", "契约")) {
            toolTags.add("api");
            toolTags.add("schema");
            capabilityTags.addAll(List.of("API", "Schema"));
            reasoning.add("识别到 API / schema 任务，加入 api 与 schema 能力。");
        }
        if (containsAny(normalized, "deploy", "部署", "发布", "preview", "预览")) {
            toolTags.add("deploy");
            toolTags.add("preview");
            capabilityTags.addAll(List.of("部署发布", "预览交付"));
            reasoning.add("识别到部署 / 预览任务，加入 deploy 与 preview 能力。");
        }

        if (toolTags.isEmpty()) {
            toolTags.add("code");
            toolTags.add("review");
        }
        if (capabilityTags.isEmpty()) {
            capabilityTags.add("协作 Agent");
            capabilityTags.add("任务执行");
        }

        String preferredAdapterType = preferredAdapter(normalized);
        String name = inferredName(normalized);
        reasoning.add("优先 Adapter 推断为 " + preferredAdapterType + "。");

        return new AgentDraftView(
                name,
                "",
                "你是 AgentHub 中的" + name + "。请基于用户消息、对话上下文、Artifact 历史和质量门禁完成任务；输出要遵守 AgentHub Artifact JSON contract，并在失败时说明 fallback / quality reason。",
                List.copyOf(capabilityTags),
                List.copyOf(toolTags),
                preferredAdapterType,
                reasoning,
                "RULE_BASED_FALLBACK",
                fallbackReason);
    }

    private String preferredAdapter(String normalized) {
        if (containsAny(normalized, "claude", "anthropic")) {
            return "CLAUDE_CODE";
        }
        if (containsAny(normalized, "codex", "openai cli")) {
            return "CODEX";
        }
        if (containsAny(normalized, "openai", "deepseek", "gpt")) {
            return "OPENAI_COMPATIBLE";
        }
        return "CODEX";
    }

    private String inferredName(String normalized) {
        if (containsAny(normalized, "安全", "审计", "review", "评审")) {
            return "安全评审 Agent";
        }
        if (containsAny(normalized, "api", "接口", "后端", "schema")) {
            return "API 协作 Agent";
        }
        if (containsAny(normalized, "部署", "发布", "deploy")) {
            return "部署发布 Agent";
        }
        if (containsAny(normalized, "前端", "react", "ui", "组件")) {
            return "前端实现 Agent";
        }
        return "自定义协作 Agent";
    }

    private boolean containsAny(String value, String... tokens) {
        for (String token : tokens) {
            if (value.contains(token.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String stripJsonFence(String content) {
        String trimmed = content == null ? "" : content.trim();
        if (trimmed.startsWith("```json")) {
            return trimmed.substring("```json".length()).replaceAll("```$", "").trim();
        }
        if (trimmed.startsWith("```")) {
            return trimmed.substring("```".length()).replaceAll("```$", "").trim();
        }
        return trimmed;
    }

    private String text(JsonNode root, String field) {
        JsonNode value = root == null ? null : root.get(field);
        return value == null || !value.isTextual() ? "" : value.asText().trim();
    }

    private List<String> array(JsonNode root, String field) {
        JsonNode value = root == null ? null : root.get(field);
        if (value == null || !value.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        value.forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) {
                values.add(item.asText().trim());
            }
        });
        return values;
    }

    private List<String> nonEmpty(List<String> values, List<String> fallback) {
        return values == null || values.isEmpty() ? fallback : values;
    }

    private List<String> sanitizeToolTags(List<String> tags) {
        Set<String> allowed = Set.of("code", "preview", "review", "deploy", "api", "schema", "task_planner", "task_router");
        return tags.stream()
                .map(tag -> tag.trim().toLowerCase(Locale.ROOT))
                .filter(allowed::contains)
                .distinct()
                .toList();
    }

    private String sanitizeAdapter(String adapterType) {
        if (adapterType == null || adapterType.isBlank()) {
            return "OPENAI_COMPATIBLE";
        }
        try {
            AgentAdapterType parsed = AgentAdapterType.valueOf(adapterType.trim().toUpperCase(Locale.ROOT));
            if (parsed == AgentAdapterType.OPEN_CODE) {
                return "OPENAI_COMPATIBLE";
            }
            return parsed.name();
        } catch (IllegalArgumentException exception) {
            return "OPENAI_COMPATIBLE";
        }
    }

    public record AgentDraftView(
            String name,
            String avatarUrl,
            String systemPrompt,
            List<String> capabilityTags,
            List<String> toolTags,
            String preferredAdapterType,
            List<String> reasoning,
            String draftSource,
            String fallbackReason) {
    }
}
