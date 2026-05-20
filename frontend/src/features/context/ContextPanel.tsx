import type { TaskSpec } from "../chat/chatTypes";
import type { ContextSnapshot, HandoffSummary } from "./contextTypes";
import { formatId } from "../../utils/id";

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
    return <div className="context-panel__empty">Loading context and handoff data...</div>;
  }

  return (
    <div className="context-panel">
      <div className="section-header">
        <h3>Context / Handoff</h3>
        <span>
          {contextSnapshots.length} snapshots / {handoffSummaries.length} handoffs
        </span>
      </div>

      {taskSpec ? (
        <section className="context-card context-card--task-spec">
          <div className="context-card__header">
            <strong>{taskSpec.title}</strong>
            <span>{taskSpec.status}</span>
          </div>
          <p className="context-card__summary">{taskSpec.userGoal}</p>
          <div className="context-list-block">
            <span className="context-list-block__label">Acceptance Criteria</span>
            <ul>
              {taskSpec.acceptanceCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="context-list-block">
            <span className="context-list-block__label">Expected Artifacts</span>
            <div className="tag-row">
              {taskSpec.expectedArtifacts.map((artifactType) => (
                <span key={artifactType} className="tag-chip">
                  {artifactType}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className="context-section">
        <div className="section-header">
          <h3>Snapshots</h3>
          <span>{contextSnapshots.length}</span>
        </div>
        {contextSnapshots.length === 0 ? (
          <div className="context-panel__empty">No context snapshot available for this task run.</div>
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
                  <span>{snapshot.includedMessageIds.length} messages</span>
                  <span>{snapshot.includedArtifactIds.length} artifacts</span>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">Pinned Context</span>
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
          <h3>Handoffs</h3>
          <span>{handoffSummaries.length}</span>
        </div>
        {handoffSummaries.length === 0 ? (
          <div className="context-panel__empty">No handoff summary available for this task run.</div>
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
                  <span>{handoff.passedArtifactIds.length} passed artifacts</span>
                  <span>
                    {formatId(handoff.sourceStepId)} {"->"} {formatId(handoff.targetStepId)}
                  </span>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">Key Decisions</span>
                  <ul>
                    {handoff.keyDecisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">Open Issues</span>
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
