import { useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { Artifact } from "./artifactTypes";
import { renderArtifactContent, CopyButton } from "./renderArtifactContent";
import { CodeMirrorEditor } from "./CodeMirrorEditor";

interface ArtifactPreviewModalProps {
  artifact: Artifact;
  onClose: () => void;
  /** If true, shows an "编辑" toggle and CodeMirror editor */
  editable?: boolean;
  /** Callback to create a revision from edited content */
  onCreateRevision?: (artifactId: string, instruction: string) => Promise<void>;
}

/**
 * Fullscreen modal overlay for artifact preview.
 * Supports optional edit mode with CodeMirror.
 */
export function ArtifactPreviewModal({
  artifact,
  onClose,
  editable = false,
  onCreateRevision,
}: ArtifactPreviewModalProps) {
  const [editMode, setEditMode] = useState(false);
  const [draftContent, setDraftContent] = useState(artifact.content ?? "");
  const [revisionNote, setRevisionNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset state when artifact changes
  useEffect(() => {
    setDraftContent(artifact.content ?? "");
    setRevisionNote("");
    setEditMode(false);
  }, [artifact.id, artifact.content]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSaveRevision = useCallback(async () => {
    if (!onCreateRevision) return;
    const hasContentChange = draftContent !== (artifact.content ?? "");
    const hasNote = revisionNote.trim().length > 0;
    if (!hasContentChange && !hasNote) return;

    setSaving(true);
    try {
      const parts: string[] = [];
      if (hasContentChange) {
        parts.push(`已编辑内容（全文 ${draftContent.length} 字符）`);
        parts.push(`编辑后内容:\n${draftContent}`);
      }
      if (hasNote) {
        parts.push(`修改说明: ${revisionNote}`);
      }
      const instruction = parts.join("\n\n");
      await onCreateRevision(String(artifact.id), instruction);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }, [onCreateRevision, artifact, draftContent, revisionNote]);

  const hasChanges = editMode && (
    draftContent !== (artifact.content ?? "") || revisionNote.trim().length > 0
  );

  return createPortal(
    <div
      className="artifact-preview-modal__backdrop"
      onClick={handleBackdropClick}
      data-testid="artifact-preview-modal"
    >
      <div className="artifact-preview-modal__dialog">
        <div className="artifact-preview-modal__header">
          <div className="artifact-preview-modal__title-group">
            <strong className="artifact-preview-modal__title">{artifact.title}</strong>
            <span className="artifact-preview-modal__type">{artifact.type}</span>
            {artifact.language ? (
              <span className="artifact-preview-modal__lang">{artifact.language}</span>
            ) : null}
            {editMode ? (
              <span className="artifact-preview-modal__lang" style={{ background: "#eff6ff", color: "#2563eb", borderColor: "rgba(37,99,235,0.22)" }}>
                编辑中
              </span>
            ) : null}
          </div>
          <div className="artifact-preview-modal__actions">
            {editable ? (
              <button
                type="button"
                className="artifact-preview-modal__copy-btn"
                onClick={() => setEditMode(!editMode)}
                style={editMode ? { background: "#fee2e2", color: "#b42335", borderColor: "rgba(220,38,38,0.2)" } : undefined}
              >
                {editMode ? "退出编辑" : "编辑"}
              </button>
            ) : null}
            <CopyButton content={editMode ? draftContent : artifact.content ?? ""} className="artifact-preview-modal__copy-btn" />
            <a
              href={`/preview/${artifact.id}`}
              target="_blank"
              rel="noreferrer"
              className="artifact-preview-modal__newtab-btn"
            >
              新标签页打开
            </a>
            <button
              type="button"
              className="artifact-preview-modal__close-btn"
              onClick={onClose}
              title="关闭 (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {editMode ? (
          <div className="artifact-preview-modal__edit-bar">
            <label htmlFor="modal-revision-note">修改说明：</label>
            <textarea
              id="modal-revision-note"
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
              placeholder="描述你希望如何修改当前产物（可选）"
            />
            <button
              type="button"
              className="artifact-preview-modal__save-btn"
              disabled={saving || !hasChanges}
              onClick={handleSaveRevision}
            >
              {saving ? "保存中..." : "保存修订"}
            </button>
          </div>
        ) : null}

        <div className="artifact-preview-modal__body">
          {editMode ? (
            <CodeMirrorEditor
              content={draftContent}
              language={artifact.language}
              height="100%"
              onChange={setDraftContent}
            />
          ) : (
            renderArtifactContent(artifact, {
              showLineNumbers: true,
              classPrefix: "modal-preview",
              markdownMode: "simple-html",
            })
          )}
        </div>
        <div className="artifact-preview-modal__footer">
          <span>Local Preview / Static Snapshot / Not Cloud Deploy</span>
          <span>v{artifact.version} · {(artifact.content ?? "").length} 字符</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
