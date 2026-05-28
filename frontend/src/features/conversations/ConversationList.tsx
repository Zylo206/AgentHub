import type { Conversation } from "./conversationTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayConversationType } from "../../utils/displayLabels";

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
    return <div className="panel-empty">正在加载会话...</div>;
  }

  if (conversations.length === 0) {
    return <div className="panel-empty">暂无会话。创建一个 Demo 会话后开始。</div>;
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
            className={`conversation-item conversation-item--im ${isActive ? "conversation-item--active" : ""}`}
            onClick={() => onSelect(conversationId)}
          >
            <div className="conversation-item__row">
              <strong>{conversation.title}</strong>
              <span className="conversation-item__type">{displayConversationType(conversation.type)}</span>
            </div>
            <div className="conversation-item__meta">
              <span>{conversation.participantAgentIds.length} 个 Agent</span>
              <span>IM 协作会话</span>
            </div>
            <div className="conversation-item__time">{formatDateTime(conversation.updatedAt)}</div>
          </button>
        );
      })}
    </div>
  );
}
