import type { Artifact } from "../artifacts/artifactTypes";
import type { Agent } from "../agents/agentTypes";
import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayArtifactSourceKind, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

interface TaskRunPanelProps {
  agents: Agent[];
  artifacts: Artifact[];
  taskSpecs: TaskSpec[];
  taskRuns: TaskRun[];
  loading: boolean;
  selectedTaskRunId: string | null;
  selectedTaskStepId: string | null;
  onSelectStep: (taskRunId: string, step: TaskStep) => void;
}

function summarizeAdapterResponse(responseSummary?: string): string | null {
  if (!responseSummary) {
    return null;
  }

  const normalized = responseSummary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function formatQualityScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return score.toFixed(2);
}

function formatBuildValidationValue(status?: string | null): string {
  return status || "NOT_EVALUATED";
}

function getReviewRetryReviseLabel(step: TaskStep): string {
  if (step.artifactQualityStatus !== "REJECTED") {
    return "NOT_TRIGGERED";
  }

  const reason = `${step.artifactQualityReason || ""}`.toLowerCase();
  if (reason.includes("retry") || reason.includes("revise")) {
    return "TRIGGERED";
  }

  return "REJECTED";
}

function getAdapterDisplay(step: TaskStep) {
  const preferred = step.preferredAdapterType || step.adapterType || null;
  const actual = step.actualAdapterType || step.adapterType || null;
  const status = step.adapterStatus || null;
  const fallbackUsed = Boolean(preferred && actual && preferred !== actual);

  return {
    preferred,
    actual,
    status,
    fallbackUsed
  };
}

function getRevisionOrigin(artifacts: Artifact[], taskRun: TaskRun) {
  const producedArtifactIds = new Set(
    taskRun.steps.flatMap((step) => step.producedArtifactIds.map((artifactId) => getIdValue(artifactId)))
  );
  const producedArtifacts = artifacts.filter((artifact) => producedArtifactIds.has(getIdValue(artifact.id)));
  const revisionArtifact =
    producedArtifacts.find((artifact) => artifact.parentArtifactId || artifact.revisionInstruction) ?? null;

  if (!revisionArtifact) {
    return null;
  }

  const parentArtifact =
    artifacts.find((artifact) => getIdValue(artifact.id) === revisionArtifact.parentArtifactId) ?? null;

  return {
    artifact: revisionArtifact,
    parentArtifact
  };
}

function getTaskSpecForRun(taskSpecs: TaskSpec[], taskRun: TaskRun): TaskSpec | null {
  const taskSpecId = getIdValue(taskRun.taskSpecId);
  return taskSpecs.find((taskSpec) => getIdValue(taskSpec.id) === taskSpecId) ?? null;
}

function getProducedArtifactsForRun(artifacts: Artifact[], taskRun: TaskRun): Artifact[] {
  const producedArtifactIds = new Set(
    taskRun.steps.flatMap((step) => step.producedArtifactIds.map((artifactId) => getIdValue(artifactId)))
  );

  return artifacts.filter((artifact) => producedArtifactIds.has(getIdValue(artifact.id)));
}

function countFallbackSteps(taskRun: TaskRun): number {
  return taskRun.steps.filter((step) => {
    const adapterDisplay = getAdapterDisplay(step);
    return adapterDisplay.fallbackUsed || adapterDisplay.status === "FALLBACK_USED";
  }).length;
}

function getParallelExecutionGroups(taskRun: TaskRun): Array<[string, TaskStep[]]> {
  const groups = new Map<string, TaskStep[]>();
  taskRun.steps.forEach((step) => {
    const groupKey = step.parallelGroupKey || `GROUP_${step.stepOrder}`;
    groups.set(groupKey, [...(groups.get(groupKey) || []), step]);
  });

  return Array.from(groups.entries()).filter(([, steps]) => steps.length > 1);
}

function getStepAgentName(step: TaskStep, agentNameMap: Map<string | null, string>): string {
  const assignedAgentId = getIdValue(step.assignedAgentId);
  return agentNameMap.get(assignedAgentId) || step.assignedAgentName || assignedAgentId || "Agent";
}

interface ParsedAdapterCandidateScore {
  adapterType: string;
  totalScore: number;
  healthScore: number;
  successRateScore: number;
  fallbackPenaltyScore: number;
  preferredBonusScore: number;
  status: string;
}

function parseAdapterCandidateScores(routingReason?: string | null): ParsedAdapterCandidateScore[] {
  if (!routingReason) {
    return [];
  }

  const match = routingReason.match(/candidates=\[(.*?)]/);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(";")
    .map((rawCandidate) => rawCandidate.trim())
    .map((rawCandidate) => {
      const candidateMatch = rawCandidate.match(/^([A-Z_]+)\((.*)\)$/);
      if (!candidateMatch) {
        return null;
      }
      const values = Object.fromEntries(
        candidateMatch[2].split(",").map((pair) => {
          const [key, value] = pair.split("=");
          return [key?.trim(), value?.trim()];
        })
      );

      return {
        adapterType: candidateMatch[1],
        totalScore: Number(values.total ?? 0),
        healthScore: Number(values.health ?? 0),
        successRateScore: Number(values.successRate ?? 0),
        fallbackPenaltyScore: Number(values.fallbackPenalty ?? 0),
        preferredBonusScore: Number(values.preferredBonus ?? 0),
        status: values.status ?? "-"
      };
    })
    .filter((candidate): candidate is ParsedAdapterCandidateScore => Boolean(candidate));
}

function AdapterRoutingExplainPanel({ taskRun }: { taskRun: TaskRun }) {
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
    <section className="adapter-routing-panel" aria-label="Adapter routing candidate scores">
      <div className="adapter-routing-panel__header">
        <strong>Adapter Routing Scores</strong>
        <span>{rows.length} candidates</span>
      </div>
      <div className="adapter-routing-table">
        <div className="adapter-routing-table__row adapter-routing-table__row--head">
          <span>Step</span>
          <span>Adapter</span>
          <span>Status</span>
          <span>Total</span>
          <span>Health</span>
          <span>Success</span>
          <span>Fallback penalty</span>
          <span>Preferred bonus</span>
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

function extractSummaryField(summary: string, label: string): string | null {
  const start = summary.indexOf(label);
  if (start < 0) {
    return null;
  }

  const valueStart = start + label.length;
  const rest = summary.slice(valueStart);
  const end = rest.search(/(?:Planner fallback 原因：|从|Selected Agent|Adapter fallback|Adapter 未发生|$)/);
  const value = (end >= 0 ? rest.slice(0, end) : rest).trim();
  return value || null;
}

function getPlannerDisplay(taskRun: TaskRun, hasParallelExecution: boolean) {
  const summary = taskRun.resultSummary || "";
  const isLlmPlanner = summary.includes("LLM_PLANNER");
  const isRuleFallback = summary.includes("RULE_BASED_FALLBACK");
  const plannerReasoning = extractSummaryField(summary, "Planner 说明：");
  const fallbackReason = extractSummaryField(summary, "Planner fallback 原因：");

  return {
    label: isLlmPlanner
      ? hasParallelExecution
        ? "LLM Planner · 并发执行组"
        : "LLM Planner"
      : isRuleFallback
        ? hasParallelExecution
          ? "规则化 fallback · 并发执行组"
          : "规则化 fallback"
        : hasParallelExecution
          ? "规则化 Planner · 并发执行组"
          : "规则化 Planner",
    description: isLlmPlanner
      ? "OPENAI_COMPATIBLE 生成 OrchestratorPlan，并通过后端 JSON schema 校验。"
      : isRuleFallback
        ? "LLM Planner 不可用或输出未通过校验，已安全回退到规则化 Planner。"
        : "Planner / Router / Executor / Aggregator 的规则化执行说明",
    plannerReasoning,
    fallbackReason
  };
}

function OrchestratorExplainPanel({
  taskRun,
  taskSpec,
  producedArtifacts,
  agentNameMap
}: {
  taskRun: TaskRun;
  taskSpec: TaskSpec | null;
  producedArtifacts: Artifact[];
  agentNameMap: Map<string | null, string>;
}) {
  const fallbackCount = countFallbackSteps(taskRun);
  const expectedArtifacts = taskSpec?.expectedArtifacts ?? [];
  const requiredSkills = taskSpec?.requiredSkills ?? [];
  const parallelExecutionGroups = getParallelExecutionGroups(taskRun);
  const hasParallelExecution = parallelExecutionGroups.length > 0;
  const plannerDisplay = getPlannerDisplay(taskRun, hasParallelExecution);
  const decisionLog = taskRun.orchestratorDecisionLog ?? null;

  return (
    <section className="orchestrator-explain-panel" aria-label="Orchestrator 决策链">
      <div className="orchestrator-explain-panel__header">
        <div>
          <strong>Orchestrator 决策链</strong>
          <p>{decisionLog?.summary || plannerDisplay.description}</p>
        </div>
        <span className="orchestrator-mode-pill">
          {decisionLog?.decisionMode || plannerDisplay.label}
        </span>
      </div>

      <div className="orchestrator-stage-grid">
        <article className="orchestrator-stage-card">
          <span className="orchestrator-stage-card__label">Planner</span>
          <strong>拆解任务</strong>
          <p>
            {decisionLog?.plannerDecision ||
              taskRun.taskPlan?.goal ||
              taskSpec?.userGoal ||
              "基于用户消息生成 Demo Task 计划。"}
          </p>
          {!decisionLog && plannerDisplay.plannerReasoning ? (
            <p className="orchestrator-stage-card__note">{plannerDisplay.plannerReasoning}</p>
          ) : null}
          {!decisionLog && plannerDisplay.fallbackReason ? (
            <p className="orchestrator-stage-card__note orchestrator-stage-card__note--warning">
              fallback 原因：{plannerDisplay.fallbackReason}
            </p>
          ) : null}
          <div className="orchestrator-stage-card__meta">
            <span>{taskRun.steps.length} 个 TaskStep</span>
            <span>{expectedArtifacts.length || producedArtifacts.length} 类预期产物</span>
          </div>
          {requiredSkills.length > 0 ? (
            <div className="orchestrator-chip-row">
              {requiredSkills.map((skill) => (
                <span className="orchestrator-chip" key={skill}>{skill}</span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="orchestrator-stage-card">
          <span className="orchestrator-stage-card__label">Router</span>
          <strong>路由 Agent</strong>
          {decisionLog?.routingDecision ? (
            <p className="orchestrator-stage-card__note">{decisionLog.routingDecision}</p>
          ) : null}
          <div className="orchestrator-route-list">
            {taskRun.steps.map((step) => {
              const adapterDisplay = getAdapterDisplay(step);
              return (
                <div className="orchestrator-route-item" key={formatId(step.id)}>
                  <span>Step {step.stepOrder}</span>
                  <strong>{getStepAgentName(step, agentNameMap)}</strong>
                  <em>{adapterDisplay.preferred || "MOCK"}</em>
                  {step.parallelGroupKey ? <small>{step.parallelGroupKey}</small> : null}
                  {step.dependsOnStepOrders?.length ? (
                    <small>dependsOn: {step.dependsOnStepOrders.join(", ")}</small>
                  ) : (
                    <small>dependsOn: none</small>
                  )}
                  {step.routingReason ? <small>{step.routingReason}</small> : null}
                </div>
              );
            })}
          </div>
        </article>

        <article className="orchestrator-stage-card">
          <span className="orchestrator-stage-card__label">Executor</span>
          <strong>执行与 fallback</strong>
          <p>{decisionLog?.executionDecision || "记录每个 Step 的 preferred / actual Adapter、执行状态和错误信息。"}</p>
          {decisionLog?.fallbackDecision ? (
            <p className="orchestrator-stage-card__note orchestrator-stage-card__note--warning">
              {decisionLog.fallbackDecision}
            </p>
          ) : null}
          <div className="orchestrator-stage-card__meta">
            <span>{taskRun.steps.length} 个 Step 已执行</span>
            <span>{fallbackCount} 个 fallback</span>
            <span>{hasParallelExecution ? "后端 CompletableFuture 并发执行" : "按依赖顺序执行"}</span>
          </div>
          {hasParallelExecution ? (
            <div className="parallel-group-list">
              {parallelExecutionGroups.map(([groupKey, steps]) => (
                <span className="parallel-group-pill" key={groupKey}>
                  {groupKey}: Step {steps.map((step) => step.stepOrder).join(" / ")}
                </span>
              ))}
            </div>
          ) : null}
          {taskRun.taskGraph ? (
            <div className="parallel-group-list">
              <span className="parallel-group-pill">{taskRun.taskGraph.graphType}</span>
              <span className="parallel-group-pill">{taskRun.taskGraph.summary}</span>
              {taskRun.taskGraph.executionBatches.map((batch) => (
                <span className="parallel-group-pill" key={batch.batchKey}>
                  {batch.batchKey}: {batch.executionMode} / steps {batch.stepOrders.join(", ")}
                  {batch.dependsOnBatchKeys.length ? ` / depends ${batch.dependsOnBatchKeys.join(", ")}` : ""}
                  {batch.batchStatus ? ` / ${displayStatus(batch.batchStatus)}` : ""}
                  {typeof batch.durationMs === "number" ? ` / ${batch.durationMs}ms` : ""}
                  {batch.failurePolicy ? ` / ${batch.failurePolicy}` : ""}
                </span>
              ))}
            </div>
          ) : null}
          <div className="orchestrator-chip-row">
            {taskRun.steps.map((step) => {
              const adapterDisplay = getAdapterDisplay(step);
              return (
                <span
                  className={`orchestrator-chip ${adapterDisplay.fallbackUsed ? "orchestrator-chip--warning" : ""}`}
                  key={formatId(step.id)}
                >
                  Step {step.stepOrder}: {adapterDisplay.actual || "未记录"}
                  {step.parallelGroupKey ? ` / ${step.parallelGroupKey}` : ""}
                </span>
              );
            })}
          </div>
        </article>

        <article className="orchestrator-stage-card">
          <span className="orchestrator-stage-card__label">Aggregator</span>
          <strong>聚合结果</strong>
          <p>{decisionLog?.aggregationDecision || taskRun.resultSummary}</p>
          {decisionLog?.aggregationDecision ? (
            <p className="orchestrator-stage-card__note">{taskRun.resultSummary}</p>
          ) : null}
          <div className="orchestrator-stage-card__meta">
            <span>{producedArtifacts.length} 个产物</span>
            <span>{displayStatus(taskRun.status)}</span>
          </div>
        </article>
      </div>
    </section>
  );
}

export function TaskRunPanel({
  agents,
  artifacts,
  taskSpecs,
  taskRuns,
  loading,
  selectedTaskRunId,
  selectedTaskStepId,
  onSelectStep
}: TaskRunPanelProps) {
  const agentNameMap = new Map(agents.map((agent) => [getIdValue(agent.id), agent.name]));

  if (loading) {
    return <div className="task-panel__empty">正在加载 TaskRun...</div>;
  }

  if (taskRuns.length === 0) {
    return (
      <div className="task-panel__empty">
        暂无 TaskRun。运行 Demo Task 后会在这里展示执行步骤。
      </div>
    );
  }

  return (
    <div className="task-panel">
      <div className="task-panel__header">
        <div>
          <h3>任务运行</h3>
          <p>
            {taskSpecs.length} 个 TaskSpec / {taskRuns.length} 个 TaskRun
          </p>
        </div>
      </div>

      {taskSpecs.length > 0 ? (
        <div className="task-spec-strip">
          {taskSpecs.map((taskSpec) => (
            <div className="task-spec-chip" key={formatId(taskSpec.id)}>
              <strong>{taskSpec.title}</strong>
              <span>{taskSpec.requiredSkills.join(", ")}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="task-run-list">
        {taskRuns.map((taskRun) => {
          const isActiveRun = selectedTaskRunId === getIdValue(taskRun.id);
          const revisionOrigin = getRevisionOrigin(artifacts, taskRun);
          const activeTaskSpec = getTaskSpecForRun(taskSpecs, taskRun);
          const producedArtifacts = getProducedArtifactsForRun(artifacts, taskRun);

          return (
            <section
              className={`task-run-card ${isActiveRun ? "task-run-card--active" : ""}`}
              key={formatId(taskRun.id)}
            >
              <div className="task-run-card__header">
                <div>
                  <strong>{formatId(taskRun.id)}</strong>
                  <p>{taskRun.resultSummary}</p>
                </div>
                <span className={`status-pill status-pill--${normalizeStatusClass(taskRun.status)}`}>
                  {displayStatus(taskRun.status)}
                </span>
              </div>
              <div className="task-run-card__goal">
                {taskRun.taskPlan?.goal || "暂无任务计划目标。"}
              </div>
              <OrchestratorExplainPanel
                taskRun={taskRun}
                taskSpec={activeTaskSpec}
                producedArtifacts={producedArtifacts}
                agentNameMap={agentNameMap}
              />
              <AdapterRoutingExplainPanel taskRun={taskRun} />
              {revisionOrigin ? (
                <div className="revision-origin task-run-card__revision">
                  <strong>产物修改任务</strong>
                  <span>
                    基于产物：{" "}
                    {revisionOrigin.parentArtifact
                      ? `${revisionOrigin.parentArtifact.title} v${revisionOrigin.parentArtifact.version}`
                      : "上一版产物"}
                  </span>
                  {revisionOrigin.artifact.revisionInstruction ? (
                    <p>修改指令：{revisionOrigin.artifact.revisionInstruction}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="task-step-list">
                {taskRun.steps.map((step) => {
                  const stepId = getIdValue(step.id);
                  const isSelectedStep = selectedTaskStepId === stepId;
                  const adapterDisplay = getAdapterDisplay(step);
                  const assignedAgentId = getIdValue(step.assignedAgentId);
                  const assignedAgentName =
                    agentNameMap.get(assignedAgentId) || step.assignedAgentName || assignedAgentId;
                  const stepProducedArtifactIds = new Set(
                    step.producedArtifactIds.map((artifactId) => getIdValue(artifactId))
                  );
                  const stepProducedArtifacts = artifacts.filter((artifact) =>
                    stepProducedArtifactIds.has(getIdValue(artifact.id))
                  );
                  const realAdapterArtifactCount = stepProducedArtifacts.filter(
                    (artifact) => artifact.sourceKind === "REAL_ADAPTER"
                  ).length;
                  const qualityScore = formatQualityScore(step.artifactQualityScore);
                  const buildValidationStatus = formatBuildValidationValue(step.artifactBuildValidationStatus);
                  const reviewRetryReviseState = getReviewRetryReviseLabel(step);

                  return (
                    <button
                      type="button"
                      className={`task-step-item ${isSelectedStep ? "task-step-item--selected" : ""}`}
                      key={formatId(step.id)}
                      onClick={() => onSelectStep(getIdValue(taskRun.id), step)}
                    >
                      <div className="task-step-item__row">
                        <span className="task-step-item__order">步骤 {step.stepOrder}</span>
                        <span className={`status-pill status-pill--${normalizeStatusClass(step.status)}`}>
                          {displayStatus(step.status)}
                        </span>
                      </div>
                      <div className="task-step-item__description">{step.taskDescription}</div>
                      <div className="task-step-item__meta step-agent-meta">
                        <span>执行 Agent：{assignedAgentName}</span>
                        <span>{step.producedArtifactIds.length} 个产物</span>
                      </div>
                      <div className="step-adapter-meta">
                        {adapterDisplay.fallbackUsed ? (
                          <div className="step-adapter-fallback">
                            <span className="step-adapter-preferred">
                              首选：{adapterDisplay.preferred}
                            </span>
                            <span className="step-adapter-actual">
                              实际：{adapterDisplay.actual}
                            </span>
                            <span className="step-adapter-status step-adapter-status--fallback">
                              状态：{displayStatus(adapterDisplay.status || "FALLBACK_USED")}
                            </span>
                            <span className="step-adapter-fallback-note">
                              首选 Adapter 不可用，已使用 fallback。
                            </span>
                          </div>
                        ) : (
                          <span className="step-adapter-status">
                            Adapter：{adapterDisplay.actual || "未记录"}
                            {adapterDisplay.status ? ` · ${displayStatus(adapterDisplay.status)}` : ""}
                          </span>
                        )}
                        {step.adapterResponseSummary ? (
                          <div className="step-adapter-response">
                            <strong>Adapter 响应：</strong> {summarizeAdapterResponse(step.adapterResponseSummary)}
                          </div>
                        ) : null}
                        <div className="step-generated-artifacts">
                          {realAdapterArtifactCount > 0 ? (
                            <span className="artifact-source-badge artifact-source-badge--real-adapter">
                              Real output used · {realAdapterArtifactCount}
                            </span>
                          ) : (
                            <span className="artifact-source-badge artifact-source-badge--static-template">
                              Static template fallback
                            </span>
                          )}
                          {stepProducedArtifacts.slice(0, 3).map((artifact) => (
                            <span
                              className={`artifact-source-badge artifact-source-badge--${(artifact.sourceKind || "STATIC_TEMPLATE").toLowerCase().replace(/_/g, "-")}`}
                              key={getIdValue(artifact.id)}
                            >
                              {displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}
                            </span>
                          ))}
                        </div>
                        <div className="step-generated-artifacts">
                          <span
                            className={`artifact-source-badge ${
                              step.realOutputUsed
                                ? "artifact-source-badge--real-adapter"
                                : "artifact-source-badge--static-template"
                          }`}
                          >
                            Real output: {step.realOutputUsed ? "USED" : "NOT_USED"}
                          </span>
                          <span className="artifact-source-badge">
                            Review retry/revise: {reviewRetryReviseState}
                          </span>
                          <span className="artifact-source-badge">
                            Parse: {step.artifactParseStatus || "NOT_ATTEMPTED"}
                          </span>
                          <span className="artifact-source-badge">
                            Quality: {step.artifactQualityStatus || "NOT_EVALUATED"}
                          </span>
                          <span className="artifact-source-badge">
                            Build validation: {buildValidationStatus}
                          </span>
                          <span className="artifact-source-badge">
                            Quality score: {qualityScore}
                          </span>
                        </div>
                        {step.artifactQualityReason ? (
                          <div className="step-adapter-response">
                            <strong>Artifact quality:</strong> {step.artifactQualityReason}
                          </div>
                        ) : null}
                        {step.adapterErrorMessage ? (
                          <div className="step-adapter-error">{step.adapterErrorMessage}</div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
