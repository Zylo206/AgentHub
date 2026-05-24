import { useMemo, useRef, useState } from "react";
import type { Agent } from "../agents/agentTypes";
import type { ApprovalRequest } from "../approval/approvalTypes";
import type { PinnedContext } from "../context/contextTypes";
import { MessageBubble } from "./MessageBubble";
import type { Message, OrchestratorTriggerSuggestion } from "./chatTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole } from "../../utils/displayLabels";

interface MessageStreamProps {
  messages: Message[];
  agents: Agent[];
  pinnedContexts: PinnedContext[];
  loading: boolean;
  rerunningMessageId?: string | null;
  regeneratingMessageId?: string | null;
  triggerSuggestionsByMessageId?: Record<string, OrchestratorTriggerSuggestion | null>;
  approvalByMessageId?: Record<string, ApprovalRequest | null>;
  autoTriggerRunningMessageId?: string | null;
  onSelectArtifact: (artifactId: string) => void;
  onToggleMessagePin: (messageId: string, pinnedContextId?: string | null) => void;
  onSaveMessageAsMemory: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onQuoteMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  onRerunFromMessage: (message: Message) => void;
  onRegenerateAgentReply: (message: Message) => void;
  onConfirmOrchestratorTrigger: (message: Message) => void;
  onRefreshOrchestratorSuggestion: (message: Message) => void;
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
  regeneratingMessageId,
  triggerSuggestionsByMessageId = {},
  approvalByMessageId = {},
  autoTriggerRunningMessageId,
  onSelectArtifact,
  onToggleMessagePin,
  onSaveMessageAsMemory,
  onCopyMessage,
  onQuoteMessage,
  onReplyMessage,
  onRerunFromMessage,
  onRegenerateAgentReply,
  onConfirmOrchestratorTrigger,
  onRefreshOrchestratorSuggestion
}: MessageStreamProps) {
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(() => new Set());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const repliesByMessageId = useMemo(() => {
    const grouped = new Map<string, Message[]>();

    messages.forEach((message) => {
      if (!message.replyToMessageId) {
        return;
      }

      const existing = grouped.get(message.replyToMessageId) ?? [];
      existing.push(message);
      grouped.set(message.replyToMessageId, existing);
    });

    return grouped;
  }, [messages]);

  function toggleThread(messageId: string) {
    setExpandedThreadIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  function jumpToMessage(messageId: string) {
    const target = messageRefs.current.get(messageId);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => setHighlightedMessageId(null), 1800);
  }

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
      {messages.map((message) => {
        const messageId = getIdValue(message.id);
        const replyMessages = repliesByMessageId.get(messageId) ?? [];

        return (
          <div
            key={messageId}
            ref={(node) => {
              if (node) {
                messageRefs.current.set(messageId, node);
              } else {
                messageRefs.current.delete(messageId);
              }
            }}
          >
            <MessageBubble
              message={message}
              senderLabel={resolveSenderLabel(message, agents)}
              senderRoleLabel={resolveSenderRoleLabel(message, agents)}
              agentStepLabel={resolveAgentStepLabel(message)}
              targetAgentLabel={resolveTargetAgentLabel(message, agents)}
              pinnedContextId={
                pinnedContexts.find(
                  (pinnedContext) =>
                    pinnedContext.sourceType === "MESSAGE" &&
                    pinnedContext.sourceId === messageId
                )?.id ?? null
              }
              rerunning={rerunningMessageId === messageId}
              regenerating={regeneratingMessageId === messageId}
              autoTriggerSuggestion={triggerSuggestionsByMessageId[messageId] ?? null}
              autoTriggerApproval={approvalByMessageId[messageId] ?? null}
              autoTriggerRunning={autoTriggerRunningMessageId === messageId}
              replyMessages={replyMessages}
              threadExpanded={expandedThreadIds.has(messageId)}
              highlighted={highlightedMessageId === messageId}
              onSelectArtifact={onSelectArtifact}
              onTogglePin={onToggleMessagePin}
              onSaveAsMemory={onSaveMessageAsMemory}
              onCopyMessage={onCopyMessage}
              onQuoteMessage={onQuoteMessage}
              onReplyMessage={onReplyMessage}
              onRerunFromMessage={onRerunFromMessage}
              onRegenerateAgentReply={onRegenerateAgentReply}
              onConfirmOrchestratorTrigger={onConfirmOrchestratorTrigger}
              onRefreshOrchestratorSuggestion={onRefreshOrchestratorSuggestion}
              onToggleThread={() => toggleThread(messageId)}
              onJumpToMessage={jumpToMessage}
            />
          </div>
        );
      })}
    </div>
  );
}
