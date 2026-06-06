import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArtifact, getArtifactsByConversation } from "../../api/agenthubApi";
import { buildArtifactVersions } from "../../features/artifacts/artifactLineage";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { formatId, getIdValue } from "../../utils/id";
import "../../styles/workspace.css";
import "../../styles/production-alignment.css";

function getPreviewMode(artifact: Artifact): string {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return "HTML iframe 预览";
  }
  if (artifact.type === "CODE") {
    return "代码预览";
  }
  if (artifact.type === "MARKDOWN") {
    return "Markdown 文本";
  }
  if (artifact.type === "REVIEW_REPORT") {
    return "评审报告";
  }
  if (artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL") {
    return "结构化文本";
  }
  return "文本预览";
}

function getPresentationMode(artifact: Artifact): { label: string; description: string } {
  if (artifact.type === "CODE") {
    return {
      label: "Source Code Mode",
      description: "以只读代码块展示原始源码，适合检查构建门禁、复制和回到 Workspace 做 Revision。"
    };
  }

  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return {
      label: "HTML Preview Mode",
      description: "使用 iframe srcDoc 展示 HTML 快照；仍是本地静态预览，不代表真实云部署。"
    };
  }

  if (artifact.type === "MARKDOWN" || artifact.type === "REVIEW_REPORT") {
    return {
      label: "Document Mode",
      description: "以文档预览方式展示 Markdown / Review Report，保留原始文本和审计上下文。"
    };
  }

  return {
    label: "Structured Text Mode",
    description: "以结构化文本展示 API Contract、Data Model 或其他产物内容。"
  };
}

type PreviewTrustTone = "success" | "warning" | "danger" | "neutral";

function isPreviewBlockingStatus(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toUpperCase();
  return normalized.includes("REJECT") || normalized.includes("FAIL") || normalized.includes("ERROR");
}

function getPreviewTrustTone(artifact: Artifact): PreviewTrustTone {
  if (
    isPreviewBlockingStatus(artifact.status) ||
    isPreviewBlockingStatus(artifact.qualityStatus) ||
    isPreviewBlockingStatus(artifact.buildValidationStatus)
  ) {
    return "danger";
  }
  if (artifact.sourceKind !== "REAL_ADAPTER" || artifact.realAdapterOutcome === "FALLBACK") {
    return "warning";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "success";
  }

  return "neutral";
}

function getPreviewTrustLabel(artifact: Artifact): string {
  const tone = getPreviewTrustTone(artifact);

  if (tone === "success") {
    return "真实产物预览";
  }
  if (tone === "danger") {
    return "门禁失败预览";
  }
  if (tone === "warning") {
    return "Fallback / 静态预览";
  }

  return "本地预览";
}

function getPreviewTrustDescription(artifact: Artifact): string {
  if (getPreviewTrustTone(artifact) === "danger") {
    return "该 Artifact 存在质量、构建或评审风险，页面仅展示当前内容，不代表可交付状态。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "该页面展示真实 Adapter 产物的当前版本，并保留 AgentHub 的版本、来源和门禁信息。";
  }

  return "该页面展示本地静态 Preview URL，对应 Artifact 内容快照，不代表真实云部署或公网发布。";
}

function getPreviewNextAction(artifact: Artifact): string {
  if (getPreviewTrustTone(artifact) === "danger") {
    return "回到 Workspace 查看质量门禁原因，执行 Revision 后再重新评审。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "可作为真实 Adapter 产物候选继续审批、部署预览或加入交付记录。";
  }
  return "当前是静态 / fallback 预览，适合演示兜底；如需交付，请优先生成真实 Adapter 版本。";
}

function formatPreviewSize(content: string | null | undefined): string {
  const length = (content || "").length;
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}k chars`;
  }
  return `${length} chars`;
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
  const presentationMode = useMemo(() => (artifact ? getPresentationMode(artifact) : null), [artifact]);
  const trustTone = useMemo(() => (artifact ? getPreviewTrustTone(artifact) : "neutral"), [artifact]);
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
          <h1>Artifact 预览工作台</h1>
          <span>本地 Preview URL · 版本链 · 来源门禁 · 内容快照</span>
        </div>
        <Link className="secondary-button" to="/workspace">
          返回工作台
        </Link>
      </header>

      {loading ? (
        <section className="preview-page__state">
          <strong>正在加载 Artifact 预览...</strong>
          <span>正在读取 Artifact 内容。</span>
        </section>
      ) : errorMessage ? (
        <section className="preview-page__state preview-page__state--error">
          <strong>未找到 Artifact</strong>
          <span>{errorMessage}</span>
          <Link className="primary-button" to="/workspace">
            返回工作台
          </Link>
        </section>
      ) : artifact ? (
        <section className="preview-page__card">
          <div className="preview-page__meta">
            <div>
              <p className="eyebrow">本地静态预览</p>
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

          <div className="preview-page__metadata-bar" aria-label="Artifact preview metadata">
            <span>
              <strong>Type</strong>
              {displayArtifactType(artifact.type)}
            </span>
            <span>
              <strong>Version</strong>
              v{artifact.version}
            </span>
            <span>
              <strong>Source</strong>
              {displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}
            </span>
            <span>
              <strong>Adapter</strong>
              {artifact.sourceAdapterType || "N/A"}
            </span>
            <span>
              <strong>Quality</strong>
              {artifact.qualityStatus || "NOT_EVALUATED"}
            </span>
            <span>
              <strong>Mode</strong>
              {presentationMode?.label || previewMode}
            </span>
          </div>

          <section className={`preview-page__studio preview-page__studio--${trustTone}`} data-testid="preview-studio">
            <div className="preview-page__studio-hero">
              <div>
                <span className="preview-page__studio-eyebrow">Preview Studio</span>
                <strong>{getPreviewTrustLabel(artifact)}</strong>
                <p>{getPreviewTrustDescription(artifact)}</p>
              </div>
              <span>{artifact.realAdapterOutcome || "FALLBACK"}</span>
            </div>
            <div className="preview-page__studio-grid">
              <article>
                <span>来源</span>
                <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
                <small>{artifact.sourceAdapterType || "无外部 Adapter"}</small>
              </article>
              <article>
                <span>门禁</span>
                <strong>{artifact.qualityStatus || "NOT_EVALUATED"}</strong>
                <small>{artifact.buildValidationStatus || "BUILD_NOT_EVALUATED"}</small>
              </article>
              <article>
                <span>版本链</span>
                <strong>{versionEntries.length} 个版本</strong>
                <small>当前 v{artifact.version}</small>
              </article>
              <article>
                <span>内容体量</span>
                <strong>{formatPreviewSize(artifact.content)}</strong>
                <small>{previewMode}</small>
              </article>
            </div>
            <div className="preview-page__boundary" data-testid="preview-boundary">
              <div>
                <span>交付边界</span>
                <strong>{getPreviewNextAction(artifact)}</strong>
              </div>
              <p>
                Preview 页面只读取后端 Artifact 内容，不执行真实构建、不发布公网地址，也不会绕过 Workspace 中的审批、审计和快照恢复链路。
              </p>
            </div>
          </section>

          <div className="preview-page__workbench">
            <dl className="preview-page__details">
              <div>
                <dt>语言</dt>
                <dd>{artifact.language || "plain"}</dd>
              </div>
              <div>
                <dt>预览模式</dt>
                <dd>{previewMode}</dd>
              </div>
              <div>
                <dt>更新时间</dt>
                <dd>{new Date(artifact.updatedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>来源</dt>
                <dd>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</dd>
              </div>
              <div>
                <dt>Adapter</dt>
                <dd>{artifact.sourceAdapterType || "-"}</dd>
              </div>
              <div>
                <dt>生成模式</dt>
                <dd>{artifact.generationMode || "-"}</dd>
              </div>
            </dl>

            <div className="preview-page__versions">
              <div>
                <strong>发布版本</strong>
                <span>当前版本链共 {versionEntries.length} 个可预览版本</span>
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
                      <small>{isActive ? "CURRENT RELEASE" : "RELEASE CANDIDATE"}</small>
                      <strong>v{entry.artifact.version}</strong>
                      {entry.isRevision ? <span>Revision build</span> : <span>Initial build</span>}
                      {entry.basedOnVersionLabel ? <small>基于 {entry.basedOnVersionLabel}</small> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="preview-page__content">
            <div className="preview-page__content-toolbar">
              <div>
                <strong>{presentationMode?.label || "内容预览"}</strong>
                <span>{artifact.title}</span>
              </div>
              <span>{presentationMode?.description || previewMode}</span>
            </div>
            {renderPreviewContent(artifact)}
          </div>
        </section>
      ) : null}
    </main>
  );
}
