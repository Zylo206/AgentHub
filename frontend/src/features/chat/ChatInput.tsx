import { FormEvent, useMemo, useRef } from "react";
import type { Agent } from "../agents/agentTypes";
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
  attachments: LightweightAttachment[];
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: LightweightAttachment[]) => void;
  onUploadFiles?: (files: File[]) => Promise<LightweightAttachment[]>;
  onClearQuote?: () => void;
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

export function ChatInput({
  value,
  disabled,
  sending,
  agents,
  selectedAgent,
  quotedMessage,
  quoteMode = "quote",
  attachments,
  onChange,
  onAttachmentsChange,
  onUploadFiles,
  onClearQuote,
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
        detail: "消息开头的多个 @Agent 会写入 mentionedAgentIds，并进入 Orchestrator 路由。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    if (targetAgents.length === 1) {
      return {
        mode: "SINGLE_AGENT",
        title: `To: @${targetAgents[0].name}`,
        detail: "该 Agent 会作为 targetAgentId / selectedAgent 优先参与首个路由决策。",
        agents: targetAgents,
        adapters,
        capabilities
      };
    }

    return {
      mode: "AUTO_ROUTE",
      title: "Orchestrator 自动分派",
      detail: "未指定 Agent 时，将按任务意图、tool capability 和 Adapter 健康度选择内置或自建 Agent。",
      agents: [],
      adapters: ["MOCK fallback 可用"],
      capabilities: []
    };
  }, [agents, selectedAgent, value]);

  function addAttachment(fileName: string, previewText = "") {
    const trimmedFileName = fileName.trim();
    const trimmedPreview = previewText.trim();
    if (!trimmedFileName && !trimmedPreview) {
      return;
    }

    onAttachmentsChange([
      ...attachments,
      {
        attachmentId: `demo-${Date.now()}-${attachments.length}`,
        fileName: trimmedFileName || "typed-context.txt",
        contentType: "text/plain",
        mimeType: "text/plain",
        size: trimmedPreview ? new Blob([trimmedPreview]).size : 0,
        previewText: trimmedPreview,
        contentPreview: trimmedPreview,
        sizeBytes: trimmedPreview ? new Blob([trimmedPreview]).size : undefined,
        source: trimmedFileName ? "LOCAL_DEMO" : "TEXT_SNIPPET"
      }
    ]);
  }

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

  function clearManualAttachmentFields(form: HTMLFormElement | null | undefined) {
    const input = form?.querySelector<HTMLInputElement>(".chat-attachment-composer__input");
    const textarea = form?.elements.namedItem("attachmentPreview") as HTMLTextAreaElement | null;
    if (input) {
      input.value = "";
    }
    if (textarea) {
      textarea.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending) {
      onSend();
    }
  }

  return (
    <form className="chat-input" data-testid="chat-input" onSubmit={handleSubmit}>
      <div className={`chat-routing-preview chat-routing-preview--${routingPreview.mode.toLowerCase()}`} data-testid="chat-routing-preview">
        <div>
          <span>发送前路由预览</span>
          <strong>{routingPreview.title}</strong>
          <p>{routingPreview.detail}</p>
        </div>
        <div className="chat-routing-preview__chips">
          {routingPreview.agents.map((agent) => (
            <em key={getIdValue(agent.id)}>@{agent.name}</em>
          ))}
          {routingPreview.adapters.map((adapter) => (
            <em key={adapter}>{adapter}</em>
          ))}
          {routingPreview.capabilities.map((capability) => (
            <em key={capability}>{capability}</em>
          ))}
        </div>
      </div>

      {quotedMessage ? (
        <div className="chat-quote-preview">
          <div>
            <strong>{quoteMode === "reply" ? "回复消息" : "引用消息"}</strong>
            <p>{quotedMessage.content}</p>
            <span>{formatId(quotedMessage.id)}</span>
          </div>
          <button type="button" className="ghost-button" data-testid="chat-quote-clear" onClick={onClearQuote}>
            取消引用
          </button>
        </div>
      ) : null}

      <textarea
        className="chat-input__textarea"
        data-testid="chat-input-textarea"
        rows={4}
        placeholder="发送消息，@Agent 或描述你的任务需求..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="chat-attachment-composer">
        <div className="chat-attachment-composer__header">
          <strong>轻量附件</strong>
          <span>支持真实上传和文本预览；图片 / PPT 当前按文件附件展示，不做富媒体编辑。</span>
        </div>
        <div className="chat-attachment-composer__grid">
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
          <button
            type="button"
            className="secondary-button"
            data-testid="chat-attachment-select-button"
            disabled={disabled || sending}
            onClick={() => fileInputRef.current?.click()}
          >
            选择本地文件
          </button>
          <input
            className="chat-attachment-composer__input"
            type="text"
            placeholder="手动输入文件名，例如 brief.md"
            disabled={disabled || sending}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              const input = event.currentTarget;
              const textarea = input.form?.elements.namedItem("attachmentPreview") as HTMLTextAreaElement | null;
              addAttachment(input.value, textarea?.value ?? "");
              clearManualAttachmentFields(input.form);
            }}
          />
          <textarea
            className="chat-attachment-composer__preview"
            name="attachmentPreview"
            rows={2}
            placeholder="可选：粘贴一小段内容预览"
            disabled={disabled || sending}
          />
          <button
            type="button"
            className="secondary-button"
            disabled={disabled || sending}
            onClick={(event) => {
              const form = event.currentTarget.form;
              const input = form?.querySelector<HTMLInputElement>(".chat-attachment-composer__input");
              const textarea = form?.elements.namedItem("attachmentPreview") as HTMLTextAreaElement | null;
              addAttachment(input?.value ?? "", textarea?.value ?? "");
              clearManualAttachmentFields(form);
            }}
          >
            添加附件
          </button>
        </div>
        {attachments.length > 0 ? (
          <div className="chat-attachment-list">
            {attachments.map((attachment) => (
              <div className="chat-attachment-chip" key={attachment.attachmentId || attachment.id || attachment.fileName}>
                <div>
                  <strong>{attachment.fileName}</strong>
                  {attachment.contentPreview || attachment.previewText ? <span>{attachment.contentPreview || attachment.previewText}</span> : null}
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    onAttachmentsChange(attachments.filter((item) => item !== attachment))
                  }
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="chat-input__actions">
        <div className="chat-input__hint-group">
          <span className="chat-input__hint">
            先发送任务消息，AgentHub 会展示协作确认卡片，再启动 Orchestrator。
          </span>
          <span className="chat-input__hint">
            以 @AgentName 开头可指定一个或多个 Agent。
          </span>
        </div>
        <button
          type="submit"
          className="primary-button"
          data-testid="chat-send-button"
          disabled={disabled || sending || (!value.trim() && attachments.length === 0)}
        >
          {sending ? "发送中..." : "发送消息"}
        </button>
      </div>
    </form>
  );
}
