import type { Artifact } from "./artifactTypes";
import { getIdValue } from "../../utils/id";

interface ArtifactPreviewDockProps {
  artifact: Artifact;
}

function isPptArtifact(artifact: Artifact): boolean {
  const value = `${artifact.type} ${artifact.language} ${artifact.title}`.toLowerCase();
  return value.includes("ppt") || value.includes("powerpoint") || value.includes("slide");
}

function isDocumentArtifact(artifact: Artifact): boolean {
  const value = `${artifact.type} ${artifact.language} ${artifact.title}`.toLowerCase();
  return value.includes("doc") || value.includes("markdown") || value.includes("md");
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

  if (isPptArtifact(artifact)) {
    return (
      <div className="artifact-preview-dock__file-shell" data-testid="artifact-ppt-preview-shell">
        <span className="artifact-preview-dock__file-icon">PPT</span>
        <strong>{artifact.title}</strong>
        <p>PPT 当前支持查看元信息、下载、作为上下文或 Memory 使用；不提供完整在线幻灯片编辑器。</p>
        <dl>
          <div>
            <dt>版本</dt>
            <dd>v{artifact.version}</dd>
          </div>
          <div>
            <dt>大小</dt>
            <dd>{artifact.content.length} chars</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (isDocumentArtifact(artifact)) {
    return (
      <article className="artifact-preview-dock__document">
        <strong>{artifact.title}</strong>
        <p>{artifact.content.slice(0, 1200) || "暂无文档内容。"}</p>
      </article>
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
          <strong>{artifact.type === "WEB_PREVIEW" ? "内嵌 Web 预览" : isPptArtifact(artifact) ? "PPT 查看模式" : "内容快照"}</strong>
        </div>
        <a href={"/preview/" + getIdValue(artifact.id)} target="_blank" rel="noreferrer">
          打开独立预览
        </a>
      </div>
      <p className="artifact-preview-dock__boundary">Local Preview / Static Snapshot / Not Cloud Deploy</p>
      <div className="artifact-preview-dock__body">{renderArtifactContent(artifact)}</div>
    </section>
  );
}
