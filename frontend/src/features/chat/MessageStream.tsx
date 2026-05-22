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
    return "你";
  }

  if (message.senderType === "SYSTEM") {
    return "系统";
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
    return <div className="panel-empty">正在加载消息...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="panel-empty">
        暂无消息。发送一条任务描述后开始 AgentHub 工作流。
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
