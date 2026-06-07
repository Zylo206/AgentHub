import { useState } from "react";
import type { Conversation } from "../../features/conversations/conversationTypes";

type ConversationVisibility = "PRIVATE" | "ORG" | "PUBLIC";

interface WorkspaceAccessPanelProps {
  conversation: Conversation | null;
  saving: boolean;
  onUpdateVisibility: (visibility: ConversationVisibility, orgTag: string | null) => Promise<void>;
  onUpsertMember: (userId: string, memberRole: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

function getVisibilityLabel(visibility: ConversationVisibility | undefined): string {
  if (visibility === "PUBLIC") {
    return "公开";
  }
  if (visibility === "ORG") {
    return "组织";
  }
  return "私有";
}

export function WorkspaceAccessPanel({
  conversation,
  saving,
  onUpdateVisibility,
  onUpsertMember,
  onRemoveMember
}: WorkspaceAccessPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [memberUserId, setMemberUserId] = useState("reviewer-user");
  const [memberRole, setMemberRole] = useState("REVIEWER");

  if (!conversation) {
    return null;
  }

  const visibility = conversation.visibility ?? "PRIVATE";
  const orgTag = conversation.orgTag ?? "";
  const memberEntries = Object.entries(conversation.memberRoles ?? {});

  return (
    <section className="workspace-access-panel" data-testid="workspace-access-panel">
      <button
        type="button"
        className="workspace-access-panel__summary"
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          权限：{getVisibilityLabel(visibility)}
          {conversation.ownerUserId ? ` · Owner ${conversation.ownerUserId}` : ""}
        </span>
        <span>{expanded ? "收起" : "管理成员"}</span>
      </button>

      {expanded ? (
        <div className="workspace-access-panel__body">
          <div className="workspace-access-panel__row">
            <label>
              可见范围
              <select
                defaultValue={visibility}
                disabled={saving}
                onChange={(event) => void onUpdateVisibility(event.target.value as ConversationVisibility, orgTag || null)}
              >
                <option value="PRIVATE">PRIVATE · 仅成员</option>
                <option value="ORG">ORG · 组织内可见</option>
                <option value="PUBLIC">PUBLIC · Demo 公开</option>
              </select>
            </label>
            <label>
              组织标签
              <input
                defaultValue={orgTag}
                disabled={saving}
                placeholder="例如 default-org"
                onBlur={(event) => void onUpdateVisibility(visibility, event.target.value.trim() || null)}
              />
            </label>
          </div>

          <div className="workspace-access-panel__row">
            <label>
              成员 User ID
              <input
                value={memberUserId}
                disabled={saving}
                onChange={(event) => setMemberUserId(event.target.value)}
              />
            </label>
            <label>
              角色
              <select value={memberRole} disabled={saving} onChange={(event) => setMemberRole(event.target.value)}>
                <option value="VIEWER">VIEWER</option>
                <option value="REVIEWER">REVIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="OWNER">OWNER</option>
              </select>
            </label>
            <button
              type="button"
              className="primary-button"
              disabled={saving || !memberUserId.trim()}
              onClick={() => void onUpsertMember(memberUserId.trim(), memberRole)}
            >
              添加 / 更新
            </button>
          </div>

          <div className="workspace-access-panel__members">
            {memberEntries.length > 0 ? (
              memberEntries.map(([userId, role]) => (
                <span key={userId} className="workspace-access-panel__member">
                  {userId} · {role}
                  {userId !== conversation.ownerUserId ? (
                    <button type="button" disabled={saving} onClick={() => void onRemoveMember(userId)}>
                      移除
                    </button>
                  ) : null}
                </span>
              ))
            ) : (
              <span className="workspace-access-panel__empty">暂无显式成员，只有 owner 可访问。</span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
