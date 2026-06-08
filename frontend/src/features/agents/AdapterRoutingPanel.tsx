import type { AdapterDescriptor, Agent } from "./agentTypes";
import { displayStatus } from "../../utils/displayLabels";
import { displayAdapterName } from "../../utils/productionLabels";

interface AdapterRoutingPanelProps {
  adapterDescriptors: AdapterDescriptor[];
  selectedAgent: Agent | null;
}

interface AdapterCandidateView {
  adapterType: string;
  status: string;
  totalScore: number;
  healthScore: number;
  successRateScore: number;
  backupPenaltyScore: number;
  preferredBonusScore: number;
  routeAttempts: number;
}

function healthScore(adapter: AdapterDescriptor): number {
  if (!adapter.enabled) {
    return 0;
  }

  switch (adapter.status) {
    case "AVAILABLE":
      return 100;
    case "PLACEHOLDER":
      return 55;
    case "MISCONFIGURED":
      return 20;
    case "ERROR":
      return 10;
    case "DISABLED":
    default:
      return 0;
  }
}

function buildCandidate(adapter: AdapterDescriptor, preferredAdapterType: string): AdapterCandidateView {
  const routeAttempts = adapter.routeAttempts ?? 0;
  const health = healthScore(adapter);
  const successRateScore = routeAttempts === 0 ? 50 : (adapter.successRate ?? 0) * 100;
  const backupPenaltyScore = routeAttempts === 0 ? 0 : (adapter.fallbackRate ?? 0) * 100;
  const preferredBonusScore = adapter.adapterType === preferredAdapterType ? 100 : 0;
  const totalScore = Math.max(
    0,
    health * 0.4 + successRateScore * 0.25 - backupPenaltyScore * 0.2 + preferredBonusScore * 0.15
  );

  return {
    adapterType: adapter.adapterType,
    status: adapter.status,
    totalScore,
    healthScore: health,
    successRateScore,
    backupPenaltyScore,
    preferredBonusScore,
    routeAttempts
  };
}

export function AdapterRoutingPanel({ adapterDescriptors, selectedAgent }: AdapterRoutingPanelProps) {
  const preferredAdapterType = selectedAgent?.preferredAdapterType || "MOCK";
  const candidates = adapterDescriptors
    .map((adapter) => buildCandidate(adapter, preferredAdapterType))
    .sort((left, right) => right.totalScore - left.totalScore);
  const selectedCandidate = candidates[0] ?? null;

  if (adapterDescriptors.length === 0) {
    return (
      <section className="adapter-routing-panel">
        <div className="adapter-routing-panel__header">
          <strong>Adapter 路由说明</strong>
          <span>暂无候选通道</span>
        </div>
        <p>后端暂未返回 Adapter 状态，路由会使用本地备用能力保证链路可用。</p>
      </section>
    );
  }

  return (
    <section className="adapter-routing-panel" aria-label="Adapter 路由说明">
      <div className="adapter-routing-panel__header">
        <div>
          <strong>Adapter 路由说明</strong>
          <p>按健康度、成功率、备用路径比例和首选权重综合评分。</p>
        </div>
        <span className="adapter-routing-panel__selected">
          当前选择 {displayAdapterName(selectedCandidate?.adapterType)}
        </span>
      </div>

      <div className="adapter-routing-panel__grid">
        {candidates.map((candidate) => (
          <article
            className={`adapter-routing-card ${
              candidate.adapterType === selectedCandidate?.adapterType ? "adapter-routing-card--selected" : ""
            }`}
            key={candidate.adapterType}
          >
            <div className="adapter-routing-card__topline">
              <strong>{displayAdapterName(candidate.adapterType)}</strong>
              <span>{displayStatus(candidate.status)}</span>
            </div>
            <div className="adapter-routing-card__score">{candidate.totalScore.toFixed(1)}</div>
            <div className="adapter-routing-card__metrics">
              <span>健康 {candidate.healthScore.toFixed(0)}</span>
              <span>成功 {candidate.successRateScore.toFixed(0)}</span>
              <span>备用扣分 {candidate.backupPenaltyScore.toFixed(0)}</span>
              <span>首选加权 {candidate.preferredBonusScore.toFixed(0)}</span>
              <span>尝试 {candidate.routeAttempts}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
