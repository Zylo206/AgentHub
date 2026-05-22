import type { AdapterDescriptor, Agent } from "./agentTypes";
import { formatId } from "../../utils/id";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

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

export function AgentList({
  agents,
  adapterDescriptors,
  loading,
  selectedAgentId,
  onSelectAgent
}: AgentListProps) {
  if (loading) {
    return <div className="panel-empty">正在加载 Agent...</div>;
  }

  if (agents.length === 0) {
    return <div className="panel-empty">暂无可用 Agent。</div>;
  }

  return (
    <div className="agent-list">
      {agents.map((agent) => {
        const adapterDescriptor = findAdapterDescriptor(adapterDescriptors, agent.preferredAdapterType);

        return (
          <button
            type="button"
            key={formatId(agent.id)}
            className={`agent-item ${selectedAgentId === formatId(agent.id) ? "agent-item--selected" : ""}`}
            onClick={() => onSelectAgent?.(agent)}
          >
            <div className="agent-item__row">
              <div className="agent-item__identity">
                {agent.avatarUrl ? (
                  <img className="agent-avatar" src={agent.avatarUrl} alt={agent.name} />
                ) : (
                  <div className="agent-avatar-placeholder">{getInitial(agent.name)}</div>
                )}
                <div className="agent-item__identity-text">
                  <strong>{agent.name}</strong>
                  <div className="agent-item__meta">{displayAgentRole(agent.role)}</div>
                </div>
              </div>
              <span className={`status-pill status-pill--${normalizeStatusClass(agent.status)}`}>
                {displayStatus(agent.status)}
              </span>
            </div>
            <div className="agent-item__description">{agent.description}</div>
            <div className="agent-preferred-adapter">
              首选 Adapter：{agent.preferredAdapterType || "MOCK"}
            </div>
            {adapterDescriptor ? (
              <div className="agent-adapter-health">
                <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(adapterDescriptor.status)}`}>
                  {displayStatus(adapterDescriptor.status)}
                </span>
                {adapterDescriptor.status !== "AVAILABLE" ? (
                  <span className="agent-adapter-health__hint">不可用时会回退到 MOCK。</span>
                ) : null}
              </div>
            ) : null}
            {agent.capabilityTags.length > 0 ? (
              <div className="tag-row">
                {renderLimitedTags(agent.capabilityTags, `${formatId(agent.id)}-cap`)}
              </div>
            ) : null}
            {agent.toolTags.length > 0 ? (
              <div className="tag-row">
                {renderLimitedTags(
                  agent.toolTags,
                  `${formatId(agent.id)}-tool`,
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
