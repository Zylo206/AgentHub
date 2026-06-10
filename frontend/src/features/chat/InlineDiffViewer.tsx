import { useState, useMemo } from "react";
import type { LineDiffEntry } from "../artifacts/artifactLineage";

interface InlineDiffViewerProps {
  entries: LineDiffEntry[];
  maxLines?: number;
  className?: string;
}

function getDiffPrefix(operation: LineDiffEntry["operation"]): string {
  if (operation === "added") return "+";
  if (operation === "removed") return "-";
  return " ";
}

/**
 * Compact inline diff viewer for chat message cards.
 * Shows line-level diff with +/- prefixes, truncated to maxLines.
 */
export function InlineDiffViewer({ entries, maxLines = 30, className }: InlineDiffViewerProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleEntries = useMemo(
    () => (expanded ? entries : entries.slice(0, maxLines)),
    [entries, expanded, maxLines]
  );
  const hiddenCount = entries.length - maxLines;

  if (entries.length === 0) return null;

  const addedCount = entries.filter((e) => e.operation === "added").length;
  const removedCount = entries.filter((e) => e.operation === "removed").length;

  return (
    <div className={`inline-diff-viewer ${className ?? ""}`} data-testid="inline-diff-viewer">
      <div className="inline-diff-viewer__header">
        <span className="inline-diff-viewer__label">Diff 预览</span>
        <span className="inline-diff-viewer__stats">
          <span className="inline-diff-viewer__stat inline-diff-viewer__stat--added">+{addedCount}</span>
          <span className="inline-diff-viewer__stat inline-diff-viewer__stat--removed">-{removedCount}</span>
        </span>
      </div>
      <div className="inline-diff-viewer__body">
        {visibleEntries.map((entry, i) => (
          <div
            key={`${entry.operation}-${entry.oldLineNumber ?? "n"}-${entry.newLineNumber ?? "n"}-${i}`}
            className={`inline-diff-row inline-diff-row--${entry.operation}`}
          >
            <span className="inline-diff-row__num">{entry.oldLineNumber ?? ""}</span>
            <span className="inline-diff-row__num">{entry.newLineNumber ?? ""}</span>
            <span className="inline-diff-row__prefix">{getDiffPrefix(entry.operation)}</span>
            <code className="inline-diff-row__content">{entry.content || " "}</code>
          </div>
        ))}
      </div>
      {!expanded && hiddenCount > 0 ? (
        <button
          type="button"
          className="inline-diff-viewer__expand"
          onClick={() => setExpanded(true)}
        >
          展开剩余 {hiddenCount} 行
        </button>
      ) : null}
      {expanded && entries.length > maxLines ? (
        <button
          type="button"
          className="inline-diff-viewer__expand"
          onClick={() => setExpanded(false)}
        >
          收起
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parse diff-like content from message text
// ---------------------------------------------------------------------------

/**
 * Try to parse diff-formatted text into LineDiffEntry[].
 * Matches lines starting with +/- or space (unified diff format).
 * Returns null if the content doesn't look like a diff.
 */
export function parseDiffFromText(content: string): LineDiffEntry[] | null {
  const lines = content.split("\n");
  // Must have at least 3 diff-like lines to qualify
  const diffLikeLines = lines.filter((l) => /^[+\- ]/.test(l) && l.length > 1);
  if (diffLikeLines.length < 3) return null;

  const entries: LineDiffEntry[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const line of lines) {
    if (line.startsWith("+")) {
      entries.push({ operation: "added", oldLineNumber: null, newLineNumber: newLine, content: line.slice(1) });
      newLine++;
    } else if (line.startsWith("-")) {
      entries.push({ operation: "removed", oldLineNumber: oldLine, newLineNumber: null, content: line.slice(1) });
      oldLine++;
    } else if (line.startsWith(" ")) {
      entries.push({ operation: "context", oldLineNumber: oldLine, newLineNumber: newLine, content: line.slice(1) });
      oldLine++;
      newLine++;
    }
    // Skip lines that don't match diff format (e.g., @@ headers, metadata)
  }

  return entries.length >= 3 ? entries : null;
}
