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
  return (
    <div className="workspace-main__header">
      <h2>{currentConversation?.title || "暂无活跃会话"}</h2>
      <p>
        {currentConversation
          ? `${displayConversationType(currentConversation.type)} / ${currentConversation.participantAgentIds.length} 个 Agent`
          : "创建一个 Demo 会话后开始 AgentHub 流程。"}
      </p>
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
