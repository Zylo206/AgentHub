import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";

function formatQualityScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return score.toFixed(2);
}

function getDisplayBuildValidationValue(artifact: Artifact): string {
  return artifact.buildValidationStatus || "NOT_EVALUATED";
}

function getDisplayQualityStatus(status?: string | null): string {
  return status || "NOT_EVALUATED";
}

interface ArtifactCardProps {
  artifact: Artifact;
  selected: boolean;
  highlighted: boolean;
  onSelect: (artifactId: string) => void;
}

export function ArtifactCard({ artifact, selected, highlighted, onSelect }: ArtifactCardProps) {
  const artifactId = getIdValue(artifact.id);
  const isRevision = Boolean(artifact.parentArtifactId || artifact.revisionInstruction);
  const isRealAdapterArtifact = artifact.sourceKind === "REAL_ADAPTER";
  const qualityScore = formatQualityScore(artifact.qualityScore);

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
          <span
            className={`artifact-card__tag artifact-source-badge ${isRealAdapterArtifact ? "artifact-source-badge--real-adapter" : "artifact-source-badge--static-template"}`}
          >
            {isRealAdapterArtifact ? "Real Adapter output artifact" : "Static / fallback output artifact"}
          </span>
          <span className="artifact-card__tag artifact-source-badge">
            Status: {getDisplayQualityStatus(artifact.qualityStatus)}
          </span>
          {isRealAdapterArtifact ? (
            <span className="artifact-card__tag artifact-source-badge">
              Build validation: {getDisplayBuildValidationValue(artifact)}
            </span>
          ) : (
            <span className="artifact-card__tag artifact-source-badge">Build validation: N/A</span>
          )}
          {artifact.qualityScore !== null && artifact.qualityScore !== undefined ? (
            <span className="artifact-card__tag artifact-source-badge">Code quality score: {qualityScore}</span>
          ) : (
            <span className="artifact-card__tag artifact-source-badge">Code quality score: N/A</span>
          )}
          {artifact.qualityReason ? (
            <span className="artifact-card__tag artifact-source-badge">Quality reason: {artifact.qualityReason}</span>
          ) : null}
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
