import type { Agent } from "./agentTypes";
import { formatId } from "../../utils/id";

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: Agent) => void;
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "A";
}

export function AgentList({ agents, loading, selectedAgentId, onSelectAgent }: AgentListProps) {
  if (loading) {
    return <div className="panel-empty">Loading agents...</div>;
  }

  if (agents.length === 0) {
    return <div className="panel-empty">No agents available.</div>;
  }

  return (
      <div className="agent-list">
      {agents.map((agent) => (
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
                <div className="agent-item__meta">{agent.role}</div>
              </div>
            </div>
            <span className={`status-pill status-pill--${agent.status.toLowerCase()}`}>
              {agent.status}
            </span>
          </div>
          <div className="agent-item__description">{agent.description}</div>
          <div className="agent-preferred-adapter">
            Preferred Adapter: {agent.preferredAdapterType || "MOCK"}
          </div>
          {agent.capabilityTags.length > 0 ? (
            <div className="tag-row">
              {agent.capabilityTags.map((tag) => (
                <span className="agent-tag" key={`${formatId(agent.id)}-cap-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {agent.toolTags.length > 0 ? (
            <div className="tag-row">
              {agent.toolTags.map((tag) => (
                <span className="agent-tag agent-tag--tool" key={`${formatId(agent.id)}-tool-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
