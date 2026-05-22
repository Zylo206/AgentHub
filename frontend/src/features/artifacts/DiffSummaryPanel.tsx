import type { Artifact } from "./artifactTypes";
import { buildDiffSummary } from "./artifactLineage";

interface DiffSummaryPanelProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
}

export function DiffSummaryPanel({ artifacts, artifact }: DiffSummaryPanelProps) {
  if (!artifact) {
    return null;
  }

  const summary = buildDiffSummary(artifacts, artifact);

  return (
    <section className="diff-summary">
      <div className="artifact-detail-section__header">
        <strong>Diff 摘要</strong>
        <span>{summary.isInitialVersion ? "初始版本" : "静态 Revision 摘要"}</span>
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
          <p>初始版本暂无未变更记录。</p>
        )}
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">风险</span>
        <p>{summary.risk}</p>
      </div>
    </section>
  );
}
