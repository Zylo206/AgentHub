import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import type { TaskRun } from "../../features/chat/chatTypes";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { displayConversationType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";

interface WorkspaceParticipantAgent {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceHeaderProps {
  currentConversation: Conversation | null;
  currentParticipantAgents: WorkspaceParticipantAgent[];
  selectedAgent: Agent | null;
  selectedAgentAdapterDescriptor: AdapterDescriptor | null;
  latestTaskRun: TaskRun | null;
  messageCount: number;
  artifactCount: number;
  actionAuditCount: number;
  realtimeStatus: string;
  activeRealtimeRunSummary: string | null;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) {
    return "暂无活动";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "时间未知";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "刚刚活跃";
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  return new Date(value).toLocaleDateString();
}

export function WorkspaceHeader({
  currentConversation,
  currentParticipantAgents,
  selectedAgent,
  selectedAgentAdapterDescriptor,
  latestTaskRun,
  messageCount,
  artifactCount,
  actionAuditCount,
  realtimeStatus,
  activeRealtimeRunSummary
}: WorkspaceHeaderProps) {
  if (!currentConversation) {
    return null;
  }

  const participantCount = currentParticipantAgents.length || currentConversation.participantAgentIds.length;
  const isGroup = currentConversation.type === "GROUP";
  const title = sanitizeProductionText(currentConversation.title || "未选择会话");
  const realtimeHint = sanitizeProductionText(activeRealtimeRunSummary || "");
  const latestActivity = formatRelativeTime(currentConversation.lastMessageAt || currentConversation.updatedAt);
  const routeLabel = selectedAgent ? `@${selectedAgent.name}` : isGroup ? "Orchestrator 协作" : "自动分派";
  const latestRunStatus = latestTaskRun ? displayStatus(latestTaskRun.status) : null;
  const summaryLine = realtimeHint || (realtimeStatus === "CONNECTED" ? `最近活跃：${latestActivity}` : "等待协作开始");
  const stats = [
    { label: "消息", value: messageCount > 0 ? String(messageCount) : null },
    { label: "产物", value: artifactCount > 0 ? String(artifactCount) : null },
    { label: "审计", value: actionAuditCount > 0 ? String(actionAuditCount) : null }
  ].filter((item) => item.value);

  return (
    <div className="workspace-main__header">
      <div className="workspace-main__hero">
        <div className="workspace-main__hero-main">
          <h2>{title}</h2>
          <div className="workspace-main__hero-meta">
            <span
              className={isGroup ? "conversation-mode-badge conversation-mode-badge--group" : "conversation-mode-badge"}
            >
              {displayConversationType(currentConversation.type)}
            </span>
            <span className="workspace-main__hero-chip">{participantCount} 个 Agent</span>
            <span className="workspace-main__hero-chip">{routeLabel}</span>
            {latestRunStatus ? (
              <span className="workspace-main__hero-chip workspace-main__hero-chip--status">最近运行：{latestRunStatus}</span>
            ) : null}
            {selectedAgentAdapterDescriptor ? (
              <span
                className={`workspace-main__hero-chip workspace-main__hero-chip--adapter workspace-main__hero-chip--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}`}
              >
                {displayAdapterName(selectedAgentAdapterDescriptor.adapterType)} {displayStatus(selectedAgentAdapterDescriptor.status)}
              </span>
            ) : selectedAgent?.preferredAdapterType ? (
              <span className="workspace-main__hero-chip workspace-main__hero-chip--adapter">
                {displayAdapterName(selectedAgent.preferredAdapterType)}
              </span>
            ) : null}
          </div>
          <div className="workspace-main__hero-summary">{summaryLine}</div>
        </div>

        {stats.length > 0 ? (
          <div className="workspace-main__hero-stats" aria-label="Conversation stats">
            {stats.map((stat) => (
              <div key={stat.label} className="workspace-main__hero-stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
