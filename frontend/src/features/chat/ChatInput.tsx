import { FormEvent } from "react";
import type { Agent } from "../agents/agentTypes";
import type { LightweightAttachment, Message } from "./chatTypes";
import { formatId } from "../../utils/id";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  selectedAgent?: Agent | null;
  quotedMessage?: Message | null;
  quoteMode?: "quote" | "reply";
  attachments: LightweightAttachment[];
  onChange: (value: string) => void;
  onAttachmentsChange: (attachments: LightweightAttachment[]) => void;
  onClearQuote?: () => void;
  onSend: () => void;
}

export function ChatInput({
  value,
  disabled,
  sending,
  selectedAgent,
  quotedMessage,
  quoteMode = "quote",
  attachments,
  onChange,
  onAttachmentsChange,
  onClearQuote,
  onSend
}: ChatInputProps) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending) {
      onSend();
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="chat-target-agent">
        {selectedAgent ? (
          <>
            <span className="chat-target-agent-token">@{selectedAgent.name}</span>
            <span className="chat-input__hint">通过 {selectedAgent.preferredAdapterType || "MOCK"}</span>
          </>
        ) : (
          <span className="chat-input__hint">未选择目标 Agent</span>
        )}
      </div>
      {quotedMessage ? (
        <div className="chat-quote-preview">
          <div>
            <strong>{quoteMode === "reply" ? "回复消息" : "引用消息"}</strong>
            <p>{quotedMessage.content}</p>
            <span>{formatId(quotedMessage.id)}</span>
          </div>
          <button type="button" className="ghost-button" onClick={onClearQuote}>
            取消引用
          </button>
        </div>
      ) : null}
      <textarea
        className="chat-input__textarea"
        rows={4}
        placeholder="描述一个需要 AgentHub 协作完成的多步骤任务..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="chat-attachment-composer">
        <div className="chat-attachment-composer__header">
          <strong>Demo attachments</strong>
          <span>No upload; sends lightweight metadata only.</span>
        </div>
        <div className="chat-attachment-composer__grid">
          <input
            className="chat-attachment-composer__input"
            type="text"
            placeholder="local filename, e.g. brief.md"
            disabled={disabled || sending}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              const input = event.currentTarget;
              const textarea = input.form?.elements.namedItem("attachmentPreview") as HTMLTextAreaElement | null;
              addAttachment(input.value, textarea?.value ?? "");
              input.value = "";
              if (textarea) {
                textarea.value = "";
              }
            }}
          />
          <textarea
            className="chat-attachment-composer__preview"
            name="attachmentPreview"
            rows={2}
            placeholder="optional preview text or paste a small snippet"
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
              if (input) {
                input.value = "";
              }
              if (textarea) {
                textarea.value = "";
              }
            }}
          >
            Add attachment
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
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <div className="chat-input__actions">
        <div className="chat-input__hint-group">
          <span className="chat-input__hint">
            先通过聊天描述任务，再触发 Demo Task 查看 Orchestrator 流程。
          </span>
          <span className="chat-input__hint">
            可以在消息开头输入 @AgentName 指定目标 Agent。
          </span>
        </div>
        <button
          type="submit"
          className="primary-button"
          disabled={disabled || sending || (!value.trim() && attachments.length === 0)}
        >
          {sending ? "发送中..." : "发送消息"}
        </button>
      </div>
    </form>
  );
}
