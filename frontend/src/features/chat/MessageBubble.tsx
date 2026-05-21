import type { Message } from "./chatTypes";
import { formatId } from "../../utils/id";

interface MessageBubbleProps {
  message: Message;
  senderLabel: string;
  targetAgentLabel?: string | null;
  onSelectArtifact: (artifactId: string) => void;
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

  return "system";
}

export function MessageBubble({
  message,
  senderLabel,
  targetAgentLabel,
  onSelectArtifact
}: MessageBubbleProps) {
  const variant = getBubbleVariant(message);
  const artifactIds = message.artifactIds.map((artifactId) => formatId(artifactId)).filter(Boolean);

  return (
    <div className={`message-row message-row--${message.senderType.toLowerCase()}`}>
      <div className={`message-bubble message-bubble--${variant}`}>
        <div className="message-bubble__header">
          <span>{senderLabel}</span>
          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>
        {message.senderType === "USER" && message.targetAgentId ? (
          <div className="message-target-agent">
            <span>To:</span>
            <span className="message-target-agent-name">@{targetAgentLabel || message.targetAgentId}</span>
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
                Open {artifactId}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
