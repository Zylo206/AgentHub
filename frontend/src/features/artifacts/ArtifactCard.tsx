import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ArtifactCardProps {
  artifact: Artifact;
  selected: boolean;
  highlighted: boolean;
  onSelect: (artifactId: string) => void;
}

export function ArtifactCard({ artifact, selected, highlighted, onSelect }: ArtifactCardProps) {
  const artifactId = getIdValue(artifact.id);
  const isRevision = Boolean(artifact.parentArtifactId || artifact.revisionInstruction);

  return (
    <button
      type="button"
      className={`artifact-card ${selected ? "artifact-card--selected" : ""} ${
        highlighted ? "artifact-card--highlighted" : ""
      }`}
      onClick={() => onSelect(artifactId)}
    >
      <div className="artifact-card__row">
        <strong>{artifact.title}</strong>
        <span className="artifact-card__version version-badge">v{artifact.version}</span>
      </div>
      <div className="artifact-card__meta">
        <span>{displayArtifactType(artifact.type)}</span>
        <span>{displayStatus(artifact.status)}</span>
      </div>
      {artifact.sourceKind ? (
        <div className="artifact-card__tags">
          <span className={`artifact-card__tag artifact-source-badge artifact-source-badge--${artifact.sourceKind.toLowerCase().replace(/_/g, "-")}`}>
            {displayArtifactSourceKind(artifact.sourceKind)}
          </span>
        </div>
      ) : null}
      {isRevision ? (
        <div className="artifact-card__tags">
          <span className="artifact-card__tag revision-badge">二次修改</span>
          {artifact.parentArtifactId ? (
            <span className="artifact-card__tag artifact-card__tag--lineage">
              基于上一版产物
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="artifact-card__id">{formatId(artifact.id)}</div>
    </button>
  );
}
