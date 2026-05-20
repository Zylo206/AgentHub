import type { Conversation } from "./conversationTypes";
import { formatId, getIdValue } from "../../utils/id";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  loading: boolean;
  onSelect: (conversationId: string) => void;
}

function formatDateTime(value: string): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

export function ConversationList({
  conversations,
  currentConversationId,
  loading,
  onSelect
}: ConversationListProps) {
  if (loading) {
    return <div className="panel-empty">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return <div className="panel-empty">No conversation yet. Create a demo conversation to start.</div>;
  }

  return (
    <div className="conversation-list">
      {conversations.map((conversation) => {
        const conversationId = getIdValue(conversation.id);
        const isActive = conversationId === currentConversationId;

        return (
          <button
            type="button"
            key={formatId(conversation.id)}
            className={`conversation-item ${isActive ? "conversation-item--active" : ""}`}
            onClick={() => onSelect(conversationId)}
          >
            <div className="conversation-item__row">
              <strong>{conversation.title}</strong>
              <span className="conversation-item__type">{conversation.type}</span>
            </div>
            <div className="conversation-item__meta">
              {conversation.participantAgentIds.length} agents
            </div>
            <div className="conversation-item__time">{formatDateTime(conversation.updatedAt)}</div>
          </button>
        );
      })}
    </div>
  );
}
