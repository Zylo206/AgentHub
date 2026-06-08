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
    ? "启动中..."
    : latestTriggerReady
      ? latestTriggerPrimaryLabel
      : "发送任务后确认协作";

  return (
    <>
      <div className="workspace-main__toolbar workspace-main__toolbar--collaboration">
        <div className="section-header">
          <h3>协作消息流</h3>
          <span>发送任务后确认启动，Agent 会在同一会话中按步骤回复。</span>
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
            title="高级运行工具用于本地排查；主路径仍从发送任务消息后确认协作开始。"
          >
            {showDebugActions ? "隐藏运行" : "高级运行"}
          </button>
        </div>
      </div>

      {showDebugActions ? (
        <div className="workspace-debug-panel" data-testid="debug-actions-panel">
          <div className="workspace-debug-panel__header">
            <strong>高级运行工具</strong>
            <p>用于本地排查和验收复现。默认工作流仍是发送任务消息后确认协作。</p>
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

      <div className="workspace-main__flow-guide" data-testid="workspace-flow-guide" aria-label="Agent collaboration flow">
        <span>主路径</span>
        <strong>发送任务</strong>
        <em>-&gt;</em>
        <strong>确认协作</strong>
        <em>-&gt;</em>
        <strong>Agent 回复</strong>
        <em>-&gt;</em>
        <strong>Artifact / Diff / Deploy</strong>
      </div>
    </>
  );
}
