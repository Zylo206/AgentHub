import { FormEvent, useMemo, useRef } from "react";
import type { Agent } from "../agents/agentTypes";
import type { ArtifactSelectionReference } from "../artifacts/artifactTypes";
import type { LightweightAttachment, Message } from "./chatTypes";
import { parseLeadingAgentMention } from "./agentMention";
import { formatId, getIdValue } from "../../utils/id";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  agents: Agent[];
  selectedAgent?: Agent | null;
  quotedMessage?: Message | null;
  quoteMode?: "quote" | "reply";
  artifactSelectionReference?: ArtifactSelectionReference | null;
  attachments: LightweightAttachment[];
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: LightweightAttachment[]) => void;
  onUploadFiles?: (files: File[]) => Promise<LightweightAttachment[]>;
  onClearQuote?: () => void;
  onClearArtifactSelection?: () => void;
  onSend: () => void;
}

function uniqueAgents(agents: Agent[]): Agent[] {
  const seen = new Set<string>();
  return agents.filter((agent) => {
    const id = getIdValue(agent.id);
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function summarizeCapabilities(agents: Agent[]): string[] {
  return Array.from(new Set(agents.flatMap((agent) => agent.toolTags || []).filter(Boolean))).slice(0, 6);
}

function formatAttachmentSize(size?: number): string {
  if (typeof size !== "number" || Number.isNaN(size)) {
    return "size n/a";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function getAttachmentContentType(attachment: LightweightAttachment): string {
  return attachment.contentType || attachment.mimeType || "attachment";
}

export function ChatInput({
  value,
  disabled,
  sending,
  agents,
  selectedAgent,
  quotedMessage,
  quoteMode = "quote",
  artifactSelectionReference,
  attachments,
  onChange,
  onAttachmentsChange,
  onUploadFiles,
  onClearQuote,
  onClearArtifactSelection,
  onSend
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const routingPreview = useMemo(() => {
    const parsedMention = parseLeadingAgentMention(value, agents);
    const mentionedAgents = parsedMention.error ? [] : parsedMention.matchedAgents;
    const targetAgents = uniqueAgents(mentionedAgents.length > 0 ? mentionedAgents : selectedAgent ? [selectedAgent] : []);
    const adapters = Array.from(new Set(targetAgents.map((agent) => agent.preferredAdapterType || "MOCK")));
    const capabilities = summarizeCapabilities(targetAgents);

    if (parsedMention.error) {
      return {
        mode: "MENTION_ERROR",
        title: "Agent 指定有误",
        detail: parsedMention.error,
        agents: [],
        adapters: [],
        capabilities: []
      };
    }

    if (targetAgents.length > 1) {
      return {
        mode: "MULTI_AGENT",
        title: "To: 多 Agent 协作",
        detail: "消息开头的多个 @Agent 会被作为协作成员，Orchestrator 会按能力和可用性拆分任务。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    if (targetAgents.length === 1) {
      return {
        mode: "SINGLE_AGENT",
        title: `To: @${targetAgents[0].name}`,
        detail: "该 Agent 会优先处理本次消息；需要更多成员时，Orchestrator 仍可补充分工。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    return {
      mode: "AUTO_ROUTE",
      title: "To: Orchestrator 自动分派",
      detail: "未指定 Agent 时，将按任务意图、工具能力和可用性选择内置或自建 Agent。",
      agents: [],
      adapters: [],
      capabilities: []
    };
  }, [agents, selectedAgent, value]);

  async function addLocalFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const fileList = Array.from(files);
    if (onUploadFiles) {
      const uploadedAttachments = await onUploadFiles(fileList);
      onAttachmentsChange([...attachments, ...uploadedAttachments]);
      return;
    }

    const nextAttachments: LightweightAttachment[] = await Promise.all(
      fileList.map(async (file, index) => {
        const isTextLike =
          file.type.startsWith("text/") ||
          /\.(md|txt|json|csv|log|tsx?|jsx?|css|html)$/i.test(file.name);
        const contentPreview = isTextLike ? await file.text().then((text) => text.slice(0, 1200)).catch(() => "") : "";

        return {
          attachmentId: `local-${Date.now()}-${index}-${file.name}`,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          sizeBytes: file.size,
          contentPreview,
          previewText: contentPreview,
          source: "LOCAL_DEMO"
        };
      })
    );

    onAttachmentsChange([...attachments, ...nextAttachments]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending) {
      onSend();
    }
  }

  function insertMentionHint() {
    if (disabled || sending) {
      return;
    }
    const mentionName = selectedAgent?.name || agents[0]?.name;
    const mention = mentionName ? `@${mentionName} ` : "@";
    onChange(value.trim() ? `${value} ${mention}` : mention);
  }

  return (
    <form className="chat-input" data-testid="chat-input" onSubmit={handleSubmit}>
      <textarea
        className="chat-input__textarea"
        data-testid="chat-input-textarea"
        rows={3}
        placeholder="发送消息，@Agent 或描述你的任务..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="chat-input__context-chips" aria-label="Composer context">
        {quotedMessage ? (
          <div className="chat-context-chip chat-quote-preview">
            <strong>{quoteMode === "reply" ? "回复" : "引用"}</strong>
            <span>{quotedMessage.content}</span>
            <em>{formatId(quotedMessage.id)}</em>
            <button type="button" className="ghost-button" data-testid="chat-quote-clear" onClick={onClearQuote}>
              移除
            </button>
          </div>
        ) : null}

        {artifactSelectionReference ? (
          <div className="chat-context-chip chat-artifact-selection-preview" data-testid="chat-artifact-selection-preview">
            <strong>正在局部修改</strong>
            <span>
              正在修改 {artifactSelectionReference.artifactTitle} v{artifactSelectionReference.artifactVersion} 的第{" "}
              {artifactSelectionReference.startLine}-{artifactSelectionReference.endLine} 行
            </span>
            <code>{artifactSelectionReference.selectedText.slice(0, 120)}</code>
            <button type="button" className="ghost-button" data-testid="chat-artifact-selection-clear" onClick={onClearArtifactSelection}>
              移除
            </button>
          </div>
        ) : null}

        {attachments.map((attachment) => (
          <div className="chat-context-chip chat-attachment-chip" key={attachment.attachmentId || attachment.id || attachment.fileName}>
            <strong>{attachment.fileName}</strong>
            <span>{getAttachmentContentType(attachment)}</span>
            <em>{formatAttachmentSize(attachment.size ?? attachment.sizeBytes)}</em>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onAttachmentsChange(attachments.filter((item) => item !== attachment))}
            >
              移除
            </button>
          </div>
        ))}
      </div>

      <input
        ref={fileInputRef}
        className="chat-attachment-composer__file"
        data-testid="chat-attachment-file-input"
        type="file"
        multiple
        disabled={disabled || sending}
        onChange={(event) => {
          void addLocalFiles(event.currentTarget.files).catch((error) => {
            console.warn("Attachment upload failed", error);
          });
          event.currentTarget.value = "";
        }}
      />

      <div className="chat-input__actions">
        <div className="chat-input__toolbar" aria-label="Composer tools">
          <button type="button" className="ghost-button" disabled={disabled || sending} onClick={() => fileInputRef.current?.click()}>
            附件
          </button>
          <button type="button" className="ghost-button" disabled={disabled || sending} onClick={insertMentionHint}>
            @Agent
          </button>
          <details className={`chat-routing-preview chat-routing-preview--${routingPreview.mode.toLowerCase()}`} data-testid="chat-routing-preview">
            <summary>
              <span>Explain</span>
              <strong>{routingPreview.title}</strong>
              {routingPreview.agents.length > 0 ? (
                <small>{routingPreview.agents.map((agent) => `@${agent.name}`).join(" ")}</small>
              ) : null}
              <em>{attachments.length > 0 ? `${attachments.length} 个附件` : "无附件"}</em>
            </summary>
            <p>{routingPreview.detail}</p>
            <div className="chat-routing-preview__chips">
              {routingPreview.agents.map((agent) => (
                <em key={getIdValue(agent.id)}>@{agent.name}</em>
              ))}
              {routingPreview.capabilities.map((capability) => (
                <em key={capability}>{capability}</em>
              ))}
            </div>
          </details>
        </div>
        <button
          type="submit"
          className="primary-button"
          data-testid="chat-send-button"
          disabled={disabled || sending || (!value.trim() && attachments.length === 0)}
        >
          {sending ? "发送中..." : "发送"}
        </button>
      </div>
    </form>
  );
}
