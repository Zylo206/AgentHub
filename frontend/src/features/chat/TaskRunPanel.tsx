import type { Artifact } from "../artifacts/artifactTypes";
import type { Agent } from "../agents/agentTypes";
import type {
  StreamingPreviewState,
  TaskRun,
  TaskRunObservabilitySummary,
  TaskSpec,
  TaskStep
} from "./chatTypes";
import { AdapterRoutingExplainPanel } from "./AdapterRoutingExplainPanel";
import { OrchestratorExplainDetails } from "./OrchestratorExplainDetails";
import { TaskRunSummaryStrip } from "./TaskRunSummaryStrip";
import { TaskStepList } from "./TaskStepList";
import {
  getProducedArtifactsForRun,
  getRevisionOrigin,
  getTaskSpecForRun
} from "./taskRunPanelHelpers";
import { formatId, getIdValue } from "../../utils/id";
import { displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { sanitizeProductionText } from "../../utils/productionLabels";

interface TaskRunPanelProps {
  agents: Agent[];
  artifacts: Artifact[];
  taskSpecs: TaskSpec[];
  taskRuns: TaskRun[];
  loading: boolean;
  selectedTaskRunId: string | null;
  selectedTaskStepId: string | null;
  observabilitySummary?: TaskRunObservabilitySummary | null;
  streamingPreviewsByStepId?: Record<string, StreamingPreviewState>;
  onSelectStep: (taskRunId: string, step: TaskStep) => void;
  onCancelTaskRun?: (taskRunId: string) => Promise<void>;
  onStopTaskRun?: (taskRunId: string) => Promise<void>;
}

function TaskRunControlRow({
  taskRun,
  onCancelTaskRun,
  onStopTaskRun
}: {
  taskRun: TaskRun;
  onCancelTaskRun?: (taskRunId: string) => Promise<void>;
  onStopTaskRun?: (taskRunId: string) => Promise<void>;
}) {
  const taskRunId = getIdValue(taskRun.id);
  const canControlRun = ["PENDING", "RUNNING"].includes(taskRun.status);

  return (
    <div className="task-run-control-row">
      <span className="task-run-control-row__hint">
        Stop 会停止继续写入后续结果；Cancel 会丢弃迟到输出。已完成任务不可再次控制。
      </span>
      <button
        type="button"
        className="secondary-button"
        data-testid="stop-run-button"
        disabled={!canControlRun || !onStopTaskRun}
        onClick={() => {
          void onStopTaskRun?.(taskRunId);
        }}
      >
        停止
      </button>
      <button
        type="button"
        className="secondary-button"
        data-testid="cancel-run-button"
        disabled={!canControlRun || !onCancelTaskRun}
        onClick={() => {
          void onCancelTaskRun?.(taskRunId);
        }}
      >
        取消
      </button>
    </div>
  );
}

function TaskRunExplainDisclosure({
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
  return (
    <details className="agenthub-disclosure task-run-explain-details" data-testid="task-run-explain-details">
      <summary>
        <span>Explain / 高级证据</span>
        <small>Planner、Router、Executor、Aggregator、备用路径、TaskGraph 和 Adapter 评分</small>
      </summary>
      <OrchestratorExplainDetails
        taskRun={taskRun}
        taskSpec={taskSpec}
        producedArtifacts={producedArtifacts}
        agentNameMap={agentNameMap}
      />
      <AdapterRoutingExplainPanel taskRun={taskRun} />
    </details>
  );
}

function RejectionRecoveryPanel({
  taskRuns,
  artifacts
}: {
  taskRuns: TaskRun[];
  artifacts: Artifact[];
}) {
  const blockedRuns = taskRuns.filter((taskRun) => String(taskRun.status).toUpperCase() === "BLOCKED");
  const rejectedArtifacts = artifacts.filter((artifact) => String(artifact.qualityStatus || "").toUpperCase() === "REJECTED");
  const acceptedReviewArtifacts = artifacts.filter(
    (artifact) =>
      String(artifact.type || "").toUpperCase() === "REVIEW_REPORT" &&
      String(artifact.status || "").toUpperCase() === "ACCEPTED"
  );
  const revisionArtifacts = artifacts.filter((artifact) => artifact.parentArtifactId || artifact.revisionInstruction);
  const latestRejectedArtifact = rejectedArtifacts.length > 0 ? rejectedArtifacts[rejectedArtifacts.length - 1] : null;
  const latestRevisionArtifact = revisionArtifacts.length > 0 ? revisionArtifacts[revisionArtifacts.length - 1] : null;
  const latestAcceptedReviewArtifact = acceptedReviewArtifacts.length > 0
    ? acceptedReviewArtifacts[acceptedReviewArtifacts.length - 1]
    : null;

  if (
    blockedRuns.length === 0 &&
    !latestRejectedArtifact &&
    !latestRevisionArtifact &&
    !latestAcceptedReviewArtifact
  ) {
    return null;
  }

  return (
    <section className="task-run-observability" data-testid="rejection-recovery-panel">
      <div className="task-run-observability__headline">
        <strong>REJECTION / Retry-Recover</strong>
        <span>
          Blocked runs {blockedRuns.length} / Revisions {revisionArtifacts.length} / Accepted reviews{" "}
          {acceptedReviewArtifacts.length}
        </span>
      </div>
      <div className="task-run-observability__grid">
        <div>
          <strong>Latest blocked run</strong>
          <ul>
            {blockedRuns.length > 0 ? (
              blockedRuns.slice(-3).map((taskRun) => (
                <li key={`blocked-${formatId(taskRun.id)}`}>
                  {formatId(taskRun.id)} - {displayStatus(taskRun.status)}
                </li>
              ))
            ) : (
              <li>None</li>
            )}
          </ul>
        </div>
        <div>
          <strong>Retry / revise source</strong>
          <ul>
            {latestRejectedArtifact ? (
              <li>
                {latestRejectedArtifact.title} - {sanitizeProductionText(latestRejectedArtifact.qualityReason)}
              </li>
            ) : (
              <li>None</li>
            )}
            {latestRevisionArtifact ? (
              <li>
                Latest revision: {latestRevisionArtifact.title}
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <strong>Recovery status</strong>
          <ul>
            {latestAcceptedReviewArtifact ? (
              <li>
                Accepted review: {latestAcceptedReviewArtifact.title}
              </li>
            ) : (
              <li>Pending</li>
            )}
          </ul>
        </div>
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
  observabilitySummary,
  streamingPreviewsByStepId = {},
  onSelectStep,
  onCancelTaskRun,
  onStopTaskRun
}: TaskRunPanelProps) {
  const agentNameMap = new Map(agents.map((agent) => [getIdValue(agent.id), agent.name]));

  if (loading && taskRuns.length === 0) {
    return <div className="task-panel__empty">正在加载任务运行记录...</div>;
  }

  if (taskRuns.length === 0) {
    return (
      <div className="task-panel__empty">
        暂无 TaskRun。发送任务消息并确认协作后，执行步骤会显示在这里。
      </div>
    );
  }

  return (
    <div className="task-panel" data-testid="task-run-panel">
      <div className="task-panel__header">
        <div>
          <h3>任务运行</h3>
          <p>
            {taskSpecs.length} 个 TaskSpec / {taskRuns.length} 个 TaskRun
            {loading ? " / 正在同步" : ""}
          </p>
        </div>
      </div>

      {observabilitySummary ? (
        <section className="task-run-observability" data-testid="task-run-observability">
          <div className="task-run-observability__headline">
            <strong>运行诊断</strong>
            <span>
              Retry {observabilitySummary.retryCount} / Fallback {observabilitySummary.fallbackCount} / Conflict{" "}
              {observabilitySummary.conflictTypes.reduce((sum, item) => sum + item.count, 0)} / Approval bypass{" "}
              {observabilitySummary.approvalBypassAttempts}
            </span>
          </div>
          <div className="task-run-observability__grid">
            <div>
              <strong>Top fallback</strong>
              <ul>
                {observabilitySummary.fallbackReasons.length > 0 ? (
                  observabilitySummary.fallbackReasons.map((item) => (
                    <li key={`fallback-${item.label}`}>{item.label} x{item.count}</li>
                  ))
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <strong>Conflict type</strong>
              <ul>
                {observabilitySummary.conflictTypes.length > 0 ? (
                  observabilitySummary.conflictTypes.map((item) => (
                    <li key={`conflict-${item.label}`}>{item.label} x{item.count}</li>
                  ))
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <strong>Discarded result</strong>
              <ul>
                {observabilitySummary.discardedReasons.length > 0 ? (
                  observabilitySummary.discardedReasons.map((item) => (
                    <li key={`discarded-${item.label}`}>{item.label} x{item.count}</li>
                  ))
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <RejectionRecoveryPanel taskRuns={taskRuns} artifacts={artifacts} />

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
              data-testid="task-run-card"
              key={formatId(taskRun.id)}
            >
              <div className="task-run-card__header">
                <div>
                  <strong>{formatId(taskRun.id)}</strong>
                  <p>{sanitizeProductionText(taskRun.resultSummary)}</p>
                </div>
                <span className={`status-pill status-pill--${normalizeStatusClass(taskRun.status)}`}>
                  {displayStatus(taskRun.status)}
                </span>
              </div>

              <TaskRunControlRow
                taskRun={taskRun}
                onCancelTaskRun={onCancelTaskRun}
                onStopTaskRun={onStopTaskRun}
              />

              <div className="task-run-card__goal">
                {sanitizeProductionText(taskRun.taskPlan?.goal) || "暂无任务计划目标。"}
              </div>

              <div className="task-run-card__goal">
                时间线 {taskRun.timeline?.length ?? 0} 条 / Retry {taskRun.retryCount ?? 0}
              </div>

              <TaskRunSummaryStrip taskRun={taskRun} producedArtifacts={producedArtifacts} />

              <TaskRunExplainDisclosure
                taskRun={taskRun}
                taskSpec={activeTaskSpec}
                producedArtifacts={producedArtifacts}
                agentNameMap={agentNameMap}
              />

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
                    <p>修改指令：{sanitizeProductionText(revisionOrigin.artifact.revisionInstruction)}</p>
                  ) : null}
                </div>
              ) : null}

              <TaskStepList
                taskRun={taskRun}
                artifacts={artifacts}
                agentNameMap={agentNameMap}
                selectedTaskStepId={selectedTaskStepId}
                streamingPreviewsByStepId={streamingPreviewsByStepId}
                onSelectStep={onSelectStep}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
