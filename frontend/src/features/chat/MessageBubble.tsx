import type { ApprovalRequest } from "../approval/approvalTypes";
import type { Message, OrchestratorTriggerSuggestion } from "./chatTypes";
import { getAttachmentDownloadUrl } from "../../api/agenthubApi";
import { formatId, getIdValue } from "../../utils/id";

interface MessageBubbleProps {
  message: Message;
  senderLabel: string;
  senderRoleLabel?: string | null;
  agentStepLabel?: string | null;
  targetAgentLabel?: string | null;
  pinnedContextId?: string | null;
  rerunning?: boolean;
  regenerating?: boolean;
  autoTriggerSuggestion?: OrchestratorTriggerSuggestion | null;
  autoTriggerApproval?: ApprovalRequest | null;
  autoTriggerRunning?: boolean;
  replyMessages?: Message[];
  threadExpanded?: boolean;
  highlighted?: boolean;
  onSelectArtifact: (artifactId: string) => void;
  onTogglePin: (messageId: string, pinnedContextId?: string | null) => void;
  onSaveAsMemory: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onQuoteMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  onRerunFromMessage: (message: Message) => void;
  onRegenerateAgentReply: (message: Message) => void;
  onConfirmOrchestratorTrigger: (message: Message) => void;
  onRefreshOrchestratorSuggestion: (message: Message) => void;
  onToggleThread: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getBubbleVariant(message: Message): string {
  if (message.senderType === "USER") {
    return "user";
  }

  if (["TASK", "RESULT", "REVIEW", "APPROVAL", "REJECTION"].includes(message.messageType)) {
    return `agent-protocol agent-protocol--${message.messageType.toLowerCase()}`;
  }

  if (message.senderType === "AGENT") {
    return "agent";
  }

  if (message.messageType === "ARTIFACT_CARD") {
    return "artifact-card";
  }

  if (message.messageType === "TASK_SPEC") {
    return "task-spec";
  }

  if (message.messageType === "TASK_STATUS") {
    return "task-status";
  }

  if (message.messageType === "DEPLOY_STATUS") {
    return "deploy-status";
  }

  return "system";
}

function getProtocolLabel(messageType: string): string | null {
  const labels: Record<string, string> = {
    TASK: "TASK",
    RESULT: "RESULT",
    REVIEW: "REVIEW",
    APPROVAL: "APPROVAL",
    REJECTION: "REJECTION",
    ERROR: "ERROR"
  };

  return labels[messageType] ?? null;
}

function getReferenceMessageId(message: Message): string | null {
  return message.replyToMessageId || message.quotedMessageId || null;
}

function getMessagePreview(message: Message): string {
  const content = message.content || "";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function getApprovalStatus(approval?: ApprovalRequest | null): string | null {
  return approval?.status ? approval.status.toUpperCase() : null;
}

function getAutoTriggerStatus(
  suggestion?: OrchestratorTriggerSuggestion | null,
  approval?: ApprovalRequest | null
): { label: string; tone: "pending" | "ready" | "done"; canRun: boolean; actionLabel: string; detail: string } | null {
  if (!suggestion || !suggestion.enabled || !suggestion.matched) {
    return null;
  }

  const approvalStatus = getApprovalStatus(approval ?? suggestion.pendingApproval);
  if (approvalStatus === "CONSUMED") {
    return {
      label: "协作已启动",
      tone: "done",
      canRun: false,
      actionLabel: "已启动",
      detail: "确认请求已被 Orchestrator 执行消费。"
    };
  }

  if (approvalStatus === "CANCELLED" || approvalStatus === "EXPIRED") {
    return {
      label: `确认已${approvalStatus === "CANCELLED" ? "取消" : "过期"}`,
      tone: "pending",
      canRun: true,
      actionLabel: "重新创建确认请求",
      detail: suggestion.reason
    };
  }

  if (suggestion.requireApproval) {
    if (!approvalStatus) {
      return {
        label: "建议触发 Agent 协作",
        tone: "pending",
        canRun: true,
        actionLabel: "创建确认请求",
        detail: suggestion.reason
      };
    }

    return {
      label: approvalStatus === "APPROVED" ? "已批准，可运行" : "需要确认",
      tone: approvalStatus === "APPROVED" ? "ready" : "pending",
      canRun: true,
      actionLabel: approvalStatus === "APPROVED" ? "运行已批准协作" : "批准并运行",
      detail: suggestion.reason
    };
  }

  return {
    label: "建议触发 Agent 协作",
    tone: "ready",
    canRun: true,
    actionLabel: "运行协作",
    detail: suggestion.reason
  };
}

function isDownloadableAttachment(attachmentId?: string | null): boolean {
  return Boolean(attachmentId && !attachmentId.startsWith("demo-") && !attachmentId.startsWith("local-"));
}

export function MessageBubble({
  message,
  senderLabel,
  senderRoleLabel,
  agentStepLabel,
  targetAgentLabel,
  pinnedContextId,
  rerunning,
  regenerating,
  autoTriggerSuggestion,
  autoTriggerApproval,
  autoTriggerRunning,
  replyMessages = [],
  threadExpanded = false,
  highlighted = false,
  onSelectArtifact,
  onTogglePin,
  onSaveAsMemory,
  onCopyMessage,
  onQuoteMessage,
  onReplyMessage,
  onRerunFromMessage,
  onRegenerateAgentReply,
  onConfirmOrchestratorTrigger,
  onRefreshOrchestratorSuggestion,
  onToggleThread,
  onJumpToMessage
}: MessageBubbleProps) {
  const variant = getBubbleVariant(message);
  const messageId = formatId(message.id);
  const referenceMessageId = getReferenceMessageId(message);
  const artifactIds = message.artifactIds.map((artifactId) => formatId(artifactId)).filter(Boolean);
  const protocolLabel = getProtocolLabel(message.messageType);
  const attachments = message.attachments ?? [];
  const autoTriggerStatus = getAutoTriggerStatus(autoTriggerSuggestion, autoTriggerApproval);

  return (
    <div className={`message-row message-row--${message.senderType.toLowerCase()} ${highlighted ? "message-row--highlighted" : ""}`}>
      <div className={`message-bubble message-bubble--${variant}`}>
        <div className="message-bubble__header">
          <span className="message-bubble__sender">
            <span>{senderLabel}</span>
            {message.senderType === "AGENT" && senderRoleLabel ? (
              <span className="message-agent-role">{senderRoleLabel}</span>
            ) : null}
            {message.senderType === "AGENT" && agentStepLabel ? (
              <span className="message-agent-step">{agentStepLabel}</span>
            ) : null}
            {protocolLabel ? <span className={`message-protocol-pill message-protocol-pill--${protocolLabel.toLowerCase()}`}>{protocolLabel}</span> : null}
          </span>
          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className="message-bubble__actions">
          <button
            type="button"
            className="message-action-button"
            onClick={() => onCopyMessage(message)}
          >
            复制
          </button>
          <button
            type="button"
            className="message-action-button"
            onClick={() => onQuoteMessage(message)}
          >
            引用
          </button>
          <button
            type="button"
            className="message-action-button"
            onClick={() => onReplyMessage(message)}
          >
            回复
          </button>
          {message.senderType === "USER" ? (
            <button
              type="button"
              className="message-action-button message-action-button--primary"
              disabled={rerunning}
              onClick={() => onRerunFromMessage(message)}
            >
              {rerunning ? "重新运行中..." : "从此消息重新运行"}
            </button>
          ) : null}
          {message.senderType === "AGENT" ? (
            <button
              type="button"
              className="message-action-button message-action-button--primary"
              disabled={regenerating}
              onClick={() => onRegenerateAgentReply(message)}
            >
              {regenerating ? "重新生成中..." : "重新生成回复"}
            </button>
          ) : null}
          <button
            type="button"
            className={`message-action-button message-pin-button ${pinnedContextId ? "message-pin-button--active" : ""}`}
            onClick={() => onTogglePin(messageId, pinnedContextId)}
            aria-pressed={Boolean(pinnedContextId)}
          >
            {pinnedContextId ? "已固定 / 取消固定" : "固定到 Context"}
          </button>
          <button
            type="button"
            className="message-action-button"
            onClick={() => onSaveAsMemory(message)}
          >
            保存为记忆
          </button>
        </div>
        {message.senderType === "USER" && (message.targetAgentId || (message.mentionedAgentIds?.length ?? 0) > 0) ? (
          <div className="message-target-agent">
            <span>发送给：</span>
            <span className="message-target-agent-name">@{targetAgentLabel || message.targetAgentId}</span>
          </div>
        ) : null}
        {autoTriggerStatus ? (
          <div className={`message-auto-trigger message-auto-trigger--${autoTriggerStatus.tone}`}>
            <div className="message-auto-trigger__header">
              <div>
                <strong>{autoTriggerStatus.label}</strong>
                <p>{autoTriggerStatus.detail}</p>
              </div>
              <span>{autoTriggerSuggestion?.mode || "AUTO_TRIGGER"}</span>
            </div>
            {autoTriggerSuggestion?.matchedKeywords?.length ? (
              <div className="message-auto-trigger__keywords">
                {autoTriggerSuggestion.matchedKeywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            ) : null}
            <div className="message-auto-trigger__actions">
              {autoTriggerStatus.canRun ? (
                <button
                  type="button"
                  className="message-action-button message-action-button--primary"
                  disabled={autoTriggerRunning}
                  onClick={() => onConfirmOrchestratorTrigger(message)}
                >
                  {autoTriggerRunning ? "处理中..." : autoTriggerStatus.actionLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="message-action-button"
                disabled={autoTriggerRunning}
                onClick={() => onRefreshOrchestratorSuggestion(message)}
              >
                刷新建议
              </button>
            </div>
          </div>
        ) : null}
        {referenceMessageId ? (
          <div className="message-reference-card">
            <div className="message-reference-card__header">
              <span>{message.replyToMessageId ? "回复" : "引用"}：{referenceMessageId}</span>
              <button
                type="button"
                className="message-reference-card__jump"
                onClick={() => onJumpToMessage(referenceMessageId)}
              >
                定位原消息
              </button>
            </div>
            {message.quotedMessageContent ? <p>{message.quotedMessageContent}</p> : null}
          </div>
        ) : null}
        <div className="message-bubble__body">{message.content}</div>
        {attachments.length > 0 ? (
          <div className="message-attachment-list">
            {attachments.map((attachment, index) => (
              <article className="message-attachment-card" key={attachment.attachmentId || attachment.id || `${attachment.fileName}-${index}`}>
                <div className="message-attachment-card__header">
                  <strong>{attachment.fileName}</strong>
                  <span>{attachment.source || "ATTACHMENT"}</span>
                </div>
                <div className="message-attachment-card__meta">
                  {attachment.contentType || attachment.mimeType ? <span>{attachment.contentType || attachment.mimeType}</span> : null}
                  {typeof (attachment.size ?? attachment.sizeBytes) === "number" ? (
                    <span>{attachment.size ?? attachment.sizeBytes} bytes</span>
                  ) : null}
                </div>
                {attachment.contentPreview || attachment.previewText ? <p>{attachment.contentPreview || attachment.previewText}</p> : null}
                {isDownloadableAttachment(attachment.attachmentId) ? (
                  <a
                    className="message-attachment-card__download"
                    href={getAttachmentDownloadUrl(attachment.attachmentId as string)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
        {artifactIds.length > 0 ? (
          <div className="message-bubble__artifacts">
            {artifactIds.map((artifactId) => (
              <button
                key={artifactId}
                type="button"
                className="artifact-link"
                onClick={() => onSelectArtifact(artifactId)}
              >
                打开 {artifactId}
              </button>
            ))}
          </div>
        ) : null}
        {replyMessages.length > 0 ? (
          <div className="message-thread">
            <button type="button" className="message-thread__toggle" onClick={onToggleThread}>
              {threadExpanded ? "隐藏回复线程" : `查看 ${replyMessages.length} 条回复`}
            </button>
            {threadExpanded ? (
              <div className="message-thread__list">
                {replyMessages.map((reply) => (
                  <button
                    key={getIdValue(reply.id)}
                    type="button"
                    className="message-thread__item"
                    onClick={() => onJumpToMessage(getIdValue(reply.id))}
                  >
                    <span>{reply.senderType === "USER" ? "用户" : reply.senderId}</span>
                    <p>{getMessagePreview(reply)}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
