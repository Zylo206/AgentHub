import type { Artifact } from "../artifacts/artifactTypes";
import type { StreamingPreviewState, TaskRun, TaskStep } from "./chatTypes";
import { displayArtifactSourceKind, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName, displayExecutionOutcome, sanitizeProductionText } from "../../utils/productionLabels";
import { formatId, getIdValue } from "../../utils/id";
import {
  formatBuildValidationValue,
  formatQualityScore,
  getAdapterDisplay,
  getReviewRetryReviseLabel,
  getStepQualityGateAction,
  summarizeAdapterResponse
} from "./taskRunPanelHelpers";

interface TaskStepListProps {
  taskRun: TaskRun;
  artifacts: Artifact[];
  agentNameMap: Map<string | null, string>;
  selectedTaskStepId: string | null;
  streamingPreviewsByStepId: Record<string, StreamingPreviewState>;
  onSelectStep: (taskRunId: string, step: TaskStep) => void;
}

function formatBuildStatus(value?: string | null): string {
  return sanitizeProductionText(formatBuildValidationValue(value));
}

export function TaskStepList({
  taskRun,
  artifacts,
  agentNameMap,
  selectedTaskStepId,
  streamingPreviewsByStepId,
  onSelectStep
}: TaskStepListProps) {
  return (
    <div className="task-step-list">
      {taskRun.steps.map((step) => {
        const stepId = getIdValue(step.id);
        const isSelectedStep = selectedTaskStepId === stepId;
        const adapterDisplay = getAdapterDisplay(step);
        const assignedAgentId = getIdValue(step.assignedAgentId);
        const assignedAgentName = sanitizeProductionText(agentNameMap.get(assignedAgentId) || step.assignedAgentName || assignedAgentId);
        const stepProducedArtifactIds = new Set(step.producedArtifactIds.map((artifactId) => getIdValue(artifactId)));
        const stepProducedArtifacts = artifacts.filter((artifact) => stepProducedArtifactIds.has(getIdValue(artifact.id)));
        const realAdapterArtifactCount = stepProducedArtifacts.filter(
          (artifact) => artifact.sourceKind === "REAL_ADAPTER"
        ).length;
        const qualityScore = formatQualityScore(step.artifactQualityScore);
        const buildValidationStatus = formatBuildStatus(step.artifactBuildValidationStatus);
        const reviewRetryReviseState = sanitizeProductionText(getReviewRetryReviseLabel(step));
        const streamingPreview = streamingPreviewsByStepId[stepId] || null;
        const qualityGateAction = getStepQualityGateAction(step);

        return (
          <button
            type="button"
            className={`task-step-item ${isSelectedStep ? "task-step-item--selected" : ""}`}
            data-testid="task-step-item"
            key={formatId(step.id)}
            onClick={() => onSelectStep(getIdValue(taskRun.id), step)}
          >
            <div className="task-step-item__row">
              <span className="task-step-item__order">步骤 {step.stepOrder}</span>
              <span className={`status-pill status-pill--${normalizeStatusClass(step.status)}`}>
                {displayStatus(step.status)}
              </span>
            </div>
            <div className="task-step-item__description">{sanitizeProductionText(step.taskDescription)}</div>
            <div className="task-step-item__meta step-agent-meta">
              <span>执行 Agent：{assignedAgentName}</span>
              <span>{step.producedArtifactIds.length} 个产物</span>
            </div>
            <div className="step-adapter-meta">
              {adapterDisplay.fallbackUsed ? (
                <div className="step-adapter-fallback">
                  <span className="step-adapter-preferred">首选：{displayAdapterName(adapterDisplay.preferred)}</span>
                  <span className="step-adapter-actual">实际：{displayAdapterName(adapterDisplay.actual)}</span>
                  <span className="step-adapter-status step-adapter-status--fallback">
                    状态：{displayStatus(adapterDisplay.status || "FALLBACK_USED")}
                  </span>
                  <span className="step-adapter-fallback-note">首选 Adapter 不可用，已切换备用路径。</span>
                </div>
              ) : (
                <span className="step-adapter-status">
                  Adapter：{displayAdapterName(adapterDisplay.actual)}
                  {adapterDisplay.status ? ` / ${displayStatus(adapterDisplay.status)}` : ""}
                </span>
              )}
              {step.adapterResponseSummary ? (
                <div className="step-adapter-response">
                  <strong>Adapter 响应：</strong>{" "}
                  {sanitizeProductionText(summarizeAdapterResponse(step.adapterResponseSummary))}
                </div>
              ) : null}
              {streamingPreview ? (
                <div className={`step-streaming-preview step-streaming-preview--${streamingPreview.status.toLowerCase()}`}>
                  <div className="step-streaming-preview__header">
                    <strong>
                      {streamingPreview.status === "STREAMING"
                        ? "流式生成中"
                        : streamingPreview.status === "DISCARDED"
                          ? "已丢弃的部分输出"
                          : "部分输出"}
                    </strong>
                    <span>
                      {displayAdapterName(streamingPreview.adapterType)} / {streamingPreview.chunkCount} 个片段
                    </span>
                  </div>
                  <div>{sanitizeProductionText(summarizeAdapterResponse(streamingPreview.content))}</div>
                  {streamingPreview.finishReason ? (
                    <small>{sanitizeProductionText(streamingPreview.finishReason)}</small>
                  ) : (
                    <small>仅用于实时预览；最终输出通过 Artifact 校验后才会持久化。</small>
                  )}
                </div>
              ) : null}
              <div className="step-generated-artifacts">
                {realAdapterArtifactCount > 0 ? (
                  <span className="artifact-source-badge artifact-source-badge--real-adapter">
                    REAL_ADAPTER 已采纳 / {realAdapterArtifactCount}
                  </span>
                ) : (
                  <span className="artifact-source-badge artifact-source-badge--static-template">
                    本地静态结果
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
                    step.realOutputUsed ? "artifact-source-badge--real-adapter" : "artifact-source-badge--static-template"
                  }`}
                >
                  真实输出：{step.realOutputUsed ? "已采纳" : "未采纳"}
                </span>
                <span className="artifact-source-badge">评审修复链路：{reviewRetryReviseState}</span>
                <span className="artifact-source-badge">解析：{sanitizeProductionText(step.artifactParseStatus || "NOT_ATTEMPTED")}</span>
                <span className="artifact-source-badge">结果：{displayExecutionOutcome(step.realAdapterOutcome)}</span>
                <span className="artifact-source-badge">质量：{sanitizeProductionText(step.artifactQualityStatus || "NOT_EVALUATED")}</span>
                <span className="artifact-source-badge">构建校验：{buildValidationStatus}</span>
                <span className="artifact-source-badge">质量分：{qualityScore}</span>
              </div>
              {step.artifactBuildValidationReason ? (
                <div className="step-adapter-response">
                  <strong>构建校验：</strong> {sanitizeProductionText(step.artifactBuildValidationReason)}
                </div>
              ) : null}
              {step.artifactQualityReason ? (
                <div className="step-adapter-response">
                  <strong>产物质量：</strong> {sanitizeProductionText(step.artifactQualityReason)}
                </div>
              ) : null}
              {qualityGateAction ? (
                <div className="quality-gate-action">
                  <strong>{qualityGateAction.title}</strong>
                  <p>失败原因：{sanitizeProductionText(qualityGateAction.reason)}</p>
                  <p>修复路径：{sanitizeProductionText(qualityGateAction.nextStep)}</p>
                </div>
              ) : null}
              {step.adapterErrorMessage ? (
                <div className="step-adapter-error">{sanitizeProductionText(step.adapterErrorMessage)}</div>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
