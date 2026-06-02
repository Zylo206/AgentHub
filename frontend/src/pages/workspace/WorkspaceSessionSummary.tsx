import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import type { Conversation } from "../../features/conversations/conversationTypes";
import type { Message, TaskRun } from "../../features/chat/chatTypes";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { getIdValue } from "../../utils/id";

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
    return "暂无消息";
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

function getSessionMode(
  currentConversation: Conversation | null,
  selectedAgent: Agent | null,
  participants: WorkspaceSessionParticipant[]
): { label: string; detail: string; tone: "single" | "group" | "auto" | "idle" } {
  if (!currentConversation) {
    return {
      label: "等待选择会话",
      detail: "选择会话后展示单聊、群聊和上下文状态。",
      tone: "idle"
    };
  }

  if (selectedAgent) {
    return {
      label: "单聊优先",
      detail: `当前消息优先路由给 @${selectedAgent.name}，Orchestrator 仍可在需要时补充分工。`,
      tone: "single"
    };
  }

  if (currentConversation.type === "GROUP" || participants.length > 1) {
    return {
      label: "群聊协作",
      detail: "Orchestrator 会根据 @Agent、参与成员、工具能力和上下文分派任务。",
      tone: "group"
    };
  }

  return {
    label: "自动分派",
    detail: "未指定 Agent 时，根据任务意图、tool capability 和 Adapter 健康度选择合适 Agent。",
    tone: "auto"
  };
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
  const sessionMode = getSessionMode(currentConversation, selectedAgent, participants);
  const participantPreview = participants.slice(0, 5);
  const hiddenParticipantCount = Math.max(0, participants.length - participantPreview.length);
  const latestActivity = formatRelativeTime(currentConversation?.lastMessageAt || currentConversation?.updatedAt);
  const lastUserMessage = [...messages].reverse().find((message) => message.senderType === "USER");
  const lastUserTargetCount = (lastUserMessage?.mentionedAgentIds ?? []).length;
  const latestTaskRunStatus = latestTaskRun?.status || "NO_RUN";

  return (
    <section className={`workspace-session-summary workspace-session-summary--${sessionMode.tone}`} data-testid="workspace-session-summary">
      <div className="workspace-session-summary__main">
        <div className="workspace-session-summary__mode">
          <span>当前协作模式</span>
          <strong>{sessionMode.label}</strong>
          <p>{sessionMode.detail}</p>
        </div>
        <div className="workspace-session-summary__participants" aria-label="Conversation participants">
          {participantPreview.length > 0 ? (
            participantPreview.map((participant) => (
              <span key={participant.id} title={`${participant.name} / ${displayAgentRole(participant.role)}`}>
                {participant.name.slice(0, 1).toUpperCase()}
              </span>
            ))
          ) : (
            <span>O</span>
          )}
          {hiddenParticipantCount > 0 ? <em>+{hiddenParticipantCount}</em> : null}
        </div>
      </div>

      <div className="workspace-session-summary__grid">
        <article>
          <span>会话状态</span>
          <strong>{currentConversation ? latestActivity : "未开始"}</strong>
          <small>{currentConversation?.pinned ? "已置顶" : currentConversation?.archived ? "已归档" : "最近活跃排序"}</small>
        </article>
        <article>
          <span>路由目标</span>
          <strong>
            {selectedAgent
              ? `@${selectedAgent.name}`
              : lastUserTargetCount > 1
                ? `${lastUserTargetCount} 个 @Agent`
                : "Orchestrator"}
          </strong>
          <small>{selectedAgent ? selectedAgent.preferredAdapterType || "MOCK fallback" : "自动分派 / 多 Agent"}</small>
        </article>
        <article>
          <span>上下文连续</span>
          <strong>{pinnedContextCount + memoryCount} 条固定 / 记忆</strong>
          <small>{messages.length} 条消息 / {artifactCount} 个产物可检索</small>
        </article>
        <article>
          <span>最近执行</span>
          <strong>{latestTaskRunStatus}</strong>
          <small>{latestTaskRun ? `TaskRun ${getIdValue(latestTaskRun.id).slice(0, 8)}` : "等待协作启动"}</small>
        </article>
        <article>
          <span>Adapter</span>
          <strong>{selectedAgentAdapterDescriptor?.adapterType || selectedAgent?.preferredAdapterType || "AUTO"}</strong>
          <small className={selectedAgentAdapterDescriptor ? `workspace-session-summary__adapter workspace-session-summary__adapter--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}` : ""}>
            {selectedAgentAdapterDescriptor ? displayStatus(selectedAgentAdapterDescriptor.status) : "按路由选择"}
          </small>
        </article>
      </div>
    </section>
  );
}
