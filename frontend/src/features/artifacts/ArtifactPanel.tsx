import { useEffect, useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import { DiffSummaryPanel } from "./DiffSummaryPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import type { Artifact } from "./artifactTypes";
import { getVersionHistoryEntries } from "./artifactLineage";
import { formatId, getIdValue } from "../../utils/id";

const DEFAULT_REVISION_INSTRUCTION =
  "把按钮改成蓝色，并增加 loading 状态。";

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
  onSelectArtifact: (artifactId: string) => void;
  onShowAllArtifacts: () => void;
  onCreateRevision: (artifactId: string, revisionInstruction: string) => Promise<void>;
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
  onSelectArtifact,
  onShowAllArtifacts,
  onCreateRevision
}: ArtifactPanelProps) {
  const [revisionInstruction, setRevisionInstruction] = useState(DEFAULT_REVISION_INSTRUCTION);
  const versionEntries = getVersionHistoryEntries(allArtifacts, selectedArtifact);
  const selectedVersionEntry =
    versionEntries.find((entry) => entry.artifactId === selectedArtifactId) ?? null;

  useEffect(() => {
    setRevisionInstruction(selectedArtifact?.revisionInstruction || DEFAULT_REVISION_INSTRUCTION);
  }, [selectedArtifact]);

  async function handleCreateRevision() {
    if (!selectedArtifactId || !revisionInstruction.trim()) {
      return;
    }

    await onCreateRevision(selectedArtifactId, revisionInstruction.trim());
  }

  return (
    <div className="artifact-panel">
      <div className="artifact-panel__sidebar">
        <div className="section-header">
          <h3>Artifacts</h3>
          <span>
            {artifacts.length} / {totalArtifactCount}
          </span>
        </div>

        {filteredByTaskStep ? (
          <button type="button" className="show-all-button" onClick={onShowAllArtifacts}>
            Show All Artifacts
          </button>
        ) : null}

        {loadingArtifacts ? (
          <div className="panel-empty">Loading artifacts...</div>
        ) : artifacts.length === 0 ? (
          <div className="panel-empty">Run the demo task to generate artifacts.</div>
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
          <h3>Artifact Detail</h3>
          {selectedArtifact ? <span>{selectedArtifact.type}</span> : null}
        </div>

        {loadingArtifactDetail ? (
          <div className="panel-empty">Loading artifact detail...</div>
        ) : !selectedArtifact ? (
          <div className="panel-empty">Select an artifact to inspect its content.</div>
        ) : (
          <div className="artifact-preview">
            <div className="artifact-preview__meta">
              <div>
                <strong>{selectedArtifact.title}</strong>
                <p>
                  {selectedArtifact.type} / {selectedArtifact.status} / v{selectedArtifact.version}
                </p>
                {selectedVersionEntry?.parentArtifact ? (
                  <p className="artifact-preview__line revision-origin">
                    Based on {selectedVersionEntry.parentArtifact.title} v
                    {selectedVersionEntry.parentArtifact.version}
                  </p>
                ) : selectedArtifact.revisionInstruction ? (
                  <p className="artifact-preview__line revision-origin">
                    Revision artifact generated from a previous version in this conversation.
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
                <strong>Artifact Revision</strong>
                <span>Static demo iteration</span>
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
                {revisingArtifact ? "Revising..." : "Revise Selected Artifact"}
              </button>
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
