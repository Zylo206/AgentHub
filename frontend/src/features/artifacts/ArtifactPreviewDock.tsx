import type { Artifact } from "./artifactTypes";
import { getIdValue } from "../../utils/id";

interface ArtifactPreviewDockProps {
  artifact: Artifact;
}

function renderArtifactContent(artifact: Artifact) {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return (
      <iframe
        className="artifact-preview__frame"
        title={artifact.title}
        srcDoc={artifact.content}
      />
    );
  }

  return (
    <pre className="artifact-preview__code">
      <code>{artifact.content}</code>
    </pre>
  );
}

export function ArtifactPreviewDock({ artifact }: ArtifactPreviewDockProps) {
  return (
    <section className="artifact-preview-dock" data-testid="artifact-preview-dock">
      <div className="artifact-preview-dock__header">
        <div>
          <span>本地预览</span>
          <strong>{artifact.type === "WEB_PREVIEW" ? "内嵌 Web 预览" : "内容快照"}</strong>
        </div>
        <a href={"/preview/" + getIdValue(artifact.id)} target="_blank" rel="noreferrer">
          打开独立预览
        </a>
      </div>
      <div className="artifact-preview-dock__body">{renderArtifactContent(artifact)}</div>
    </section>
  );
}
