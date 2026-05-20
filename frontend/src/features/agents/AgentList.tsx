import type { Agent } from "./agentTypes";
import { formatId } from "../../utils/id";

interface AgentListProps {
  agents: Agent[];
  loading: boolean;
}

export function AgentList({ agents, loading }: AgentListProps) {
  if (loading) {
    return <div className="panel-empty">Loading agents...</div>;
  }

  if (agents.length === 0) {
    return <div className="panel-empty">No agents available.</div>;
  }

  return (
    <div className="agent-list">
      {agents.map((agent) => (
        <div key={formatId(agent.id)} className="agent-item">
          <div className="agent-item__row">
            <strong>{agent.name}</strong>
            <span className={`status-pill status-pill--${agent.status.toLowerCase()}`}>
              {agent.status}
            </span>
          </div>
          <div className="agent-item__meta">{agent.role}</div>
          <div className="agent-item__description">{agent.description}</div>
          <div className="tag-row">
            {agent.capabilityTags.map((tag) => (
              <span className="tag-chip" key={`${formatId(agent.id)}-${tag}`}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
