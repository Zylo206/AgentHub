import { useMemo, useState } from "react";
import type { Artifact } from "./artifactTypes";
import { buildDiffSummary, type LineDiffEntry } from "./artifactLineage";
import { getIdValue } from "../../utils/id";
import type { ArtifactCompareDiffResponse } from "../../api/agenthubApi";

interface DiffSummaryPanelProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
  appliedArtifactId?: string | null;
  compareResult?: ArtifactCompareDiffResponse | null;
  conflictArtifactId?: string | null;
  conflictMessage?: string | null;
  onCreateConflictResolutionRevision?: (mergedContent: string) => void;
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

function scrollToLineDiff(): void {
  document.getElementById("artifact-line-diff-viewer")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

export function DiffSummaryPanel({
  artifacts,
  artifact,
  appliedArtifactId,
  compareResult,
  conflictArtifactId,
  conflictMessage,
  onCreateConflictResolutionRevision,
  onApplyDiff,
  onForceApplyDiff
}: DiffSummaryPanelProps) {
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [manualMergedContent, setManualMergedContent] = useState("");

  if (!artifact) {
    return null;
  }

  const artifactId = getIdValue(artifact.id);
  const summary = buildDiffSummary(artifacts, artifact);
  const canApplyDiff = !summary.isInitialVersion && summary.hasRealLineDiff;
  const isApplied = appliedArtifactId === artifactId;
  const hasConflict = conflictArtifactId === artifactId;
  const showConflict = hasConflict && !conflictDismissed;
  const visibleDiffEntries = summary.lineDiffEntries.slice(0, MAX_VISIBLE_DIFF_LINES);
  const hiddenLineCount = Math.max(summary.lineDiffEntries.length - visibleDiffEntries.length, 0);
  const compareColumns = useMemo(
    () => [
      { label: "当前版本", value: compareResult?.currentContent || "" },
      { label: "用户基线", value: compareResult?.baseContent || "" },
      { label: "Agent 候选", value: compareResult?.candidateContent || artifact.content || "" }
    ],
    [artifact.content, compareResult]
  );
  const riskItems = [
    canApplyDiff ? "Apply / Force Apply 前都必须经过审批，后端会记录快照和审计。" : "当前版本没有可应用的行级变更。",
    hasConflict
      ? "检测到版本冲突，普通 Apply 已被阻止；如果仍要继续，必须走 Force Apply 审批。"
      : "当前未检测到最新 accepted artifact 冲突。",
    summary.hasRealLineDiff
      ? `行级影响：新增 ${summary.lineDiffStats.added} 行，删除 ${summary.lineDiffStats.removed} 行，估算修改 ${summary.lineDiffStats.changed} 处。`
      : "没有可展示的行级差异统计。",
    "Apply、Force Apply、Restore 都会通过 Artifact Snapshot 保留回滚点。"
  ];

  return (
    <section className="diff-summary" data-testid="diff-summary">
      <div className="artifact-detail-section__header">
        <strong>Diff 摘要</strong>
        <span>{summary.hasRealLineDiff ? "真实行级 Diff" : summary.isInitialVersion ? "初始版本" : "无内容变更"}</span>
      </div>

      <div className="diff-summary-apply" data-testid="diff-apply-panel">
        <div>
          <strong>{isApplied ? "当前 Diff 已应用" : "应用 Diff 结果"}</strong>
          <p>
            {isApplied
              ? "该版本已经通过后端 Apply 链路物化成新的 accepted artifact。"
              : canApplyDiff
                ? "将当前 revision 的行级 Diff 应用到基线版本，并生成新的 artifact 版本。"
                : "初始版本或无行级变化时，不需要应用 Diff。"}
          </p>
        </div>
        <button
          type="button"
          className={isApplied ? "secondary-button" : "primary-button"}
          disabled={!canApplyDiff || isApplied || hasConflict || !onApplyDiff}
          onClick={() => onApplyDiff?.(artifact)}
        >
          {isApplied ? "已应用" : hasConflict ? "需处理冲突" : "应用 Diff"}
        </button>
      </div>

      {showConflict ? (
        <div className="diff-conflict-card" data-testid="artifact-conflict-panel">
          <div>
            <strong>检测到跨端版本冲突</strong>
            <p>{conflictMessage || "已有更新的 accepted artifact，当前 revision 不再是最新操作基线。"}</p>
            <dl className="diff-conflict-card__facts">
              <div>
                <dt>当前版本</dt>
                <dd>
                  {artifact.title} v{artifact.version}
                </dd>
              </div>
              <div>
                <dt>操作基线</dt>
                <dd>{summary.basedOnLabel || "未知父级 artifact"}</dd>
              </div>
              <div>
                <dt>冲突类型</dt>
                <dd>{compareResult?.conflictType || "TEXT_CONFLICT"}</dd>
              </div>
              <div>
                <dt>推荐动作</dt>
                <dd>{compareResult?.recommendedAction || "REQUEST_APPROVAL_AND_FORCE_APPLY"}</dd>
              </div>
            </dl>
          </div>

          {compareResult ? (
            <div className="diff-conflict-columns" data-testid="artifact-conflict-columns">
              {compareColumns.map((column) => (
                <div className="diff-conflict-columns__column" key={column.label}>
                  <strong>{column.label}</strong>
                  <pre>{column.value || "(empty)"}</pre>
                </div>
              ))}
            </div>
          ) : null}

          <div className="diff-conflict-merge-panel">
            <label htmlFor="artifact-manual-merge-content">人工合并结果</label>
            <textarea
              id="artifact-manual-merge-content"
              data-testid="artifact-manual-merge-content"
              value={manualMergedContent}
              placeholder="如果你决定人工解冲，请把最终内容粘贴到这里，再生成新的 Revision。"
              onChange={(event) => setManualMergedContent(event.target.value)}
            />
            <button
              type="button"
              className="secondary-button"
              disabled={!manualMergedContent.trim() || !onCreateConflictResolutionRevision}
              onClick={() => onCreateConflictResolutionRevision?.(manualMergedContent)}
            >
              提交人工合并为新 Revision
            </button>
          </div>

          <div className="diff-conflict-card__actions">
            <button type="button" className="secondary-button" onClick={() => window.location.reload()}>
              刷新最新版本
            </button>
            <button type="button" className="secondary-button" onClick={scrollToLineDiff}>
              查看差异
            </button>
            <button type="button" className="secondary-button" onClick={() => setConflictDismissed(true)}>
              放弃本次操作
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!onForceApplyDiff}
              onClick={() => onForceApplyDiff?.(artifact)}
            >
              Force Apply 审批
            </button>
          </div>
        </div>
      ) : null}

      <div className={`diff-trust-card ${hasConflict ? "diff-trust-card--warning" : ""}`} data-testid="diff-risk-summary">
        <div>
          <strong>应用前可信度检查</strong>
          <p>
            {hasConflict
              ? "当前 Diff 存在冲突风险。建议先刷新最新版本，或通过 Force Apply 审批确认覆盖风险。"
              : "当前 Diff 可通过常规审批路径应用；系统会记录快照、审计和行级影响。"}
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
        <p>{summary.instruction || "该 artifact 是初始版本。"}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">基于版本</span>
        <p>{summary.basedOnLabel || "没有父级 artifact。"}</p>
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
        <div className="diff-summary-section" id="artifact-line-diff-viewer" data-testid="artifact-line-diff-viewer">
          <span className="diff-summary-section__label">行级 Diff</span>
          <div className="line-diff-viewer__scroll" data-testid="artifact-line-diff-scroll">
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
          </div>
          {hiddenLineCount > 0 ? <p>已截断显示，另有 {hiddenLineCount} 行未显示。</p> : null}
        </div>
      ) : null}

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">风险</span>
        <p>{summary.risk}</p>
      </div>
    </section>
  );
}
