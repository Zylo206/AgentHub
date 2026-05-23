import type { Agent } from "../agents/agentTypes";
import type { PinnedContext } from "../context/contextTypes";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "./chatTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole } from "../../utils/displayLabels";

interface MessageStreamProps {
  messages: Message[];
  agents: Agent[];
  pinnedContexts: PinnedContext[];
  loading: boolean;
  rerunningMessageId?: string | null;
  onSelectArtifact: (artifactId: string) => void;
  onToggleMessagePin: (messageId: string, pinnedContextId?: string | null) => void;
  onSaveMessageAsMemory: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onQuoteMessage: (message: Message) => void;
  onRerunFromMessage: (message: Message) => void;
}

function resolveSenderLabel(message: Message, agents: Agent[]): string {
  if (message.senderType === "USER") {
    return "你";
  }

  if (message.senderType === "SYSTEM") {
    return "系统";
  }

  const matchedAgent = agents.find((agent) => getIdValue(agent.id) === message.senderId);
  return matchedAgent?.name || getBuiltInAgentLabel(message.senderId) || message.senderId || "Agent";
}

function resolveSenderRoleLabel(message: Message, agents: Agent[]): string | null {
  if (message.senderType !== "AGENT") {
    return null;
  }

  const matchedAgent = agents.find((agent) => getIdValue(agent.id) === message.senderId);
  if (matchedAgent) {
    return displayAgentRole(matchedAgent.role);
  }

  return getBuiltInAgentRoleLabel(message.senderId);
}

function getBuiltInAgentLabel(senderId?: string | null): string | null {
  const labels: Record<string, string> = {
    agent_orchestrator: "Orchestrator",
    agent_frontend_builder: "Frontend Builder",
    agent_backend_worker: "Backend Worker",
    agent_reviewer: "Reviewer"
  };

  return senderId ? labels[senderId] || null : null;
}

function getBuiltInAgentRoleLabel(senderId?: string | null): string | null {
  const labels: Record<string, string> = {
    agent_orchestrator: "主控 Agent",
    agent_frontend_builder: "前端构建 Agent",
    agent_backend_worker: "后端协作 Agent",
    agent_reviewer: "评审 Agent"
  };

  return senderId ? labels[senderId] || null : null;
}

function resolveAgentStepLabel(message: Message): string | null {
  if (message.senderType !== "AGENT") {
    return null;
  }

  const match = String(message.content || "").match(/TaskStep\s*(\d+)/i);
  if (!match) {
    return message.senderId === "agent_orchestrator" ? "群聊协调" : null;
  }

  return `TaskStep ${match[1]}`;
}

function resolveTargetAgentLabel(message: Message, agents: Agent[]): string | null {
  const mentionedAgentIds = message.mentionedAgentIds ?? [];
  if (mentionedAgentIds.length > 0) {
    return mentionedAgentIds
      .map((agentId) => agents.find((agent) => getIdValue(agent.id) === agentId)?.name || agentId)
      .join(" @");
  }

  return message.targetAgentId
    ? agents.find((agent) => getIdValue(agent.id) === message.targetAgentId)?.name || message.targetAgentId
    : null;
}

export function MessageStream({
  messages,
  agents,
  pinnedContexts,
  loading,
  rerunningMessageId,
  onSelectArtifact,
  onToggleMessagePin,
  onSaveMessageAsMemory,
  onCopyMessage,
  onQuoteMessage,
  onRerunFromMessage
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
          senderRoleLabel={resolveSenderRoleLabel(message, agents)}
          agentStepLabel={resolveAgentStepLabel(message)}
          targetAgentLabel={
            resolveTargetAgentLabel(message, agents)
          }
          pinnedContextId={
            pinnedContexts.find(
              (pinnedContext) =>
                pinnedContext.sourceType === "MESSAGE" &&
                pinnedContext.sourceId === getIdValue(message.id)
            )?.id ?? null
          }
          rerunning={rerunningMessageId === getIdValue(message.id)}
          onSelectArtifact={onSelectArtifact}
          onTogglePin={onToggleMessagePin}
          onSaveAsMemory={onSaveMessageAsMemory}
          onCopyMessage={onCopyMessage}
          onQuoteMessage={onQuoteMessage}
          onRerunFromMessage={onRerunFromMessage}
        />
      ))}
    </div>
  );
}
