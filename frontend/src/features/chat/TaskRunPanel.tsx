import type { Artifact } from "../artifacts/artifactTypes";
import type { Agent } from "../agents/agentTypes";
import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

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
