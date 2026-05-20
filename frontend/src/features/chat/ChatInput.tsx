import { FormEvent } from "react";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  sending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, disabled, sending, onChange, onSend }: ChatInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!disabled && !sending) {
      onSend();
    }
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <textarea
        className="chat-input__textarea"
        rows={4}
        placeholder="Describe a multi-step task for AgentHub..."
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="chat-input__actions">
        <span className="chat-input__hint">
          Use chat as the main entry, then trigger Demo Task for Orchestrator flow.
        </span>
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
