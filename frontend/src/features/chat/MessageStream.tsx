import { useMemo, useRef, useState } from "react";
import type { Agent } from "../agents/agentTypes";
import type { ApprovalRequest } from "../approval/approvalTypes";
import type { PinnedContext } from "../context/contextTypes";
import { MessageBubble } from "./MessageBubble";
import type { Message, OrchestratorTriggerSuggestion, StreamingPreviewState } from "./chatTypes";
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
  onCancelOrchestratorTrigger: (approvalId: string) => void;
  onRefreshOrchestratorSuggestion: (message: Message) => void;
  streamingPreviewsByStepId?: Record<string, StreamingPreviewState>;
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
    agent_orchestrator: "Orchestrator",
    agent_frontend_builder: "Frontend Builder",
    agent_backend_worker: "Backend Worker",
    agent_reviewer: "Reviewer"
  };

  return senderId ? labels[senderId] || null : null;
}

function resolveAgentStepLabel(message: Message): string | null {
  if (message.senderType !== "AGENT") {
    return null;
  }

  const match = String(message.content || "").match(/TaskStep\s*(\d+)/i);
  if (!match) {
    return message.senderId === "agent_orchestrator" ? "群聊编排" : null;
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

function getStreamingPreviews(streamingPreviewsByStepId: Record<string, StreamingPreviewState> = {}): StreamingPreviewState[] {
  return Object.values(streamingPreviewsByStepId)
    .filter((preview) => preview.content.trim())
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt));
}

function getStreamingStatusLabel(status: StreamingPreviewState["status"]): string {
  if (status === "DISCARDED") {
    return "已丢弃的流式片段";
  }
  if (status === "PARTIAL") {
    return "部分流式输出";
  }
  return "生成中";
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
  onCancelOrchestratorTrigger,
  onRefreshOrchestratorSuggestion,
  streamingPreviewsByStepId = {}
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
      <div className="panel-empty panel-empty--collaboration">
        <strong>从任务消息开始</strong>
        <p>发送需求后，AgentHub 会生成协作确认卡片；确认后 Orchestrator 会启动多 Agent 协作。</p>
        <div className="panel-empty__examples">
          <span>生成一个 React 登录页，同时输出 README 并做质量检查。</span>
          <span>@Frontend Builder @Reviewer 优化这个 UI 并检查代码质量。</span>
          <span>设计 API 契约，并生成可打开的静态预览。</span>
        </div>
      </div>
    );
  }

  const streamingPreviews = getStreamingPreviews(streamingPreviewsByStepId);

  return (
    <div className="message-stream" data-testid="message-stream">
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
              onCancelOrchestratorTrigger={onCancelOrchestratorTrigger}
              onRefreshOrchestratorSuggestion={onRefreshOrchestratorSuggestion}
              onToggleThread={() => toggleThread(messageId)}
              onJumpToMessage={jumpToMessage}
            />
          </div>
        );
      })}

      {streamingPreviews.map((preview) => (
        <div className="message-stream__status-row" data-testid="streaming-status-row" key={preview.taskStepId}>
          <div className={`message-stream-status-bar message-stream-status-bar--${preview.status.toLowerCase()}`}>
            <div className="message-stream-status-bar__header">
              <div>
                <strong>{getStreamingStatusLabel(preview.status)}</strong>
                <span>{preview.adapterType || "Adapter stream"} / {preview.taskStepId}</span>
              </div>
              <span>{preview.chunkCount} 个片段</span>
            </div>
            <div className="message-stream__preview-content">{preview.content}</div>
            <div className="message-stream__preview-meta">
              {preview.finishReason ? preview.finishReason : "最终 Artifact 校验通过前，不会持久化 token 级片段。"}
              {preview.status === "STREAMING" ? " / 正在等待最终 JSON contract 校验。" : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
