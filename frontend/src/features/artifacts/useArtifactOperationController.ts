import { useEffect, useState, type SyntheticEvent } from "react";
import type { Artifact, ArtifactSelectionReference } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import { buildDiffSummary } from "./artifactLineage";
import { getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";
import { ApiError } from "../../api/agenthubApi";

type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH";

export type ArtifactInspectorTab = "overview" | "diff" | "versions" | "snapshots" | "deploy" | "audit" | "related";

export interface ArtifactPanelApprovalRequest {
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

interface ContentSelectionRange {
  startLine: number;
  endLine: number;
  text: string;
}

interface DraftDiffPreview {
  added: number;
  removed: number;
  changed: number;
  firstChangedLine: number | null;
  hasChanges: boolean;
}

interface CreateApprovalRequestInput {
  actionType: string;
  targetType: string;
  targetId: string;
  riskLevel: string;
  summary: string;
  affectedItems: string[];
}

interface UseArtifactOperationControllerParams {
  allArtifacts: Artifact[];
  selectedArtifact: Artifact | null;
  selectedArtifactId: string | null;
  snapshots: ArtifactSnapshot[];
  conversationId: string | null;
  onSelectArtifact: (artifactId: string) => void;
  onCreateRevision: (artifactId: string, revisionInstruction: string) => Promise<void>;
  onCreateDeployment: (
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) => Promise<void>;
  onRestoreSnapshot: (
    snapshotId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) => Promise<Artifact | null>;
  onApplyDiff: (
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) => Promise<Artifact | null>;
  onForceApplyDiff: (
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) => Promise<Artifact | null>;
  onSendSelectionToChat?: (selection: ArtifactSelectionReference) => void;
  onCreateApprovalRequest: (request: CreateApprovalRequestInput) => Promise<string | null>;
  onApproveApprovalRequest: (approvalId: string) => Promise<void>;
  onCancelApprovalRequest: (approvalId: string) => Promise<void>;
}

const PRODUCT_REVISION_INSTRUCTION = "把主按钮改成蓝色，并增加 loading 状态。";

function getLineNumberAtOffset(content: string, offset: number): number {
  return content.slice(0, Math.max(offset, 0)).split("\n").length;
}

function getTextareaSelectionRange(textarea: HTMLTextAreaElement): ContentSelectionRange | null {
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;

  if (selectionEnd <= selectionStart) {
    return null;
  }

  return {
    startLine: getLineNumberAtOffset(textarea.value, selectionStart),
    endLine: getLineNumberAtOffset(textarea.value, selectionEnd),
    text: textarea.value.slice(selectionStart, selectionEnd)
  };
}

function buildDraftDiffPreview(originalContent: string, draftContent: string): DraftDiffPreview {
  if (originalContent === draftContent) {
    return {
      added: 0,
      removed: 0,
      changed: 0,
      firstChangedLine: null,
      hasChanges: false
    };
  }

  const originalLines = originalContent.split("\n");
  const draftLines = draftContent.split("\n");
  const maxLength = Math.max(originalLines.length, draftLines.length);
  let changed = 0;
  let firstChangedLine: number | null = null;

  for (let index = 0; index < maxLength; index += 1) {
    if (originalLines[index] !== draftLines[index]) {
      changed += 1;
      firstChangedLine = firstChangedLine ?? index + 1;
    }
  }

  return {
    added: Math.max(draftLines.length - originalLines.length, 0),
    removed: Math.max(originalLines.length - draftLines.length, 0),
    changed,
    firstChangedLine,
    hasChanges: true
  };
}

function buildDraftRevisionInstruction(
  artifact: Artifact,
  draftContent: string,
  draftNote: string,
  selectedRange: ContentSelectionRange | null
): string {
  const scope = selectedRange
    ? `只修改第 ${selectedRange.startLine}-${selectedRange.endLine} 行选中的代码片段。`
    : "根据完整编辑草稿生成新的 Artifact Revision。";
  const selectionContext = selectedRange
    ? `\n\n选中片段：\n${selectedRange.text}`
    : "";
  const userNote = draftNote.trim()
    ? `\n\n局部修改说明：\n${draftNote.trim()}`
    : "";

  return [
    `为 Artifact "${artifact.title}" v${artifact.version} 生成 draft revision。`,
    scope,
    "不要直接覆盖当前 Artifact；先生成可审查的 Revision，随后通过 Diff Preview 和 Approval Gate 应用。",
    userNote,
    selectionContext,
    `\n\n编辑后的草稿内容：\n${draftContent}`
  ].join("\n");
}

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

function isBlockingValidationStatus(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toUpperCase();
  return normalized.includes("REJECT") || normalized.includes("FAIL") || normalized.includes("ERROR");
}

function isConflictError(error: unknown): boolean {
  return (
    (error instanceof ApiError && error.status === 409) ||
    (error instanceof Error && error.message.toUpperCase().includes("CONFLICT"))
  );
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

function truncateText(value: string, maxLength = 96): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
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

export function useArtifactOperationController({
  allArtifacts,
  selectedArtifact,
  selectedArtifactId,
  snapshots,
  conversationId,
  onSelectArtifact,
  onCreateRevision,
  onCreateDeployment,
  onRestoreSnapshot,
  onApplyDiff,
  onForceApplyDiff,
  onSendSelectionToChat,
  onCreateApprovalRequest,
  onApproveApprovalRequest,
  onCancelApprovalRequest
}: UseArtifactOperationControllerParams) {
  const [revisionInstruction, setRevisionInstruction] = useState(PRODUCT_REVISION_INSTRUCTION);
  const [artifactOperationMessage, setArtifactOperationMessage] = useState<string | null>(null);
  const [appliedDiffArtifactId, setAppliedDiffArtifactId] = useState<string | null>(null);
  const [diffConflictArtifactId, setDiffConflictArtifactId] = useState<string | null>(null);
  const [diffConflictMessage, setDiffConflictMessage] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ArtifactPanelApprovalRequest | null>(null);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftSelection, setDraftSelection] = useState<ContentSelectionRange | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<ArtifactInspectorTab>("overview");
  const isEditingSelectedArtifact = Boolean(
    selectedArtifact && editingArtifactId === getIdValue(selectedArtifact.id)
  );
  const draftDiffPreview = selectedArtifact
    ? buildDraftDiffPreview(selectedArtifact.content || "", draftContent)
    : null;

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

  function findParentArtifact(artifact: Artifact): Artifact | null {
    if (!artifact.parentArtifactId) {
      return null;
    }

    return allArtifacts.find((item) => getIdValue(item.id) === artifact.parentArtifactId) ?? null;
  }

  function setConflictNotice(title: string, error?: unknown) {
    const suffix = error instanceof Error ? ` 后端返回：${error.message}` : "";
    setDiffConflictArtifactId(selectedArtifactId);
    setDiffConflictMessage(`${title}。当前产物已被其他页面或设备更新，请刷新版本链后重新审查 Diff；如确认覆盖风险，可走 Force Apply / Restore / Deploy 的审批路径。${suffix}`);
    setArtifactOperationMessage("检测到跨端版本冲突，已阻止本次高风险操作。");
  }

  useEffect(() => {
    setRevisionInstruction(
      selectedArtifact?.revisionInstruction ||
        (selectedArtifact ? buildQualityRevisionInstruction(selectedArtifact) : null) ||
        PRODUCT_REVISION_INSTRUCTION
    );
    setArtifactOperationMessage(null);
    setPendingApproval(null);
    setEditingArtifactId(null);
    setDraftContent(selectedArtifact?.content || "");
    setDraftNote("");
    setDraftSelection(null);
    setActiveInspectorTab("overview");
  }, [selectedArtifact]);

  async function handleCreateRevision() {
    if (!selectedArtifactId || !revisionInstruction.trim()) {
      return;
    }

    await onCreateRevision(selectedArtifactId, revisionInstruction.trim());
  }

  function handleStartContentEdit(artifact: Artifact) {
    setEditingArtifactId(getIdValue(artifact.id));
    setDraftContent(artifact.content || "");
    setDraftNote("");
    setDraftSelection(null);
  }

  function handleCancelContentEdit() {
    setEditingArtifactId(null);
    setDraftContent(selectedArtifact?.content || "");
    setDraftNote("");
    setDraftSelection(null);
  }

  function handleDraftSelectionChange(event: SyntheticEvent<HTMLTextAreaElement>) {
    setDraftSelection(getTextareaSelectionRange(event.currentTarget));
  }

  async function handleCreateDraftRevision() {
    if (!selectedArtifact || !selectedArtifactId) {
      return;
    }

    const hasDraftChange = (selectedArtifact.content || "") !== draftContent;
    if (!hasDraftChange && !draftNote.trim()) {
      setArtifactOperationMessage("请先编辑内容、选中片段，或填写局部修改说明。");
      return;
    }

    const instruction = buildDraftRevisionInstruction(selectedArtifact, draftContent, draftNote, draftSelection);
    setRevisionInstruction(instruction);
    await onCreateRevision(selectedArtifactId, instruction);
    setArtifactOperationMessage("已生成 Draft Revision。请在 Diff Preview 中确认变更，并通过 Approval Gate 应用。");
  }

  function handleSendSelectionToChat() {
    if (!selectedArtifact || !selectedArtifactId || !onSendSelectionToChat) {
      return;
    }
    const fallbackSelection: ContentSelectionRange = {
      startLine: 1,
      endLine: Math.max(draftContent.split("\n").length, 1),
      text: draftContent || selectedArtifact.content || ""
    };
    const selection = draftSelection ?? fallbackSelection;

    onSendSelectionToChat({
      artifactId: selectedArtifactId,
      artifactTitle: selectedArtifact.title,
      artifactVersion: selectedArtifact.version,
      artifactType: selectedArtifact.type,
      language: selectedArtifact.language || "plain",
      startLine: selection.startLine,
      endLine: selection.endLine,
      selectedText: selection.text
    });
    setArtifactOperationMessage(
      draftSelection
        ? "已把选中代码片段同步到聊天输入框，请描述修改需求后发送。"
        : "未捕获到选区，已把当前编辑草稿作为局部修改上下文同步到聊天输入框。"
    );
  }

  async function requestApproval(
    request: Omit<ArtifactPanelApprovalRequest, "approvalId"> & { approvalId?: string }
  ) {
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
        try {
          await onCreateDeployment(selectedArtifactId, approvalId, selectedArtifact?.version ?? null, null);
        } catch (error) {
          if (isConflictError(error)) {
            setConflictNotice("预览生成被版本冲突阻止", error);
            return;
          }
          throw error;
        }
      }
    });
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
    const snapshot = snapshots.find((item) => item.snapshotId === snapshotId);
    let restoredArtifact: Artifact | null = null;
    try {
      restoredArtifact = await onRestoreSnapshot(snapshotId, approvalId, snapshot?.version ?? null, null);
    } catch (error) {
      if (isConflictError(error)) {
        setConflictNotice("快照恢复被版本冲突阻止", error);
        return;
      }
      throw error;
    }
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
    const parentArtifact = findParentArtifact(artifact);
    let appliedArtifact: Artifact | null = null;
    try {
      appliedArtifact = await onApplyDiff(artifactId, approvalId, parentArtifact?.version ?? null, null);
    } catch (error) {
      if (isConflictError(error)) {
        setConflictNotice("Diff 应用被版本冲突阻止", error);
        return;
      }
      throw error;
    }

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
    const parentArtifact = findParentArtifact(artifact);
    const appliedArtifact = await onForceApplyDiff(artifactId, approvalId, parentArtifact?.version ?? null, null);

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

  return {
    activeInspectorTab,
    appliedDiffArtifactId,
    artifactOperationMessage,
    diffConflictArtifactId,
    diffConflictMessage,
    draftContent,
    draftDiffPreview,
    draftNote,
    draftSelection,
    isEditingSelectedArtifact,
    pendingApproval,
    revisionInstruction,
    setActiveInspectorTab,
    setDraftContent,
    setDraftNote,
    setRevisionInstruction,
    handleApplyDiffArtifact,
    handleCancelApproval,
    handleCancelContentEdit,
    handleConfirmApproval,
    handleCopyArtifactContent,
    handleCopyPreviewUrl,
    handleCreateDeployment,
    handleCreateDraftRevision,
    handleCreateRevision,
    handleDownloadArtifact,
    handleDraftSelectionChange,
    handleForceApplyDiffArtifact,
    handleRestoreSnapshot,
    handleSendSelectionToChat,
    handleStartContentEdit
  };
}
