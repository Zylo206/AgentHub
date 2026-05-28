import type { Artifact } from "./artifactTypes";
import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import { buildDiffSummary } from "./artifactLineage";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { displayArtifactSourceKind, displayArtifactType, displayStatus } from "../../utils/displayLabels";

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
      <section
        className={`artifact-cockpit artifact-cockpit--${cockpitTone}`}
        data-testid="artifact-cockpit"
      >
        <div className="artifact-cockpit__hero">
          <div>
            <span className="artifact-cockpit__eyebrow">Artifact Cockpit</span>
            <strong>{cockpitLabel}</strong>
            <p>{cockpitDescription}</p>
          </div>
          <span className="artifact-cockpit__status">
            {artifact.realAdapterOutcome || "FALLBACK"}
          </span>
        </div>
        <div className="artifact-cockpit__grid">
          <article>
            <span>产物来源</span>
            <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
            <small>{artifact.sourceAdapterType || "无外部 Adapter"} / {artifact.generationMode || "STATIC"}</small>
          </article>
          <article>
            <span>质量门禁</span>
            <strong>{artifact.qualityStatus || "NOT_EVALUATED"}</strong>
            <small>Score {qualityScoreLabel}</small>
          </article>
          <article>
            <span>构建校验</span>
            <strong>{buildValidationLabel}</strong>
            <small>{artifact.buildValidationReason || "暂无失败原因"}</small>
          </article>
          <article>
            <span>内容体量</span>
            <strong>{sizeLabel}</strong>
            <small>{displayArtifactType(artifact.type)} / {artifact.language || "plain"}</small>
          </article>
          <article>
            <span>安全快照</span>
            <strong>{snapshots.length} 条</strong>
            <small>{latestSnapshot ? `最近：${latestSnapshot.operationType}` : "尚未创建快照"}</small>
          </article>
          <article>
            <span>预览发布</span>
            <strong>{deployments.length} 条</strong>
            <small>{latestDeployment ? displayStatus(latestDeployment.status) : "尚未部署预览"}</small>
          </article>
        </div>
        <div className="artifact-cockpit__handoff" data-testid="artifact-cockpit-handoff">
          <div>
            <span>下一步建议</span>
            <strong>
              {gateAction
                ? "先修复门禁问题"
                : artifact.sourceKind === "REAL_ADAPTER"
                  ? "可进入审批 / 预览"
                  : "建议生成真实或修订版本"}
            </strong>
            <p>
              {gateAction?.nextStep ||
                (artifact.sourceKind === "REAL_ADAPTER"
                  ? "该产物已通过当前来源与质量观测链路，可继续执行 Apply Diff、Deploy Preview 或保存为交付候选。"
                  : "当前产物仍属于静态 / fallback 路径，适合演示和兜底；如需交付，请优先通过 Revision 或真实 Adapter 输出生成新版本。")}
            </p>
          </div>
          <ol className="artifact-cockpit__flow" aria-label="Artifact delivery flow">
            <li className={artifact.sourceKind === "REAL_ADAPTER" ? "is-active" : ""}>真实输出</li>
            <li className={!gateAction || !gateAction.title.includes("Quality") ? "is-active" : ""}>质量门禁</li>
            <li className={!gateAction || !gateAction.title.includes("Build") ? "is-active" : ""}>构建校验</li>
            <li className={deployments.length > 0 ? "is-active" : ""}>预览发布</li>
          </ol>
        </div>
      </section>

      <section className="artifact-delivery-workbench" data-testid="artifact-delivery-workbench">
        <div className="artifact-badge-system" aria-label="Artifact source and quality badges">
          <div className={`artifact-explain-badge artifact-explain-badge--${sourceBadgeTone}`}>
            <span>来源</span>
            <strong>{displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</strong>
            <small>{sourceDescription}</small>
          </div>
          <div className={`artifact-explain-badge artifact-explain-badge--${qualityBadgeTone}`}>
            <span>质量</span>
            <strong>{artifact.qualityStatus || artifact.realAdapterOutcome || "NOT_EVALUATED"}</strong>
            <small>{qualityDescription}</small>
          </div>
          <div className={`artifact-explain-badge artifact-explain-badge--${buildBadgeTone}`}>
            <span>构建</span>
            <strong>{buildValidationLabel}</strong>
            <small>{artifact.buildValidationReason || "暂无构建失败原因。"}</small>
          </div>
        </div>

        <details className="artifact-diagnostic-panel" open={Boolean(gateAction || fallbackReason)}>
          <summary>
            <span>诊断面板</span>
            <strong>来源、质量、构建和 fallback 诊断</strong>
          </summary>
          <div className="artifact-diagnostic-panel__grid">
            {diagnostics.map((item) => (
              <article className={`artifact-diagnostic-item artifact-diagnostic-item--${item.tone}`} key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
                <p>{item.summary}</p>
                <small>{item.detail}</small>
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
            <strong>{snapshots.length} 个安全检查点</strong>
            <p>Restore 会走 Approval Gate，并生成新的恢复版本，不会直接覆盖原产物。</p>
          </article>
          <article className="artifact-risk-card artifact-risk-card--deploy">
            <span>Deploy Preview</span>
            <strong>{deployments.length > 0 ? "已有发布记录" : "尚未发布"}</strong>
            <p>当前仅生成本地静态 Preview URL，不代表真实云部署或生产发布。</p>
          </article>
        </div>
      </section>
    </>
  );
}
