import { useEffect, useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { Artifact } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { getVersionHistoryEntries } from "./artifactLineage";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

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
  onCreateDeployment: (artifactId: string) => Promise<void>;
  onRestoreSnapshot: (snapshotId: string) => Promise<Artifact | null>;
  onApplyDiff: (artifactId: string) => Promise<Artifact | null>;
  onForceApplyDiff: (artifactId: string) => Promise<Artifact | null>;
  onRecordApprovalAudit: (request: {
    actionType: string;
    targetType: string;
    targetId: string;
    status: string;
    summary: string;
  }) => Promise<void>;
}

type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH";

interface ApprovalRequest {
  actionType: string;
  targetType: string;
  targetId: string;
  title: string;
  summary: string;
  riskLevel: ApprovalRisk;
  confirmLabel: string;
  execute: () => Promise<void>;
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
  onRecordApprovalAudit
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

  useEffect(() => {
    setRevisionInstruction(selectedArtifact?.revisionInstruction || PRODUCT_REVISION_INSTRUCTION);
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
    requestApproval({
      actionType: "APPROVE_DEMO_DEPLOY",
      targetType: "ARTIFACT",
      targetId: selectedArtifactId,
      title: "Approve demo deployment",
      summary: `Deploy ${artifactTitle} to the static preview target. This is a local demo deployment, not an external release.`,
      riskLevel: "MEDIUM",
      confirmLabel: "Approve Deploy",
      execute: async () => {
        await onCreateDeployment(selectedArtifactId);
      }
    });
  }

  function requestApproval(request: ApprovalRequest) {
    setPendingApproval(request);
    setArtifactOperationMessage(`Approval required: ${request.title}`);
  }

  async function recordApproval(request: ApprovalRequest, status: "APPROVED" | "CANCELLED") {
    if (!conversationId) {
      return;
    }

    try {
      await onRecordApprovalAudit({
        actionType: request.actionType,
        targetType: request.targetType,
        targetId: request.targetId,
        status,
        summary: `${status}: ${request.summary}`
      });
    } catch (error) {
      console.warn("Failed to record approval audit.", error);
    }
  }

  async function handleConfirmApproval() {
    if (!pendingApproval) {
      return;
    }

    const approval = pendingApproval;
    setPendingApproval(null);
    await recordApproval(approval, "APPROVED");
    await approval.execute();
  }

  async function handleCancelApproval() {
    if (!pendingApproval) {
      return;
    }

    const approval = pendingApproval;
    setPendingApproval(null);
    await recordApproval(approval, "CANCELLED");
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

  async function executeRestoreSnapshot(snapshotId: string) {
    const restoredArtifact = await onRestoreSnapshot(snapshotId);
    if (restoredArtifact) {
      onSelectArtifact(getIdValue(restoredArtifact.id));
      setArtifactOperationMessage(`Restored snapshot as ${restoredArtifact.title} v${restoredArtifact.version}.`);
    }
  }

  async function handleRestoreSnapshot(snapshotId: string) {
    const snapshot = snapshots.find((item) => item.snapshotId === snapshotId);
    requestApproval({
      actionType: "APPROVE_RESTORE_SNAPSHOT",
      targetType: "ARTIFACT_SNAPSHOT",
      targetId: snapshotId,
      title: "Approve snapshot restore",
      summary: `Restore ${snapshot?.title || "artifact snapshot"} from safety snapshot ${snapshotId}. This creates a new restored Artifact version.`,
      riskLevel: "HIGH",
      confirmLabel: "Approve Restore",
      execute: async () => {
        await executeRestoreSnapshot(snapshotId);
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

  async function executeApplyDiffArtifact(artifact: Artifact) {
    const artifactId = getIdValue(artifact.id);
    const appliedArtifact = await onApplyDiff(artifactId);

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
    requestApproval({
      actionType: "APPROVE_APPLY_DIFF",
      targetType: "ARTIFACT",
      targetId: artifactId,
      title: "Approve diff apply",
      summary: `Apply the generated diff for ${artifact.title} v${artifact.version}. A safety snapshot is created before applying.`,
      riskLevel: "MEDIUM",
      confirmLabel: "Approve Apply Diff",
      execute: async () => {
        await executeApplyDiffArtifact(artifact);
      }
    });
  }

  async function executeForceApplyDiffArtifact(artifact: Artifact) {
    const artifactId = getIdValue(artifact.id);
    const appliedArtifact = await onForceApplyDiff(artifactId);

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
    requestApproval({
      actionType: "APPROVE_FORCE_APPLY_DIFF",
      targetType: "ARTIFACT",
      targetId: artifactId,
      title: "Approve force apply diff",
      summary: `Force apply the generated diff for ${artifact.title} v${artifact.version}. This bypasses the conflict guard and creates a new Artifact version.`,
      riskLevel: "HIGH",
      confirmLabel: "Approve Force Apply",
      execute: async () => {
        await executeForceApplyDiffArtifact(artifact);
      }
    });
  }

  return (
    <div className="artifact-panel">
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
          <div className="panel-empty">运行 Demo Task 后会生成产物。</div>
        ) : (
          <div className="artifact-card-list">
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

      <div className="artifact-panel__detail">
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
              <div className={`approval-gate approval-gate--${pendingApproval.riskLevel.toLowerCase()}`}>
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
                  <span>Target: {pendingApproval.targetType}</span>
                  <span>ID: {pendingApproval.targetId}</span>
                  <span>Approval result will be written to Action Audit.</span>
                </div>
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
                    Cancel
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
            <div className="deploy-status-box">
              <div className="artifact-revision-box__header">
                <strong>Deploy Status</strong>
                <span>Static demo simulation</span>
              </div>
              <button
                type="button"
                className="primary-button artifact-revision-box__button"
                disabled={deployingArtifact}
                onClick={() => {
                  void handleCreateDeployment();
                }}
              >
                {deployingArtifact ? "Deploying..." : "Deploy Selected Artifact"}
              </button>
              {deployments.length === 0 ? (
                <div className="deploy-status-empty">
                  No deployment yet. Deploy this artifact to generate a static preview card.
                </div>
              ) : (
                <div className="deploy-status-list">
                  {deployments.map((deployment) => (
                    <div className="deploy-status-card" key={deployment.deploymentId}>
                      <div className="deploy-status-card__row">
                        <strong>{deployment.artifactTitle}</strong>
                        <span className={`status-pill status-pill--${normalizeStatusClass(deployment.status)}`}>
                          {displayStatus(deployment.status)}
                        </span>
                      </div>
                      <div className="deploy-status-card__meta">
                        <span>Target: {deployment.deployTarget}</span>
                        <span>ID: {deployment.deploymentId}</span>
                        <span>{new Date(deployment.createdAt).toLocaleString()}</span>
                      </div>
                      <a
                        className="deploy-preview-link"
                        href={deployment.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {deployment.previewUrl}
                      </a>
                      <div className="deploy-status-card__actions">
                        <a
                          className="primary-button deploy-status-card__button"
                          href={deployment.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Preview
                        </a>
                        <button
                          type="button"
                          className="secondary-button deploy-status-card__button"
                          onClick={() => {
                            void handleCopyPreviewUrl(deployment.previewUrl);
                          }}
                        >
                          Copy URL
                        </button>
                      </div>
                      <p>{deployment.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <VersionHistoryPanel
              artifacts={allArtifacts}
              selectedArtifact={selectedArtifact}
              selectedArtifactId={selectedArtifactId}
              onSelectArtifact={onSelectArtifact}
            />
            <div className="artifact-snapshot-box">
              <div className="artifact-revision-box__header">
                <strong>Safety Snapshots</strong>
                <span>{snapshots.length} record(s)</span>
              </div>
              {snapshots.length === 0 ? (
                <div className="deploy-status-empty">
                  No safety snapshot yet. Revision, apply diff, deploy, and restore will create snapshots.
                </div>
              ) : (
                <div className="deploy-status-list">
                  {snapshots.map((snapshot) => (
                    <div className="deploy-status-card" key={snapshot.snapshotId}>
                      <div className="deploy-status-card__row">
                        <strong>{snapshot.title} v{snapshot.version}</strong>
                        <span className="tag-chip">{snapshot.operationType}</span>
                      </div>
                      <div className="deploy-status-card__meta">
                        <span>ID: {snapshot.snapshotId}</span>
                        <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        className="secondary-button deploy-status-card__button"
                        disabled={restoringSnapshot}
                        onClick={() => {
                          void handleRestoreSnapshot(snapshot.snapshotId);
                        }}
                      >
                        {restoringSnapshot ? "Restoring..." : "Restore Snapshot"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
