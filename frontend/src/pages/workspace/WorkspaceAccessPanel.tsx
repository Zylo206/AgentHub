import { useEffect, useMemo, useRef, useState } from "react";
import { searchUserDirectory, type UserDirectoryItem } from "../../api/agenthubApi";
import type { Conversation } from "../../features/conversations/conversationTypes";

type ConversationVisibility = "PRIVATE" | "ORG" | "PUBLIC";
type ConversationMemberRole = "OWNER" | "EDITOR" | "REVIEWER" | "VIEWER";

interface WorkspaceAccessPanelProps {
  conversation: Conversation | null;
  currentUserId?: string | null;
  saving: boolean;
  mode?: "popover" | "panel";
  onUpdateVisibility: (visibility: ConversationVisibility, orgTag: string | null) => Promise<void>;
  onUpsertMember: (userId: string, memberRole: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

const ROLE_DESCRIPTIONS: Record<ConversationMemberRole, string> = {
  OWNER: "可管理会话、成员、权限以及高风险操作。",
  EDITOR: "可发送消息、运行任务，并参与 Artifact 修改。",
  REVIEWER: "可评审、批准或拒绝高风险操作。",
  VIEWER: "只能查看会话、产物和运行结果。"
};

const ROLE_OPTIONS: ConversationMemberRole[] = ["VIEWER", "REVIEWER", "EDITOR", "OWNER"];

function getVisibilityLabel(visibility: ConversationVisibility | undefined): string {
  if (visibility === "PUBLIC") {
    return "公开";
  }
  if (visibility === "ORG") {
    return "组织内可见";
  }
  return "仅成员可见";
}

function normalizeRole(role: string): ConversationMemberRole {
  if (role === "OWNER" || role === "EDITOR" || role === "REVIEWER" || role === "VIEWER") {
    return role;
  }
  return "VIEWER";
}

function canManage(role: ConversationMemberRole): boolean {
  return role === "OWNER";
}

export function WorkspaceAccessPanel({
  conversation,
  currentUserId,
  saving,
  mode = "popover",
  onUpdateVisibility,
  onUpsertMember,
  onRemoveMember
}: WorkspaceAccessPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<ConversationMemberRole>("REVIEWER");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<UserDirectoryItem[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentUserRole = useMemo<ConversationMemberRole>(() => {
    if (!conversation || !currentUserId) {
      return "VIEWER";
    }
    if (conversation.ownerUserId === currentUserId) {
      return "OWNER";
    }
    return normalizeRole(conversation.memberRoles?.[currentUserId] ?? "VIEWER");
  }, [conversation, currentUserId]);

  useEffect(() => {
    setExpanded(false);
    setMemberUserId("");
    setDirectoryQuery("");
  }, [conversation?.id]);

  useEffect(() => {
    if (mode !== "popover" || !expanded) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [expanded, mode]);

  useEffect(() => {
    if (mode === "popover" && !expanded) {
      return;
    }

    let cancelled = false;
    setDirectoryLoading(true);
    void searchUserDirectory(directoryQuery)
      .then((items) => {
        if (!cancelled) {
          setDirectoryResults(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDirectoryResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDirectoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [directoryQuery, expanded, mode]);

  if (!conversation) {
    return null;
  }

  const visibility = conversation.visibility ?? "PRIVATE";
  const orgTag = conversation.orgTag ?? "";
  const memberEntries = Object.entries(conversation.memberRoles ?? {});
  const managementAllowed = canManage(currentUserRole);
  const disabledReason = managementAllowed
    ? ""
    : `当前用户角色为 ${currentUserRole}，只有 OWNER 可以调整成员与权限。`;

  const body = (
    <div className="workspace-access-panel__body">
      <div className="workspace-access-panel__role-note">
        <strong>当前权限</strong>
        <span>
          当前用户 {currentUserId || "未登录"} 的角色是 {currentUserRole}。
          {managementAllowed ? " 你可以调整可见范围、成员和角色。" : ` ${disabledReason}`}
        </span>
      </div>

      <div className="workspace-access-panel__role-description">
        <strong>角色说明：</strong>
        {ROLE_OPTIONS.map((role) => `${role}: ${ROLE_DESCRIPTIONS[role]}`).join(" / ")}
      </div>

      <div className="workspace-access-panel__row workspace-access-panel__row--visibility">
        <label>
          可见范围
          <select
            value={visibility}
            disabled={saving || !managementAllowed}
            onChange={(event) => void onUpdateVisibility(event.target.value as ConversationVisibility, orgTag || null)}
          >
            <option value="PRIVATE">PRIVATE / 仅成员</option>
            <option value="ORG">ORG / 组织内可见</option>
            <option value="PUBLIC">PUBLIC / 公开可见</option>
          </select>
        </label>
        <label>
          组织标签
          <input
            defaultValue={orgTag}
            disabled={saving || !managementAllowed}
            placeholder="例如 default-org"
            onBlur={(event) => void onUpdateVisibility(visibility, event.target.value.trim() || null)}
          />
        </label>
      </div>

      <div className="workspace-access-panel__directory">
        <div className="workspace-access-panel__directory-header">
          <strong>成员目录</strong>
          <input
            value={directoryQuery}
            disabled={saving || !managementAllowed}
            onChange={(event) => setDirectoryQuery(event.target.value)}
            placeholder="搜索用户名、邮箱或显示名"
          />
        </div>
        <div className="workspace-access-panel__directory-list">
          {directoryLoading ? <span className="workspace-access-panel__empty">搜索中...</span> : null}
          {!directoryLoading && directoryResults.length === 0 ? (
            <span className="workspace-access-panel__empty">没有匹配用户。</span>
          ) : null}
          {!directoryLoading
            ? directoryResults.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  className={`workspace-access-panel__directory-item${
                    memberUserId === user.userId ? " workspace-access-panel__directory-item--selected" : ""
                  }`}
                  disabled={saving || !managementAllowed}
                  onClick={() => setMemberUserId(user.userId)}
                >
                  <span>
                    <strong>{user.displayName}</strong>
                    <small>
                      {user.username} / {user.email}
                    </small>
                  </span>
                  <em>
                    {user.role} / {user.primaryOrgTag}
                  </em>
                </button>
              ))
            : null}
        </div>
      </div>

      <div className="workspace-access-panel__row">
        <label>
          已选成员
          <input
            value={memberUserId}
            disabled={saving || !managementAllowed}
            onChange={(event) => setMemberUserId(event.target.value)}
            placeholder="从上方目录选择用户"
          />
        </label>
        <label>
          角色
          <select
            value={memberRole}
            disabled={saving || !managementAllowed}
            onChange={(event) => setMemberRole(normalizeRole(event.target.value))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="primary-button"
          title={disabledReason}
          disabled={saving || !managementAllowed || !memberUserId.trim()}
          onClick={() => void onUpsertMember(memberUserId.trim(), memberRole)}
        >
          添加 / 更新
        </button>
      </div>

      <p className="workspace-access-panel__role-description">{ROLE_DESCRIPTIONS[memberRole]}</p>

      <div className="workspace-access-panel__members">
        {memberEntries.length > 0 ? (
          memberEntries.map(([userId, role]) => (
            <span key={userId} className="workspace-access-panel__member">
              {userId} / {role}
              {userId !== conversation.ownerUserId ? (
                <button
                  type="button"
                  title={disabledReason}
                  disabled={saving || !managementAllowed}
                  onClick={() => void onRemoveMember(userId)}
                >
                  移除
                </button>
              ) : null}
            </span>
          ))
        ) : (
          <span className="workspace-access-panel__empty">暂无显式成员，目前只有 owner 可访问。</span>
        )}
      </div>
    </div>
  );

  if (mode === "panel") {
    return (
      <div className="workspace-access-panel workspace-access-panel--panel" data-testid="workspace-access-panel">
        {body}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="workspace-access-panel workspace-access-panel--popover"
      data-testid="workspace-access-panel"
    >
      <button
        type="button"
        className="workspace-access-panel__trigger"
        onClick={() => setExpanded((current) => !current)}
      >
        <span>成员与权限</span>
        <small>{expanded ? "收起" : `${getVisibilityLabel(visibility)} / ${currentUserRole}`}</small>
      </button>

      {expanded ? (
        <div className="workspace-access-panel__popover">
          <div className="workspace-access-panel__popover-header">
            <div>
              <strong>会话权限</strong>
              <small>
                {getVisibilityLabel(visibility)}
                {conversation.ownerUserId ? ` / Owner ${conversation.ownerUserId}` : ""}
              </small>
            </div>
            <button type="button" className="workspace-access-panel__close" onClick={() => setExpanded(false)}>
              关闭
            </button>
          </div>
          {body}
        </div>
      ) : null}
    </div>
  );
}
