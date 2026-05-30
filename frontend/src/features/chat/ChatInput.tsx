import { FormEvent, useRef } from "react";
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
  onUploadFiles?: (files: File[]) => Promise<LightweightAttachment[]>;
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
  onUploadFiles,
  onClearQuote,
  onSend
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          source: "LOCAL_DEMO" as const
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
          <button type="button" className="ghost-button" data-testid="chat-quote-clear" onClick={onClearQuote}>
            取消引用
          </button>
        </div>
      ) : null}
      <textarea
        className="chat-input__textarea"
        data-testid="chat-input-textarea"
        rows={4}
        placeholder="发送消息，@Agent 或描述你的需求..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="chat-attachment-composer">
        <div className="chat-attachment-composer__header">
          <strong>轻量附件</strong>
          <span>不上传文件，只发送文件名、大小、类型和文本预览。</span>
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
            先发送任务消息。AgentHub 会先展示协作确认卡片，再启动 Orchestrator。
          </span>
          <span className="chat-input__hint">
            以 @AgentName 开头可以指定一个或多个 Agent。
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
