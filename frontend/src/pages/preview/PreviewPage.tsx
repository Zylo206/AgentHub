import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getArtifact, getArtifactsByConversation, createDemoArtifactRevision } from "../../api/agenthubApi";
import { buildArtifactVersions } from "../../features/artifacts/artifactLineage";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";
import { formatId, getIdValue } from "../../utils/id";
import { renderArtifactContent, CopyButton } from "../../features/artifacts/renderArtifactContent";
import { CodeMirrorEditor } from "../../features/artifacts/CodeMirrorEditor";
import {
  getPreviewMode, getPresentationMode, getTrustTone, getTrustLabel,
  formatPreviewSize,
} from "./previewPageHelpers";
import "../../styles/pages/preview.css";

// ---------------------------------------------------------------------------
// Data loading hook
// ---------------------------------------------------------------------------
function useArtifactData(artifactId: string | undefined) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [conversationArtifacts, setConversationArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = artifactId?.trim();
    if (!id) { setArtifact(null); setErrorMessage("缺少产物 ID。"); setLoading(false); return; }

    setLoading(true);
    setErrorMessage(null);
    setConversationArtifacts([]);

    (async () => {
      try {
        const data = await getArtifact(id);
        if (cancelled) return;
        setArtifact(data);

        const convId = getIdValue(data.conversationId);
        if (convId) {
          try {
            const all = await getArtifactsByConversation(convId);
            if (!cancelled) setConversationArtifacts(all);
          } catch {
            if (!cancelled) setConversationArtifacts([data]);
          }
        } else if (!cancelled) {
          setConversationArtifacts([data]);
        }
      } catch (err) {
        if (!cancelled) {
          setArtifact(null);
          setConversationArtifacts([]);
          setErrorMessage(err instanceof Error ? err.message : "读取产物失败。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [artifactId]);

  return { artifact, conversationArtifacts, loading, errorMessage, setArtifact };
}

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} 小时前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} 天前`;
}

// ---------------------------------------------------------------------------
// Content panel with edit mode
// ---------------------------------------------------------------------------
function ContentPanel({ artifact, presentationMode, previewMode, onRevisionCreated }: {
  artifact: Artifact;
  presentationMode: { label: string; description: string } | null;
  previewMode: string;
  onRevisionCreated: (newArtifact: Artifact) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState(artifact.content ?? "");
  const [revisionNote, setRevisionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftContent(artifact.content ?? "");
    setRevisionNote("");
    setEditMode(false);
    setError(null);
  }, [artifact.id, artifact.content]);

  const handleSave = useCallback(async () => {
    const convId = getIdValue(artifact.conversationId);
    if (!convId) { setError("缺少会话 ID，无法创建修订。"); return; }

    const hasContentChange = draftContent !== (artifact.content ?? "");
    const hasNote = revisionNote.trim().length > 0;
    if (!hasContentChange && !hasNote) { setError("请先编辑内容或填写修改说明。"); return; }

    setSaving(true);
    setError(null);
    try {
      const parts: string[] = [];
      if (hasContentChange) {
        parts.push(`已编辑内容（全文 ${draftContent.length} 字符）`);
        parts.push(`编辑后内容:\n${draftContent}`);
      }
      if (hasNote) parts.push(`修改说明: ${revisionNote}`);
      const instruction = parts.join("\n\n");

      const result = await createDemoArtifactRevision(String(artifact.id), String(convId), instruction);
      if (result.revisedArtifact) {
        onRevisionCreated(result.revisedArtifact);
        setEditMode(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存修订失败。");
    } finally {
      setSaving(false);
    }
  }, [artifact, draftContent, revisionNote, onRevisionCreated]);

  const hasChanges = editMode && (
    draftContent !== (artifact.content ?? "") || revisionNote.trim().length > 0
  );

  return (
    <div className="preview-content">
      {/* Toolbar */}
      <div className="preview-content__toolbar">
        <div className="preview-content__toolbar-left">
          <span className="preview-content__label">{presentationMode?.label || "内容预览"}</span>
          <span className="preview-content__desc">{presentationMode?.description || previewMode}</span>
        </div>
        <div className="preview-content__toolbar-right">
          <button
            type="button"
            className={`preview-btn ${editMode ? "preview-btn--danger" : "preview-btn--default"}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "退出编辑" : "编辑"}
          </button>
          <CopyButton content={editMode ? draftContent : artifact.content ?? ""} className="preview-btn preview-btn--default" />
        </div>
      </div>

      {/* Editor bar (edit mode only) */}
      {editMode ? (
        <div className="preview-content__editor-bar">
          <label htmlFor="preview-revision-note">修改说明</label>
          <textarea
            id="preview-revision-note"
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="描述你希望如何修改当前产物（可选）"
          />
          <button
            type="button"
            className="preview-btn preview-btn--primary"
            disabled={saving || !hasChanges}
            onClick={handleSave}
          >
            {saving ? "保存中..." : "保存修订"}
          </button>
          {error ? <span className="preview-content__error">{error}</span> : null}
        </div>
      ) : null}

      {/* Content */}
      <div className="preview-content__body">
        {editMode ? (
          <div className="preview-content__codemirror">
            <CodeMirrorEditor
              content={draftContent}
              language={artifact.language}
              height="60vh"
              onChange={setDraftContent}
            />
          </div>
        ) : (
          renderArtifactContent(artifact, {
            showLineNumbers: true,
            classPrefix: "preview-page",
            iframeSandbox: "",
            markdownMode: "simple-html",
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function PreviewPage() {
  const { artifactId } = useParams();
  const { artifact, conversationArtifacts, loading, errorMessage, setArtifact } = useArtifactData(artifactId);

  const previewMode = useMemo(() => (artifact ? getPreviewMode(artifact) : "-"), [artifact]);
  const presentationMode = useMemo(() => (artifact ? getPresentationMode(artifact) : null), [artifact]);
  const trustTone = useMemo(() => (artifact ? getTrustTone(artifact) : "neutral"), [artifact]);
  const versionEntries = useMemo(
    () => (artifact ? buildArtifactVersions(artifact, conversationArtifacts.length > 0 ? conversationArtifacts : [artifact]) : []),
    [artifact, conversationArtifacts]
  );
  const currentId = artifact ? getIdValue(artifact.id) ?? "" : "";

  const handleRevisionCreated = useCallback((newArtifact: Artifact) => {
    setArtifact(newArtifact);
    window.location.href = `/preview/${getIdValue(newArtifact.id)}`;
  }, [setArtifact]);

  return (
    <main className="preview-page">
      {/* ── Sticky top bar ── */}
      <header className="preview-topbar">
        <Link to="/workspace" className="preview-topbar__back">← 返回工作区</Link>
        {artifact ? (
          <div className="preview-topbar__badges">
            <span className="preview-badge">本地预览</span>
            <span className="preview-badge">静态快照</span>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="preview-loading">
          <div className="preview-loading__spinner" />
          <span>正在加载产物...</span>
        </div>
      ) : errorMessage ? (
        <div className="preview-error">
          <strong>未找到产物</strong>
          <span>{errorMessage}</span>
          <Link to="/workspace" className="preview-btn preview-btn--primary">返回工作区</Link>
        </div>
      ) : artifact ? (
        <div className="preview-workspace">
          {/* ── Header ── */}
          <div className="preview-header">
            <div className="preview-header__top">
              <div className="preview-header__badges">
                <span className={`preview-type-badge preview-type-badge--${artifact.type.toLowerCase()}`}>
                  {displayArtifactType(artifact.type)}
                </span>
                <span className={`preview-status-badge preview-status-badge--${normalizeStatusClass(artifact.status)}`}>
                  {displayStatus(artifact.status)}
                </span>
                <span className={`preview-trust-badge preview-trust-badge--${trustTone}`}>
                  {getTrustLabel(trustTone)}
                </span>
              </div>
            </div>
            <div className="preview-header__main">
              <h1 className="preview-header__title">{artifact.title}</h1>
              <div className="preview-header__meta">
                <span>{formatId(artifact.id)}</span>
                <span className="preview-meta-dot" />
                <span>v{artifact.version}</span>
                <span className="preview-meta-dot" />
                <span>{formatRelativeTime(artifact.updatedAt)}</span>
                <span className="preview-meta-dot" />
                <span>{formatPreviewSize(artifact.content)}</span>
              </div>
            </div>
          </div>

          {/* ── Info strip ── */}
          <div className="preview-info-strip">
            <div className="preview-info-item">
              <span className="preview-info-item__label">来源</span>
              <span className="preview-info-item__value">{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-item__label">通道</span>
              <span className="preview-info-item__value">{artifact.sourceAdapterType ? displayAdapterName(artifact.sourceAdapterType) : "—"}</span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-item__label">质量</span>
              <span className="preview-info-item__value">{sanitizeProductionText(artifact.qualityStatus || artifact.realAdapterOutcome || "未评估")}</span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-item__label">模式</span>
              <span className="preview-info-item__value">{sanitizeProductionText(artifact.generationMode || previewMode)}</span>
            </div>
            <div className="preview-info-item">
              <span className="preview-info-item__label">构建</span>
              <span className="preview-info-item__value">{sanitizeProductionText(artifact.buildValidationStatus || "未评估")}</span>
            </div>
          </div>

          {/* ── Versions ── */}
          {versionEntries.length > 1 ? (
            <div className="preview-versions">
              <span className="preview-versions__label">版本</span>
              <div className="preview-versions__list">
                {versionEntries.map((entry) => {
                  const isActive = entry.artifactId === currentId;
                  return (
                    <Link
                      key={entry.artifactId}
                      className={`preview-version-chip ${isActive ? "preview-version-chip--active" : ""}`}
                      to={`/preview/${entry.artifactId}`}
                    >
                      v{entry.artifact.version}
                      {isActive ? " · 当前" : ""}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Content ── */}
          <ContentPanel
            artifact={artifact}
            presentationMode={presentationMode}
            previewMode={previewMode}
            onRevisionCreated={handleRevisionCreated}
          />
        </div>
      ) : null}
    </main>
  );
}
