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
  return (
    <>
      <div className="workspace-main__toolbar workspace-main__toolbar--collaboration">
        <div className="section-header">
          <h3>协作消息流</h3>
          <span>发送任务后，通过消息卡片确认 Agent 协作。</span>
        </div>
        <div className="workspace-main__collaboration-actions" data-testid="workspace-collaboration-actions">
          <button
            type="button"
            className="primary-button"
            data-testid="start-collaboration-primary"
            disabled={!currentConversationId || !latestUserMessage || !latestTriggerReady || Boolean(autoTriggerRunningMessageId)}
            onClick={() => latestUserMessage && onStartCollaboration(latestUserMessage)}
          >
            {autoTriggerRunningMessageId ? "启动中..." : latestTriggerReady ? latestTriggerPrimaryLabel : "发送任务消息后确认协作"}
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--quiet workspace-debug-toggle"
            data-testid="debug-actions-toggle"
            onClick={onToggleDebugActions}
            aria-expanded={showDebugActions}
            title="调试工具是次要入口；产品主路径从消息确认开始。"
          >
            {showDebugActions ? "隐藏调试工具" : "调试 / 高级"}
          </button>
        </div>
      </div>

      {showDebugActions ? (
        <div className="workspace-debug-panel" data-testid="debug-actions-panel">
          <div className="workspace-debug-panel__header">
            <strong>手动调试 fallback</strong>
            <p>仅用于 smoke test 或本地调试。产品主路径是消息确认后启动协作。</p>
          </div>
          <button
            type="button"
            className="secondary-button secondary-button--quiet"
            data-testid="manual-debug-run"
            disabled={!currentConversationId || !latestUserMessage || runningDemoTask}
            onClick={onRunManualDebug}
          >
            {runningDemoTask ? "运行中..." : "手动调试运行"}
          </button>
        </div>
      ) : null}

      <div className="workspace-main__flow-guide" data-testid="workspace-flow-guide" aria-label="Agent collaboration flow">
        <span>主路径</span>
        <strong>发送任务消息</strong>
        <em>→</em>
        <strong>确认协作</strong>
        <em>→</em>
        <strong>Orchestrator 执行</strong>
        <em>→</em>
        <strong>查看 Artifact / 审批 / Preview</strong>
      </div>
    </>
  );
}
