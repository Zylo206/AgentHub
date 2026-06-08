import { displayStatus } from "./displayLabels";

const TECHNICAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Set agenthub\.adapters\.[\w-]+\.enabled=true to enable it\.?/gi, "本地 CLI 未启用，请在桌面控制台完成检测。"],
  [/\bMOCK_FALLBACK\b/gi, "本地备用结果"],
  [/\bMOCK\b/gi, "本地备用引擎"],
  [/\bFALLBACK_USED\b/gi, "已切换本地安全路径"],
  [/\bTEXT_FALLBACK\b/gi, "本地文本输出"],
  [/\bFALLBACK_TEXT\b/gi, "本地文本输出"],
  [/\bREAL_FIRST_STATIC_FALLBACK\b/gi, "真实优先，本地静态展示"],
  [/\bFALLBACK\b/gi, "本地安全路径"],
  [/\bfallback\b/gi, "本地安全路径"],
  [/\bSTATIC_TEMPLATE\b/gi, "本地静态结构"],
  [/\bSTATIC\b/gi, "本地静态"],
  [/Demo Task/gi, "协作任务"],
  [/单聊任务 Demo/gi, "单 Agent 任务"],
  [/多 Agent 协作 Demo/gi, "多 Agent 协作"],
  [/登录页 Demo/gi, "登录页任务"],
  [/\bDemo User\b/gi, "当前用户"],
  [/\bDemo\b/gi, ""],
  [/actualAdapterType=本地备用引擎;?/gi, "实际执行为本地备用引擎；"],
  [/adapterStatus=本地安全路径_USED;?/gi, "Adapter 已切换本地安全路径；"]
];

export function sanitizeProductionText(value?: string | null): string {
  if (!value) {
    return "";
  }

  const normalizedValue = value
    .replace(/\bfallbackUsed\b/gi, "本地安全路径启用")
    .replace(/\bfallbackSummary\b/gi, "本地安全路径摘要");

  return TECHNICAL_REPLACEMENTS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    normalizedValue
  ).replace(/\s{2,}/g, " ").trim();
}

export function displayAdapterName(value?: string | null): string {
  const labels: Record<string, string> = {
    MOCK: "本地备用引擎",
    OPENAI_COMPATIBLE: "OpenAI-compatible",
    CLAUDE_CODE: "Claude Code CLI",
    CODEX: "Codex CLI",
    OPEN_CODE: "OpenCode CLI",
    REAL_ADAPTER: "REAL_ADAPTER"
  };

  return value ? labels[value] || sanitizeProductionText(value) : "自动选择";
}

export function displayExecutionOutcome(value?: string | null): string {
  const labels: Record<string, string> = {
    ACCEPTED: "已采纳",
    PARSE_FAILED: "解析失败",
    QUALITY_FAILED: "质量未通过",
    BUILD_FAILED: "构建未通过",
    FALLBACK: "本地安全路径"
  };

  return value ? labels[value] || sanitizeProductionText(value) : "本地安全路径";
}

export function displayProductionStatus(value?: string | null): string {
  return sanitizeProductionText(displayStatus(value));
}
