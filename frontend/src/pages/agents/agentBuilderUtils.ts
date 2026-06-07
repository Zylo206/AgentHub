import type { AdapterDescriptor } from "../../features/agents/agentTypes";

export const ADAPTER_OPTIONS = ["MOCK", "CODEX", "CLAUDE_CODE", "OPEN_CODE", "OPENAI_COMPATIBLE"] as const;
export const MAINSTREAM_DEEP_ADAPTERS = new Set(["OPENAI_COMPATIBLE", "CLAUDE_CODE", "CODEX"]);

export function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeTags(...tagGroups: string[][]): string[] {
  return Array.from(
    new Set(
      tagGroups
        .flat()
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

export function getFallbackAdapterOptions(): AdapterDescriptor[] {
  return ADAPTER_OPTIONS.map((option) => ({
    adapterType: option,
    status: option === "MOCK" ? "AVAILABLE" : option === "OPENAI_COMPATIBLE" ? "DISABLED" : "PLACEHOLDER",
    enabled: option === "MOCK",
    placeholder: option !== "MOCK" && option !== "OPENAI_COMPATIBLE",
    description: "",
    failureReason: null
  }));
}

export function getAdapterDepthProfile(adapterType?: string | null): { label: string; description: string; className: string } {
  if (adapterType && MAINSTREAM_DEEP_ADAPTERS.has(adapterType)) {
    return {
      label: "深接 v1",
      description: "Artifact-only、REAL_FIRST、Contract / Quality / Build gate、fallback reason 可观测。",
      className: "agent-builder-depth-badge--deep"
    };
  }

  if (adapterType === "OPEN_CODE") {
    return {
      label: "Probe",
      description: "当前只做 CLI 探测和 fallback，不作为本轮主流平台深接目标。",
      className: "agent-builder-depth-badge--probe"
    };
  }

  return {
    label: "Fallback",
    description: "稳定演示安全网，不能包装成真实主流 Agent 平台成功。",
    className: "agent-builder-depth-badge--fallback"
  };
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```json")) {
    return trimmed.slice("```json".length).replace(/```$/, "").trim();
  }
  if (trimmed.startsWith("```")) {
    return trimmed.slice("```".length).replace(/```$/, "").trim();
  }
  return trimmed;
}

export function parseAdapterArtifacts(content?: string | null): Array<{
  title?: string;
  type?: string;
  language?: string;
  summary?: string;
  content?: string;
}> {
  if (!content?.trim()) {
    return [];
  }

  try {
    const payload = JSON.parse(stripJsonFence(content));
    const artifacts: Record<string, unknown>[] = Array.isArray(payload?.artifacts)
      ? payload.artifacts.filter((artifact: unknown): artifact is Record<string, unknown> => looksLikeAdapterArtifact(artifact))
      : payload?.artifact
        ? [payload.artifact]
        : looksLikeAdapterArtifact(payload)
          ? [payload]
          : [];
    return artifacts
      .map((artifact: Record<string, unknown>) => normalizeAdapterArtifact(artifact))
      .filter((artifact) => Boolean(artifact.content));
  } catch {
    return [];
  }
}

function looksLikeAdapterArtifact(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  return ["content", "body", "text", "markdown", "code"].some((key) => typeof candidate[key] === "string");
}

function firstStringValue(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeAdapterArtifact(artifact: Record<string, unknown>) {
  return {
    title: firstStringValue(artifact, ["title", "fileName", "filename", "name", "path"]),
    type: firstStringValue(artifact, ["type", "artifactType", "kind"]),
    language: firstStringValue(artifact, ["language", "lang", "extension"]),
    summary: firstStringValue(artifact, ["summary", "description", "reason"]),
    content: firstStringValue(artifact, ["content", "body", "text", "markdown", "code"])
  };
}

export function evaluateAdapterTestQuality(content?: string | null) {
  if (!content?.trim()) {
    return {
      parseStatus: "EMPTY",
      qualityStatus: "REJECTED",
      qualityReason: "Adapter 响应为空。",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  try {
    JSON.parse(stripJsonFence(content));
  } catch {
    return {
      parseStatus: "FALLBACK_TEXT",
      qualityStatus: "NOT_EVALUATED",
      qualityReason: "响应不是 artifact JSON。后端可以降级为文本，但 REAL_FIRST 不会提升为主产物。",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  const artifacts = parseAdapterArtifacts(content);
  if (artifacts.length === 0) {
    return {
      parseStatus: "INVALID_ARTIFACT_SCHEMA",
      qualityStatus: "REJECTED",
      qualityReason: "JSON 已解析，但未找到包含可用 content 的 artifacts[]。",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  const acceptedCount = artifacts.filter((artifact) => {
    const contentLength = (artifact.content || "").trim().length;
    const hasContractFields = Boolean(
      artifact.title && artifact.type && artifact.language && artifact.summary && contentLength > 20
    );
    const isCodeFenceWrapped =
      String(artifact.type || "").toUpperCase() === "CODE" &&
      (artifact.content || "").trim().startsWith("```");
    return hasContractFields && !isCodeFenceWrapped;
  }).length;
  const rejectedCount = artifacts.length - acceptedCount;

  return {
    parseStatus: "VALID_JSON_ARTIFACTS",
    qualityStatus: acceptedCount > 0 ? "ACCEPTED" : "REJECTED",
    qualityReason:
      acceptedCount > 0
        ? `已接受 ${acceptedCount} 个 Artifact；拒绝 ${rejectedCount} 个。`
        : "解析出的 Artifact 未通过契约检查：title/type/language/summary/content 必填；CODE content 必须是原始源码。",
    acceptedCount,
    rejectedCount
  };
}
