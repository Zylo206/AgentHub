import type { AdapterDescriptor, Agent } from "./agentTypes";

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
  fallbackPenaltyScore: number;
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
  const fallbackPenaltyScore = routeAttempts === 0 ? 0 : (adapter.fallbackRate ?? 0) * 100;
  const preferredBonusScore = adapter.adapterType === preferredAdapterType ? 100 : 0;
  const totalScore = Math.max(
    0,
    health * 0.4 + successRateScore * 0.25 - fallbackPenaltyScore * 0.2 + preferredBonusScore * 0.15
  );

  return {
    adapterType: adapter.adapterType,
    status: adapter.status,
    totalScore,
    healthScore: health,
    successRateScore,
    fallbackPenaltyScore,
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
          <strong>Adapter 路由解释</strong>
          <span>暂无候选池</span>
        </div>
        <p>后端暂未返回 Adapter 状态，路由会继续依赖 MOCK fallback。</p>
      </section>
    );
  }

  return (
    <section className="adapter-routing-panel" aria-label="Adapter 路由解释">
      <div className="adapter-routing-panel__header">
        <div>
          <strong>Adapter 路由解释</strong>
          <p>候选池按 health 40% / success rate 25% / fallback penalty 20% / preferred bonus 15% 评分。</p>
        </div>
        <span className="adapter-routing-panel__selected">
          selected {selectedCandidate?.adapterType || "MOCK"}
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
              <strong>{candidate.adapterType}</strong>
              <span>{candidate.status}</span>
            </div>
            <div className="adapter-routing-card__score">{candidate.totalScore.toFixed(1)}</div>
            <div className="adapter-routing-card__metrics">
              <span>health {candidate.healthScore.toFixed(0)}</span>
              <span>success {candidate.successRateScore.toFixed(0)}</span>
              <span>fallback penalty {candidate.fallbackPenaltyScore.toFixed(0)}</span>
              <span>preferred bonus {candidate.preferredBonusScore.toFixed(0)}</span>
              <span>attempts {candidate.routeAttempts}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
