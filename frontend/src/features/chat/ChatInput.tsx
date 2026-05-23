import { FormEvent } from "react";
import type { Agent } from "../agents/agentTypes";
import type { Message } from "./chatTypes";
import { formatId } from "../../utils/id";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  selectedAgent?: Agent | null;
  quotedMessage?: Message | null;
  quoteMode?: "quote" | "reply";
  onChange: (value: string) => void;
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
  onChange,
  onClearQuote,
  onSend
}: ChatInputProps) {
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
          disabled={disabled || sending || !value.trim()}
        >
          {sending ? "发送中..." : "发送消息"}
        </button>
      </div>
    </form>
  );
}
