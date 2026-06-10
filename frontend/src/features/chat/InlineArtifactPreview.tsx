import { useState, useCallback } from "react";
import type { Artifact } from "../artifacts/artifactTypes";
import { renderArtifactContent, CopyButton, isCodeArtifact } from "../artifacts/renderArtifactContent";

interface InlineArtifactPreviewProps {
  artifact: Artifact;
  /** Max lines for code/markdown preview. Default 12 */
  maxLines?: number;
}

/**
 * Inline artifact preview rendered inside chat message cards.
 * Shows a compact content preview (code snippet, iframe thumbnail, markdown, etc.)
 * so users can see what the artifact contains without leaving the chat.
 */
export function InlineArtifactPreview({ artifact, maxLines = 12 }: InlineArtifactPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const effectiveMaxLines = expanded ? undefined : maxLines;
  const content = artifact.content ?? "";
  const lineCount = content.split("\n").length;
  const isTruncatable = lineCount > maxLines;

  return (
    <div className="inline-artifact-preview" data-testid="inline-artifact-preview">
      <div className="inline-artifact-preview__toolbar">
        <span className="inline-artifact-preview__label">
          {isCodeArtifact(artifact) ? "代码预览" : artifact.type === "WEB_PREVIEW" ? "网页预览" : "内容预览"}
        </span>
        <div className="inline-artifact-preview__toolbar-actions">
          <CopyButton content={content} className="inline-artifact-preview__copy-btn" />
          {isTruncatable ? (
            <button
              type="button"
              className="inline-artifact-preview__toggle-btn"
              onClick={handleToggle}
            >
              {expanded ? "收起" : `展开 (${lineCount} 行)`}
            </button>
          ) : null}
        </div>
      </div>
      <div className="inline-artifact-preview__content">
        {renderArtifactContent(artifact, {
          maxLines: effectiveMaxLines,
          showLineNumbers: true,
          classPrefix: "inline-preview",
          markdownMode: "simple-html",
        })}
      </div>
    </div>
  );
}
