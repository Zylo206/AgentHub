import type { Artifact } from "./artifactTypes";
import { formatId } from "../../utils/id";

interface ArtifactVersionEntry {
  parentArtifact?: Artifact | null;
}

interface ArtifactAuditPanelProps {
  artifact: Artifact;
  selectedVersionEntry?: ArtifactVersionEntry | null;
  versionCount: number;
  revisionInstructionLabel: string;
}

export function ArtifactAuditPanel({
  artifact,
  selectedVersionEntry,
  versionCount,
  revisionInstructionLabel
}: ArtifactAuditPanelProps) {
  return (
    <>
      <section className="artifact-audit-panel" data-testid="artifact-audit-panel">
        <div className="artifact-detail-section__header">
          <strong>Artifact 审计线索</strong>
          <span>当前产物</span>
        </div>
        <div className="artifact-related-grid">
          <article>
            <span>Artifact ID</span>
            <strong>{formatId(artifact.id)}</strong>
          </article>
          <article>
            <span>Source Step</span>
            <strong>{artifact.sourceTaskStepId || "none"}</strong>
          </article>
          <article>
            <span>Adapter</span>
            <strong>{artifact.sourceAdapterType || "none"}</strong>
          </article>
          <article>
            <span>完整审计</span>
            <strong>见 Audit 诊断抽屉</strong>
          </article>
        </div>
      </section>
      <section className="artifact-related-panel" data-testid="artifact-related-panel">
        <div className="artifact-detail-section__header">
          <strong>关联产物</strong>
          <span>Lineage / Revision</span>
        </div>
        <div className="artifact-related-grid">
          <article>
            <span>当前版本</span>
            <strong>v{artifact.version}</strong>
          </article>
          <article>
            <span>父产物</span>
            <strong>{selectedVersionEntry?.parentArtifact?.title || artifact.parentArtifactId || "无"}</strong>
          </article>
          <article>
            <span>Revision 指令</span>
            <strong>{revisionInstructionLabel}</strong>
          </article>
          <article>
            <span>相关版本数</span>
            <strong>{versionCount}</strong>
          </article>
        </div>
      </section>
    </>
  );
}
