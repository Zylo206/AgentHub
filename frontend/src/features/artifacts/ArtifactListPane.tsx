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
        <div className="artifact-scaffold-list" aria-label="Artifact scaffold examples">
          <article className="artifact-scaffold-card artifact-scaffold-card--active">
            <span className="artifact-scaffold-card__icon">A</span>
            <div>
              <strong>LoginPage.tsx</strong>
              <small>React 组件示例</small>
            </div>
            <em>v1.2.0</em>
          </article>
          <article className="artifact-scaffold-card">
            <span className="artifact-scaffold-card__icon artifact-scaffold-card__icon--api">API</span>
            <div>
              <strong>auth.api.yaml</strong>
              <small>OpenAPI 合约示例</small>
            </div>
            <em>合约</em>
          </article>
          <article className="artifact-scaffold-card">
            <span className="artifact-scaffold-card__icon artifact-scaffold-card__icon--review">R</span>
            <div>
              <strong>安全审计报告</strong>
              <small>Review Report 示例</small>
            </div>
            <em>通过</em>
          </article>
          <p>确认协作后，Agent 生成的真实产物会出现在这里。</p>
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
