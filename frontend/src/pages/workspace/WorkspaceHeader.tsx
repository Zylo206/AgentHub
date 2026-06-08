import type { Conversation } from "../../features/conversations/conversationTypes";
import { displayConversationType } from "../../utils/displayLabels";
import { sanitizeProductionText } from "../../utils/productionLabels";

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
  realtimeStatus,
  activeRealtimeRunSummary
}: WorkspaceHeaderProps) {
  if (!currentConversation) {
    return null;
  }

  const participantCount = currentParticipantAgents.length || currentConversation.participantAgentIds.length;
  const runHint = activeRealtimeRunSummary || realtimeStatus;
  const isGroup = currentConversation.type === "GROUP";
  const title = sanitizeProductionText(currentConversation.title || "未选择会话");

  return (
    <div className="workspace-main__header">
      <div className="workspace-main__hero">
        <div>
          <h2>{title}</h2>
          <p>
            <span className={isGroup ? "conversation-mode-badge conversation-mode-badge--group" : "conversation-mode-badge"}>
              {displayConversationType(currentConversation.type)}
            </span>
            <span>{participantCount} 个 Agent</span>
            <span>{runHint}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
