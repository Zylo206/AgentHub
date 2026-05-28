import type { Artifact } from "./artifactTypes";
import { buildDiffSummary, type LineDiffEntry } from "./artifactLineage";
import { getIdValue } from "../../utils/id";

interface DiffSummaryPanelProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
  appliedArtifactId?: string | null;
  conflictArtifactId?: string | null;
  conflictMessage?: string | null;
  onApplyDiff?: (artifact: Artifact) => void;
  onForceApplyDiff?: (artifact: Artifact) => void;
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

export function DiffSummaryPanel({
  artifacts,
  artifact,
  appliedArtifactId,
  conflictArtifactId,
  conflictMessage,
  onApplyDiff,
  onForceApplyDiff
}: DiffSummaryPanelProps) {
  if (!artifact) {
    return null;
  }

  const artifactId = getIdValue(artifact.id);
  const summary = buildDiffSummary(artifacts, artifact);
  const canApplyDiff = !summary.isInitialVersion && summary.hasRealLineDiff;
  const isApplied = appliedArtifactId === artifactId;
  const hasConflict = conflictArtifactId === artifactId;
  const visibleDiffEntries = summary.lineDiffEntries.slice(0, MAX_VISIBLE_DIFF_LINES);
  const hiddenLineCount = Math.max(summary.lineDiffEntries.length - visibleDiffEntries.length, 0);
  const riskItems = [
    canApplyDiff
      ? "需要后端 Approval Gate 批准后才会 materialize 新产物。"
      : "当前版本没有可应用的真实行级 Diff。",
    hasConflict
      ? "检测到最新已应用产物冲突；普通 Apply 会被阻止，Force Apply 必须显式确认。"
      : "未检测到当前 revision 与最新已应用产物的冲突标记。",
    summary.hasRealLineDiff
      ? `行级影响：新增 ${summary.lineDiffStats.added} 行，删除 ${summary.lineDiffStats.removed} 行，估算修改 ${summary.lineDiffStats.changed} 处。`
      : "没有可展示的行级影响统计。",
    "Apply / Force Apply / Restore 都会通过 Artifact Snapshot 保留安全回滚点。"
  ];

  return (
    <section className="diff-summary">
      <div className="artifact-detail-section__header">
        <strong>Diff 摘要</strong>
        <span>{summary.hasRealLineDiff ? "真实行级 diff" : summary.isInitialVersion ? "初始版本" : "无内容变化"}</span>
      </div>
      <div className="diff-summary-apply">
        <div>
          <strong>{isApplied ? "当前 Diff 已应用" : "一键应用 Diff"}</strong>
          <p>
            {isApplied
              ? "该版本已由后端 patch apply 生成，是当前工作台的已应用产物。"
              : canApplyDiff
              ? "调用后端 patch apply，将当前 revision 的行级 Diff 应用到父版本并生成新产物。"
              : "初始版本或无行级变化时无需应用 Diff。"}
          </p>
        </div>
        <button
          type="button"
          className={isApplied ? "secondary-button" : "primary-button"}
          disabled={!canApplyDiff || isApplied || !onApplyDiff}
          onClick={() => onApplyDiff?.(artifact)}
        >
          {isApplied ? "已应用" : "应用 Diff 结果"}
        </button>
      </div>

      {hasConflict ? (
        <div className="diff-conflict-card">
          <div>
            <strong>检测到 Diff 冲突</strong>
            <p>{conflictMessage || "已有更新的已应用产物，当前 revision 可能不是最新基线。"}</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={!onForceApplyDiff}
            onClick={() => onForceApplyDiff?.(artifact)}
          >
            仍然强制应用
          </button>
        </div>
      ) : null}

      <div className={`diff-trust-card ${hasConflict ? "diff-trust-card--warning" : ""}`}>
        <div>
          <strong>应用前可信度检查</strong>
          <p>
            {hasConflict
              ? "当前 Diff 存在冲突风险，建议先查看最新已应用产物或通过 Force Apply 审批确认风险。"
              : "当前 Diff 可以通过常规审批路径应用；系统仍会记录快照、审计和行级影响。"}
          </p>
        </div>
        <ul>
          {riskItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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
