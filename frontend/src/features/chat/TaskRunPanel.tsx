import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { formatId, getIdValue } from "../../utils/id";

interface TaskRunPanelProps {
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

export function TaskRunPanel({
  taskSpecs,
  taskRuns,
  loading,
  selectedTaskRunId,
  selectedTaskStepId,
  onSelectStep
}: TaskRunPanelProps) {
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
              <div className="task-step-list">
                {taskRun.steps.map((step) => {
                  const stepId = getIdValue(step.id);
                  const isSelectedStep = selectedTaskStepId === stepId;

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
                      <div className="task-step-item__meta">
                        Agent {getIdValue(step.assignedAgentId)} / {step.producedArtifactIds.length} artifacts
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
