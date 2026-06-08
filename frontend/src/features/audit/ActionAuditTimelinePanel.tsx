import { useMemo, useState } from "react";
import type { ActionAuditLog } from "./auditTypes";
import { sanitizeProductionText } from "../../utils/productionLabels";

interface ActionAuditTimelinePanelProps {
  audits: ActionAuditLog[];
}

function formatDateTime(value: string): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function normalizeAuditStatus(status: string): string {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function getAuditLabel(actionType: string): string {
  const labels: Record<string, string> = {
    APPROVE_APPLY_DIFF: "确认应用 Diff",
    APPROVE_FORCE_APPLY_DIFF: "确认强制应用 Diff",
    APPROVE_DEMO_DEPLOY: "确认生成预览",
    APPROVE_RESTORE_SNAPSHOT: "确认恢复快照",
    APPLY_DIFF: "应用 Diff",
    DEMO_DEPLOY: "生成本地预览",
    RESTORE_SNAPSHOT: "恢复快照",
    DEMO_REVISION: "产物修改",
    SMOKE_APPROVAL_GATE: "审批链路验证"
  };

  return labels[actionType] || sanitizeProductionText(actionType);
}

export function ActionAuditTimelinePanel({ audits }: ActionAuditTimelinePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const sortedAudits = useMemo(
    () => [...audits].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()),
    [audits]
  );
  const latestAudit = sortedAudits[0] ?? null;

  return (
    <section className="action-audit-panel" data-testid="action-audit-panel">
      <div className="section-header">
        <div>
          <h3>操作审计</h3>
          <p>记录审批、应用 Diff、生成预览和恢复快照等高风险操作。</p>
        </div>
        <button
          type="button"
          className="secondary-button action-audit-panel__toggle"
          data-testid="action-audit-toggle"
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? "收起审计" : "展开审计"} · {audits.length}
        </button>
      </div>

      {audits.length === 0 ? (
        <div className="context-panel__empty">暂无操作审计。执行 Apply Diff、生成预览或 Restore 后会出现审计记录。</div>
      ) : (
        <>
          {!expanded && latestAudit ? (
            <article className="action-audit-card action-audit-card--latest" data-testid="action-audit-card">
              <div className="action-audit-card__dot" />
              <div>
                <div className="action-audit-card__header">
                  <strong>{getAuditLabel(latestAudit.actionType)}</strong>
                  <span className={`action-audit-status action-audit-status--${normalizeAuditStatus(latestAudit.status)}`}>
                    {sanitizeProductionText(latestAudit.status)}
                  </span>
                </div>
                <p>{sanitizeProductionText(latestAudit.summary)}</p>
                <div className="action-audit-card__meta">
                  <span>{sanitizeProductionText(latestAudit.targetType)}: {latestAudit.targetId}</span>
                  <span>{formatDateTime(latestAudit.createdAt)}</span>
                </div>
              </div>
            </article>
          ) : null}

          {expanded ? (
            <div className="action-audit-timeline">
              {sortedAudits.map((audit) => (
                <article className="action-audit-card" data-testid="action-audit-card" key={audit.auditId}>
                  <div className="action-audit-card__dot" />
                  <div>
                    <div className="action-audit-card__header">
                      <strong>{getAuditLabel(audit.actionType)}</strong>
                      <span className={`action-audit-status action-audit-status--${normalizeAuditStatus(audit.status)}`}>
                        {sanitizeProductionText(audit.status)}
                      </span>
                    </div>
                    <p>{sanitizeProductionText(audit.summary)}</p>
                    <div className="action-audit-card__meta">
                      <span>{sanitizeProductionText(audit.targetType)}: {audit.targetId}</span>
                      <span>{formatDateTime(audit.createdAt)}</span>
                      <span>ID: {audit.auditId}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
