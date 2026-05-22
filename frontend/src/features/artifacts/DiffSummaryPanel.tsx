import type { Artifact } from "./artifactTypes";
import { buildDiffSummary, type LineDiffEntry } from "./artifactLineage";

interface DiffSummaryPanelProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
}

const MAX_VISIBLE_DIFF_LINES = 120;

function getDiffPrefix(entry: LineDiffEntry): string {
  if (entry.operation === "added") {
    return "+";
  }

  if (entry.operation === "removed") {
    return "-";
  }

  return " ";
}

export function DiffSummaryPanel({ artifacts, artifact }: DiffSummaryPanelProps) {
  if (!artifact) {
    return null;
  }

  const summary = buildDiffSummary(artifacts, artifact);
  const visibleDiffEntries = summary.lineDiffEntries.slice(0, MAX_VISIBLE_DIFF_LINES);
  const hiddenLineCount = Math.max(summary.lineDiffEntries.length - visibleDiffEntries.length, 0);

  return (
    <section className="diff-summary">
      <div className="artifact-detail-section__header">
        <strong>Diff 摘要</strong>
        <span>{summary.hasRealLineDiff ? "真实行级 diff" : summary.isInitialVersion ? "初始版本" : "无内容变化"}</span>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">修改指令</span>
        <p>{summary.instruction || "该产物是初始版本。"}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">基于版本</span>
        <p>{summary.basedOnLabel || "没有父级产物。"}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">摘要</span>
        <p>{summary.summary}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">行级统计</span>
        <div className="line-diff-stats">
          <span className="line-diff-stat line-diff-stat--added">+{summary.lineDiffStats.added} 新增</span>
          <span className="line-diff-stat line-diff-stat--removed">-{summary.lineDiffStats.removed} 删除</span>
          <span>{summary.lineDiffStats.unchanged} 未变</span>
          <span>{summary.lineDiffStats.changed} 处估算修改</span>
        </div>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">变更项</span>
        {summary.changedItems.length > 0 ? (
          <ul>
            {summary.changedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>暂无 revision 摘要。</p>
        )}
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">未变更</span>
        {summary.notChanged.length > 0 ? (
          <ul>
            {summary.notChanged.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>暂无未变更记录。</p>
        )}
      </div>

      {visibleDiffEntries.length > 0 ? (
        <div className="diff-summary-section">
          <span className="diff-summary-section__label">行级 Diff</span>
          <div className="line-diff-viewer">
            {visibleDiffEntries.map((entry, index) => (
              <div
                key={`${entry.operation}-${entry.oldLineNumber ?? "n"}-${entry.newLineNumber ?? "n"}-${index}`}
                className={`line-diff-row line-diff-row--${entry.operation}`}
              >
                <span className="line-diff-row__number">{entry.oldLineNumber ?? ""}</span>
                <span className="line-diff-row__number">{entry.newLineNumber ?? ""}</span>
                <span className="line-diff-row__prefix">{getDiffPrefix(entry)}</span>
                <code>{entry.content || " "}</code>
              </div>
            ))}
          </div>
          {hiddenLineCount > 0 ? (
            <p>已截断展示，另有 {hiddenLineCount} 行未显示。</p>
          ) : null}
        </div>
      ) : null}

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">风险</span>
        <p>{summary.risk}</p>
      </div>
    </section>
  );
}
