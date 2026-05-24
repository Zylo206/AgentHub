import type { TaskRun, TaskSpec, TaskStep } from "../chat/chatTypes";
import type { ContextSnapshot, HandoffSummary, PinnedContext, RetrievedContextItem } from "./contextTypes";
import type { MemoryItem } from "../memory/memoryTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ContextPanelProps {
  taskSpec: TaskSpec | null;
  taskRuns: TaskRun[];
  pinnedContexts: PinnedContext[];
  memories: MemoryItem[];
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

function formatPinnedSource(pinnedContext: PinnedContext): string {
  return `${pinnedContext.sourceType || "MESSAGE"} · ${pinnedContext.sourceId}`;
}

function getRetrievedItemStepId(item: RetrievedContextItem): string | null {
  return (
    getIdValue(item.taskStepId) ||
    getIdValue(item.injectedStepId) ||
    getIdValue(item.injectionStepId) ||
    getIdValue(item.targetStepId) ||
    getIdValue(item.stepId) ||
    item.injectedIntoStep ||
    null
  );
}

function stepContainsRetrievedItem(step: TaskStep, item: RetrievedContextItem): boolean {
  const inputContext = (step.inputContext || "").toLowerCase();
  if (!inputContext) {
    return false;
  }

  return [item.sourceId, item.title, item.content, item.reason]
    .filter(Boolean)
    .some((value) => inputContext.includes(String(value).toLowerCase().slice(0, 160)));
}

function resolveInjectionStepLabel(
  snapshot: ContextSnapshot,
  item: RetrievedContextItem,
  taskRuns: TaskRun[]
): string {
  const backendStepId = getRetrievedItemStepId(item);
  const taskRunId = getIdValue(snapshot.taskRunId);
  const taskRun = taskRuns.find((run) => getIdValue(run.id) === taskRunId);

  if (backendStepId) {
    const matchedStep = taskRun?.steps.find((step) => getIdValue(step.id) === backendStepId);
    if (matchedStep) {
      return `TaskStep ${matchedStep.stepOrder} / ${matchedStep.assignedAgentName || formatId(matchedStep.assignedAgentId)}`;
    }

    return `Step ${backendStepId}`;
  }

  const matchedSteps = taskRun?.steps.filter((step) => stepContainsRetrievedItem(step, item)) ?? [];
  if (matchedSteps.length > 0) {
    return matchedSteps
      .map((step) => `TaskStep ${step.stepOrder} / ${step.assignedAgentName || formatId(step.assignedAgentId)}`)
      .join(", ");
  }

  return taskRunId ? `TaskRun ${formatId(snapshot.taskRunId)} / no exact TaskStep inputContext match` : "No TaskRun fallback available";
}

export function ContextPanel({
  taskSpec,
  taskRuns,
  pinnedContexts,
  memories,
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
              {taskSpec.acceptanceCriteria.map((item, index) => (
                <li key={`acceptance-${index}-${item.slice(0, 32)}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="context-list-block">
            <span className="context-list-block__label">预期产物</span>
            <div className="tag-row">
              {taskSpec.expectedArtifacts.map((artifactType, index) => (
                <span key={`expected-artifact-${index}-${artifactType}`} className="tag-chip">
                  {displayArtifactType(artifactType)}
                </span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="context-card context-card--pinned">
        <div className="context-card__header">
          <strong>手动固定上下文</strong>
          <span>{pinnedContexts.length} 条</span>
        </div>
        {pinnedContexts.length === 0 ? (
          <p className="context-card__summary">还没有固定消息。可以在消息气泡中点击“固定到 Context”，让下一次 Demo Task 使用这些长期上下文。</p>
        ) : (
          <div className="pinned-context-list">
            {pinnedContexts.map((pinnedContext) => (
              <article className="pinned-context-item" key={pinnedContext.id}>
                <div className="pinned-context-item__meta">
                  <span>{formatPinnedSource(pinnedContext)}</span>
                  <span>{formatDateTime(pinnedContext.createdAt)}</span>
                </div>
                <p>{pinnedContext.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="context-card context-card--memory">
        <div className="context-card__header">
          <strong>长期记忆</strong>
          <span>{memories.length} 条</span>
        </div>
        {memories.length === 0 ? (
          <p className="context-card__summary">还没有长期记忆。可以在消息气泡中点击“保存为记忆”，让后续 TaskRun 自动引用。</p>
        ) : (
          <div className="pinned-context-list">
            {memories.map((memory) => (
              <article className="pinned-context-item" key={memory.memoryId}>
                <div className="pinned-context-item__meta">
                  <span>{memory.category} · {memory.scope} · {memory.sourceId}</span>
                  <span>importance {memory.importance} · last used {new Date(memory.lastUsedAt).toLocaleString()}</span>
                </div>
                <p>{memory.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>

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
                  {snapshot.pinnedContextItems.length === 0 ? (
                    <p className="context-card__summary">该 TaskRun 没有使用手动固定上下文。</p>
                  ) : (
                    <ul>
                      {snapshot.pinnedContextItems.map((item, index) => (
                        <li key={`${formatId(snapshot.id)}-pinned-${index}-${item.slice(0, 32)}`}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {snapshot.retrievedContextItems?.length ? (
                  <div className="context-list-block">
                    <span className="context-list-block__label">Retrieved Context</span>
                    <div className="retrieved-context-list">
                      {snapshot.retrievedContextItems.map((item, index) => (
                        <article
                          className="retrieved-context-item"
                          key={`${formatId(snapshot.id)}-retrieved-${index}-${item.sourceType}-${item.sourceId}`}
                        >
                          <div className="retrieved-context-item__topline">
                            <strong>{item.title || item.sourceId}</strong>
                            <span>{item.sourceType}</span>
                          </div>
                          <div className="retrieved-context-item__meta">
                            <span>score {Number.isFinite(item.score) ? item.score.toFixed(2) : "-"}</span>
                            <span>injects into {resolveInjectionStepLabel(snapshot, item, taskRuns)}</span>
                          </div>
                          <p className="retrieved-context-item__reason">{item.reason || "No retrieval reason provided."}</p>
                          <p className="retrieved-context-item__content">{item.content}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                    {handoff.keyDecisions.map((decision, index) => (
                      <li key={`${handoff.id}-decision-${index}-${decision.slice(0, 32)}`}>{decision}</li>
                    ))}
                  </ul>
                </div>
                <div className="context-list-block">
                  <span className="context-list-block__label">待解决问题</span>
                  <ul>
                    {handoff.openIssues.map((issue, index) => (
                      <li key={`${handoff.id}-issue-${index}-${issue.slice(0, 32)}`}>{issue}</li>
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
