import type { Artifact } from "./artifactTypes";
import { getIdValue } from "../../utils/id";
import { renderArtifactContent, CopyButton, isPptArtifact } from "./renderArtifactContent";

interface ArtifactPreviewDockProps {
  artifact: Artifact;
}

export function ArtifactPreviewDock({ artifact }: ArtifactPreviewDockProps) {
  return (
    <section className="artifact-preview-dock" data-testid="artifact-preview-dock">
      <div className="artifact-preview-dock__header">
        <div>
          <span>本地预览</span>
          <strong>{artifact.type === "WEB_PREVIEW" ? "内嵌 Web 预览" : isPptArtifact(artifact) ? "PPT 查看模式" : "内容快照"}</strong>
        </div>
        <div className="artifact-preview-dock__header-actions">
          <CopyButton content={artifact.content ?? ""} className="artifact-preview-dock__copy-btn" />
          <a href={"/preview/" + getIdValue(artifact.id)} target="_blank" rel="noreferrer">
            打开独立预览
          </a>
        </div>
      </div>
      <p className="artifact-preview-dock__boundary">Local Preview / Static Snapshot / Not Cloud Deploy</p>
      <div className="artifact-preview-dock__body">
        {renderArtifactContent(artifact, {
          showLineNumbers: true,
          classPrefix: "artifact-preview",
          markdownMode: "simple-html",
        })}
      </div>
    </section>
  );
}
