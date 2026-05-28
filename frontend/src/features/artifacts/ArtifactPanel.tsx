import { useEffect, useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import {
  ArtifactDeliveryWorkbench,
  type ArtifactCockpitTone,
  type ArtifactDiagnosticEntry
} from "./ArtifactDeliveryWorkbench";
import { ArtifactDeployPanel } from "./ArtifactDeployPanel";
import { ArtifactSnapshotTimeline } from "./ArtifactSnapshotTimeline";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { Artifact } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { buildDiffSummary, getVersionHistoryEntries } from "./artifactLineage";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ArtifactPanelProps {
  artifacts: Artifact[];
  allArtifacts: Artifact[];
  totalArtifactCount: number;
  selectedArtifact: Artifact | null;
  selectedArtifactId: string | null;
  loadingArtifacts: boolean;
  loadingArtifactDetail: boolean;
  highlightedArtifactIds: string[];
  filteredByTaskStep: boolean;
  revisingArtifact: boolean;
  deployments: DeploymentRecord[];
  snapshots: ArtifactSnapshot[];
  deployingArtifact: boolean;
  restoringSnapshot: boolean;
  conversationId: string | null;
  onSelectArtifact: (artifactId: string) => void;
  onShowAllArtifacts: () => void;
  onCreateRevision: (artifactId: string, revisionInstruction: string) => Promise<void>;
  onCreateDeployment: (artifactId: string, approvalId: string) => Promise<void>;
  onRestoreSnapshot: (snapshotId: string, approvalId: string) => Promise<Artifact | null>;
  onApplyDiff: (artifactId: string, approvalId: string) => Promise<Artifact | null>;
  onForceApplyDiff: (artifactId: string, approvalId: string) => Promise<Artifact | null>;
  onCreateApprovalRequest: (request: {
    actionType: string;
    targetType: string;
    targetId: string;
    riskLevel: string;
    summary: string;
    affectedItems: string[];
  }) => Promise<string | null>;
  onApproveApprovalRequest: (approvalId: string) => Promise<void>;
  onCancelApprovalRequest: (approvalId: string) => Promise<void>;
}

type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH";

interface ApprovalRequest {
  approvalId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  title: string;
  summary: string;
  affectedItems: string[];
  riskLevel: ApprovalRisk;
  confirmLabel: string;
  execute: (approvalId: string) => Promise<void>;
}

const PRODUCT_REVISION_INSTRUCTION = "把主按钮改成蓝色，并增加 loading 状态。";

function getArtifactFileExtension(artifact: Artifact): string {
  const language = (artifact.language || "").toLowerCase();

  if (["tsx", "ts", "jsx", "js", "css", "html"].includes(language)) {
    return language;
  }
  if (language === "md" || artifact.type === "MARKDOWN" || artifact.type === "REVIEW_REPORT") {
    return "md";
  }
  if (language === "json" || artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL") {
    return "json";
  }
  if (artifact.type === "WEB_PREVIEW") {
    return "html";
  }

  return "txt";
}

function getArtifactMimeType(artifact: Artifact): string {
  const extension = getArtifactFileExtension(artifact);

  if (extension === "html") {
    return "text/html;charset=utf-8";
  }
  if (extension === "json") {
    return "application/json;charset=utf-8";
  }
  if (extension === "md") {
    return "text/markdown;charset=utf-8";
  }

  return "text/plain;charset=utf-8";
}

function getSafeArtifactFileName(artifact: Artifact): string {
  const baseName = artifact.title
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "artifact";

  return `${baseName}-v${artifact.version}.${getArtifactFileExtension(artifact)}`;
}

function formatBuildValidationValue(artifact: Artifact): string {
  if (!artifact.buildValidationStatus) {
    return "NOT_EVALUATED";
  }

  return artifact.buildValidationStatus;
}

function formatQualityScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return score.toFixed(2);
}

function getArtifactFallbackReason(artifact: Artifact): string | null {
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return null;
  }

  if (artifact.generationMode === "REAL_FIRST_STATIC_FALLBACK" || artifact.status === "ARCHIVED") {
    return "REAL_FIRST 已采用合格真实 Adapter 产物；该静态模板作为归档 fallback 保留。";
  }

  if (artifact.qualityReason) {
    return artifact.qualityReason;
  }

  if (artifact.sourceKind === "STATIC_TEMPLATE") {
    return "静态模板产物作为稳定 fallback 路径保留。";
  }

  if (artifact.sourceKind === "MOCK_FALLBACK") {
    return "首选 Adapter 没有产出可采纳的真实产物，因此生成 Mock fallback 产物。";
  }

  return null;
}

function isBlockingValidationStatus(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toUpperCase();
  return normalized.includes("REJECT") || normalized.includes("FAIL") || normalized.includes("ERROR");
}

function buildQualityRevisionInstruction(artifact: Artifact): string | null {
  const reasons = [
    artifact.qualityReason ? `Address reviewer feedback: ${artifact.qualityReason}` : null,
    isBlockingValidationStatus(artifact.buildValidationStatus)
      ? `Fix build validation status: ${artifact.buildValidationStatus}${artifact.buildValidationReason ? ` (${artifact.buildValidationReason})` : ""}`
      : null,
    artifact.sourceKind && artifact.sourceKind !== "REAL_ADAPTER"
      ? `Replace fallback output (${displayArtifactSourceKind(artifact.sourceKind)}) with a validated revision.`
      : null
  ].filter(Boolean);

  if (reasons.length === 0) {
    return null;
  }

  return `${reasons.join(" ")} Create a new revision that can pass review, quality evaluation, and build validation.`;
}

function getArtifactGateAction(
  artifact: Artifact,
  fallbackReason: string | null
): { title: string; reason: string; nextStep: string } | null {
  const qualityRejected = isBlockingValidationStatus(artifact.qualityStatus);
  const buildFailed = isBlockingValidationStatus(artifact.buildValidationStatus);
  const fallbackKept = Boolean(fallbackReason);

  if (!qualityRejected && !buildFailed && !fallbackKept) {
    return null;
  }

  const failedGates = [
    qualityRejected ? `Quality evaluator: ${artifact.qualityStatus}` : null,
    buildFailed ? `Build validation: ${artifact.buildValidationStatus}` : null,
    fallbackKept ? "Fallback artifact is being shown" : null
  ].filter(Boolean);

  return {
    title: failedGates.join(" · "),
    reason:
      (buildFailed ? artifact.buildValidationReason : null) ||
      artifact.qualityReason ||
      fallbackReason ||
      "后端没有返回更详细的失败原因。",
    nextStep: "使用下方预填 Revision 指令生成修复版本，然后重新执行评审和构建校验。"
  };
}

function getArtifactCockpitTone(artifact: Artifact, fallbackReason: string | null): ArtifactCockpitTone {
  const qualityBlocked = isBlockingValidationStatus(artifact.qualityStatus);
  const buildBlocked = isBlockingValidationStatus(artifact.buildValidationStatus);
  const statusBlocked = isBlockingValidationStatus(artifact.status);

  if (qualityBlocked || buildBlocked || statusBlocked) {
    return "danger";
  }
  if (fallbackReason || artifact.realAdapterOutcome === "FALLBACK" || artifact.sourceKind !== "REAL_ADAPTER") {
    return "warning";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "success";
  }

  return "neutral";
}

function getArtifactCockpitLabel(artifact: Artifact, fallbackReason: string | null): string {
  const tone = getArtifactCockpitTone(artifact, fallbackReason);

  if (tone === "success") {
    return "真实产物已通过门禁";
  }
  if (tone === "danger") {
    return "需要修复后再交付";
  }
  if (tone === "warning") {
    return artifact.sourceKind === "REAL_ADAPTER" ? "真实产物需复核" : "当前为 fallback 产物";
  }

  return "产物状态待确认";
}

function getArtifactCockpitDescription(artifact: Artifact, fallbackReason: string | null): string {
  if (fallbackReason) {
    return "当前产物来自静态或 Mock fallback，请优先查看原因并通过 Revision 生成可评审版本。";
  }
  if (isBlockingValidationStatus(artifact.qualityStatus)) {
    return "质量门禁已拒绝该产物，建议按失败原因修复后重新评审。";
  }
  if (isBlockingValidationStatus(artifact.buildValidationStatus)) {
    return "构建校验未通过，部署或交付前应先修复代码。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "该产物来自真实 Adapter 输出，并已进入 AgentHub 的 contract / quality / build 观测链路。";
  }

  return "该产物可用于演示和迭代，但不应被描述为真实外部 Agent 产物。";
}

function getArtifactSourceDescription(artifact: Artifact): string {
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "真实 Adapter 输出，已进入 contract / quality / build 观测链路。";
  }
  if (artifact.sourceKind === "USER_REVISION") {
    return "用户通过 Revision 或 Apply Diff 生成的修订产物。";
  }
  if (artifact.sourceKind === "MOCK_FALLBACK") {
    return "Mock fallback 产物，用于保持演示和回退链路稳定。";
  }
  return "静态模板产物，作为无真实输出时的稳定兜底。";
}

function getArtifactQualityDescription(artifact: Artifact): string {
  const status = (artifact.qualityStatus || artifact.realAdapterOutcome || "NOT_EVALUATED").toUpperCase();

  if (status.includes("ACCEPT")) {
    return "质量门禁已接受，可继续审批、应用 Diff 或生成预览。";
  }
  if (status.includes("PARSE")) {
    return "真实输出未通过 JSON contract 解析，不能作为主产物交付。";
  }
  if (status.includes("BUILD")) {
    return "代码构建校验失败，交付前需要先修复。";
  }
  if (status.includes("QUALITY") || status.includes("REJECT") || status.includes("FAIL")) {
    return "质量门禁未通过，需要根据原因执行 Revision 或重新评审。";
  }
  if (status.includes("FALLBACK")) {
    return "当前走 fallback 路径，不应被标记为真实产物成功。";
  }
  return "尚未收到完整质量评估，可继续查看诊断详情。";
}

function getArtifactBadgeTone(status?: string | null): ArtifactDiagnosticEntry["tone"] {
  const normalized = (status || "").toUpperCase();

  if (!normalized || normalized === "NOT_EVALUATED" || normalized === "UNKNOWN") {
    return "neutral";
  }
  if (normalized.includes("ACCEPT") || normalized.includes("PASS") || normalized.includes("SUCCESS") || normalized.includes("REAL_ADAPTER")) {
    return "success";
  }
  if (normalized.includes("PARSE") || normalized.includes("QUALITY") || normalized.includes("BUILD") || normalized.includes("FAIL") || normalized.includes("REJECT") || normalized.includes("ERROR")) {
    return "danger";
  }
  if (normalized.includes("FALLBACK") || normalized.includes("STATIC") || normalized.includes("ARCHIVED") || normalized.includes("MOCK") || normalized.includes("USER_REVISION")) {
    return "warning";
  }

  return "neutral";
}

function buildArtifactDiagnostics(
  artifact: Artifact,
  fallbackReason: string | null
): ArtifactDiagnosticEntry[] {
  const sourceValue = displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE");
  const qualityValue = artifact.qualityStatus || artifact.realAdapterOutcome || "NOT_EVALUATED";
  const buildValue = formatBuildValidationValue(artifact);
  const fallbackValue = fallbackReason ? "FALLBACK_VISIBLE" : "NONE";

  return [
    {
      label: "来源",
      value: sourceValue,
      tone: artifact.sourceKind === "REAL_ADAPTER" ? "success" : artifact.sourceKind ? "warning" : "neutral",
      summary: getArtifactSourceDescription(artifact),
      detail: `Adapter: ${artifact.sourceAdapterType || "none"} · Mode: ${artifact.generationMode || "STATIC"} · Step: ${artifact.sourceTaskStepId || "none"}`
    },
    {
      label: "质量",
      value: qualityValue,
      tone: getArtifactBadgeTone(qualityValue),
      summary: getArtifactQualityDescription(artifact),
      detail: artifact.qualityReason || `质量分：${formatQualityScore(artifact.qualityScore)}`
    },
    {
      label: "构建",
      value: buildValue,
      tone: getArtifactBadgeTone(buildValue),
      summary: isBlockingValidationStatus(buildValue)
        ? "构建校验阻塞交付，建议先修复代码再继续。"
        : "构建校验未发现阻塞问题，或当前产物无需构建。",
      detail: artifact.buildValidationReason || "暂无构建失败原因。"
    },
    {
      label: "Fallback",
      value: fallbackValue,
      tone: fallbackReason ? "warning" : "success",
      summary: fallbackReason ? "当前产物存在 fallback 或归档兜底语义。" : "当前没有显式 fallback 原因。",
      detail: fallbackReason || "真实产物或修订产物可继续进入交付流程。"
    }
  ];
}

function formatArtifactSize(content: string | null | undefined): string {
  const length = (content || "").length;
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}k chars`;
  }
  return `${length} chars`;
}

function renderArtifactContent(artifact: Artifact) {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return (
      <iframe
        className="artifact-preview__frame"
        title={artifact.title}
        srcDoc={artifact.content}
      />
    );
  }

  return (
    <pre className="artifact-preview__code">
      <code>{artifact.content}</code>
    </pre>
  );
}

function truncateText(value: string, maxLength = 96): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function ArtifactPanel({
  artifacts,
  allArtifacts,
  totalArtifactCount,
  selectedArtifact,
  selectedArtifactId,
  loadingArtifacts,
  loadingArtifactDetail,
  highlightedArtifactIds,
  filteredByTaskStep,
  revisingArtifact,
  deployments,
  snapshots,
  deployingArtifact,
  restoringSnapshot,
  conversationId,
  onSelectArtifact,
  onShowAllArtifacts,
  onCreateRevision,
  onCreateDeployment,
  onRestoreSnapshot,
  onApplyDiff,
  onForceApplyDiff,
  onCreateApprovalRequest,
  onApproveApprovalRequest,
  onCancelApprovalRequest
}: ArtifactPanelProps) {
  const [revisionInstruction, setRevisionInstruction] = useState(PRODUCT_REVISION_INSTRUCTION);
  const [artifactOperationMessage, setArtifactOperationMessage] = useState<string | null>(null);
  const [appliedDiffArtifactId, setAppliedDiffArtifactId] = useState<string | null>(null);
  const [diffConflictArtifactId, setDiffConflictArtifactId] = useState<string | null>(null);
  const [diffConflictMessage, setDiffConflictMessage] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const versionEntries = getVersionHistoryEntries(allArtifacts, selectedArtifact);
  const selectedVersionEntry =
    versionEntries.find((entry) => entry.artifactId === selectedArtifactId) ?? null;
  const selectedArtifactFallbackReason = selectedArtifact ? getArtifactFallbackReason(selectedArtifact) : null;
  const selectedArtifactGateAction = selectedArtifact
    ? getArtifactGateAction(selectedArtifact, selectedArtifactFallbackReason)
    : null;
  const selectedArtifactCockpitTone = selectedArtifact
    ? getArtifactCockpitTone(selectedArtifact, selectedArtifactFallbackReason)
    : "neutral";
  const selectedArtifactDiagnostics = selectedArtifact
    ? buildArtifactDiagnostics(selectedArtifact, selectedArtifactFallbackReason)
    : [];
  function buildBaseArtifactAffectedItems(artifact: Artifact): string[] {
    return [
      `Artifact: ${artifact.title} v${artifact.version}`,
      `Type: ${displayArtifactType(artifact.type)} / Status: ${displayStatus(artifact.status)}`,
      `Language: ${artifact.language || "plain"} / Content length: ${(artifact.content || "").length} chars`
    ];
  }

  function buildDiffAffectedItems(artifact: Artifact, force: boolean): string[] {
    const diffSummary = buildDiffSummary(allArtifacts, artifact);
    const changedItems = diffSummary.changedItems.slice(0, 3);
    const changedLineSamples = diffSummary.lineDiffEntries
      .filter((entry) => entry.operation === "added" || entry.operation === "removed")
      .slice(0, 3)
      .map((entry) => `${entry.operation === "added" ? "+" : "-"} ${truncateText(entry.content.trim() || "(blank line)")}`);

    return [
      ...buildBaseArtifactAffectedItems(artifact),
      `Based on: ${diffSummary.basedOnLabel || "unknown parent artifact"}`,
      `Line diff: +${diffSummary.lineDiffStats.added} / -${diffSummary.lineDiffStats.removed} / changed blocks ${diffSummary.lineDiffStats.changed}`,
      `Mode: ${force ? "force apply, bypass conflict guard" : "normal apply, conflict guard enabled"}`,
      `Risk: ${diffSummary.risk}`,
      ...changedItems,
      ...changedLineSamples
    ].filter(Boolean);
  }

  function buildSnapshotAffectedItems(snapshot: ArtifactSnapshot | undefined): string[] {
    if (!snapshot) {
      return ["Snapshot metadata is unavailable. Restore will still create a new Artifact version if the backend can resolve it."];
    }

    return [
      `Snapshot: ${snapshot.snapshotId}`,
      `Artifact: ${snapshot.title} v${snapshot.version}`,
      `Operation source: ${snapshot.operationType}`,
      `Type: ${displayArtifactType(snapshot.type)} / Status: ${displayStatus(snapshot.status)}`,
      `Language: ${snapshot.language || "plain"} / Snapshot content length: ${(snapshot.content || "").length} chars`
    ];
  }

  useEffect(() => {
    setRevisionInstruction(
      selectedArtifact?.revisionInstruction ||
        (selectedArtifact ? buildQualityRevisionInstruction(selectedArtifact) : null) ||
        PRODUCT_REVISION_INSTRUCTION
    );
    setArtifactOperationMessage(null);
    setPendingApproval(null);
  }, [selectedArtifact]);

  async function handleCreateRevision() {
    if (!selectedArtifactId || !revisionInstruction.trim()) {
      return;
    }

    await onCreateRevision(selectedArtifactId, revisionInstruction.trim());
  }

  async function handleCreateDeployment() {
    if (!selectedArtifactId) {
      return;
    }

    const artifactTitle = selectedArtifact?.title || selectedArtifactId;
    await requestApproval({
      approvalId: "",
      actionType: "DEMO_DEPLOY",
      targetType: "ARTIFACT",
      targetId: selectedArtifactId,
      title: "确认静态预览部署",
      summary: `将 ${artifactTitle} 部署到本地静态预览目标。这是本地 demo 部署，不是外部发布。`,
      affectedItems: selectedArtifact
        ? [
            ...buildBaseArtifactAffectedItems(selectedArtifact),
            "目标：STATIC_PREVIEW",
            "输出：本地 Preview URL 和部署状态消息",
            "不会执行外部 Vercel / Netlify / Docker 部署。"
          ]
        : [`Artifact: ${selectedArtifactId}`],
      riskLevel: "MEDIUM",
      confirmLabel: "确认部署",
      execute: async (approvalId) => {
        await onCreateDeployment(selectedArtifactId, approvalId);
      }
    });
  }

  async function requestApproval(request: Omit<ApprovalRequest, "approvalId"> & { approvalId?: string }) {
    if (!conversationId) {
      setArtifactOperationMessage("需要先选择一个会话，才能创建审批请求。");
      return;
    }

    try {
      const approvalId = await onCreateApprovalRequest({
        actionType: request.actionType,
        targetType: request.targetType,
        targetId: request.targetId,
        riskLevel: request.riskLevel,
        summary: request.summary,
        affectedItems: request.affectedItems
      });
      if (!approvalId) {
        setArtifactOperationMessage("Failed to create backend approval request.");
        return;
      }
      setPendingApproval({ ...request, approvalId });
      setArtifactOperationMessage(`Approval required: ${request.title}`);
    } catch (error) {
      console.warn("Failed to create approval request.", error);
      setArtifactOperationMessage("Approval request creation failed.");
    }
  }

  async function handleConfirmApproval() {
    if (!pendingApproval) {
      return;
    }

    const approval = pendingApproval;
    setPendingApproval(null);
    await onApproveApprovalRequest(approval.approvalId);
    await approval.execute(approval.approvalId);
  }

  async function handleCancelApproval() {
    if (!pendingApproval) {
      return;
    }

    const approval = pendingApproval;
    setPendingApproval(null);
    await onCancelApprovalRequest(approval.approvalId);
    setArtifactOperationMessage(`Cancelled: ${approval.title}`);
  }

  async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function handleCopyPreviewUrl(previewUrl: string) {
    try {
      await copyTextToClipboard(previewUrl);
      setArtifactOperationMessage("Preview URL 已复制。");
    } catch (error) {
      console.warn("Failed to copy preview URL.", error);
      setArtifactOperationMessage("Preview URL 复制失败，请手动复制。");
    }
  }

  async function handleCopyArtifactContent(artifact: Artifact) {
    try {
      await copyTextToClipboard(artifact.content || "");
      setArtifactOperationMessage("Artifact 内容已复制。");
    } catch (error) {
      console.warn("Failed to copy artifact content.", error);
      setArtifactOperationMessage("Artifact 内容复制失败，请手动复制。");
    }
  }

  async function executeRestoreSnapshot(snapshotId: string, approvalId: string) {
    const restoredArtifact = await onRestoreSnapshot(snapshotId, approvalId);
    if (restoredArtifact) {
      onSelectArtifact(getIdValue(restoredArtifact.id));
      setArtifactOperationMessage(`Restored snapshot as ${restoredArtifact.title} v${restoredArtifact.version}.`);
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    const snapshot = snapshots.find((item) => item.snapshotId === snapshotId);
    await requestApproval({
      actionType: "RESTORE_SNAPSHOT",
      targetType: "ARTIFACT_SNAPSHOT",
      targetId: snapshotId,
      title: "确认恢复安全快照",
      summary: `从安全快照 ${snapshotId} 恢复 ${snapshot?.title || "产物快照"}。该操作会创建新的恢复版本，不会覆盖原产物。`,
      affectedItems: buildSnapshotAffectedItems(snapshot),
      riskLevel: "HIGH",
      confirmLabel: "确认恢复",
      execute: async (approvalId) => {
        await executeRestoreSnapshot(snapshotId, approvalId);
      }
    });
  }

  function handleDownloadArtifact(artifact: Artifact) {
    const blob = new Blob([artifact.content || ""], { type: getArtifactMimeType(artifact) });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = getSafeArtifactFileName(artifact);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setArtifactOperationMessage(`已生成下载文件：${anchor.download}`);
  }

  async function executeApplyDiffArtifact(artifact: Artifact, approvalId: string) {
    const artifactId = getIdValue(artifact.id);
    const appliedArtifact = await onApplyDiff(artifactId, approvalId);

    if (appliedArtifact) {
      setAppliedDiffArtifactId(getIdValue(appliedArtifact.id));
      setDiffConflictArtifactId(null);
      setDiffConflictMessage(null);
      onSelectArtifact(getIdValue(appliedArtifact.id));
      setArtifactOperationMessage(
        `已通过后端 patch apply 生成 ${appliedArtifact.title} v${appliedArtifact.version}，可继续部署或打开 Preview。`
      );
    } else {
      setDiffConflictArtifactId(artifactId);
      setDiffConflictMessage("检测到 Diff 应用冲突：已有更新的已应用产物。请检查版本链，或确认后强制应用。");
    }
  }

  async function handleApplyDiffArtifact(artifact: Artifact) {
    const artifactId = getIdValue(artifact.id);
    await requestApproval({
      actionType: "APPLY_DIFF",
      targetType: "ARTIFACT",
      targetId: artifactId,
      title: "确认应用 Diff",
      summary: `将 ${artifact.title} v${artifact.version} 的行级 Diff 应用到父版本。应用前会创建安全快照。`,
      affectedItems: buildDiffAffectedItems(artifact, false),
      riskLevel: "MEDIUM",
      confirmLabel: "确认应用 Diff",
      execute: async (approvalId) => {
        await executeApplyDiffArtifact(artifact, approvalId);
      }
    });
  }

  async function executeForceApplyDiffArtifact(artifact: Artifact, approvalId: string) {
    const artifactId = getIdValue(artifact.id);
    const appliedArtifact = await onForceApplyDiff(artifactId, approvalId);

    if (appliedArtifact) {
      setAppliedDiffArtifactId(getIdValue(appliedArtifact.id));
      setDiffConflictArtifactId(null);
      setDiffConflictMessage(null);
      onSelectArtifact(getIdValue(appliedArtifact.id));
      setArtifactOperationMessage(
        `已强制应用 Diff，生成 ${appliedArtifact.title} v${appliedArtifact.version}。`
      );
    }
  }

  async function handleForceApplyDiffArtifact(artifact: Artifact) {
    const artifactId = getIdValue(artifact.id);
    await requestApproval({
      actionType: "FORCE_APPLY_DIFF",
      targetType: "ARTIFACT",
      targetId: artifactId,
      title: "确认强制应用 Diff",
      summary: `强制应用 ${artifact.title} v${artifact.version} 的行级 Diff。该操作会绕过冲突保护并创建新的产物版本。`,
      affectedItems: buildDiffAffectedItems(artifact, true),
      riskLevel: "HIGH",
      confirmLabel: "确认强制应用",
      execute: async (approvalId) => {
        await executeForceApplyDiffArtifact(artifact, approvalId);
      }
    });
  }

  return (
    <div className="artifact-panel" data-testid="artifact-panel">
      <div className="artifact-panel__sidebar">
        <div className="section-header">
          <h3>产物</h3>
          <span>
            {artifacts.length} / {totalArtifactCount}
          </span>
        </div>

        {filteredByTaskStep ? (
          <button type="button" className="show-all-button" onClick={onShowAllArtifacts}>
            显示全部产物
          </button>
        ) : null}

        {loadingArtifacts ? (
          <div className="panel-empty">正在加载产物...</div>
        ) : artifacts.length === 0 ? (
          <div className="panel-empty">从任务消息确认 Agent 协作后，产物会显示在这里。</div>
        ) : (
          <div className="artifact-card-list" data-testid="artifact-card-list">
            {artifacts.map((artifact) => {
              const artifactId = getIdValue(artifact.id);
              return (
                <ArtifactCard
                  key={formatId(artifact.id)}
                  artifact={artifact}
                  selected={artifactId === selectedArtifactId}
                  highlighted={highlightedArtifactIds.includes(artifactId)}
                  onSelect={onSelectArtifact}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="artifact-panel__detail" data-testid="artifact-detail">
        <div className="section-header">
          <h3>产物详情</h3>
          {selectedArtifact ? <span>{displayArtifactType(selectedArtifact.type)}</span> : null}
        </div>

        {loadingArtifactDetail ? (
          <div className="panel-empty">正在加载产物详情...</div>
        ) : !selectedArtifact ? (
          <div className="panel-empty">选择一个产物后查看内容。</div>
        ) : (
          <div className="artifact-preview">
            <div className="artifact-preview__meta">
              <div>
                <strong>{selectedArtifact.title}</strong>
                <p>
                  {displayArtifactType(selectedArtifact.type)} / {displayStatus(selectedArtifact.status)} / v{selectedArtifact.version}
                </p>
                {selectedArtifact.sourceKind ? (
                  <p className="artifact-preview__line">
                    来源：{displayArtifactSourceKind(selectedArtifact.sourceKind)}
                    {selectedArtifact.sourceAdapterType ? ` / Adapter: ${selectedArtifact.sourceAdapterType}` : ""}
                    {selectedArtifact.sourceTaskStepId ? ` / Step: ${selectedArtifact.sourceTaskStepId}` : ""}
                    {selectedArtifact.generationMode ? ` / Mode: ${selectedArtifact.generationMode}` : ""}
                  </p>
                ) : null}
                {selectedArtifact.sourceKind ? (
                  <p className="artifact-preview__line">
                    {selectedArtifact.sourceKind === "REAL_ADAPTER" ? "真实 Adapter 输出" : "静态 / fallback 输出"}质量：
                    {" "}
                    {selectedArtifact.qualityStatus || "UNKNOWN"}
                  </p>
                ) : null}
                <p className="artifact-preview__line">
                  真实 Adapter 结果：{selectedArtifact.realAdapterOutcome || "FALLBACK"}
                </p>
                {selectedArtifact.sourceKind === "REAL_ADAPTER" ? (
                  <p className="artifact-preview__line">构建校验：{formatBuildValidationValue(selectedArtifact)}</p>
                ) : null}
                {selectedArtifact.buildValidationReason ? (
                  <p className="artifact-preview__line">构建校验原因：{selectedArtifact.buildValidationReason}</p>
                ) : null}
                <p className="artifact-preview__line">代码质量分：{formatQualityScore(selectedArtifact.qualityScore)}</p>
                {selectedArtifactFallbackReason ? (
                  <p className="artifact-preview__line">Fallback 原因：{selectedArtifactFallbackReason}</p>
                ) : null}
                {selectedArtifact.qualityReason ? (
                  <p className="artifact-preview__line">质量原因：{selectedArtifact.qualityReason}</p>
                ) : null}
                {selectedArtifactGateAction ? (
                  <div className="quality-gate-action artifact-preview__gate-action">
                    <strong>{selectedArtifactGateAction.title}</strong>
                    <p>失败原因：{selectedArtifactGateAction.reason}</p>
                    <p>修复路径：{selectedArtifactGateAction.nextStep}</p>
                  </div>
                ) : null}
                {selectedVersionEntry?.parentArtifact ? (
                  <p className="artifact-preview__line revision-origin">
                    基于 {selectedVersionEntry.parentArtifact.title} v{selectedVersionEntry.parentArtifact.version}
                  </p>
                ) : selectedArtifact.revisionInstruction ? (
                  <p className="artifact-preview__line revision-origin">
                    该 revision 产物基于当前会话中的上一版生成。
                  </p>
                ) : null}
              </div>
              <div className="artifact-preview__meta-right">
                <span>{formatId(selectedArtifact.id)}</span>
                <span>{selectedArtifact.language || "plain"}</span>
              </div>
            </div>
            <ArtifactDeliveryWorkbench
              artifact={selectedArtifact}
              allArtifacts={allArtifacts}
              snapshots={snapshots}
              deployments={deployments}
              fallbackReason={selectedArtifactFallbackReason}
              gateAction={selectedArtifactGateAction}
              cockpitTone={selectedArtifactCockpitTone}
              diagnostics={selectedArtifactDiagnostics}
              cockpitLabel={getArtifactCockpitLabel(selectedArtifact, selectedArtifactFallbackReason)}
              cockpitDescription={getArtifactCockpitDescription(selectedArtifact, selectedArtifactFallbackReason)}
              sourceDescription={getArtifactSourceDescription(selectedArtifact)}
              qualityDescription={getArtifactQualityDescription(selectedArtifact)}
              sourceBadgeTone={getArtifactBadgeTone(selectedArtifact.sourceKind)}
              qualityBadgeTone={getArtifactBadgeTone(selectedArtifact.qualityStatus || selectedArtifact.realAdapterOutcome)}
              buildBadgeTone={getArtifactBadgeTone(formatBuildValidationValue(selectedArtifact))}
              buildValidationLabel={formatBuildValidationValue(selectedArtifact)}
              qualityScoreLabel={formatQualityScore(selectedArtifact.qualityScore)}
              sizeLabel={formatArtifactSize(selectedArtifact.content)}
            />
            <div className="artifact-preview__actions">
              <button
                type="button"
                className="secondary-button artifact-preview__action-button"
                disabled={!selectedArtifact.content}
                onClick={() => {
                  void handleCopyArtifactContent(selectedArtifact);
                }}
              >
                复制内容
              </button>
              <button
                type="button"
                className="secondary-button artifact-preview__action-button"
                disabled={!selectedArtifact.content}
                onClick={() => handleDownloadArtifact(selectedArtifact)}
              >
                下载文件
              </button>
              {artifactOperationMessage ? (
                <span className="artifact-preview__operation-message">{artifactOperationMessage}</span>
              ) : null}
            </div>
            {pendingApproval ? (
              <div
                className={`approval-gate approval-gate--${pendingApproval.riskLevel.toLowerCase()}`}
                data-testid="approval-gate"
              >
                <div className="approval-gate__header">
                  <div>
                    <strong>{pendingApproval.title}</strong>
                    <p>{pendingApproval.summary}</p>
                  </div>
                  <span className={`approval-gate__risk approval-gate__risk--${pendingApproval.riskLevel.toLowerCase()}`}>
                    Risk: {pendingApproval.riskLevel}
                  </span>
                </div>
                <div className="approval-gate__meta">
                  <span>目标：{pendingApproval.targetType}</span>
                  <span>ID：{pendingApproval.targetId}</span>
                  <span>审批结果会写入 Action Audit。</span>
                </div>
                {pendingApproval.affectedItems.length > 0 ? (
                  <div className="approval-gate__affected" data-testid="approval-affected-summary">
                    <span className="approval-gate__affected-label">影响范围摘要</span>
                    <ul>
                      {pendingApproval.affectedItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="approval-gate__actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      void handleConfirmApproval();
                    }}
                  >
                    {pendingApproval.confirmLabel}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      void handleCancelApproval();
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
            <div className="artifact-revision-box">
              <div className="artifact-revision-box__header">
                <strong>产物二次修改</strong>
                <span>静态 Demo 迭代</span>
              </div>
              <textarea
                className="artifact-revision-box__input"
                value={revisionInstruction}
                disabled={revisingArtifact}
                onChange={(event) => setRevisionInstruction(event.target.value)}
              />
              <button
                type="button"
                className="primary-button artifact-revision-box__button"
                disabled={revisingArtifact || !revisionInstruction.trim()}
                onClick={() => {
                  void handleCreateRevision();
                }}
              >
                {revisingArtifact ? "修改中..." : "修改选中产物"}
              </button>
            </div>
            <ArtifactDeployPanel
              artifact={selectedArtifact}
              deployments={deployments}
              deployingArtifact={deployingArtifact}
              onCreateDeployment={() => {
                void handleCreateDeployment();
              }}
              onCopyPreviewUrl={(previewUrl) => {
                void handleCopyPreviewUrl(previewUrl);
              }}
            />
            <VersionHistoryPanel
              artifacts={allArtifacts}
              selectedArtifact={selectedArtifact}
              selectedArtifactId={selectedArtifactId}
              onSelectArtifact={onSelectArtifact}
            />
            <ArtifactSnapshotTimeline
              snapshots={snapshots}
              restoringSnapshot={restoringSnapshot}
              onRestoreSnapshot={(snapshotId) => {
                void handleRestoreSnapshot(snapshotId);
              }}
            />
            <DiffSummaryPanel
              artifacts={allArtifacts}
              artifact={selectedArtifact}
              appliedArtifactId={appliedDiffArtifactId}
              conflictArtifactId={diffConflictArtifactId}
              conflictMessage={diffConflictMessage}
              onApplyDiff={(artifact) => {
                void handleApplyDiffArtifact(artifact);
              }}
              onForceApplyDiff={(artifact) => {
                void handleForceApplyDiffArtifact(artifact);
              }}
            />
            {renderArtifactContent(selectedArtifact)}
          </div>
        )}
      </div>
    </div>
  );
}
