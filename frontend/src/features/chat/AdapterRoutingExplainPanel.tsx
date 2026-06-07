import type { TaskRun } from "./chatTypes";
import { displayStatus } from "../../utils/displayLabels";
import { parseAdapterCandidateScores } from "./taskRunPanelHelpers";

export function AdapterRoutingExplainPanel({ taskRun }: { taskRun: TaskRun }) {
  const rows = taskRun.steps.flatMap((step) =>
    parseAdapterCandidateScores(step.routingReason).map((candidate) => ({
      stepOrder: step.stepOrder,
      selectedAdapter: step.preferredAdapterType || step.adapterType || "-",
      ...candidate
    }))
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="adapter-routing-panel" data-testid="adapter-routing-panel" aria-label="Adapter 路由候选分">
      <div className="adapter-routing-panel__header">
        <strong>Adapter 路由评分</strong>
        <span>{rows.length} 个候选</span>
      </div>
      <div className="adapter-routing-table">
        <div className="adapter-routing-table__row adapter-routing-table__row--head">
          <span>步骤</span>
          <span>Adapter</span>
          <span>状态</span>
          <span>总分</span>
          <span>健康</span>
          <span>成功率</span>
          <span>Fallback 惩罚</span>
          <span>首选加分</span>
        </div>
        {rows.map((row) => (
          <div
            className={`adapter-routing-table__row ${row.adapterType === row.selectedAdapter ? "adapter-routing-table__row--selected" : ""}`}
            key={`${row.stepOrder}-${row.adapterType}`}
          >
            <span>#{row.stepOrder}</span>
            <strong>{row.adapterType}</strong>
            <span>{displayStatus(row.status)}</span>
            <span>{row.totalScore.toFixed(1)}</span>
            <span>{row.healthScore.toFixed(1)}</span>
            <span>{row.successRateScore.toFixed(1)}</span>
            <span>{row.fallbackPenaltyScore.toFixed(1)}</span>
            <span>{row.preferredBonusScore.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
