import { useEffect, useState } from "react";
import { ArtifactCard } from "./ArtifactCard";
import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";

const DEFAULT_REVISION_INSTRUCTION =
  "\u628a\u6309\u94ae\u6539\u6210\u84dd\u8272\uff0c\u5e76\u589e\u52a0 loading \u72b6\u6001\u3002";

interface ArtifactPanelProps {
  artifacts: Artifact[];
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
                {selectedArtifact.parentArtifactId ? (
                  <p className="artifact-preview__line">
                    Based on {selectedArtifact.parentArtifactId}
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
            {renderArtifactContent(selectedArtifact)}
          </div>
        )}
      </div>
    </div>
  );
}
