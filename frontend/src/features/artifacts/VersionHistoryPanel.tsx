import type { Artifact } from "./artifactTypes";
import { getVersionHistoryEntries } from "./artifactLineage";
import { displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

interface VersionHistoryPanelProps {
  artifacts: Artifact[];
  selectedArtifact: Artifact | null;
  selectedArtifactId: string | null;
  onSelectArtifact: (artifactId: string) => void;
}

export function VersionHistoryPanel({
  artifacts,
  selectedArtifact,
  selectedArtifactId,
  onSelectArtifact
}: VersionHistoryPanelProps) {
  const entries = getVersionHistoryEntries(artifacts, selectedArtifact);

  if (!selectedArtifact) {
    return null;
  }

  return (
    <section className="version-history">
      <div className="artifact-detail-section__header">
        <strong>版本历史</strong>
        <span>{selectedArtifact.title}</span>
      </div>

      <div className="version-history__list">
        {entries.map((entry) => {
          const isSelected = entry.artifactId === selectedArtifactId;

          return (
            <button
              key={entry.artifactId}
              type="button"
              className={`version-history-item ${isSelected ? "version-history-item--selected" : ""}`}
              onClick={() => onSelectArtifact(entry.artifactId)}
            >
              <div className="version-history-item__row">
                <div className="version-history-item__meta">
                  <strong>v{entry.artifact.version}</strong>
                  <span>{displayArtifactType(entry.artifact.type)}</span>
                </div>
                <span className={`status-pill status-pill--${normalizeStatusClass(entry.artifact.status)}`}>
                  {displayStatus(entry.artifact.status)}
                </span>
              </div>
              <div className="version-history-item__notes">
                {entry.isRevision ? (
                  <>
                    <span className="revision-badge">二次修改</span>
                    {entry.basedOnVersionLabel ? <span>基于 {entry.basedOnVersionLabel}</span> : null}
                    {entry.artifact.revisionInstruction ? (
                      <p>修改指令：{entry.artifact.revisionInstruction}</p>
                    ) : null}
                  </>
                ) : (
                  <span>初始产物</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
