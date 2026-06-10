import type { Artifact } from "../../features/artifacts/artifactTypes";

export type PreviewTrustTone = "success" | "warning" | "danger" | "neutral";

// ---------------------------------------------------------------------------
// Preview mode labels
// ---------------------------------------------------------------------------
export function getPreviewMode(artifact: Artifact): string {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) return "HTML 页面快照";
  if (artifact.type === "CODE") return "代码文本";
  if (artifact.type === "MARKDOWN") return "Markdown 文本";
  if (artifact.type === "REVIEW_REPORT") return "评审报告";
  if (artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL") return "结构化文档";
  return "文档文本";
}

export function getPresentationMode(artifact: Artifact): { label: string; description: string } {
  if (artifact.type === "CODE") {
    return { label: "代码预览", description: "只读展示源代码；如需修改，回工作区发起草稿修订。" };
  }
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return { label: "页面快照", description: "本地产物快照，只用于查看界面，不代表真实部署地址。" };
  }
  if (artifact.type === "MARKDOWN" || artifact.type === "REVIEW_REPORT") {
    return { label: "文档预览", description: "按文档方式展示文本内容，保留原始内容和审计上下文。" };
  }
  return { label: "结构化内容", description: "展示 API 契约、数据模型或其他结构化产物内容。" };
}

// ---------------------------------------------------------------------------
// Trust system
// ---------------------------------------------------------------------------
function isBlockingStatus(status?: string | null): boolean {
  if (!status) return false;
  const upper = status.toUpperCase();
  return upper.includes("REJECT") || upper.includes("FAIL") || upper.includes("ERROR");
}

export function getTrustTone(artifact: Artifact): PreviewTrustTone {
  if (isBlockingStatus(artifact.status) || isBlockingStatus(artifact.qualityStatus) || isBlockingStatus(artifact.buildValidationStatus)) {
    return "danger";
  }
  if (artifact.sourceKind !== "REAL_ADAPTER" || artifact.realAdapterOutcome === "FALLBACK") return "warning";
  if (artifact.sourceKind === "REAL_ADAPTER") return "success";
  return "neutral";
}

const TRUST_LABELS: Record<PreviewTrustTone, string> = {
  success: "真实产物预览",
  danger: "风险产物预览",
  warning: "本地静态预览",
  neutral: "普通预览",
};

const TRUST_DESCRIPTIONS: Record<PreviewTrustTone, string> = {
  success: "当前页面展示真实适配器产物的当前版本，并保留版本、来源和质量状态。",
  danger: "当前产物存在质量、构建或审批风险。这里仅展示内容，不代表可直接交付。",
  warning: "当前页面展示本地静态快照，适合查看和验收，不代表已完成真实部署或正式发布。",
  neutral: "当前页面展示本地静态快照，适合查看和验收。",
};

const NEXT_ACTIONS: Record<PreviewTrustTone, string> = {
  success: "可继续走 Diff、审批、部署预览或交付记录。",
  danger: "回到工作区处理风险、重新评审后再继续交付。",
  warning: "适合本地验收；如果要正式交付，优先生成真实适配器版本。",
  neutral: "适合本地验收。",
};

export function getTrustLabel(tone: PreviewTrustTone): string { return TRUST_LABELS[tone]; }
export function getTrustDescription(tone: PreviewTrustTone): string { return TRUST_DESCRIPTIONS[tone]; }
export function getNextAction(tone: PreviewTrustTone): string { return NEXT_ACTIONS[tone]; }

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
export function formatPreviewSize(content: string | null | undefined): string {
  const length = (content || "").length;
  return length >= 1000 ? `${(length / 1000).toFixed(1)}k 字符` : `${length} 字符`;
}
