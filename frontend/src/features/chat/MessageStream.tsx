import { useMemo, useRef, useState } from "react";
import type { Agent } from "../agents/agentTypes";
import type { AgentCreationDraft } from "../agents/conversationalAgentDraft";
import type { Artifact } from "../artifacts/artifactTypes";
import type { ApprovalRequest } from "../approval/approvalTypes";
import type { PinnedContext } from "../context/contextTypes";
import { MessageBubble } from "./MessageBubble";
import type { DeployIntentDraft, Message, OrchestratorTriggerSuggestion, StreamingPreviewState } from "./chatTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole } from "../../utils/displayLabels";

interface MessageStreamProps {
  messages: Message[];
  agents: Agent[];
  artifacts: Artifact[];
  pinnedContexts: PinnedContext[];
  memorySourceIds: Set<string>;
  loading: boolean;
  rerunningMessageId?: string | null;
  regeneratingMessageId?: string | null;
  triggerSuggestionsByMessageId?: Record<string, OrchestratorTriggerSuggestion | null>;
  approvalByMessageId?: Record<string, ApprovalRequest | null>;
  autoTriggerRunningMessageId?: string | null;
  agentCreationDraftsByMessageId?: Record<string, AgentCreationDraft | null>;
  agentCreationRunningMessageId?: string | null;
  deployIntentsByMessageId?: Record<string, DeployIntentDraft | null>;
  deployingMessageId?: string | null;
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
  onConfirmAgentCreation: (messageId: string) => void;
  onCancelAgentCreation: (messageId: string) => void;
  onStartDeployIntent: (message: Message, artifactId?: string | null) => void;
  onApproveDeployIntent: (messageId: string) => void;
  onCancelDeployIntent: (messageId: string) => void;
  onDownloadArtifactBundle: (artifactIds?: string[]) => void;
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

function artifactIdsToArtifacts(artifactIds: Message["artifactIds"], artifactsById: Map<string, Artifact>): Artifact[] {
  return artifactIds
    .map((artifactId) => artifactsById.get(getIdValue(artifactId)))
    .filter((artifact): artifact is Artifact => Boolean(artifact));
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
  artifacts,
  pinnedContexts,
  memorySourceIds,
  loading,
  rerunningMessageId,
  regeneratingMessageId,
  triggerSuggestionsByMessageId = {},
  approvalByMessageId = {},
  autoTriggerRunningMessageId,
  agentCreationDraftsByMessageId = {},
  agentCreationRunningMessageId,
  deployIntentsByMessageId = {},
  deployingMessageId,
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
  onConfirmAgentCreation,
  onCancelAgentCreation,
  onStartDeployIntent,
  onApproveDeployIntent,
  onCancelDeployIntent,
  onDownloadArtifactBundle,
  streamingPreviewsByStepId = {}
}: MessageStreamProps) {
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(() => new Set());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const artifactsById = useMemo(() => {
    const mapped = new Map<string, Artifact>();
    artifacts.forEach((artifact) => mapped.set(getIdValue(artifact.id), artifact));
    return mapped;
  }, [artifacts]);

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
      <div className="message-empty-reference" aria-label="AgentHub collaboration empty state">
        <section className="message-empty-suggestion-card">
          <div className="message-empty-suggestion-card__icon" aria-hidden="true">✦</div>
          <div className="message-empty-suggestion-card__body">
            <div className="message-empty-suggestion-card__header">
              <div>
                <strong>建议启动多 Agent 协作</strong>
                <p>发送任务消息后，Orchestrator 会生成确认卡片并自动分派 Agent。</p>
              </div>
              <span>待输入</span>
            </div>
            <div className="message-empty-suggestion-card__grid">
              <span>任务目标</span>
              <strong>生成登录页并完成安全评审，输出组件、API 合约与审计报告</strong>
              <span>参与 Agent</span>
              <strong>Frontend Specialist · Backend Specialist · Reviewer</strong>
              <span>预计产物</span>
              <strong>React 组件 · API 合约 · 安全审计报告</strong>
              <span>上下文来源</span>
              <strong>历史对话 · 关键消息 · 附件 · Artifact</strong>
            </div>
            <div className="message-empty-suggestion-card__actions">
              <button type="button" disabled>等待任务消息</button>
              <button type="button" disabled>调试入口已折叠</button>
            </div>
          </div>
        </section>

        <section className="message-empty-protocol-stack" aria-label="Collaboration flow examples">
          <article className="message-empty-protocol-card message-empty-protocol-card--task">
            <div className="message-empty-protocol-card__header">
              <span className="message-empty-avatar">O</span>
              <div>
                <strong>Orchestrator</strong>
                <small>TASK · 任务规划 · 示例</small>
              </div>
              <time>10:51</time>
            </div>
            <p>我会拆解任务并分派合适的 Agent，预计 4 个步骤并行执行。</p>
            <div className="message-empty-step-strip">
              <span>1 需求理解</span>
              <span>2 前端生成</span>
              <span>3 API 合约</span>
              <span>4 安全评审</span>
            </div>
          </article>

          <article className="message-empty-protocol-card message-empty-protocol-card--result">
            <div className="message-empty-protocol-card__header">
              <span className="message-empty-avatar message-empty-avatar--frontend">F</span>
              <div>
                <strong>Frontend Specialist</strong>
                <small>RESULT · 执行结果 · 示例</small>
              </div>
              <time>10:53</time>
            </div>
            <div className="message-empty-artifact-card">
              <span>⚛</span>
              <div>
                <strong>LoginPage.tsx</strong>
                <small>React Component · 构建通过 · 可预览</small>
              </div>
              <b>Preview</b>
            </div>
          </article>

          <article className="message-empty-protocol-card message-empty-protocol-card--review">
            <div className="message-empty-protocol-card__header">
              <span className="message-empty-avatar message-empty-avatar--review">R</span>
              <div>
                <strong>Reviewer</strong>
                <small>REVIEW · 评审结果 · 示例</small>
              </div>
              <time>10:55</time>
            </div>
            <div className="message-empty-review-pass">
              <strong>评审通过（ACCEPTED）</strong>
              <span>类型检查、质量门禁和安全检查通过。</span>
            </div>
          </article>
        </section>
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
              savedAsMemory={memorySourceIds.has(messageId)}
              artifacts={artifactIdsToArtifacts(message.artifactIds, artifactsById)}
              rerunning={rerunningMessageId === messageId}
              regenerating={regeneratingMessageId === messageId}
              autoTriggerSuggestion={triggerSuggestionsByMessageId[messageId] ?? null}
              autoTriggerApproval={approvalByMessageId[messageId] ?? null}
              autoTriggerRunning={autoTriggerRunningMessageId === messageId}
              agentCreationDraft={agentCreationDraftsByMessageId[messageId] ?? null}
              agentCreationRunning={agentCreationRunningMessageId === messageId}
              deployIntent={deployIntentsByMessageId[messageId] ?? null}
              deployIntentArtifact={deployIntentsByMessageId[messageId]?.artifactId
                ? artifactsById.get(deployIntentsByMessageId[messageId]?.artifactId ?? "") ?? null
                : artifacts[artifacts.length - 1] ?? null}
              deployIntentRunning={deployingMessageId === messageId}
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
              onConfirmAgentCreation={onConfirmAgentCreation}
              onCancelAgentCreation={onCancelAgentCreation}
              onStartDeployIntent={onStartDeployIntent}
              onApproveDeployIntent={onApproveDeployIntent}
              onCancelDeployIntent={onCancelDeployIntent}
              onDownloadArtifactBundle={onDownloadArtifactBundle}
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
