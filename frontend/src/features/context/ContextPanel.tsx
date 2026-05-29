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

function resolveInjectionMode(
  snapshot: ContextSnapshot,
  item: RetrievedContextItem,
  taskRuns: TaskRun[]
): string {
  if (getRetrievedItemStepId(item)) {
    return "backend step id";
  }

  const taskRunId = getIdValue(snapshot.taskRunId);
  const taskRun = taskRuns.find((run) => getIdValue(run.id) === taskRunId);
  const matchedSteps = taskRun?.steps.filter((step) => stepContainsRetrievedItem(step, item)) ?? [];

  return matchedSteps.length > 0 ? "inputContext fallback" : "unmatched";
}

type ContextSearchStage = "LIST_GREP_READ" | "LIST_READ_FALLBACK" | "UNKNOWN";

interface ContextStageSummary {
  total: number;
  listGrepRead: number;
  listReadFallback: number;
  unknown: number;
  matchedTokenCount: number;
  injectedCount: number;
  topSourceType: string;
}

function resolveContextSearchStage(item: RetrievedContextItem): ContextSearchStage {
  const explicitStage = item.searchStage?.toUpperCase();
  if (explicitStage === "LIST_GREP_READ" || explicitStage === "LIST_READ_FALLBACK") {
    return explicitStage;
  }

  const reasonMatch = item.reason?.match(/Search stage:\s*([A-Z_]+)/i);
  const reasonStage = reasonMatch?.[1]?.toUpperCase();
  if (reasonStage === "LIST_GREP_READ" || reasonStage === "LIST_READ_FALLBACK") {
    return reasonStage;
  }

  const windowPolicy = item.windowPolicy?.toUpperCase() || "";
  if (windowPolicy.startsWith("GREP_")) {
    return "LIST_GREP_READ";
  }

  if (windowPolicy.startsWith("LIST_")) {
    return "LIST_READ_FALLBACK";
  }

  if (item.matchedTokens?.length) {
    return "LIST_GREP_READ";
  }

  return "UNKNOWN";
}

function getContextSearchStageLabel(stage: ContextSearchStage): string {
  if (stage === "LIST_GREP_READ") {
    return "List -> Grep -> Read";
  }

  if (stage === "LIST_READ_FALLBACK") {
    return "List -> Read fallback";
  }

  return "Search stage unknown";
}

function getContextSearchStageDetail(stage: ContextSearchStage): string {
  if (stage === "LIST_GREP_READ") {
    return "先命中关键词，再读取片段";
  }

  if (stage === "LIST_READ_FALLBACK") {
    return "无关键词命中，按候选窗口读取";
  }

  return "旧快照缺少检索阶段元数据";
}

function getContextSearchPipeline(stage: ContextSearchStage, item: RetrievedContextItem): Array<{ label: string; detail: string }> {
  const hasKeywordHit = stage === "LIST_GREP_READ" || Boolean(item.matchedTokens?.length);
  return [
    {
      label: "List",
      detail: `候选 ${item.sourceType}:${item.sourceId}`
    },
    {
      label: "Grep",
      detail: hasKeywordHit ? `命中 ${item.matchedTokens?.join(", ") || "keyword"}` : "未命中精确关键词"
    },
    {
      label: "Read",
      detail: item.windowPolicy ? `窗口 ${item.windowPolicy}` : "读取内容片段"
    }
  ];
}

function getScoreBreakdownLabel(item: RetrievedContextItem): string {
  const parts = [
    typeof item.baseScore === "number" ? `base ${item.baseScore.toFixed(1)}` : null,
    typeof item.keywordScore === "number" ? `keyword ${item.keywordScore.toFixed(1)}` : null,
    typeof item.recencyScore === "number" ? `recency ${item.recencyScore.toFixed(1)}` : null,
    typeof item.importanceScore === "number" ? `importance ${item.importanceScore.toFixed(1)}` : null,
    typeof item.semanticScore === "number" ? `semantic ${item.semanticScore.toFixed(1)}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" / ") : "后端未返回拆分分数，使用综合 score。";
}

function buildContextStageSummary(items: RetrievedContextItem[], taskRuns: TaskRun[], snapshot: ContextSnapshot): ContextStageSummary {
  const sourceCounts = new Map<string, number>();

  const summary = items.reduce<ContextStageSummary>(
    (current, item) => {
      const stage = resolveContextSearchStage(item);
      sourceCounts.set(item.sourceType, (sourceCounts.get(item.sourceType) ?? 0) + 1);

      return {
        ...current,
        listGrepRead: current.listGrepRead + (stage === "LIST_GREP_READ" ? 1 : 0),
        listReadFallback: current.listReadFallback + (stage === "LIST_READ_FALLBACK" ? 1 : 0),
        unknown: current.unknown + (stage === "UNKNOWN" ? 1 : 0),
        matchedTokenCount: current.matchedTokenCount + (item.matchedTokens?.length ?? 0),
        injectedCount: current.injectedCount + (resolveInjectionMode(snapshot, item, taskRuns) === "unmatched" ? 0 : 1)
      };
    },
    {
      total: items.length,
      listGrepRead: 0,
      listReadFallback: 0,
      unknown: 0,
      matchedTokenCount: 0,
      injectedCount: 0,
      topSourceType: "N/A"
    }
  );

  const topSourceType =
    Array.from(sourceCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "N/A";

  return {
    ...summary,
    topSourceType
  };
}

function getScorePercent(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
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
    <div className="context-panel" data-testid="context-panel">
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
          <div className="context-card-list" data-testid="context-snapshot-list">
            {contextSnapshots.map((snapshot) => {
              const retrievedItems = snapshot.retrievedContextItems ?? [];
              const stageSummary = buildContextStageSummary(retrievedItems, taskRuns, snapshot);

              return (
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
                <div className="context-search-overview" data-testid="context-search-overview">
                  <div className="context-search-overview__header">
                    <strong>检索流水线</strong>
                    <span>List / Grep / Read</span>
                  </div>
                  <div className="context-search-overview__grid">
                    <span>
                      <strong>{stageSummary.total}</strong>
                      <small>召回上下文</small>
                    </span>
                    <span>
                      <strong>{stageSummary.listGrepRead}</strong>
                      <small>关键词命中</small>
                    </span>
                    <span>
                      <strong>{stageSummary.listReadFallback}</strong>
                      <small>窗口回退</small>
                    </span>
                    <span>
                      <strong>{stageSummary.matchedTokenCount}</strong>
                      <small>matched tokens</small>
                    </span>
                    <span>
                      <strong>{stageSummary.injectedCount}</strong>
                      <small>已注入 Step</small>
                    </span>
                    <span>
                      <strong>{stageSummary.topSourceType}</strong>
                      <small>主要来源</small>
                    </span>
                  </div>
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
                {retrievedItems.length ? (
                  <div className="context-list-block">
                    <span className="context-list-block__label">检索上下文</span>
                    <div className="retrieved-context-list">
                      {retrievedItems.map((item, index) => {
                        const searchStage = resolveContextSearchStage(item);
                        const scorePercent = getScorePercent(item.score);

                        return (
                          <article
                            className="retrieved-context-item"
                            data-testid="retrieved-context-item"
                            key={`${formatId(snapshot.id)}-retrieved-${index}-${item.sourceType}-${item.sourceId}`}
                          >
                            <div className="retrieved-context-item__topline">
                              <strong>{item.title || item.sourceId}</strong>
                              <span>{item.sourceType}</span>
                            </div>
                            <div className="retrieved-context-item__stage-row">
                              <span
                                className={`retrieved-context-item__stage-chip retrieved-context-item__stage-chip--${searchStage.toLowerCase()}`}
                              >
                                {getContextSearchStageLabel(searchStage)}
                              </span>
                              <span>{getContextSearchStageDetail(searchStage)}</span>
                              {item.windowPolicy ? <span>窗口 {item.windowPolicy}</span> : null}
                              {item.semanticBackend ? <span>语义后端 {item.semanticBackend}</span> : null}
                            </div>
                            <div
                              className="retrieved-context-item__pipeline"
                              data-testid="context-search-pipeline"
                              aria-label="Context search pipeline"
                            >
                              {getContextSearchPipeline(searchStage, item).map((stageItem) => (
                                <span key={`${item.sourceType}-${item.sourceId}-${stageItem.label}`}>
                                  <strong>{stageItem.label}</strong>
                                  <small>{stageItem.detail}</small>
                                </span>
                              ))}
                            </div>
                            <div className="retrieved-context-item__explain-chain">
                              <section>
                                <span>01 · List / Grep / Read</span>
                                <strong>{getContextSearchStageLabel(searchStage)}</strong>
                                <small>
                                  {item.matchedTokens?.length
                                    ? `Grep 命中 ${item.matchedTokens.length} 个 token`
                                    : "未命中精确关键词，使用候选窗口回退"}
                                </small>
                              </section>
                              <section>
                                <span>02 · Scoring</span>
                                <strong>{Number.isFinite(item.score) ? item.score.toFixed(2) : "-"}</strong>
                                <small>{getScoreBreakdownLabel(item)}</small>
                              </section>
                              <section>
                                <span>03 · Injected Step</span>
                                <strong>{resolveInjectionStepLabel(snapshot, item, taskRuns)}</strong>
                                <small>{resolveInjectionMode(snapshot, item, taskRuns)}</small>
                              </section>
                            </div>
                            <div className="retrieved-context-item__meta">
                              {item.sourceRank ? <span>rank #{item.sourceRank}</span> : null}
                              <span>score {Number.isFinite(item.score) ? item.score.toFixed(2) : "-"}</span>
                              {typeof item.baseScore === "number" ? <span>base {item.baseScore.toFixed(1)}</span> : null}
                              {typeof item.keywordScore === "number" ? <span>keyword {item.keywordScore.toFixed(1)}</span> : null}
                              {typeof item.recencyScore === "number" ? <span>recency {item.recencyScore.toFixed(1)}</span> : null}
                              {typeof item.importanceScore === "number" ? <span>importance {item.importanceScore.toFixed(1)}</span> : null}
                              {typeof item.semanticScore === "number" ? <span>semantic {item.semanticScore.toFixed(1)}</span> : null}
                              <span>source {item.sourceType}:{item.sourceId}</span>
                              <span>injects into {resolveInjectionStepLabel(snapshot, item, taskRuns)}</span>
                              <span>match {resolveInjectionMode(snapshot, item, taskRuns)}</span>
                            </div>
                            <div className="retrieved-context-item__score">
                              <span>综合分 {Number.isFinite(item.score) ? item.score.toFixed(2) : "-"}</span>
                              <div className="retrieved-context-item__score-track" aria-hidden="true">
                                <i style={{ width: `${scorePercent}%` }} />
                              </div>
                            </div>
                            {item.matchedTokens?.length ? (
                              <div className="retrieved-context-item__tokens">
                                {item.matchedTokens.map((token) => (
                                  <span key={`${item.sourceType}-${item.sourceId}-${token}`}>{token}</span>
                                ))}
                              </div>
                            ) : null}
                            <p className="retrieved-context-item__reason">{item.reason || "后端未返回检索原因。"}</p>
                            {item.semanticExplanation ? (
                              <p className="retrieved-context-item__reason">语义解释：{item.semanticExplanation}</p>
                            ) : null}
                            <p className="retrieved-context-item__content">{item.content}</p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="context-list-block">
                    <span className="context-list-block__label">检索上下文</span>
                    <p className="context-card__summary">
                      本次 TaskRun 没有命中可注入的检索上下文，或后端未返回 retrievedContextItems。
                    </p>
                  </div>
                )}
              </section>
              );
            })}
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
