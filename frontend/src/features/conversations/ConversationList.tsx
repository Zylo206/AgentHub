import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { Conversation } from "./conversationTypes";
import { formatId, getIdValue } from "../../utils/id";
import { displayConversationType } from "../../utils/displayLabels";
import { sanitizeProductionText } from "../../utils/productionLabels";

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

interface ContextMenuState {
  conversation: Conversation;
  x: number;
  y: number;
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

function getConversationModeLabel(conversation: Conversation): string {
  if (conversation.type === "GROUP") {
    return "多 Agent 群聊";
  }
  return "单 Agent 对话";
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return undefined;
    }

    function closeContextMenu() {
      setContextMenu(null);
    }

    function handlePointerDown(event: MouseEvent | globalThis.MouseEvent) {
      const target = event.target as Node | null;
      if (target && contextMenuRef.current?.contains(target)) {
        return;
      }
      closeContextMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("scroll", closeContextMenu, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("scroll", closeContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

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

  function openContextMenu(event: MouseEvent, conversation: Conversation) {
    event.preventDefault();
    const menuWidth = 236;
    const menuHeight = conversation.archived ? 172 : 148;
    const leftBoundary = 8;
    const rightBoundary = window.innerWidth - menuWidth - 8;
    const topBoundary = 8;
    const bottomBoundary = window.innerHeight - menuHeight - 8;

    setContextMenu({
      conversation,
      x: Math.max(leftBoundary, Math.min(event.clientX, rightBoundary)),
      y: Math.max(topBoundary, Math.min(event.clientY, bottomBoundary))
    });
  }

  function handleContextAction(action: "pin" | "delete" | "restore") {
    if (!contextMenu) {
      return;
    }

    const { conversation } = contextMenu;
    setContextMenu(null);
    if (action === "pin") {
      onTogglePinned(conversation);
    } else if (action === "restore") {
      onRestore(conversation);
    } else {
      onArchive(conversation);
    }
  }

  return (
    <div className="conversation-list conversation-list--im" data-testid="conversation-list">
      <div className="im-list-tools">
        <label className="im-search-box">
          <span className="sr-only">搜索会话</span>
          <span className="im-search-box__control">
            <input
              data-testid="conversation-search-input"
              name="conversation-search"
              autoComplete="off"
              spellCheck={false}
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

        <div className="conversation-list-status" data-testid="conversation-list-status">
          <span>{visibleConversations.length} 条可见</span>
          <span>{loading ? "正在同步" : query ? "搜索结果" : "按最近活跃排序"}</span>
        </div>
      </div>

      {loading && conversations.length === 0 ? <div className="panel-empty">正在加载会话...</div> : null}

      {visibleConversations.length === 0 && !loading ? (
        <div className="conversation-empty-im" aria-label="Conversation empty state">
          <div className="conversation-empty-im__eyebrow">{query || filter !== "ALL" ? "没有匹配会话" : "暂无会话"}</div>
          <strong>{query || filter !== "ALL" ? "换个关键词，或切回全部会话。" : "点击“新建会话”开始一次协作。"}</strong>
          <p>这里展示真实会话列表，并保留未读、置顶和归档状态。</p>
          <div className="conversation-empty-im__hints">
            <span>搜索 Agent / 消息</span>
            <span>置顶关键协作</span>
            <span>右键管理会话</span>
          </div>
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
            onContextMenu={(event) => openContextMenu(event, conversation)}
          >
            <button
              type="button"
              className="conversation-item__main"
              onClick={() => onSelect(conversationId)}
              onContextMenu={(event) => openContextMenu(event, conversation)}
            >
              <div className="conversation-item__row">
                <div className="conversation-item__identity">
                  <span className="conversation-avatar">{conversation.type === "GROUP" ? "群" : "单"}</span>
                  <div>
                    <strong>{sanitizeProductionText(conversation.title)}</strong>
                    <small>{getConversationModeLabel(conversation)}</small>
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
          </article>
        );
      })}

      {contextMenu
        ? createPortal(
            <div
              ref={contextMenuRef}
              className="conversation-context-menu"
              role="menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" role="menuitem" onClick={() => handleContextAction("pin")}>
                {contextMenu.conversation.pinned ? "取消置顶" : "置顶会话"}
              </button>
              {contextMenu.conversation.archived ? (
                <button type="button" role="menuitem" onClick={() => handleContextAction("restore")}>
                  恢复会话
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="conversation-context-menu__danger"
                  onClick={() => handleContextAction("delete")}
                >
                  归档会话
                </button>
              )}
              <small>当前删除行为会先移动到归档，之后仍可恢复。</small>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
