import type { Artifact } from "./artifactTypes";
import type { DeploymentRecord } from "../deployments/deploymentTypes";
import { displayArtifactSourceKind, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

interface ArtifactDeployPanelProps {
  artifact: Artifact;
  deployments: DeploymentRecord[];
  deployingArtifact: boolean;
  onCreateDeployment: () => void;
  onCopyPreviewUrl: (previewUrl: string) => void;
  onDownloadBundle: () => void;
}

export function ArtifactDeployPanel({
  artifact,
  deployments,
  deployingArtifact,
  onCreateDeployment,
  onCopyPreviewUrl,
  onDownloadBundle
}: ArtifactDeployPanelProps) {
  return (
    <div className="deploy-status-box" data-testid="deploy-status-box">
      <div className="artifact-revision-box__header">
        <strong>Deploy Status</strong>
        <span>静态站点预览</span>
      </div>
      <button
        type="button"
        className="primary-button artifact-revision-box__button"
        disabled={deployingArtifact}
        onClick={onCreateDeployment}
      >
        {deployingArtifact ? "部署中..." : "部署选中产物"}
      </button>
      <button
        type="button"
        className="secondary-button artifact-revision-box__button"
        onClick={onDownloadBundle}
      >
        下载源码包
      </button>
      {deployments.length === 0 ? (
        <div className="deploy-status-empty">
          暂无部署记录。部署该产物后会生成静态预览链接。
        </div>
      ) : (
        <div className="deploy-status-list release-panel-list">
          {deployments.map((deployment) => (
            <div className="deploy-status-card release-panel" data-testid="deploy-status-card" key={deployment.deploymentId}>
              <div className="deploy-status-card__row release-panel__header">
                <div>
                  <span className="release-panel__eyebrow">发布面板</span>
                  <strong>{deployment.artifactTitle}</strong>
                  <p>产物 v{artifact.version} · {displayArtifactSourceKind(artifact.sourceKind || "STATIC_TEMPLATE")}</p>
                </div>
                <span className={`status-pill status-pill--${normalizeStatusClass(deployment.status)}`}>
                  {displayStatus(deployment.status)}
                </span>
              </div>
              <div className="deploy-status-card__meta release-panel__meta">
                <span>目标：{deployment.deployTarget}</span>
                <span>ID: {deployment.deploymentId}</span>
                <span>审计：部署审批与执行会写入 Action Audit</span>
                <span>{new Date(deployment.createdAt).toLocaleString()}</span>
              </div>
              <a
                className="deploy-preview-link"
                href={deployment.previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                {deployment.previewUrl}
              </a>
              <div className="deploy-status-card__actions">
                <a
                  className="primary-button deploy-status-card__button"
                  href={deployment.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开预览
                </a>
                <button
                  type="button"
                  className="secondary-button deploy-status-card__button"
                  onClick={() => {
                    onCopyPreviewUrl(deployment.previewUrl);
                  }}
                >
                  复制 URL
                </button>
                <button
                  type="button"
                  className="secondary-button deploy-status-card__button"
                  onClick={onDownloadBundle}
                >
                  下载源码包
                </button>
              </div>
              <p>{deployment.message}</p>
              <div className="release-panel__boundary">
                后端静态预览服务，无需外部部署平台。
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
