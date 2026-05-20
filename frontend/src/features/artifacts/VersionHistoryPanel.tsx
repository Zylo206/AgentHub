import type { Artifact } from "./artifactTypes";
import { getVersionHistoryEntries } from "./artifactLineage";

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

  function normalizeStatus(status: string): string {
    return status.toLowerCase().replace(/_/g, "-");
  }

  if (!selectedArtifact) {
    return null;
  }

  return (
    <section className="version-history">
      <div className="artifact-detail-section__header">
        <strong>Version History</strong>
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
                  <span>{entry.artifact.type}</span>
                </div>
                <span className={`status-pill status-pill--${normalizeStatus(entry.artifact.status)}`}>
                  {entry.artifact.status}
                </span>
              </div>
              <div className="version-history-item__notes">
                {entry.isRevision ? (
                  <>
                    <span className="revision-badge">Revision</span>
                    {entry.basedOnVersionLabel ? <span>Based on {entry.basedOnVersionLabel}</span> : null}
                    {entry.artifact.revisionInstruction ? (
                      <p>Instruction: {entry.artifact.revisionInstruction}</p>
                    ) : null}
                  </>
                ) : (
                  <span>Initial artifact</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
