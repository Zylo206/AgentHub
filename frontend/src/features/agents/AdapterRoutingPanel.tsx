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
          <strong>Adapter 路由</strong>
          <span>暂无候选通道</span>
        </div>
        <p>后端还没有返回适配器状态，当前会退回默认稳定通道。</p>
      </section>
    );
  }

  return (
    <section className="adapter-routing-panel" aria-label="Adapter 路由说明">
      <div className="adapter-routing-panel__header">
        <div>
          <strong>Adapter 路由说明</strong>
          <p>这里只解释为什么本次消息优先走某个执行通道，不会改变主聊天链路。</p>
        </div>
        <span className="adapter-routing-panel__selected">当前优先 {displayAdapterName(selectedCandidate?.adapterType)}</span>
      </div>

      <div className="adapter-routing-table" role="table" aria-label="Adapter routing score table">
        <div className="adapter-routing-table__row adapter-routing-table__row--head" role="row">
          <span role="columnheader">Adapter</span>
          <span role="columnheader">状态</span>
          <span role="columnheader">总分</span>
          <span role="columnheader">健康</span>
          <span role="columnheader">成功</span>
          <span role="columnheader">回退</span>
          <span role="columnheader">首选</span>
          <span role="columnheader">尝试</span>
        </div>
        {candidates.map((candidate) => (
          <div
            className={`adapter-routing-table__row ${
              candidate.adapterType === selectedCandidate?.adapterType ? "adapter-routing-table__row--selected" : ""
            }`}
            key={candidate.adapterType}
            role="row"
          >
            <strong role="cell">{displayAdapterName(candidate.adapterType)}</strong>
            <span role="cell">{displayStatus(candidate.status)}</span>
            <span role="cell">{candidate.totalScore.toFixed(1)}</span>
            <span role="cell">{candidate.healthScore.toFixed(0)}</span>
            <span role="cell">{candidate.successRateScore.toFixed(0)}</span>
            <span role="cell">{candidate.backupPenaltyScore.toFixed(0)}</span>
            <span role="cell">{candidate.preferredBonusScore.toFixed(0)}</span>
            <span role="cell">{candidate.routeAttempts}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
