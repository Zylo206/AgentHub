import type { TaskSpec } from "../chat/chatTypes";
import type { ContextSnapshot, HandoffSummary } from "./contextTypes";
import { formatId } from "../../utils/id";
import { displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ContextPanelProps {
  taskSpec: TaskSpec | null;
  contextSnapshots: ContextSnapshot[];
  handoffSummaries: HandoffSummary[];
  loading: boolean;
}

function formatDateTime(value: string): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export function ContextPanel({
  taskSpec,
  contextSnapshots,
  handoffSummaries,
  loading
}: ContextPanelProps) {
  if (loading) {
    return <div className="context-panel__empty">正在加载 Context / Handoff 数据...</div>;
  }

  return (
    <div className="context-panel">
      <div className="section-header">
        <h3>Context / Handoff</h3>
        <span>
          {contextSnapshots.length} 个快照 / {handoffSummaries.length} 次交接
        </span>
      </div>

      {taskSpec ? (
        <section className="context-card context-card--task-spec">
          <div className="context-card__header">
            <strong>{taskSpec.title}</strong>
            <span>{displayStatus(taskSpec.status)}</span>
          </div>
          <p className="context-card__summary">{taskSpec.userGoal}</p>
          <div className="context-list-block">
            <span className="context-list-block__label">验收标准</span>
            <ul>
              {taskSpec.acceptanceCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="context-list-block">
            <span className="context-list-block__label">预期产物</span>
            <div className="tag-row">
              {taskSpec.expectedArtifacts.map((artifactType) => (
                <span key={artifactType} className="tag-chip">
                  {displayArtifactType(artifactType)}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="context-section">
        <div className="section-header">
          <h3>上下文快照</h3>
          <span>{contextSnapshots.length}</span>
        </div>
        {contextSnapshots.length === 0 ? (
          <div className="context-panel__empty">当前 TaskRun 暂无上下文快照。</div>
        ) : (
          <div className="context-card-list">
            {contextSnapshots.map((snapshot) => (
              <section className="context-card" key={formatId(snapshot.id)}>
                <div className="context-card__header">
                  <strong>{formatId(snapshot.id)}</strong>
                  <span>{formatDateTime(snapshot.createdAt)}</span>
                </div>
                <p className="context-card__summary">{snapshot.summary}</p>
                <div className="context-card__meta">
                  <span>{snapshot.includedMessageIds.length} 条消息</span>
                  <span>{snapshot.includedArtifactIds.length} 个产物</span>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">固定上下文</span>
                  <ul>
                    {snapshot.pinnedContextItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="context-section">
        <div className="section-header">
          <h3>Agent 交接</h3>
          <span>{handoffSummaries.length}</span>
        </div>
        {handoffSummaries.length === 0 ? (
          <div className="context-panel__empty">当前 TaskRun 暂无 HandoffSummary。</div>
        ) : (
          <div className="context-card-list">
            {handoffSummaries.map((handoff) => (
              <section className="context-card context-card--handoff" key={handoff.id}>
                <div className="context-card__header">
                  <strong>
                    {handoff.sourceAgentId} {"->"} {handoff.targetAgentId}
                  </strong>
                  <span>{formatDateTime(handoff.createdAt)}</span>
                </div>
                <p className="context-card__summary">{handoff.summary}</p>
                <div className="context-card__meta">
                  <span>{handoff.passedArtifactIds.length} 个传递产物</span>
                  <span>
                    {formatId(handoff.sourceStepId)} {"->"} {formatId(handoff.targetStepId)}
                  </span>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">关键决策</span>
                  <ul>
                    {handoff.keyDecisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">待解决问题</span>
                  <ul>
                    {handoff.openIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
