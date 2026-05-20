import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";

interface ArtifactCardProps {
  artifact: Artifact;
  selected: boolean;
  highlighted: boolean;
  onSelect: (artifactId: string) => void;
}

export function ArtifactCard({ artifact, selected, highlighted, onSelect }: ArtifactCardProps) {
  const artifactId = getIdValue(artifact.id);

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
        <span className="artifact-card__version">v{artifact.version}</span>
      </div>
      <div className="artifact-card__meta">
        <span>{artifact.type}</span>
        <span>{artifact.status}</span>
      </div>
      {artifact.parentArtifactId || artifact.revisionInstruction ? (
        <div className="artifact-card__tags">
          {artifact.parentArtifactId ? (
            <span className="artifact-card__tag">Revision</span>
          ) : null}
          {artifact.revisionInstruction ? (
            <span className="artifact-card__tag">Based on previous artifact</span>
          ) : null}
        </div>
      ) : null}
      <div className="artifact-card__id">{formatId(artifact.id)}</div>
    </button>
  );
}
