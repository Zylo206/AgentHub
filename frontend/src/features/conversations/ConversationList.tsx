import type { Conversation } from "./conversationTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayConversationType } from "../../utils/displayLabels";

export type ConversationFilter = "ALL" | "UNREAD" | "PINNED" | "ARCHIVED";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  loading: boolean;
  query: string;
  filter: ConversationFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: ConversationFilter) => void;
  onSelect: (conversationId: string) => void;
  onTogglePinned: (conversation: Conversation) => void;
  onArchive: (conversation: Conversation) => void;
  onRestore: (conversation: Conversation) => void;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function getActivityTime(conversation: Conversation): string {
  return conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt;
}

export function ConversationList({
  conversations,
  currentConversationId,
  loading,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  onSelect,
  onTogglePinned,
  onArchive,
  onRestore
}: ConversationListProps) {
  if (loading) {
    return <div className="panel-empty">正在加载会话...</div>;
  }

  const activeConversations = conversations.filter((conversation) => !conversation.archived);
  const archivedConversations = conversations.filter((conversation) => conversation.archived);
  const unreadConversations = activeConversations.filter((conversation) => (conversation.unreadCount ?? 0) > 0);
  const pinnedConversations = activeConversations.filter((conversation) => conversation.pinned);
  const visibleConversations = conversations.filter((conversation) => {
    if (filter === "ARCHIVED") {
      return Boolean(conversation.archived);
    }
    if (filter === "UNREAD") {
      return !conversation.archived && (conversation.unreadCount ?? 0) > 0;
    }
    if (filter === "PINNED") {
      return !conversation.archived && Boolean(conversation.pinned);
    }
    return !conversation.archived;
  });
  const filters: Array<{ key: ConversationFilter; label: string; count: number }> = [
    { key: "ALL", label: "全部", count: activeConversations.length },
    { key: "UNREAD", label: "未读", count: unreadConversations.length },
    { key: "PINNED", label: "置顶", count: pinnedConversations.length },
    { key: "ARCHIVED", label: "归档", count: archivedConversations.length }
  ];

  return (
    <div className="conversation-list conversation-list--im" data-testid="conversation-list">
      <div className="im-list-tools">
        <label className="im-search-box">
          <span>搜索</span>
          <span className="im-search-box__control">
            <input
              data-testid="conversation-search-input"
              value={query}
              placeholder="搜索会话 / Agent / 消息"
              onChange={(event) => onQueryChange(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                data-testid="conversation-search-clear"
                className="conversation-search-clear"
                onClick={() => onQueryChange("")}
              >
                清空
              </button>
            ) : null}
          </span>
        </label>
        <div className="conversation-filter-tabs" aria-label="Conversation filters">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              data-testid={`conversation-filter-${item.key.toLowerCase()}`}
              className={["conversation-filter-tab", filter === item.key ? "conversation-filter-tab--active" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onFilterChange(item.key)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
        <div className="im-list-tools__chips" aria-label="Conversation capabilities">
          <span>最近活跃</span>
          <span>置顶优先</span>
          <span>未读追踪</span>
        </div>
      </div>

      {visibleConversations.length === 0 ? (
        <div className="panel-empty panel-empty--compact">
          {query || filter !== "ALL" ? "没有匹配的会话。" : "暂无会话。创建一个 Demo 会话后开始。"}
        </div>
      ) : null}

      {visibleConversations.map((conversation) => {
        const conversationId = getIdValue(conversation.id);
        const isActive = conversationId === currentConversationId;
        const participantCount = conversation.participantAgentIds.length;
        const unreadCount = conversation.unreadCount ?? 0;
        const archived = Boolean(conversation.archived);
        const pinned = Boolean(conversation.pinned);

        return (
          <article
            key={formatId(conversation.id)}
            className={[
              "conversation-item",
              "conversation-item--im",
              isActive ? "conversation-item--active" : "",
              archived ? "conversation-item--archived" : "",
              pinned ? "conversation-item--pinned" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            data-testid="conversation-item"
            data-conversation-id={conversationId}
          >
            <button
              type="button"
              className="conversation-item__main"
              onClick={() => onSelect(conversationId)}
            >
              <div className="conversation-item__row">
                <div className="conversation-item__identity">
                  <span className="conversation-avatar">{conversation.type === "GROUP" ? "群" : "单"}</span>
                  <div>
                    <strong>{conversation.title}</strong>
                    <small>{participantCount > 1 ? "多 Agent 群聊" : "单聊 / 指定 Agent"}</small>
                  </div>
                </div>
                <span className="conversation-item__type">{displayConversationType(conversation.type)}</span>
              </div>
              <div className="conversation-item__meta">
                <span>{participantCount} 个 Agent</span>
                <span>{pinned ? "已置顶" : "普通排序"}</span>
                <span>{archived ? "已归档" : "活跃会话"}</span>
              </div>
              <div className="conversation-item__footer">
                <span className="conversation-item__time">{formatDateTime(getActivityTime(conversation))}</span>
                {unreadCount > 0 ? (
                  <span className="conversation-unread-badge" data-testid="conversation-unread-badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </div>
            </button>

            <div className="conversation-item__actions" aria-label="Conversation actions">
              <button
                type="button"
                data-testid="conversation-pin-button"
                className="conversation-action-button"
                onClick={() => onTogglePinned(conversation)}
              >
                {pinned ? "取消置顶" : "置顶"}
              </button>
              {archived ? (
                <button
                  type="button"
                  data-testid="conversation-restore-button"
                  className="conversation-action-button"
                  onClick={() => onRestore(conversation)}
                >
                  恢复
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="conversation-archive-button"
                  className="conversation-action-button conversation-action-button--muted"
                  onClick={() => onArchive(conversation)}
                >
                  归档
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
