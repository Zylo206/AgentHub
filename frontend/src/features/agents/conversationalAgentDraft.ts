import type { ToolCapabilityKey } from "./agentTypes";

export interface AgentCreationDraft {
  name: string;
  avatarUrl: string;
  systemPrompt: string;
  capabilityTags: string[];
  toolTags: ToolCapabilityKey[];
  preferredAdapterType: string;
  reasoning: string[];
  draftSource?: string | null;
  fallbackReason?: string | null;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function isAgentCreationRequest(content: string): boolean {
  const normalized = content.toLowerCase();
  return includesAny(normalized, ["创建", "新建", "生成", "create", "build"]) &&
    includesAny(normalized, ["agent", "智能体", "协作成员", "助手"]);
}

export function inferAgentCreationDraft(content: string): AgentCreationDraft | null {
  const normalized = content.toLowerCase();
  if (!isAgentCreationRequest(content)) {
    return null;
  }

  const toolTags: ToolCapabilityKey[] = [];
  const capabilityTags: string[] = [];
  const reasoning: string[] = [];

  if (includesAny(normalized, ["react", "ui", "tsx", "前端", "组件", "页面", "代码", "code"])) {
    toolTags.push("code", "preview");
    capabilityTags.push("React", "UI", "代码生成");
    reasoning.push("识别到前端 / 代码任务，加入 code 与 preview 能力。");
  }
  if (includesAny(normalized, ["review", "质量", "评审", "安全", "审计", "blocker", "不通过"])) {
    toolTags.push("review");
    capabilityTags.push("质量评审", "安全审查");
    reasoning.push("识别到评审 / 安全任务，加入 review 能力。");
  }
  if (includesAny(normalized, ["api", "接口", "后端", "schema", "数据模型", "契约"])) {
    toolTags.push("api", "schema");
    capabilityTags.push("API", "Schema");
    reasoning.push("识别到 API / schema 任务，加入 api 与 schema 能力。");
  }
  if (includesAny(normalized, ["deploy", "部署", "发布", "preview", "预览"])) {
    toolTags.push("deploy", "preview");
    capabilityTags.push("部署发布", "预览交付");
    reasoning.push("识别到部署 / 预览任务，加入 deploy 与 preview 能力。");
  }

  const fallbackToolTags: ToolCapabilityKey[] = ["code", "review"];
  const uniqueToolTags = Array.from(new Set<ToolCapabilityKey>(toolTags.length > 0 ? toolTags : fallbackToolTags));
  const uniqueCapabilityTags = Array.from(new Set(capabilityTags.length > 0 ? capabilityTags : ["协作 Agent", "任务执行"]));
  const preferredAdapterType = includesAny(normalized, ["claude", "anthropic"])
    ? "CLAUDE_CODE"
    : includesAny(normalized, ["codex", "openai cli"])
      ? "CODEX"
      : includesAny(normalized, ["openai", "deepseek", "gpt"])
        ? "OPENAI_COMPATIBLE"
        : "CODEX";

  const name = includesAny(normalized, ["安全", "审计", "review", "评审"])
    ? "安全评审 Agent"
    : includesAny(normalized, ["api", "接口", "后端", "schema"])
      ? "API 协作 Agent"
      : includesAny(normalized, ["部署", "发布", "deploy"])
        ? "部署发布 Agent"
        : includesAny(normalized, ["前端", "react", "ui", "组件"])
          ? "前端实现 Agent"
          : "自定义协作 Agent";

  reasoning.push(`优先 Adapter 推断为 ${preferredAdapterType}。`);

  return {
    name,
    avatarUrl: "",
    systemPrompt: `你是 AgentHub 中的${name}。请基于用户消息、对话上下文、Artifact 历史和质量门禁完成任务；输出要遵守 AgentHub Artifact JSON contract，并在失败时说明 fallback / quality reason。`,
    capabilityTags: uniqueCapabilityTags,
    toolTags: uniqueToolTags,
    preferredAdapterType,
    reasoning
  };
}

function mergeUnique<T extends string>(current: T[], next: T[]): T[] {
  return Array.from(new Set([...current, ...next].filter(Boolean)));
}

function inferPreferredAdapter(instruction: string, currentAdapter: string): string {
  const normalized = instruction.toLowerCase();
  if (includesAny(normalized, ["mock", "fallback", "稳定演示", "测试"])) {
    return "MOCK";
  }
  if (includesAny(normalized, ["claude", "anthropic"])) {
    return "CLAUDE_CODE";
  }
  if (includesAny(normalized, ["codex", "openai cli"])) {
    return "CODEX";
  }
  if (includesAny(normalized, ["openai", "deepseek", "gpt"])) {
    return "OPENAI_COMPATIBLE";
  }
  return currentAdapter;
}

export function refineAgentCreationDraft(
  currentDraft: AgentCreationDraft,
  instruction: string
): AgentCreationDraft {
  const trimmedInstruction = instruction.trim();
  if (!trimmedInstruction) {
    return currentDraft;
  }

  const inferredPatch = inferAgentCreationDraft(`create agent ${trimmedInstruction}`);
  const nextToolTags = mergeUnique<ToolCapabilityKey>(
    currentDraft.toolTags,
    inferredPatch?.toolTags ?? []
  );
  const nextCapabilityTags = mergeUnique(
    currentDraft.capabilityTags,
    inferredPatch?.capabilityTags ?? []
  );
  const nextPreferredAdapter = inferPreferredAdapter(trimmedInstruction, currentDraft.preferredAdapterType);
  const nextSystemPrompt = [
    currentDraft.systemPrompt.trim(),
    `补充要求：${trimmedInstruction}`
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ...currentDraft,
    systemPrompt: nextSystemPrompt,
    capabilityTags: nextCapabilityTags,
    toolTags: nextToolTags,
    preferredAdapterType: nextPreferredAdapter,
    reasoning: [
      ...currentDraft.reasoning,
      `根据追问更新草案：${trimmedInstruction}`,
      nextPreferredAdapter !== currentDraft.preferredAdapterType
        ? `首选 Adapter 从 ${currentDraft.preferredAdapterType} 调整为 ${nextPreferredAdapter}。`
        : "保留当前首选 Adapter。"
    ],
    draftSource: currentDraft.draftSource
      ? `${currentDraft.draftSource}+CLIENT_REFINEMENT`
      : "CLIENT_REFINEMENT"
  };
}
