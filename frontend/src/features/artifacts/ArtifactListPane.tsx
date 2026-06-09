import { ArtifactCard } from "./ArtifactCard";
import type { Artifact } from "./artifactTypes";
import { formatId, getIdValue } from "../../utils/id";

interface ArtifactListPaneProps {
  artifacts: Artifact[];
  totalArtifactCount: number;
  selectedArtifactId: string | null;
  loadingArtifacts: boolean;
  highlightedArtifactIds: string[];
  filteredByTaskStep: boolean;
  onSelectArtifact: (artifactId: string) => void;
  onShowAllArtifacts: () => void;
}

export function ArtifactListPane({
  artifacts,
  totalArtifactCount,
  selectedArtifactId,
  loadingArtifacts,
  highlightedArtifactIds,
  filteredByTaskStep,
  onSelectArtifact,
  onShowAllArtifacts
}: ArtifactListPaneProps) {
  return (
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
        <div className="panel-empty artifact-panel__empty-state">
          当前会话还没有真实产物。开始协作后，代码、文档和评审报告会显示在这里。
        </div>
      ) : (
        <div className="artifact-card-list" data-testid="artifact-card-list">
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
  );
}
