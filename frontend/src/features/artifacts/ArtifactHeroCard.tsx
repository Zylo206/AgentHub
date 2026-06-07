import type { Artifact } from "./artifactTypes";
import type { VersionHistoryEntry } from "./artifactLineage";
import { formatId } from "../../utils/id";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ArtifactHeroCardProps {
  artifact: Artifact;
  fallbackReason: string | null;
  gateAction: { title: string; reason: string; nextStep: string } | null;
  selectedVersionEntry: VersionHistoryEntry | null;
  buildValidationLabel: string;
  qualityScoreLabel: string;
}

export function ArtifactHeroCard({
  artifact,
  fallbackReason,
  gateAction,
  selectedVersionEntry,
  buildValidationLabel,
  qualityScoreLabel
}: ArtifactHeroCardProps) {
  const sourceLabel = displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE");
  const isRealOutput = artifact.sourceKind === "REAL_ADAPTER";

  return (
    <section className={`artifact-hero-card ${isRealOutput ? "artifact-hero-card--real" : "artifact-hero-card--fallback"}`} data-testid="artifact-hero-card">
      <div className="artifact-hero-card__main">
        <span className="artifact-hero-card__avatar">A</span>
        <div>
          <span className="artifact-hero-card__eyebrow">
            {isRealOutput ? "真实 Adapter 产物" : "本地 / fallback 产物"}
          </span>
          <strong>{artifact.title}</strong>
          <p>
            {displayArtifactType(artifact.type)} / {displayStatus(artifact.status)} / v{artifact.version}
          </p>
        </div>
      </div>

      <div className="artifact-hero-card__badges" aria-label="Artifact source and delivery boundary">
        <span>{sourceLabel}</span>
        <span>{artifact.realAdapterOutcome || "FALLBACK"}</span>
        <span>Build {buildValidationLabel}</span>
        <span>Score {qualityScoreLabel}</span>
      </div>

      <div className="artifact-hero-card__meta">
        <span>ID {formatId(artifact.id)}</span>
        <span>{artifact.language || "plain"}</span>
        <span>{artifact.generationMode || "STATIC"}</span>
      </div>

      {fallbackReason ? (
        <p className="artifact-hero-card__boundary">
          当前产物包含 STATIC / MOCK / FALLBACK 边界：{fallbackReason}
        </p>
      ) : null}

      {gateAction ? (
        <div className="artifact-hero-card__gate">
          <strong>{gateAction.title}</strong>
          <span>{gateAction.reason}</span>
        </div>
      ) : null}

      {selectedVersionEntry?.parentArtifact ? (
        <p className="artifact-hero-card__lineage">
          基于 {selectedVersionEntry.parentArtifact.title} v{selectedVersionEntry.parentArtifact.version}
        </p>
      ) : artifact.revisionInstruction ? (
        <p className="artifact-hero-card__lineage">该 Revision 产物基于当前会话中的历史版本生成。</p>
      ) : null}
    </section>
  );
}
