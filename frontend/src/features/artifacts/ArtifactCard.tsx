import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";
import { sanitizeProductionText } from "../../utils/productionLabels";

function formatQualityScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "未评分";
  }

  return score.toFixed(2);
}

function formatBuildValidation(status: string | null | undefined): string {
  if (!status || status === "NOT_EVALUATED") {
    return "未构建";
  }
  if (status === "PASS" || status === "PASSED") {
    return "构建通过";
  }
  if (status === "FAILED" || status === "FAIL") {
    return "构建失败";
  }
  return sanitizeProductionText(status);
}

function formatQualityStatus(status: string | null | undefined): string {
  if (!status || status === "NOT_EVALUATED") {
    return "未评估";
  }
  if (status === "ACCEPTED" || status === "PASS" || status === "PASSED") {
    return "质量通过";
  }
  return sanitizeProductionText(status);
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
  const sourceLabel = displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE");
  const buildLabel = formatBuildValidation(artifact.buildValidationStatus);
  const qualityLabel = formatQualityStatus(artifact.qualityStatus);

  return (
    <button
      type="button"
      className={`artifact-card ${selected ? "artifact-card--selected" : ""} ${
        highlighted ? "artifact-card--highlighted" : ""
      }`}
      data-testid="artifact-card"
      onClick={() => onSelect(artifactId)}
    >
      <div className="artifact-card__row">
        <div className="artifact-card__title">
          <strong>{artifact.title}</strong>
          <span>
            {displayArtifactType(artifact.type)} / {displayStatus(artifact.status)}
          </span>
        </div>
        <span className="artifact-card__version version-badge">v{artifact.version}</span>
      </div>

      <div className="artifact-card__meta">
        <span>{isRealAdapterArtifact ? "真实输出" : "本地预览"}</span>
        <span>{sourceLabel}</span>
        <span>{formatId(artifact.id)}</span>
      </div>

      <div className="artifact-card__tags">
        <span className="artifact-card__tag artifact-card__tag--quality">{qualityLabel}</span>
        <span className="artifact-card__tag artifact-card__tag--build">{buildLabel}</span>
        <span className="artifact-card__tag">质量分 {qualityScore}</span>
      </div>

      {isRevision ? (
        <div className="artifact-card__revision-note">
          <span>二次修改</span>
          {artifact.parentArtifactId ? <em>基于上一版产物生成</em> : <em>基于会话历史生成</em>}
        </div>
      ) : null}
    </button>
  );
}
