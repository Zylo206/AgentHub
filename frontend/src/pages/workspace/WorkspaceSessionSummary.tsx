import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import type { Message, TaskRun } from "../../features/chat/chatTypes";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { displayAdapterName } from "../../utils/productionLabels";

interface WorkspaceSessionParticipant {
  id: string;
  name: string;
  role: string;
}

interface WorkspaceSessionSummaryProps {
  currentConversation: Conversation | null;
  selectedAgent: Agent | null;
  selectedAgentAdapterDescriptor: AdapterDescriptor | null;
  participants: WorkspaceSessionParticipant[];
  messages: Message[];
  latestTaskRun: TaskRun | null;
  pinnedContextCount: number;
  memoryCount: number;
  artifactCount: number;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) {
    return "暂无";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "未知";
  }

  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "刚刚";
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

export function WorkspaceSessionSummary({
  currentConversation,
  selectedAgent,
  selectedAgentAdapterDescriptor,
  participants,
  messages,
  latestTaskRun,
  pinnedContextCount,
  memoryCount,
  artifactCount
}: WorkspaceSessionSummaryProps) {
  if (!currentConversation) {
    return null;
  }

  const participantPreview = participants.slice(0, 4);
  const hiddenParticipantCount = Math.max(0, participants.length - participantPreview.length);
  const routeTarget = selectedAgent ? `@${selectedAgent.name}` : currentConversation.type === "GROUP" ? "多 Agent / Orchestrator" : "自动分派";
  const adapterLabel = selectedAgentAdapterDescriptor
    ? `${displayAdapterName(selectedAgentAdapterDescriptor.adapterType)} · ${displayStatus(selectedAgentAdapterDescriptor.status)}`
    : selectedAgent?.preferredAdapterType
      ? displayAdapterName(selectedAgent.preferredAdapterType)
      : "按路由选择";
  const contextCount = pinnedContextCount + memoryCount;

  return (
    <section
      className={`workspace-session-summary workspace-session-summary--${currentConversation.type === "GROUP" ? "group" : "single"}`}
      data-testid="workspace-session-summary"
    >
      <div className="workspace-session-summary__main">
        <div className="workspace-session-summary__mode">
          <span>会话补充信息</span>
          <strong>{routeTarget}</strong>
        </div>
        <div className="workspace-session-summary__participants" aria-label="Conversation participants">
          {participantPreview.map((participant) => (
            <span key={participant.id} title={participant.name}>
              {participant.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {hiddenParticipantCount > 0 ? <em>+{hiddenParticipantCount}</em> : null}
        </div>
      </div>

      <div className="workspace-session-summary__grid">
        <article>
          <span>最近活跃</span>
          <strong>{formatRelativeTime(currentConversation.lastMessageAt || currentConversation.updatedAt)}</strong>
          <small>{messages.length} 条消息</small>
        </article>
        <article>
          <span>执行状态</span>
          <strong>{latestTaskRun ? displayStatus(latestTaskRun.status) : "未启动"}</strong>
          <small>{latestTaskRun ? "已有 TaskRun" : "等待协作启动"}</small>
        </article>
        <article>
          <span>上下文</span>
          <strong>{contextCount > 0 ? `${contextCount} 项` : "无"}</strong>
          <small>{artifactCount} 个产物可引用</small>
        </article>
        <article>
          <span>Adapter</span>
          <strong>{selectedAgentAdapterDescriptor?.adapterType || selectedAgent?.preferredAdapterType || "AUTO"}</strong>
          <small
            className={
              selectedAgentAdapterDescriptor
                ? `workspace-session-summary__adapter workspace-session-summary__adapter--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}`
                : ""
            }
          >
            {adapterLabel}
          </small>
        </article>
      </div>
    </section>
  );
}
