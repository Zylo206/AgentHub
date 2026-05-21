import { FormEvent } from "react";
import type { Agent } from "../agents/agentTypes";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  selectedAgent?: Agent | null;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({
  value,
  disabled,
  sending,
  selectedAgent,
  onChange,
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
            <span className="chat-input__hint">via {selectedAgent.preferredAdapterType || "MOCK"}</span>
          </>
        ) : (
          <span className="chat-input__hint">No target agent selected</span>
        )}
      </div>
      <textarea
        className="chat-input__textarea"
        rows={4}
        placeholder="Describe a multi-step task for AgentHub..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="chat-input__actions">
        <div className="chat-input__hint-group">
          <span className="chat-input__hint">
            Use chat as the main entry, then trigger Demo Task for Orchestrator flow.
          </span>
          <span className="chat-input__hint">
            You can type @AgentName at the beginning of a message.
          </span>
        </div>
        <button
          type="submit"
          className="primary-button"
          disabled={disabled || sending || !value.trim()}
        >
          {sending ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
}
