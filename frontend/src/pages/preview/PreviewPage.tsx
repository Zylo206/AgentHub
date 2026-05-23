import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArtifact, getArtifactsByConversation } from "../../api/agenthubApi";
import { buildArtifactVersions } from "../../features/artifacts/artifactLineage";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { formatId, getIdValue } from "../../utils/id";
import "../../styles/workspace.css";

function getPreviewMode(artifact: Artifact): string {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return "HTML iframe";
  }
  if (artifact.type === "CODE") {
    return "Code preview";
  }
  if (artifact.type === "MARKDOWN") {
    return "Markdown text";
  }
  if (artifact.type === "REVIEW_REPORT") {
    return "Review report";
  }
  if (artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL") {
    return "Structured text";
  }
  return "Text preview";
}

function renderPreviewContent(artifact: Artifact) {
  const content = artifact.content || "";

  if (artifact.type === "WEB_PREVIEW" && content.trim().startsWith("<")) {
    return (
      <iframe
        className="preview-page__iframe"
        title={artifact.title}
        sandbox=""
        srcDoc={content}
      />
    );
  }

  const className = artifact.type === "CODE" || artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL"
    ? "preview-page__code"
    : "preview-page__text";

  return (
    <pre className={className}>
      <code>{content}</code>
    </pre>
  );
}

export function PreviewPage() {
  const { artifactId } = useParams();
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [conversationArtifacts, setConversationArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArtifact() {
      const normalizedArtifactId = artifactId?.trim();
      if (!normalizedArtifactId) {
        setArtifact(null);
        setErrorMessage("Artifact ID is required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setConversationArtifacts([]);

      try {
        const artifactData = await getArtifact(normalizedArtifactId);
        if (!cancelled) {
          setArtifact(artifactData);
        }

        const conversationId = getIdValue(artifactData.conversationId);
        if (conversationId) {
          try {
            const artifacts = await getArtifactsByConversation(conversationId);
            if (!cancelled) {
              setConversationArtifacts(artifacts);
            }
          } catch (error) {
            console.warn("Failed to load artifact version group.", error);
            if (!cancelled) {
              setConversationArtifacts([artifactData]);
            }
          }
        } else if (!cancelled) {
          setConversationArtifacts([artifactData]);
        }
      } catch (error) {
        if (!cancelled) {
          setArtifact(null);
          setConversationArtifacts([]);
          setErrorMessage(error instanceof Error ? error.message : "Request failed.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadArtifact();

    return () => {
      cancelled = true;
    };
  }, [artifactId]);

  const previewMode = useMemo(() => (artifact ? getPreviewMode(artifact) : "-"), [artifact]);
  const versionEntries = useMemo(
    () => (artifact ? buildArtifactVersions(artifact, conversationArtifacts.length > 0 ? conversationArtifacts : [artifact]) : []),
    [artifact, conversationArtifacts]
  );
  const currentArtifactId = artifact ? getIdValue(artifact.id) : null;

  return (
    <main className="preview-page">
      <header className="preview-page__topbar">
        <div>
          <p className="eyebrow">AgentHub Preview</p>
          <h1>Artifact 静态预览</h1>
        </div>
        <Link className="secondary-button" to="/workspace">
          返回工作台
        </Link>
      </header>

      {loading ? (
        <section className="preview-page__state">
          <strong>Loading artifact preview...</strong>
          <span>正在读取 Artifact 内容。</span>
        </section>
      ) : errorMessage ? (
        <section className="preview-page__state preview-page__state--error">
          <strong>Artifact not found</strong>
          <span>{errorMessage}</span>
          <Link className="primary-button" to="/workspace">
            返回工作台
          </Link>
        </section>
      ) : artifact ? (
        <section className="preview-page__card">
          <div className="preview-page__meta">
            <div>
              <p className="eyebrow">Static demo preview</p>
              <h2>{artifact.title}</h2>
              <p>{formatId(artifact.id)}</p>
            </div>
            <div className="preview-page__badges">
              <span className="status-pill">{displayArtifactType(artifact.type)}</span>
              <span className={`status-pill status-pill--${normalizeStatusClass(artifact.status)}`}>
                {displayStatus(artifact.status)}
              </span>
              <span className="status-pill">v{artifact.version}</span>
              {artifact.parentArtifactId || artifact.revisionInstruction ? (
                <span className="status-pill status-pill--approved">Revision</span>
              ) : null}
              {artifact.sourceKind ? (
                <span className={`artifact-source-badge artifact-source-badge--${artifact.sourceKind.toLowerCase().replace(/_/g, "-")}`}>
                  {displayArtifactSourceKind(artifact.sourceKind)}
                </span>
              ) : null}
            </div>
          </div>

          <dl className="preview-page__details">
            <div>
              <dt>Language</dt>
              <dd>{artifact.language || "plain"}</dd>
            </div>
            <div>
              <dt>Preview mode</dt>
              <dd>{previewMode}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(artifact.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</dd>
            </div>
            <div>
              <dt>Adapter</dt>
              <dd>{artifact.sourceAdapterType || "-"}</dd>
            </div>
            <div>
              <dt>Generation</dt>
              <dd>{artifact.generationMode || "-"}</dd>
            </div>
          </dl>

          <div className="preview-page__versions">
            <div>
              <strong>Version Switcher</strong>
              <span>{versionEntries.length} version{versionEntries.length === 1 ? "" : "s"} in this artifact chain</span>
            </div>
            <div className="preview-page__version-list">
              {versionEntries.map((entry) => {
                const isActive = entry.artifactId === currentArtifactId;
                return (
                  <Link
                    key={entry.artifactId}
                    className={`preview-page__version-item ${isActive ? "preview-page__version-item--active" : ""}`}
                    to={`/preview/${entry.artifactId}`}
                  >
                    <strong>v{entry.artifact.version}</strong>
                    {entry.isRevision ? <span>Revision</span> : <span>Initial</span>}
                    {entry.basedOnVersionLabel ? <small>based on {entry.basedOnVersionLabel}</small> : null}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="preview-page__content">
            {renderPreviewContent(artifact)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
