import type { Artifact } from "../artifacts/artifactTypes";
import type { Agent } from "../agents/agentTypes";
import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { formatId, getIdValue } from "../../utils/id";

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

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, "-");
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
    return <div className="task-panel__empty">Loading task runs...</div>;
  }

  if (taskRuns.length === 0) {
    return (
      <div className="task-panel__empty">
        No task runs yet. Run the demo task to populate this panel.
      </div>
    );
  }

  return (
    <div className="task-panel">
      <div className="task-panel__header">
        <div>
          <h3>Task Runs</h3>
          <p>
            {taskSpecs.length} TaskSpec / {taskRuns.length} TaskRun
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
                <span className={`status-pill status-pill--${normalizeStatus(taskRun.status)}`}>
                  {taskRun.status}
                </span>
              </div>
              <div className="task-run-card__goal">
                {taskRun.taskPlan?.goal || "No task plan goal available."}
              </div>
              {revisionOrigin ? (
                <div className="revision-origin task-run-card__revision">
                  <strong>Revision TaskRun</strong>
                  <span>
                    Based on artifact:{" "}
                    {revisionOrigin.parentArtifact
                      ? `${revisionOrigin.parentArtifact.title} v${revisionOrigin.parentArtifact.version}`
                      : "previous artifact"}
                  </span>
                  {revisionOrigin.artifact.revisionInstruction ? (
                    <p>Instruction: {revisionOrigin.artifact.revisionInstruction}</p>
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
                        <span className="task-step-item__order">Step {step.stepOrder}</span>
                        <span className={`status-pill status-pill--${normalizeStatus(step.status)}`}>
                          {step.status}
                        </span>
                      </div>
                      <div className="task-step-item__description">{step.taskDescription}</div>
                      <div className="task-step-item__meta step-agent-meta">
                        <span>Assigned Agent: {assignedAgentName}</span>
                        <span>{step.producedArtifactIds.length} artifacts</span>
                      </div>
                      <div className="step-adapter-meta">
                        {adapterDisplay.fallbackUsed ? (
                          <div className="step-adapter-fallback">
                            <span className="step-adapter-preferred">
                              Preferred: {adapterDisplay.preferred}
                            </span>
                            <span className="step-adapter-actual">
                              Actual: {adapterDisplay.actual}
                            </span>
                            <span className="step-adapter-status step-adapter-status--fallback">
                              Status: {adapterDisplay.status || "FALLBACK_USED"}
                            </span>
                          </div>
                        ) : (
                          <span className="step-adapter-status">
                            Adapter: {adapterDisplay.actual || "not recorded"}
                            {adapterDisplay.status ? ` · ${adapterDisplay.status}` : ""}
                          </span>
                        )}
                        {step.adapterResponseSummary ? (
                          <div className="step-adapter-response">
                            <strong>Adapter Response:</strong> {summarizeAdapterResponse(step.adapterResponseSummary)}
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
