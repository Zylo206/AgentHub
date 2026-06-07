import type { Artifact } from "../artifacts/artifactTypes";
import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { displayStatus } from "../../utils/displayLabels";
import { formatId } from "../../utils/id";
import {
  countFallbackSteps,
  displayRoutingKey,
  getAdapterDisplay,
  getParallelExecutionGroups,
  getPlannerDisplay,
  getStepAgentName,
  getStepQualityGateAction,
  parseRoutingEvidence
} from "./taskRunPanelHelpers";

interface OrchestratorExplainDetailsProps {
  taskRun: TaskRun;
  taskSpec: TaskSpec | null;
  producedArtifacts: Artifact[];
  agentNameMap: Map<string | null, string>;
}

function TaskGraphDAGPanel({
  taskRun,
  agentNameMap
}: {
  taskRun: TaskRun;
  agentNameMap: Map<string | null, string>;
}) {
  const batches = taskRun.taskGraph?.executionBatches ?? [];
  if (batches.length === 0) {
    return null;
  }

  const stepsByOrder = new Map(taskRun.steps.map((step) => [step.stepOrder, step]));

  return (
    <section className="task-graph-dag-panel" data-testid="task-graph-dag-panel" aria-label="TaskGraph DAG">
      <div className="task-graph-dag-panel__header">
        <div>
          <strong>TaskGraph DAG</strong>
          <p>{taskRun.taskGraph?.summary || "批次、依赖、运行时和 fallback 拓扑。"}</p>
        </div>
        <span>{batches.length} 个 batch</span>
      </div>
      <div className="task-graph-dag-panel__lane">
        {batches.map((batch, batchIndex) => (
          <article className="task-graph-batch-card" key={batch.batchKey}>
            <div className="task-graph-batch-card__top">
              <span>{String(batchIndex + 1).padStart(2, "0")}</span>
              <strong>{batch.batchKey}</strong>
              <em>{displayStatus(batch.batchStatus || "PENDING")}</em>
            </div>
            <div className="task-graph-batch-card__meta">
              <span>{batch.executionMode}</span>
              <span>{batch.failurePolicy || "STEP_FALLBACK_TO_MOCK"}</span>
              {typeof batch.durationMs === "number" ? <span>{batch.durationMs}ms</span> : null}
            </div>
            <div className="task-graph-batch-card__deps">
              依赖：{batch.dependsOnBatchKeys.length > 0 ? batch.dependsOnBatchKeys.join(", ") : "无"}
            </div>
            <div className="task-graph-step-list">
              {batch.stepOrders.map((stepOrder) => {
                const step = stepsByOrder.get(stepOrder);
                if (!step) {
                  return (
                    <span className="task-graph-step-chip task-graph-step-chip--missing" key={stepOrder}>
                      Step {stepOrder} 缺失
                    </span>
                  );
                }
                const qualityGateAction = getStepQualityGateAction(step);
                return (
                  <span
                    className={`task-graph-step-chip ${qualityGateAction ? "task-graph-step-chip--blocked" : ""}`}
                    key={stepOrder}
                    title={step.routingReason || step.taskDescription}
                  >
                    Step {step.stepOrder} - {getStepAgentName(step, agentNameMap)} - {displayStatus(step.status)}
                  </span>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewerGateRetryPanel({ taskRun }: { taskRun: TaskRun }) {
  const blockedSteps = taskRun.steps
    .map((step) => ({ step, action: getStepQualityGateAction(step) }))
    .filter((item): item is { step: TaskStep; action: NonNullable<ReturnType<typeof getStepQualityGateAction>> } =>
      Boolean(item.action)
    );
  const isBlockedRun = taskRun.status === "BLOCKED";

  if (!isBlockedRun && blockedSteps.length === 0) {
    return null;
  }

  const decisionLog = taskRun.orchestratorDecisionLog;

  return (
    <section className="reviewer-gate-retry-panel" data-testid="reviewer-gate-retry-panel" aria-label="Reviewer 重试策略">
      <div className="reviewer-gate-retry-panel__header">
        <div>
          <strong>Reviewer Gate / 重试策略</strong>
          <p>{"失败原因 -> 修订产物 -> 重新 build/lint/test -> 重新 Reviewer。"}</p>
        </div>
        <span>{displayStatus(taskRun.status)}</span>
      </div>
      {decisionLog?.fallbackDecision ? (
        <div className="reviewer-gate-retry-panel__decision">{decisionLog.fallbackDecision}</div>
      ) : null}
      <div className="reviewer-gate-retry-panel__steps">
        {["检查阻断项", "修订产物", "重跑 build/lint/test", "重跑 Reviewer"].map((label, index) => (
          <span key={label}>
            {index + 1}. {label}
          </span>
        ))}
      </div>
      {blockedSteps.length > 0 ? (
        <div className="reviewer-gate-retry-panel__blockers">
          {blockedSteps.map(({ step, action }) => (
            <article key={formatId(step.id)}>
              <strong>Step {step.stepOrder}: {action.title}</strong>
              <p>{action.reason}</p>
              <small>{action.nextStep}</small>
            </article>
          ))}
        </div>
      ) : (
        <p className="reviewer-gate-retry-panel__empty">
          TaskRun 被 Reviewer 阻断。请查看 Review Report 和 Action Audit 定位详细阻断项。
        </p>
      )}
    </section>
  );
}

export function OrchestratorExplainDetails({
  taskRun,
  taskSpec,
  producedArtifacts,
  agentNameMap
}: OrchestratorExplainDetailsProps) {
  const fallbackCount = countFallbackSteps(taskRun);
  const expectedArtifacts = taskSpec?.expectedArtifacts ?? [];
  const requiredSkills = taskSpec?.requiredSkills ?? [];
  const parallelExecutionGroups = getParallelExecutionGroups(taskRun);
  const hasParallelExecution = parallelExecutionGroups.length > 0;
  const plannerDisplay = getPlannerDisplay(taskRun, hasParallelExecution);
  const decisionLog = taskRun.orchestratorDecisionLog ?? null;
  const acceptedRealOutputs = taskRun.steps.filter((step) => step.realAdapterOutcome === "ACCEPTED").length;
  const approvalAuditSummary =
    taskRun.status === "BLOCKED"
      ? "当前任务被质量门禁阻断，后续修复应走 Revision / Approval / Audit 链路。"
      : "高风险操作继续由 ApprovalRequest 和 ActionAuditLog 记录，TaskRun 只展示执行事实。";
  const decisionHighlights = [
    {
      label: "Planner",
      value: decisionLog?.decisionMode || plannerDisplay.label,
      detail: decisionLog?.plannerDecision || plannerDisplay.plannerReasoning || taskRun.taskPlan?.goal || "规则化计划已生成。"
    },
    {
      label: "Router",
      value: `${taskRun.steps.length} steps`,
      detail: decisionLog?.routingDecision || "按 selectedAgent、mentionedAgents、tool capability 与 adapter health 路由。"
    },
    {
      label: "Executor",
      value: hasParallelExecution ? "并行 batch" : "顺序执行",
      detail: decisionLog?.executionDecision || "执行层记录 adapter、fallback、build validation 与 step runtime。"
    },
    {
      label: "Aggregator",
      value: `${producedArtifacts.length} artifacts`,
      detail: decisionLog?.aggregationDecision || taskRun.resultSummary || "聚合产物、协作消息与最终摘要。"
    },
    {
      label: "Fallback",
      value: `${fallbackCount} fallback`,
      detail: decisionLog?.fallbackDecision || `${acceptedRealOutputs} 个真实 Adapter 输出被采纳，其余保持静态 / MOCK 兜底。`
    },
    {
      label: "Approval / Audit",
      value: displayStatus(taskRun.status),
      detail: approvalAuditSummary
    }
  ];

  return (
    <section className="orchestrator-explain-panel" data-testid="orchestrator-explain-panel" aria-label="Orchestrator 决策链">
      <div className="orchestrator-explain-panel__header">
        <div>
          <strong>Orchestrator 决策链</strong>
          <p>{decisionLog?.summary || plannerDisplay.description}</p>
        </div>
        <span className="orchestrator-mode-pill">
          {decisionLog?.decisionMode || plannerDisplay.label}
        </span>
      </div>

      <div className="orchestrator-decision-rail" aria-label="Planner Router Executor Aggregator Fallback Approval Audit">
        {decisionHighlights.map((item, index) => (
          <article className="orchestrator-decision-rail__item" key={item.label}>
            <span>{String(index + 1).padStart(2, "0")} / {item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </div>

      <TaskGraphDAGPanel taskRun={taskRun} agentNameMap={agentNameMap} />
      <ReviewerGateRetryPanel taskRun={taskRun} />

      <div className="orchestrator-stage-grid">
        <article className="orchestrator-stage-card">
          <span className="orchestrator-stage-card__label">Planner</span>
          <strong>拆解任务</strong>
          <p>{decisionLog?.plannerDecision || taskRun.taskPlan?.goal || taskSpec?.userGoal || "基于用户消息生成 Task 计划。"}</p>
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
                  {parseRoutingEvidence(step.routingReason).length > 0 ? (
                    <div className="orchestrator-route-evidence" data-testid="orchestrator-route-evidence">
                      {parseRoutingEvidence(step.routingReason).map(([key, value]) => (
                        <span key={`${step.stepOrder}-${key}`}>
                          {displayRoutingKey(key)}：<strong>{value}</strong>
                        </span>
                      ))}
                    </div>
                  ) : null}
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
