import { useMemo, useState } from "react";
import type { AdapterDescriptor, Agent } from "./agentTypes";
import { formatId } from "../../utils/id";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";

interface AgentListProps {
  agents: Agent[];
  adapterDescriptors?: AdapterDescriptor[];
  loading: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: Agent) => void;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "A";
}

function findAdapterDescriptor(
  adapterDescriptors: AdapterDescriptor[] | undefined,
  preferredAdapterType?: string | null
): AdapterDescriptor | null {
  const adapterType = preferredAdapterType || "MOCK";
  return adapterDescriptors?.find((descriptor) => descriptor.adapterType === adapterType) ?? null;
}

function renderLimitedTags(tags: string[], keyPrefix: string, className = "agent-tag") {
  const visibleTags = tags.slice(0, 3);
  const hiddenCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <>
      {visibleTags.map((tag) => (
        <span className={className} key={`${keyPrefix}-${tag}`}>
          {tag}
        </span>
      ))}
      {hiddenCount > 0 ? <span className="agent-tag agent-tag--more">+{hiddenCount}</span> : null}
    </>
  );
}

function formatRate(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value * 100)}%`;
}

function getAgentAvailabilityLabel(agent: Agent, descriptor: AdapterDescriptor | null): string {
  if (descriptor?.status === "AVAILABLE") {
    return "在线可路由";
  }
  if (agent.status === "ACTIVE") {
    return "可用，必要时切换备用路径";
  }
  return "待配置";
}

function getAdapterIntegrationProfile(adapterType?: string | null): { label: string; description: string; className: string } {
  if (adapterType === "OPENAI_COMPATIBLE" || adapterType === "CLAUDE_CODE" || adapterType === "CODEX") {
    return {
      label: "深接 v1",
      description: "REAL_FIRST / Artifact contract / quality gate",
      className: "agent-integration-pill--deep"
    };
  }

  if (adapterType === "OPEN_CODE") {
    return {
      label: "Probe",
      description: "仅探测，不作为本轮深接目标",
      className: "agent-integration-pill--probe"
    };
  }

  return {
    label: "备用路径",
    description: "本地稳定兜底能力",
    className: "agent-integration-pill--fallback"
  };
}

function getExternalSessionProfile(descriptor: AdapterDescriptor | null): { enabled: boolean; label: string } {
  if (!descriptor?.capabilityDetails?.externalCliSessionSupport) {
    return { enabled: false, label: "AgentHub session" };
  }

  const mode = String(descriptor.capabilityDetails.externalCliSessionMode || "AGENTHUB_CONTEXT_BRIDGE");
  return {
    enabled: true,
    label: mode === "AGENTHUB_CONTEXT_BRIDGE" ? "CLI Session Bridge" : mode
  };
}

export function AgentList({
  agents,
  adapterDescriptors,
  loading,
  selectedAgentId,
  onSelectAgent
}: AgentListProps) {
  const [query, setQuery] = useState("");
  const visibleAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return agents;
    }

    return agents.filter((agent) =>
      [
        agent.name,
        agent.description,
        agent.role,
        agent.status,
        agent.preferredAdapterType,
        ...agent.capabilityTags,
        ...agent.toolTags
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    );
  }, [agents, query]);

  if (loading) {
    return <div className="panel-empty">正在加载 Agent...</div>;
  }

  if (agents.length === 0) {
    return <div className="panel-empty">暂无可用 Agent。</div>;
  }

  return (
    <div className="agent-list agent-list--im">
      <div className="im-list-tools">
        <label className="im-search-box">
          <span>联系人</span>
          <input
            value={query}
            placeholder="搜索 Agent / 能力 / 工具"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="im-list-tools__chips" aria-label="Agent capabilities">
          <span>@Agent</span>
          <span>工具能力</span>
          <span>备用路径</span>
        </div>
      </div>

      {visibleAgents.length === 0 ? (
        <div className="panel-empty panel-empty--compact">没有匹配的 Agent。</div>
      ) : null}

      {visibleAgents.map((agent) => {
        const agentId = formatId(agent.id);
        const adapterDescriptor = findAdapterDescriptor(adapterDescriptors, agent.preferredAdapterType);
        const availabilityClass = normalizeStatusClass(adapterDescriptor?.status || agent.status);
        const integrationProfile = getAdapterIntegrationProfile(agent.preferredAdapterType || adapterDescriptor?.adapterType);
        const sessionProfile = getExternalSessionProfile(adapterDescriptor);

        return (
          <button
            type="button"
            key={agentId}
            className={`agent-item agent-item--im ${selectedAgentId === agentId ? "agent-item--selected" : ""}`}
            onClick={() => onSelectAgent?.(agent)}
          >
            <div className="agent-item__row">
              <div className="agent-item__identity">
                <span className={`agent-presence-dot agent-presence-dot--${availabilityClass}`} />
                {agent.avatarUrl ? (
                  <img className="agent-avatar" src={agent.avatarUrl} alt={agent.name} />
                ) : (
                  <div className="agent-avatar-placeholder">{getInitial(agent.name)}</div>
                )}
                <div className="agent-item__identity-text">
                  <strong>{sanitizeProductionText(agent.name)}</strong>
                  <div className="agent-item__meta">{displayAgentRole(agent.role)}</div>
                </div>
              </div>
              <span className={`status-pill status-pill--${normalizeStatusClass(agent.status)}`}>
                {displayStatus(agent.status)}
              </span>
            </div>
            <div className="agent-item__description">{sanitizeProductionText(agent.description)}</div>
            <div className="agent-im-strip">
              <strong>{getAgentAvailabilityLabel(agent, adapterDescriptor)}</strong>
              <span>{displayAdapterName(agent.preferredAdapterType || "MOCK")}</span>
            </div>
            <div className={`agent-integration-pill ${integrationProfile.className}`}>
              <strong>{integrationProfile.label}</strong>
              <span>{integrationProfile.description}</span>
            </div>
            {sessionProfile.enabled ? (
              <div className="agent-session-bridge-pill" title="复用 AgentHub 会话历史、产物、Review 和 TaskRun 摘要作为外部 CLI 的连续上下文。">
                <strong>{sessionProfile.label}</strong>
                <span>conversation + agent</span>
              </div>
            ) : null}
            {adapterDescriptor ? (
              <div className="agent-adapter-health">
                <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(adapterDescriptor.status)}`}>
                  {displayStatus(adapterDescriptor.status)}
                </span>
                <span className="agent-adapter-health__hint">
                  路由画像：{adapterDescriptor.routeAttempts ?? 0} 次 / 成功 {formatRate(adapterDescriptor.successRate)} / 备用路径 {formatRate(adapterDescriptor.fallbackRate)}
                </span>
                {adapterDescriptor.status !== "AVAILABLE" ? (
                  <span className="agent-adapter-health__hint">不可用时会切换本地备用路径。</span>
                ) : null}
              </div>
            ) : null}
            <div className="agent-capability-summary">
              <span>{agent.capabilityTags.length} 个能力</span>
              <span>{agent.toolTags.length} 个工具</span>
            </div>
            {agent.capabilityTags.length > 0 ? (
              <div className="tag-row">
                {renderLimitedTags(agent.capabilityTags, `${agentId}-cap`)}
              </div>
            ) : null}
            {agent.toolTags.length > 0 ? (
              <div className="tag-row">
                {renderLimitedTags(
                  agent.toolTags,
                  `${agentId}-tool`,
                  "agent-tag agent-tag--tool"
                )}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
