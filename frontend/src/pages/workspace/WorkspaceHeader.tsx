import type { Conversation } from "../../features/conversations/conversationTypes";
import { displayAgentRole, displayConversationType } from "../../utils/displayLabels";

interface WorkspaceParticipantAgent {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceHeaderProps {
  currentConversation: Conversation | null;
  currentParticipantAgents: WorkspaceParticipantAgent[];
  actionAuditCount: number;
  realtimeStatus: string;
  activeRealtimeRunSummary: string | null;
}

export function WorkspaceHeader({
  currentConversation,
  currentParticipantAgents,
  actionAuditCount,
  realtimeStatus,
  activeRealtimeRunSummary
}: WorkspaceHeaderProps) {
  if (!currentConversation) {
    return null;
  }

  return (
    <div className="workspace-main__header">
      <div className="workspace-main__hero">
        <div>
          <span className="workspace-main__eyebrow">IM-first Multi-Agent Workspace</span>
          <h2>{currentConversation?.title || "暂无活跃会话"}</h2>
          <p>
            {currentConversation
              ? `${displayConversationType(currentConversation.type)} / ${currentConversation.participantAgentIds.length} 个 Agent · 通过消息触发协作、产物、审批和预览`
              : "创建一个会话后，像 IM 群聊一样发送任务，AgentHub 会建议启动多 Agent 协作。"}
          </p>
        </div>
        <div className="workspace-main__mode-card" aria-label="Current collaboration mode">
          <strong>{currentConversation?.type === "GROUP" ? "群聊协作" : "单聊模式"}</strong>
          <span>消息流 · TaskRun · Artifact</span>
        </div>
      </div>
      {currentConversation ? (
        <div className="workspace-session-strip" aria-label="当前会话状态">
          <span className="workspace-session-strip__status">运行中</span>
          <span>当前链路：Orchestrator → Specialist Agents → Reviewer</span>
          <span>{actionAuditCount} 条审计记录</span>
          <span>{realtimeStatus}</span>
        </div>
      ) : null}
      <div className="workspace-capability-strip" aria-label="IM capabilities">
        <span>文本 / 代码块</span>
        <span>文件附件</span>
        <span>Diff 视图</span>
        <span>部署状态卡片</span>
        <span>Pin 上下文</span>
      </div>
      {currentConversation ? (
        <div className="conversation-participants conversation-participants--agents" data-testid="conversation-participants">
          <span className="conversation-participants__label">当前群聊成员</span>
          <div className="conversation-participants__list">
            {currentParticipantAgents.map((participant) => (
              <span key={participant.id} className="conversation-participant-pill" title={participant.id}>
                {participant.name}
                <small>{displayAgentRole(participant.role)}</small>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {currentConversation ? (
        <div className="conversation-participants">
          <span className="conversation-participants__label">操作审计</span>
          <div className="conversation-participants__list">
            <span className="conversation-participant-pill">
              {actionAuditCount} 条记录
              <small>apply / deploy / restore</small>
            </span>
          </div>
        </div>
      ) : null}
      {currentConversation ? (
        <div className="conversation-participants">
          <span className="conversation-participants__label">实时状态</span>
          <div className="conversation-participants__list">
            <span className={`conversation-participant-pill realtime-pill realtime-pill--${realtimeStatus.toLowerCase()}`}>
              {realtimeStatus}
              <small>{activeRealtimeRunSummary || "SSE server push"}</small>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
