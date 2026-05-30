import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const visibleConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...conversations]
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .filter((conversation) => {
        if (!normalizedQuery) {
          return true;
        }

        return [conversation.title, conversation.type, getIdValue(conversation.id)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [conversations, query]);

  if (loading) {
    return <div className="panel-empty">正在加载会话...</div>;
  }

  if (conversations.length === 0) {
    return <div className="panel-empty">暂无会话。创建一个 Demo 会话后开始。</div>;
  }

  return (
    <div className="conversation-list conversation-list--im">
      <div className="im-list-tools">
        <label className="im-search-box">
          <span>搜索</span>
          <input
            value={query}
            placeholder="搜索会话 / Agent / 类型"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="im-list-tools__chips" aria-label="Conversation capabilities">
          <span>最近活跃</span>
          <span>群聊协作</span>
          <span>上下文连续</span>
        </div>
      </div>

      {visibleConversations.length === 0 ? (
        <div className="panel-empty panel-empty--compact">没有匹配的会话。</div>
      ) : null}

      {visibleConversations.map((conversation) => {
        const conversationId = getIdValue(conversation.id);
        const isActive = conversationId === currentConversationId;
        const participantCount = conversation.participantAgentIds.length;

        return (
          <button
            type="button"
            key={formatId(conversation.id)}
            className={`conversation-item conversation-item--im ${isActive ? "conversation-item--active" : ""}`}
            onClick={() => onSelect(conversationId)}
          >
            <div className="conversation-item__row">
              <div className="conversation-item__identity">
                <span className="conversation-avatar">
                  {conversation.type === "GROUP" ? "群" : "单"}
                </span>
                <div>
                  <strong>{conversation.title}</strong>
                  <small>{participantCount > 1 ? "多 Agent 群聊" : "单聊 / 指定 Agent"}</small>
                </div>
              </div>
              <span className="conversation-item__type">{displayConversationType(conversation.type)}</span>
            </div>
            <div className="conversation-item__meta">
              <span>{participantCount} 个 Agent</span>
              <span>{participantCount > 1 ? "Orchestrator 自动分派" : "1v1 对话"}</span>
              <span>Artifact 内联</span>
            </div>
            <div className="conversation-item__time">{formatDateTime(conversation.updatedAt)}</div>
          </button>
        );
      })}
    </div>
  );
}
