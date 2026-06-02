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

  const isGroup = currentConversation.type === "GROUP";
  const participantCount = currentParticipantAgents.length || currentConversation.participantAgentIds.length;

  return (
    <div className="workspace-main__header">
      <div className="workspace-main__hero">
        <div>
          <span className="workspace-main__eyebrow">IM-first multi-agent workspace</span>
          <h2>{currentConversation.title || "未选择会话"}</h2>
          <p>
            {displayConversationType(currentConversation.type)} · {participantCount} 个 Agent ·
            发送任务消息后确认协作，Orchestrator 会分派、执行并汇总产物。
          </p>
        </div>
        <div className="workspace-main__mode-card" aria-label="当前协作模式">
          <strong>{isGroup ? "群聊协作" : "单聊优先"}</strong>
          <span>消息流 · TaskRun · Artifact</span>
        </div>
      </div>

      <div className="workspace-session-strip" aria-label="当前会话状态">
        <span className="workspace-session-strip__status">运行中</span>
        <span>Orchestrator → Specialist Agents → Reviewer</span>
        <span>{actionAuditCount} 条审计记录</span>
        <span>{realtimeStatus}</span>
      </div>

      <div className="workspace-capability-strip" aria-label="IM capabilities">
        <span>文本 / 代码块</span>
        <span>文件附件</span>
        <span>Diff 视图</span>
        <span>部署状态卡片</span>
        <span>Pin 上下文</span>
      </div>

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

      <div className="conversation-participants conversation-participants--compact">
        <span className="conversation-participants__label">运行信号</span>
        <div className="conversation-participants__list">
          <span className="conversation-participant-pill">
            审计 {actionAuditCount}
            <small>apply / deploy / restore</small>
          </span>
          <span className={`conversation-participant-pill realtime-pill realtime-pill--${realtimeStatus.toLowerCase()}`}>
            {realtimeStatus}
            <small>{activeRealtimeRunSummary || "SSE server push"}</small>
          </span>
        </div>
      </div>
    </div>
  );
}
