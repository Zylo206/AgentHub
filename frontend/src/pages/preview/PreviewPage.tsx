import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getArtifact, getArtifactsByConversation } from "../../api/agenthubApi";
import { buildArtifactVersions } from "../../features/artifacts/artifactLineage";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";
import { formatId, getIdValue } from "../../utils/id";
import "../../styles/workspace.css";
import "../../styles/pages/preview.css";

type PreviewTrustTone = "success" | "warning" | "danger" | "neutral";

function getPreviewMode(artifact: Artifact): string {
  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return "HTML 页面快照";
  }
  if (artifact.type === "CODE") {
    return "代码文本";
  }
  if (artifact.type === "MARKDOWN") {
    return "Markdown 文本";
  }
  if (artifact.type === "REVIEW_REPORT") {
    return "评审报告";
  }
  if (artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL") {
    return "结构化文档";
  }
  return "文档文本";
}

function getPresentationMode(artifact: Artifact): { label: string; description: string } {
  if (artifact.type === "CODE") {
    return {
      label: "代码预览",
      description: "当前页面只读展示源代码内容；如需修改，请回到工作区发起草稿修订或 Diff 审批。"
    };
  }

  if (artifact.type === "WEB_PREVIEW" && artifact.content.trim().startsWith("<")) {
    return {
      label: "页面快照",
      description: "当前展示的是本地产物快照，只用于查看界面，不代表真实对外部署地址。"
    };
  }

  if (artifact.type === "MARKDOWN" || artifact.type === "REVIEW_REPORT") {
    return {
      label: "文档预览",
      description: "当前按文档方式展示文本内容，保留原始内容和审计上下文。"
    };
  }

  return {
    label: "结构化内容",
    description: "当前展示 API 契约、数据模型或其他结构化产物内容。"
  };
}

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
    return "风险产物预览";
  }
  if (tone === "warning") {
    return "本地静态预览";
  }
  return "普通预览";
}

function getPreviewTrustDescription(artifact: Artifact): string {
  if (getPreviewTrustTone(artifact) === "danger") {
    return "当前产物存在质量、构建或审批风险。这里仅展示内容，不代表可直接交付。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "当前页面展示真实适配器产物的当前版本，并保留版本、来源和质量状态。";
  }
  return "当前页面展示本地静态快照，适合查看和验收，不代表已完成真实部署或正式发布。";
}

function getPreviewNextAction(artifact: Artifact): string {
  if (getPreviewTrustTone(artifact) === "danger") {
    return "回到工作区处理风险、重新评审后再继续交付。";
  }
  if (artifact.sourceKind === "REAL_ADAPTER") {
    return "可继续走 Diff、审批、部署预览或交付记录。";
  }
  return "适合本地验收；如果要正式交付，优先生成真实适配器版本。";
}

function formatPreviewSize(content: string | null | undefined): string {
  const length = (content || "").length;
  if (length >= 1000) {
    return `${(length / 1000).toFixed(1)}k 字符`;
  }
  return `${length} 字符`;
}

function renderPreviewContent(artifact: Artifact) {
  const content = artifact.content || "";

  if (artifact.type === "WEB_PREVIEW" && content.trim().startsWith("<")) {
    return <iframe className="preview-page__iframe" title={artifact.title} sandbox="" srcDoc={content} />;
  }

  const className =
    artifact.type === "CODE" || artifact.type === "API_CONTRACT" || artifact.type === "DATA_MODEL"
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
        setErrorMessage("缺少产物 ID。");
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
          setErrorMessage(error instanceof Error ? error.message : "读取产物失败。");
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

  return (
    <main className="preview-page">
      <header className="preview-page__topbar">
        <div className="preview-page__hero-copy">
          <p className="eyebrow">产物预览</p>
          <h1>产物预览工作台</h1>
          <span className="preview-page__topbar-note">只读查看当前产物内容、版本链和来源状态。</span>
        </div>
        <div className="preview-page__topbar-actions">
          <div className="preview-page__boundary-badges" aria-label="预览边界">
            <span>本地预览</span>
            <span>静态快照</span>
            <span>只读查看</span>
          </div>
          <Link to="/workspace" className="preview-page__back-link">
            返回工作区
          </Link>
        </div>
      </header>

      {loading ? (
        <section className="preview-page__state">
          <strong>正在加载产物预览...</strong>
          <span>正在读取后端中的 Artifact 内容。</span>
        </section>
      ) : errorMessage ? (
        <section className="preview-page__state preview-page__state--error">
          <strong>未找到产物</strong>
          <span>{errorMessage}</span>
          <Link to="/workspace">返回工作区</Link>
        </section>
      ) : artifact ? (
        <section className="preview-page__card">
          <div className="preview-page__layout">
            <aside className="preview-page__sidebar">
              <section className="preview-page__panel preview-page__panel--hero">
                <div className="preview-page__meta-head">
                  <div>
                    <p className="eyebrow">当前产物</p>
                    <h2>{artifact.title}</h2>
                    <span className="preview-page__artifact-id">{formatId(artifact.id)}</span>
                  </div>
                  <div className="preview-page__badges">
                    <span className="status-pill">{displayArtifactType(artifact.type)}</span>
                    <span className={`status-pill status-pill--${normalizeStatusClass(artifact.status)}`}>
                      {displayStatus(artifact.status)}
                    </span>
                    <span className={`status-pill status-pill--${trustTone}`}>{getPreviewTrustLabel(artifact)}</span>
                  </div>
                </div>
              </section>

              <section className="preview-page__panel preview-page__panel--facts">
                <div className="preview-page__facts-grid" aria-label="产物预览元数据">
                  <article className="preview-page__fact">
                    <span>来源</span>
                    <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
                  </article>
                  <article className="preview-page__fact">
                    <span>执行通道</span>
                    <strong>{artifact.sourceAdapterType ? displayAdapterName(artifact.sourceAdapterType) : "无"}</strong>
                  </article>
                  <article className="preview-page__fact">
                    <span>质量状态</span>
                    <strong>{sanitizeProductionText(artifact.qualityStatus || artifact.realAdapterOutcome || "未评估")}</strong>
                  </article>
                  <article className="preview-page__fact">
                    <span>显示模式</span>
                    <strong>{sanitizeProductionText(artifact.generationMode || previewMode)}</strong>
                  </article>
                </div>
              </section>

              <section className={`preview-page__panel preview-page__panel--trust preview-page__panel--${trustTone}`} data-testid="preview-studio">
                <div className="preview-page__trust-head">
                  <div>
                    <span className="preview-page__section-kicker">预览说明</span>
                    <strong>{getPreviewTrustLabel(artifact)}</strong>
                    <p>{getPreviewTrustDescription(artifact)}</p>
                  </div>
                  <span className="preview-page__trust-route">
                    {sanitizeProductionText(artifact.realAdapterOutcome || "本地静态路径")}
                  </span>
                </div>
                <div className="preview-page__summary-grid">
                  <article className="preview-page__summary-card">
                    <span>版本链</span>
                    <strong>{versionEntries.length} 个版本</strong>
                    <small>当前 v{artifact.version}</small>
                  </article>
                  <article className="preview-page__summary-card">
                    <span>构建状态</span>
                    <strong>{sanitizeProductionText(artifact.buildValidationStatus || "未评估")}</strong>
                    <small>{sanitizeProductionText(artifact.buildValidationReason || "暂无阻断原因")}</small>
                  </article>
                  <article className="preview-page__summary-card">
                    <span>内容体量</span>
                    <strong>{formatPreviewSize(artifact.content)}</strong>
                    <small>{previewMode}</small>
                  </article>
                  <article className="preview-page__summary-card">
                    <span>下一步</span>
                    <strong>{getPreviewNextAction(artifact)}</strong>
                    <small>如需修改，请回到工作区走草稿、Diff 和审批链。</small>
                  </article>
                </div>
              </section>
            </aside>

            <section className="preview-page__main-pane">
              <section className="preview-page__panel preview-page__panel--details">
                <dl className="preview-page__details">
                  <div>
                    <dt>产物 ID</dt>
                    <dd>{formatId(artifact.id)}</dd>
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
                    <dt>来源类型</dt>
                    <dd>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</dd>
                  </div>
                </dl>
              </section>

              <section className="preview-page__panel preview-page__panel--versions">
                <div className="preview-page__panel-title">
                  <div>
                    <strong>版本快照</strong>
                    <span>当前版本链共 {versionEntries.length} 个可预览快照。</span>
                  </div>
                </div>
                <div className="preview-page__version-list">
                  {versionEntries.map((entry) => {
                    const isActive = entry.artifactId === getIdValue(artifact.id);
                    return (
                      <Link
                        key={entry.artifactId}
                        className={`preview-page__version-item ${isActive ? "preview-page__version-item--active" : ""}`}
                        to={`/preview/${entry.artifactId}`}
                      >
                        <small>{isActive ? "当前快照" : "候选版本"}</small>
                        <strong>v{entry.artifact.version}</strong>
                        <span>{entry.isRevision ? "修订版本" : "基础版本"}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="preview-page__panel preview-page__panel--content">
                <div className="preview-page__content-toolbar">
                  <div>
                    <strong>{presentationMode?.label || "内容预览"}</strong>
                    <span>{artifact.title}</span>
                  </div>
                  <span>{presentationMode?.description || previewMode}</span>
                </div>
                {renderPreviewContent(artifact)}
              </section>
            </section>
          </div>
        </section>
      ) : null}
    </main>
  );
}
