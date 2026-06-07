import { ArtifactApprovalGatePanel } from "./ArtifactApprovalGatePanel";
import { ArtifactAuditPanel } from "./ArtifactAuditPanel";
import {
  ArtifactDeliveryWorkbench,
  type ArtifactCockpitTone,
  type ArtifactDiagnosticEntry
} from "./ArtifactDeliveryWorkbench";
import { ArtifactDeployPanel } from "./ArtifactDeployPanel";
import { ArtifactInspectorMetrics } from "./ArtifactInspectorMetrics";
import { ArtifactInspectorTabs } from "./ArtifactInspectorTabs";
import { ArtifactListPane } from "./ArtifactListPane";
import { ArtifactRevisionWorkspace } from "./ArtifactRevisionWorkspace";
import { ArtifactSnapshotTimeline } from "./ArtifactSnapshotTimeline";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { Artifact, ArtifactSelectionReference } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { getVersionHistoryEntries } from "./artifactLineage";
import { useArtifactOperationController, type ArtifactInspectorTab } from "./useArtifactOperationController";
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
  onDownloadArtifactBundle: (artifactIds?: string[]) => void;
  onRestoreSnapshot: (snapshotId: string, approvalId: string) => Promise<Artifact | null>;
  onApplyDiff: (artifactId: string, approvalId: string) => Promise<Artifact | null>;
  onForceApplyDiff: (artifactId: string, approvalId: string) => Promise<Artifact | null>;
  onSendSelectionToChat?: (selection: ArtifactSelectionReference) => void;
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

const ARTIFACT_INSPECTOR_TABS: Array<{ key: ArtifactInspectorTab; label: string }> = [
  { key: "overview", label: "概览" },
  { key: "diff", label: "Diff" },
  { key: "versions", label: "版本" },
  { key: "snapshots", label: "快照" },
  { key: "deploy", label: "预览" },
  { key: "audit", label: "审计" },
  { key: "related", label: "关联" }
];

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

function formatArtifactSize(content: string | null | undefined): string {
  const length = (content || "").length;
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}k chars`;
  }
  return `${length} chars`;
}

function getArtifactFallbackReason(artifact: Artifact): string | null {
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return null;
  }

  if (artifact.generationMode === "REAL_FIRST_STATIC_FALLBACK" || artifact.status === "ARCHIVED") {
    return "REAL_FIRST 已采纳有效真实输出，同时保留静态 fallback 归档用于回滚。";
  }

  if (artifact.qualityReason) {
    return artifact.qualityReason;
  }

  if (artifact.sourceKind === "STATIC_TEMPLATE") {
    return "当前使用 STATIC_TEMPLATE 静态 fallback，保证演示链路稳定。";
  }

  if (artifact.sourceKind === "MOCK_FALLBACK") {
    return "主 Adapter 未返回可用真实产物，当前展示 MOCK_FALLBACK 兜底产物。";
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
    qualityRejected ? "质量评审：" + artifact.qualityStatus : null,
    buildFailed ? "构建校验：" + artifact.buildValidationStatus : null,
    fallbackKept ? "当前展示 fallback 产物" : null
  ].filter(Boolean);

  return {
    title: failedGates.join(" / "),
    reason:
      (buildFailed ? artifact.buildValidationReason : null) ||
      artifact.qualityReason ||
      fallbackReason ||
      "后端未返回更详细的失败原因。",
    nextStep: "基于下方指令创建 Revision，再重新执行评审与构建校验。"
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
    return "交付前必须修复";
  }
  if (tone === "warning") {
    return artifact.sourceKind === "REAL_ADAPTER" ? "真实产物待复核" : "当前为 fallback 产物";
  }

  return "产物状态待确认";
}

function getArtifactCockpitDescription(artifact: Artifact, fallbackReason: string | null): string {
  if (fallbackReason) {
    return "该产物来自静态或 MOCK fallback。对外展示为交付物前，请先确认原因并创建 Revision。";
  }
  if (isBlockingValidationStatus(artifact.qualityStatus)) {
    return "质量门禁未通过。请按失败原因修复后重新评审。";
  }
  if (isBlockingValidationStatus(artifact.buildValidationStatus)) {
    return "构建校验失败。审批或生成预览前必须先修复代码。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "该产物来自真实 Adapter，并已进入 AgentHub 契约、质量和构建校验链路。";
  }

  return "该产物可用于演示和迭代，但不能描述为真实外部 Agent 输出。";
}

function getArtifactSourceDescription(artifact: Artifact): string {
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "真实 Adapter 输出，带契约、质量和构建校验证据。";
  }
  if (artifact.sourceKind === "USER_REVISION") {
    return "用户通过 Revision 或 Apply Diff 生成的修订版本。";
  }
  if (artifact.sourceKind === "MOCK_FALLBACK") {
    return "MOCK_FALLBACK 产物，用于保持演示和回滚路径稳定。";
  }
  return "未获得真实输出时使用的 STATIC_TEMPLATE 静态 fallback。";
}

function getArtifactQualityDescription(artifact: Artifact): string {
  const status = (artifact.qualityStatus || artifact.realAdapterOutcome || "NOT_EVALUATED").toUpperCase();

  if (status.includes("ACCEPT")) {
    return "质量门禁已通过，可继续审批、Diff 和本地预览流程。";
  }
  if (status.includes("PARSE")) {
    return "真实输出未通过 JSON 契约解析，不能成为主产物。";
  }
  if (status.includes("BUILD")) {
    return "构建校验失败，交付前必须修复。";
  }
  if (status.includes("QUALITY") || status.includes("REJECT") || status.includes("FAIL")) {
    return "质量门禁未通过，请按原因创建 Revision 或重新评审。";
  }
  if (status.includes("FALLBACK")) {
    return "Fallback 路径已启用，不应标记为真实产物成功。";
  }
  return "暂无完整质量评估结果。";
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
      detail: "Adapter: " + (artifact.sourceAdapterType || "none") + " / Mode: " + (artifact.generationMode || "STATIC") + " / Step: " + (artifact.sourceTaskStepId || "none")
    },
    {
      label: "质量",
      value: qualityValue,
      tone: getArtifactBadgeTone(qualityValue),
      summary: getArtifactQualityDescription(artifact),
      detail: artifact.qualityReason || "质量分：" + formatQualityScore(artifact.qualityScore)
    },
    {
      label: "构建",
      value: buildValue,
      tone: getArtifactBadgeTone(buildValue),
      summary: isBlockingValidationStatus(buildValue)
        ? "构建校验阻断交付，请先修复代码。"
        : "构建校验没有阻断项，或该产物不需要构建校验。",
      detail: artifact.buildValidationReason || "无构建失败原因。"
    },
    {
      label: "Fallback",
      value: fallbackValue,
      tone: fallbackReason ? "warning" : "success",
      summary: fallbackReason ? "该产物具有 fallback 或归档语义。" : "当前没有明确 fallback 原因。",
      detail: fallbackReason || "该产物可继续进入交付流程。"
    }
  ];
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

  return `${value.slice(0, maxLength - 3)}...`;
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
  onDownloadArtifactBundle,
  onRestoreSnapshot,
  onApplyDiff,
  onForceApplyDiff,
  onSendSelectionToChat,
  onCreateApprovalRequest,
  onApproveApprovalRequest,
  onCancelApprovalRequest
}: ArtifactPanelProps) {
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
  const {
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
  } = useArtifactOperationController({
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
  });

  return (
    <div className="artifact-panel" data-testid="artifact-panel">
      <ArtifactListPane
        artifacts={artifacts}
        totalArtifactCount={totalArtifactCount}
        selectedArtifactId={selectedArtifactId}
        loadingArtifacts={loadingArtifacts}
        highlightedArtifactIds={highlightedArtifactIds}
        filteredByTaskStep={filteredByTaskStep}
        onSelectArtifact={onSelectArtifact}
        onShowAllArtifacts={onShowAllArtifacts}
      />

      <div className="artifact-panel__detail" data-testid="artifact-detail">
        <div className="section-header">
          <h3>产物详情</h3>
          {selectedArtifact ? <span>{displayArtifactType(selectedArtifact.type)}</span> : null}
        </div>

        {loadingArtifactDetail ? (
          <div className="panel-empty">正在加载产物详情...</div>
        ) : !selectedArtifact ? (
          <div className="artifact-scaffold-inspector" aria-label="Artifact inspector scaffold">
            <div className="artifact-scaffold-inspector__hero">
              <span className="artifact-scaffold-card__icon">A</span>
              <div>
                <strong>LoginPage.tsx</strong>
                <p>React 组件 / 本地静态预览示例</p>
                <small>ID: art_7f3b5c9a / 示例创建时间 10:53</small>
              </div>
              <button type="button" disabled>本地预览</button>
            </div>
            <div className="artifact-inspector-tabs artifact-inspector-tabs--scaffold" aria-label="Artifact scaffold sections">
              <span className="artifact-inspector-tabs__item artifact-inspector-tabs__item--active">概览</span>
              <span className="artifact-inspector-tabs__item">版本 6</span>
              <span className="artifact-inspector-tabs__item">快照 3</span>
              <span className="artifact-inspector-tabs__item">预览 2</span>
            </div>
            <div className="artifact-scaffold-metrics">
              <article><span>来源</span><strong>REAL_ADAPTER</strong></article>
              <article><span>质量</span><strong>ACCEPTED</strong></article>
              <article><span>构建</span><strong>PASS</strong></article>
              <article><span>运行</span><strong>HEALTHY</strong></article>
            </div>
            <section className="artifact-scaffold-diagnostics">
              <header>
                <strong>诊断</strong>
                <span>示例全部通过</span>
              </header>
              <p>TypeScript <em>passed</em></p>
              <p>ESLint <em>passed</em></p>
              <p>Vite build <em>passed</em></p>
              <p>A11y <em>passed</em></p>
            </section>
            <section className="artifact-scaffold-preview">
              <header>
                <strong>本地预览示例</strong>
                <span>Local static sample</span>
              </header>
              <div className="artifact-scaffold-login-preview">
                <b>Welcome back</b>
                <span>Sign in to your Agent workspace</span>
                <i>Email</i>
                <i>Password</i>
                <button type="button" disabled>Sign in</button>
              </div>
            </section>
          </div>
        ) : (
          <div className={"artifact-preview artifact-preview--tab-" + activeInspectorTab}>
            <ArtifactInspectorTabs
              tabs={ARTIFACT_INSPECTOR_TABS}
              activeTab={activeInspectorTab}
              versionCount={versionEntries.length}
              snapshotCount={snapshots.length}
              deploymentCount={deployments.length}
              relatedCount={Math.max(versionEntries.length - 1, 0)}
              onChange={setActiveInspectorTab}
            />
            <div className="artifact-preview__meta">
              <div>
                <strong>{selectedArtifact.title}</strong>
                <p>
                  {displayArtifactType(selectedArtifact.type)} / {displayStatus(selectedArtifact.status)} / v{selectedArtifact.version}
                </p>
                {selectedArtifact.sourceKind ? (
                  <p className="artifact-preview__line">
                    来源：{displayArtifactSourceKind(selectedArtifact.sourceKind)}
                    {selectedArtifact.sourceAdapterType ? "/ Adapter: " + selectedArtifact.sourceAdapterType : ""}
                    {selectedArtifact.sourceTaskStepId ? "/ Step: " + selectedArtifact.sourceTaskStepId : ""}
                    {selectedArtifact.generationMode ? "/ Mode: " + selectedArtifact.generationMode : ""}
                  </p>
                ) : null}
                {selectedArtifact.sourceKind ? (
                  <p className="artifact-preview__line">
                    {selectedArtifact.sourceKind === "REAL_ADAPTER" ? "真实 Adapter 输出" : "静态或 fallback 输出"}：{selectedArtifact.qualityStatus || "UNKNOWN"}
                  </p>
                ) : null}
                <p className="artifact-preview__line">
                  真实 Adapter 结果：{selectedArtifact.realAdapterOutcome || "FALLBACK"}
                </p>
                {selectedArtifact.sourceKind === "REAL_ADAPTER" ? (
                  <p className="artifact-preview__line">构建校验：{formatBuildValidationValue(selectedArtifact)}</p>
                ) : null}
                {selectedArtifact.buildValidationReason ? (
                  <p className="artifact-preview__line">构建原因：{selectedArtifact.buildValidationReason}</p>
                ) : null}
                <p className="artifact-preview__line">质量分：{formatQualityScore(selectedArtifact.qualityScore)}</p>
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
                    该 Revision 产物基于当前会话中的历史版本生成。
                  </p>
                ) : null}
              </div>
              <div className="artifact-preview__meta-right">
                <span>{formatId(selectedArtifact.id)}</span>
                <span>{selectedArtifact.language || "plain"}</span>
              </div>
            </div>
            <ArtifactInspectorMetrics
              metrics={[
                {
                  label: "来源",
                  value: displayArtifactSourceKind(selectedArtifact.sourceKind || "STATIC_TEMPLATE"),
                  detail: selectedArtifact.sourceAdapterType || selectedArtifact.generationMode || "fallback-ready"
                },
                {
                  label: "质量",
                  value: selectedArtifact.qualityStatus || selectedArtifact.realAdapterOutcome || "NOT_EVALUATED",
                  detail: "score " + formatQualityScore(selectedArtifact.qualityScore)
                },
                {
                  label: "构建",
                  value: formatBuildValidationValue(selectedArtifact),
                  detail: selectedArtifact.buildValidationReason || "无阻断原因"
                },
                {
                  label: "运行",
                  value: displayStatus(selectedArtifact.status),
                  detail: selectedArtifact.realAdapterOutcome || selectedArtifact.generationMode || "本地静态边界"
                }
              ]}
            />
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
            <section className="artifact-preview-dock" data-testid="artifact-preview-dock">
              <div className="artifact-preview-dock__header">
                <div>
                  <span>本地预览</span>
                  <strong>{selectedArtifact.type === "WEB_PREVIEW" ? "内嵌 Web 预览" : "内容快照"}</strong>
                </div>
                <a href={"/preview/" + getIdValue(selectedArtifact.id)} target="_blank" rel="noreferrer">
                  打开独立预览
                </a>
              </div>
              <div className="artifact-preview-dock__body">{renderArtifactContent(selectedArtifact)}</div>
            </section>
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
              <ArtifactApprovalGatePanel
                approval={pendingApproval}
                onConfirm={() => {
                  void handleConfirmApproval();
                }}
                onCancel={() => {
                  void handleCancelApproval();
                }}
              />
            ) : null}
            <ArtifactRevisionWorkspace
              artifact={selectedArtifact}
              allArtifacts={allArtifacts}
              revisingArtifact={revisingArtifact}
              isEditingSelectedArtifact={isEditingSelectedArtifact}
              draftContent={draftContent}
              draftNote={draftNote}
              draftSelection={draftSelection}
              draftDiffPreview={draftDiffPreview}
              revisionInstruction={revisionInstruction}
              appliedDiffArtifactId={appliedDiffArtifactId}
              diffConflictArtifactId={diffConflictArtifactId}
              diffConflictMessage={diffConflictMessage}
              canSendSelectionToChat={Boolean(onSendSelectionToChat)}
              onStartContentEdit={handleStartContentEdit}
              onCancelContentEdit={handleCancelContentEdit}
              onDraftContentChange={setDraftContent}
              onDraftNoteChange={setDraftNote}
              onDraftSelectionChange={handleDraftSelectionChange}
              onCreateDraftRevision={() => {
                void handleCreateDraftRevision();
              }}
              onSendSelectionToChat={handleSendSelectionToChat}
              onRevisionInstructionChange={setRevisionInstruction}
              onCreateRevision={() => {
                void handleCreateRevision();
              }}
              onApplyDiff={(artifact) => {
                void handleApplyDiffArtifact(artifact);
              }}
              onForceApplyDiff={(artifact) => {
                void handleForceApplyDiffArtifact(artifact);
              }}
            />
            <ArtifactDeployPanel
              artifact={selectedArtifact}
              deployments={deployments}
              deployingArtifact={deployingArtifact}
              onDownloadBundle={() => onDownloadArtifactBundle(selectedArtifactId ? [selectedArtifactId] : [])}
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
            <ArtifactAuditPanel
              artifact={selectedArtifact}
              selectedVersionEntry={selectedVersionEntry}
              versionCount={versionEntries.length}
              revisionInstructionLabel={
                selectedArtifact.revisionInstruction ? truncateText(selectedArtifact.revisionInstruction, 72) : "无"
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
