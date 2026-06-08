import type { Artifact } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import { buildDiffSummary } from "./artifactLineage";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";

export type ArtifactCockpitTone = "success" | "warning" | "danger" | "neutral";
export type ArtifactBadgeTone = "success" | "warning" | "danger" | "neutral";

export interface ArtifactDiagnosticEntry {
  label: string;
  value: string;
  tone: ArtifactBadgeTone;
  summary: string;
  detail: string;
}

interface ArtifactGateAction {
  title: string;
  reason: string;
  nextStep: string;
}

interface ArtifactDeliveryWorkbenchProps {
  artifact: Artifact;
  allArtifacts: Artifact[];
  snapshots: ArtifactSnapshot[];
  deployments: DeploymentRecord[];
  fallbackReason: string | null;
  gateAction: ArtifactGateAction | null;
  cockpitTone: ArtifactCockpitTone;
  diagnostics: ArtifactDiagnosticEntry[];
  cockpitLabel: string;
  cockpitDescription: string;
  sourceDescription: string;
  qualityDescription: string;
  sourceBadgeTone: ArtifactBadgeTone;
  qualityBadgeTone: ArtifactBadgeTone;
  buildBadgeTone: ArtifactBadgeTone;
  buildValidationLabel: string;
  qualityScoreLabel: string;
  sizeLabel: string;
}

export function ArtifactDeliveryWorkbench({
  artifact,
  allArtifacts,
  snapshots,
  deployments,
  fallbackReason,
  gateAction,
  cockpitTone,
  diagnostics,
  cockpitLabel,
  cockpitDescription,
  sourceDescription,
  qualityDescription,
  sourceBadgeTone,
  qualityBadgeTone,
  buildBadgeTone,
  buildValidationLabel,
  qualityScoreLabel,
  sizeLabel
}: ArtifactDeliveryWorkbenchProps) {
  const latestDeployment = deployments[0] ?? null;
  const latestSnapshot = snapshots[0] ?? null;
  const diffSummary = buildDiffSummary(allArtifacts, artifact);

  return (
    <>
      <section className={`artifact-cockpit artifact-cockpit--${cockpitTone}`} data-testid="artifact-cockpit">
        <div className="artifact-cockpit__hero">
          <div>
            <span className="artifact-cockpit__eyebrow">交付概览</span>
            <strong>{cockpitLabel}</strong>
            <p>{sanitizeProductionText(cockpitDescription)}</p>
          </div>
          <span className="artifact-cockpit__status">
            {sanitizeProductionText(artifact.realAdapterOutcome || "本地预览结果")}
          </span>
        </div>

        <div className="artifact-cockpit__grid">
          <article>
            <span>产物来源</span>
            <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
            <small>
              {artifact.sourceAdapterType ? displayAdapterName(artifact.sourceAdapterType) : "无外部 Adapter"} /{" "}
              {sanitizeProductionText(artifact.generationMode || "本地静态")}
            </small>
          </article>
          <article>
            <span>质量门禁</span>
            <strong>{sanitizeProductionText(artifact.qualityStatus || "未评估")}</strong>
            <small>评分 {qualityScoreLabel}</small>
          </article>
          <article>
            <span>构建校验</span>
            <strong>{buildValidationLabel}</strong>
            <small>{sanitizeProductionText(artifact.buildValidationReason || "暂无失败原因")}</small>
          </article>
          <article>
            <span>内容体量</span>
            <strong>{sizeLabel}</strong>
            <small>
              {displayArtifactType(artifact.type)} / {artifact.language || "plain"}
            </small>
          </article>
          <article>
            <span>安全快照</span>
            <strong>{snapshots.length} 条</strong>
            <small>{latestSnapshot ? `最近：${latestSnapshot.operationType}` : "尚未创建快照"}</small>
          </article>
          <article>
            <span>预览发布</span>
            <strong>{deployments.length} 条</strong>
            <small>{latestDeployment ? displayStatus(latestDeployment.status) : "尚未生成预览"}</small>
          </article>
        </div>
      </section>

      <section className="artifact-delivery-workbench" data-testid="artifact-delivery-workbench">
        <div className="artifact-badge-system" aria-label="Artifact source and quality badges">
          <div className={`artifact-explain-badge artifact-explain-badge--${sourceBadgeTone}`}>
            <span>来源</span>
            <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
            <small>{sanitizeProductionText(sourceDescription)}</small>
          </div>
          <div className={`artifact-explain-badge artifact-explain-badge--${qualityBadgeTone}`}>
            <span>质量</span>
            <strong>{sanitizeProductionText(artifact.qualityStatus || artifact.realAdapterOutcome || "未评估")}</strong>
            <small>{sanitizeProductionText(qualityDescription)}</small>
          </div>
          <div className={`artifact-explain-badge artifact-explain-badge--${buildBadgeTone}`}>
            <span>构建</span>
            <strong>{buildValidationLabel}</strong>
            <small>{sanitizeProductionText(artifact.buildValidationReason || "暂无构建失败原因")}</small>
          </div>
        </div>

        <details className="artifact-diagnostic-panel" open={Boolean(gateAction || fallbackReason)}>
          <summary>
            <span>诊断面板</span>
            <strong>来源、质量、构建和备用路径诊断</strong>
          </summary>
          <div className="artifact-diagnostic-panel__grid">
            {diagnostics.map((item) => (
              <article className={`artifact-diagnostic-item artifact-diagnostic-item--${item.tone}`} key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{sanitizeProductionText(item.value)}</strong>
                </div>
                <p>{sanitizeProductionText(item.summary)}</p>
                <small>{sanitizeProductionText(item.detail)}</small>
              </article>
            ))}
          </div>
        </details>

        <div className="artifact-operation-deck" data-testid="artifact-operation-deck">
          <article className="artifact-risk-card artifact-risk-card--diff">
            <span>Diff 风险摘要</span>
            <strong>
              {diffSummary.hasRealLineDiff
                ? `+${diffSummary.lineDiffStats.added} / -${diffSummary.lineDiffStats.removed}`
                : "暂无可应用 Diff"}
            </strong>
            <p>
              {diffSummary.hasRealLineDiff
                ? `基于 ${diffSummary.basedOnLabel || "未知父版本"}，风险：${diffSummary.risk}`
                : "初始版本或无行级变化时不需要 Apply Diff。"}
            </p>
          </article>
          <article className="artifact-risk-card artifact-risk-card--restore">
            <span>Snapshot / Restore</span>
            <strong>{snapshots.length} 个检查点</strong>
            <p>Restore 会走 Approval Gate，并生成新的恢复版本，不直接覆盖原产物。</p>
          </article>
          <article className="artifact-risk-card artifact-risk-card--deploy">
            <span>Deploy Preview</span>
            <strong>{deployments.length > 0 ? "已有预览记录" : "尚未生成预览"}</strong>
            <p>当前仅生成本地静态 Preview URL，不代表真实云部署或生产发布。</p>
          </article>
        </div>
      </section>
    </>
  );
}
