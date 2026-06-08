import { useMemo, useState } from "react";
import type { Conversation } from "../../features/conversations/conversationTypes";

type ConversationVisibility = "PRIVATE" | "ORG" | "PUBLIC";
type ConversationMemberRole = "OWNER" | "EDITOR" | "REVIEWER" | "VIEWER";

interface WorkspaceAccessPanelProps {
  conversation: Conversation | null;
  saving: boolean;
  onUpdateVisibility: (visibility: ConversationVisibility, orgTag: string | null) => Promise<void>;
  onUpsertMember: (userId: string, memberRole: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}

const ROLE_DESCRIPTIONS: Record<ConversationMemberRole, string> = {
  OWNER: "可以管理会话、成员、权限和高风险操作。",
  EDITOR: "可以发送消息、运行任务，并参与 Artifact 修改。",
  REVIEWER: "可以评审、批准或拒绝高风险操作。",
  VIEWER: "只能查看会话、产物和运行证据。"
};

const ROLE_OPTIONS: ConversationMemberRole[] = ["VIEWER", "REVIEWER", "EDITOR", "OWNER"];
const QUICK_MEMBERS = ["demo-user", "reviewer-user", "operator-user"];

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
  saving,
  onUpdateVisibility,
  onUpsertMember,
  onRemoveMember
}: WorkspaceAccessPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [memberUserId, setMemberUserId] = useState("reviewer-user");
  const [memberRole, setMemberRole] = useState<ConversationMemberRole>("REVIEWER");

  const currentUserId = "demo-user";

  const currentUserRole = useMemo<ConversationMemberRole>(() => {
    if (!conversation) {
      return "VIEWER";
    }
    if (conversation.ownerUserId === currentUserId) {
      return "OWNER";
    }
    return normalizeRole(conversation.memberRoles?.[currentUserId] ?? "VIEWER");
  }, [conversation]);

  if (!conversation) {
    return null;
  }

  const visibility = conversation.visibility ?? "PRIVATE";
  const orgTag = conversation.orgTag ?? "";
  const memberEntries = Object.entries(conversation.memberRoles ?? {});
  const managementAllowed = canManage(currentUserRole);
  const disabledReason = managementAllowed ? "" : `当前用户是 ${currentUserRole}，只有 OWNER 可以修改成员和权限。`;

  return (
    <section className="workspace-access-panel" data-testid="workspace-access-panel">
      <button
        type="button"
        className="workspace-access-panel__summary"
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          权限：{getVisibilityLabel(visibility)}
          {conversation.ownerUserId ? ` / Owner ${conversation.ownerUserId}` : ""}
        </span>
        <span>{expanded ? "收起" : "管理成员"}</span>
      </button>

      {expanded ? (
        <div className="workspace-access-panel__body">
          <div className="workspace-access-panel__role-note">
            <strong>当前权限态</strong>
            <span>
              当前用户 {currentUserId} 是 {currentUserRole}。
              {managementAllowed ? " 可以调整可见范围、成员和角色。" : ` ${disabledReason}`}
            </span>
          </div>

          <div className="workspace-access-panel__role-description">
            <strong>角色说明：</strong>
            {ROLE_OPTIONS.map((role) => `${role}: ${ROLE_DESCRIPTIONS[role]}`).join(" / ")}
          </div>

          <div className="workspace-access-panel__row">
            <label>
              可见范围
              <select
                defaultValue={visibility}
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

          <div className="workspace-access-panel__row">
            <label>
              成员
              <input
                list="workspace-member-candidates"
                value={memberUserId}
                disabled={saving || !managementAllowed}
                onChange={(event) => setMemberUserId(event.target.value)}
                placeholder="输入或选择用户 ID"
              />
              <datalist id="workspace-member-candidates">
                {QUICK_MEMBERS.map((userId) => (
                  <option key={userId} value={userId} />
                ))}
              </datalist>
            </label>
            <label>
              角色
              <select
                value={memberRole}
                disabled={saving || !managementAllowed}
                onChange={(event) => setMemberRole(normalizeRole(event.target.value))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>{role}</option>
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
              <span className="workspace-access-panel__empty">暂无显式成员，只有 owner 可访问。</span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
