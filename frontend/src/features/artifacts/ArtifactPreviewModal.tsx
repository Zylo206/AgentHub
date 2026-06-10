import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Artifact } from "./artifactTypes";
import { renderArtifactContent, CopyButton } from "./renderArtifactContent";

interface ArtifactPreviewModalProps {
  artifact: Artifact;
  onClose: () => void;
}

/**
 * Fullscreen modal overlay for artifact preview.
 * Opens when user clicks "预览" on an artifact card in chat.
 * Renders via React Portal to document.body.
 */
export function ArtifactPreviewModal({ artifact, onClose }: ArtifactPreviewModalProps) {
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
          </div>
          <div className="artifact-preview-modal__actions">
            <CopyButton content={artifact.content ?? ""} className="artifact-preview-modal__copy-btn" />
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
        <div className="artifact-preview-modal__body">
          {renderArtifactContent(artifact, {
            showLineNumbers: true,
            classPrefix: "modal-preview",
            markdownMode: "simple-html",
          })}
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
