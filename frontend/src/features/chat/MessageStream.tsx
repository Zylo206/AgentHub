import type { Agent } from "../agents/agentTypes";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./chatTypes";
import { getIdValue } from "../../utils/id";

interface MessageStreamProps {
  messages: Message[];
  agents: Agent[];
  loading: boolean;
  onSelectArtifact: (artifactId: string) => void;
}

function resolveSenderLabel(message: Message, agents: Agent[]): string {
  if (message.senderType === "USER") {
    return "You";
  }

  if (message.senderType === "SYSTEM") {
    return "System";
  }

  const matchedAgent = agents.find((agent) => getIdValue(agent.id) === message.senderId);
  return matchedAgent?.name || message.senderId || "Agent";
}

export function MessageStream({
  messages,
  agents,
  loading,
  onSelectArtifact
}: MessageStreamProps) {
  if (loading) {
    return <div className="panel-empty">Loading messages...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="panel-empty">
        No messages yet. Send a prompt to start the AgentHub workflow.
      </div>
    );
  }

  return (
    <div className="message-stream">
      {messages.map((message) => (
        <MessageBubble
          key={getIdValue(message.id)}
          message={message}
          senderLabel={resolveSenderLabel(message, agents)}
          targetAgentLabel={
            message.targetAgentId
              ? agents.find((agent) => getIdValue(agent.id) === message.targetAgentId)?.name || message.targetAgentId
              : null
          }
          onSelectArtifact={onSelectArtifact}
        />
      ))}
    </div>
  );
}
