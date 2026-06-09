import type { Message } from "../../features/chat/chatTypes";

interface WorkspaceCollaborationToolbarProps {
  currentConversationId: string | null;
  latestUserMessage: Message | null;
  latestTriggerReady: boolean;
  latestTriggerPrimaryLabel: string;
  autoTriggerRunningMessageId: string | null;
  showDebugActions: boolean;
  runningDemoTask: boolean;
  onStartCollaboration: (message: Message) => void;
  onToggleDebugActions: () => void;
  onRunManualDebug: () => void;
}

export function WorkspaceCollaborationToolbar({
  currentConversationId,
  latestUserMessage,
  latestTriggerReady,
  latestTriggerPrimaryLabel,
  autoTriggerRunningMessageId,
  showDebugActions,
  runningDemoTask,
  onStartCollaboration,
  onToggleDebugActions,
  onRunManualDebug
}: WorkspaceCollaborationToolbarProps) {
  const primaryLabel = autoTriggerRunningMessageId
    ? "协作启动中..."
    : latestTriggerReady
      ? latestTriggerPrimaryLabel
      : "发送任务后确认协作";

  return (
    <>
      <div className="workspace-main__toolbar workspace-main__toolbar--collaboration">
        <div className="section-header">
          <h3>协作消息流</h3>
          <span>先发送任务消息，再由 Orchestrator 发起协作。</span>
        </div>
        <div className="workspace-main__collaboration-actions" data-testid="workspace-collaboration-actions">
          <button
            type="button"
            className="primary-button"
            data-testid="start-collaboration-primary"
            disabled={!currentConversationId || !latestUserMessage || !latestTriggerReady || Boolean(autoTriggerRunningMessageId)}
            onClick={() => latestUserMessage && onStartCollaboration(latestUserMessage)}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--quiet workspace-debug-toggle"
            data-testid="debug-actions-toggle"
            onClick={onToggleDebugActions}
            aria-expanded={showDebugActions}
            title="仅用于补跑、排查和验收，不改变默认协作链路。"
          >
            {showDebugActions ? "收起高级运行" : "高级运行"}
          </button>
        </div>
      </div>

      {showDebugActions ? (
        <div className="workspace-debug-panel" data-testid="debug-actions-panel">
          <div className="workspace-debug-panel__header">
            <strong>高级运行工具</strong>
            <p>用于本地补跑和验收复核，默认工作流仍以聊天协作为主。</p>
          </div>
          <button
            type="button"
            className="secondary-button secondary-button--quiet"
            data-testid="manual-debug-run"
            disabled={!currentConversationId || !latestUserMessage || runningDemoTask}
            onClick={onRunManualDebug}
          >
            {runningDemoTask ? "运行中..." : "基于最近消息运行"}
          </button>
        </div>
      ) : null}
    </>
  );
}
