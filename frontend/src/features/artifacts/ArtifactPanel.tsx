import { useEffect, useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { Artifact } from "./artifactTypes";
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
  deployingArtifact: boolean;
  onSelectArtifact: (artifactId: string) => void;
  onShowAllArtifacts: () => void;
  onCreateRevision: (artifactId: string, revisionInstruction: string) => Promise<void>;
  onCreateDeployment: (artifactId: string) => Promise<void>;
}

const PRODUCT_REVISION_INSTRUCTION = "把主按钮改成蓝色，并增加 loading 状态。";

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
  deployingArtifact,
  onSelectArtifact,
  onShowAllArtifacts,
  onCreateRevision,
  onCreateDeployment
}: ArtifactPanelProps) {
  const [revisionInstruction, setRevisionInstruction] = useState(PRODUCT_REVISION_INSTRUCTION);
  const versionEntries = getVersionHistoryEntries(allArtifacts, selectedArtifact);
  const selectedVersionEntry =
    versionEntries.find((entry) => entry.artifactId === selectedArtifactId) ?? null;

  useEffect(() => {
    setRevisionInstruction(selectedArtifact?.revisionInstruction || PRODUCT_REVISION_INSTRUCTION);
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

    await onCreateDeployment(selectedArtifactId);
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
            <DiffSummaryPanel artifacts={allArtifacts} artifact={selectedArtifact} />
            {renderArtifactContent(selectedArtifact)}
          </div>
        )}
      </div>
    </div>
  );
}
