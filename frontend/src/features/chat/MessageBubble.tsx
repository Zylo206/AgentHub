import type { Message } from "./chatTypes";
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
  onToggleThread: () => void;
  onJumpToMessage: (messageId: string) => void;
}

function getBubbleVariant(message: Message): string {
  if (message.senderType === "USER") {
    return "user";
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

function getReferenceMessageId(message: Message): string | null {
  return message.replyToMessageId || message.quotedMessageId || null;
}

function getMessagePreview(message: Message): string {
  const content = message.content || "";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
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
  onToggleThread,
  onJumpToMessage
}: MessageBubbleProps) {
  const variant = getBubbleVariant(message);
  const messageId = formatId(message.id);
  const referenceMessageId = getReferenceMessageId(message);
  const artifactIds = message.artifactIds.map((artifactId) => formatId(artifactId)).filter(Boolean);

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
              {rerunning ? "重新运行中..." : "重新运行 Demo Task"}
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
