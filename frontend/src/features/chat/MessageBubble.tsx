import type { ApprovalRequest } from "../approval/approvalTypes";
import type { Artifact } from "../artifacts/artifactTypes";
import type { AgentCreationDraft } from "../agents/conversationalAgentDraft";
import type { DeployIntentDraft, LightweightAttachment, Message, OrchestratorTriggerSuggestion } from "./chatTypes";
import { getAttachmentDownloadUrl } from "../../api/agenthubApi";
import { formatId, getIdValue } from "../../utils/id";

interface MessageBubbleProps {
  message: Message;
  senderLabel: string;
  senderRoleLabel?: string | null;
  agentStepLabel?: string | null;
  targetAgentLabel?: string | null;
  pinnedContextId?: string | null;
  savedAsMemory?: boolean;
  artifacts?: Artifact[];
  rerunning?: boolean;
  regenerating?: boolean;
  autoTriggerSuggestion?: OrchestratorTriggerSuggestion | null;
  autoTriggerApproval?: ApprovalRequest | null;
  autoTriggerRunning?: boolean;
  agentCreationDraft?: AgentCreationDraft | null;
  agentCreationRunning?: boolean;
  deployIntent?: DeployIntentDraft | null;
  deployIntentArtifact?: Artifact | null;
  deployIntentRunning?: boolean;
  replyMessages?: Message[];
  threadExpanded?: boolean;
  highlighted?: boolean;
  onSelectArtifact: (artifactId: string) => void;
  onTogglePin: (messageId: string, pinnedContextId?: string | null) => void;
  onSaveAsMemory: (message: Message) => void;
  onCopyMessage: (message: Message) => void;
  onQuoteMessage: (message: Message) => void;
  onReplyMessage: (message: Message) => void;
  onRerunFromMessage: (message: Message) => void;
  onRegenerateAgentReply: (message: Message) => void;
  onConfirmOrchestratorTrigger: (message: Message) => void;
  onCancelOrchestratorTrigger: (approvalId: string) => void;
  onRefreshOrchestratorSuggestion: (message: Message) => void;
  onConfirmAgentCreation: (messageId: string) => void;
  onCancelAgentCreation: (messageId: string) => void;
  onStartDeployIntent: (message: Message, artifactId?: string | null) => void;
  onApproveDeployIntent: (messageId: string) => void;
  onCancelDeployIntent: (messageId: string) => void;
  onDownloadArtifactBundle: (artifactIds?: string[]) => void;
  onToggleThread: () => void;
  onJumpToMessage: (messageId: string) => void;
}

type ProtocolTone = "TASK" | "RESULT" | "REVIEW" | "APPROVAL" | "REJECTION" | "ERROR";

function getBubbleVariant(message: Message): string {
  if (message.senderType === "USER") {
    return "user";
  }

  if (["TASK", "RESULT", "REVIEW", "APPROVAL", "REJECTION", "ERROR"].includes(message.messageType)) {
    return `agent-protocol agent-protocol--${message.messageType.toLowerCase()}`;
  }

  if (message.senderType === "AGENT") {
    return "agent";
  }

  if (message.messageType === "ARTIFACT_CARD") {
    return "artifact-card";
  }

  if (message.messageType === "TASK_SPEC") {
    return "task-spec";
  }

  if (message.messageType === "TASK_STATUS") {
    return "task-status";
  }

  if (message.messageType === "DEPLOY_STATUS") {
    return "deploy-status";
  }

  return "system";
}

function getProtocolLabel(messageType: string): ProtocolTone | null {
  return ["TASK", "RESULT", "REVIEW", "APPROVAL", "REJECTION", "ERROR"].includes(messageType)
    ? (messageType as ProtocolTone)
    : null;
}

function getProtocolDescription(messageType: string): string {
  const descriptions: Record<ProtocolTone, string> = {
    TASK: "Orchestrator 正在拆解任务、分配 Agent 和上下文。",
    RESULT: "Specialist Agent 返回了本步骤产出或执行结果。",
    REVIEW: "Reviewer 正在检查质量、风险和可交付性。",
    APPROVAL: "协作链路通过当前评审，可继续进入产物操作。",
    REJECTION: "评审发现阻塞问题，需要先修复后再继续。",
    ERROR: "协作链路遇到错误，请查看失败原因和 fallback 状态。"
  };

  return descriptions[messageType as ProtocolTone] || "Agent 协作状态更新。";
}

function getProtocolCta(messageType: string): string {
  const ctas: Record<ProtocolTone, string> = {
    TASK: "查看计划",
    RESULT: "查看产物",
    REVIEW: "查看评审",
    APPROVAL: "继续交付",
    REJECTION: "按建议修复",
    ERROR: "查看错误"
  };

  return ctas[messageType as ProtocolTone] || "查看详情";
}

function getAgentLane(message: Message): "orchestrator" | "specialist" | "system" {
  if (message.senderType !== "AGENT") {
    return "system";
  }

  return message.senderId === "agent_orchestrator" ? "orchestrator" : "specialist";
}

function getReferenceMessageId(message: Message): string | null {
  return message.replyToMessageId || message.quotedMessageId || null;
}

function getMessagePreview(message: Message): string {
  const content = message.content || "";
  return content.length > 120 ? `${content.slice(0, 120)}...` : content;
}

function getApprovalStatus(approval?: ApprovalRequest | null): string | null {
  return approval?.status ? approval.status.toUpperCase() : null;
}

function getAutoTriggerStatus(
  suggestion?: OrchestratorTriggerSuggestion | null,
  approval?: ApprovalRequest | null
): { label: string; tone: "pending" | "ready" | "done"; canRun: boolean; actionLabel: string; detail: string } | null {
  if (!suggestion || !suggestion.enabled || !suggestion.matched) {
    return null;
  }

  const approvalStatus = getApprovalStatus(approval ?? suggestion.pendingApproval);
  if (approvalStatus === "CONSUMED") {
    return {
      label: "协作已启动",
      tone: "done",
      canRun: false,
      actionLabel: "已启动",
      detail: "Orchestrator 已消费确认请求，并开始执行协作流程。"
    };
  }

  if (approvalStatus === "CANCELLED" || approvalStatus === "EXPIRED") {
    return {
      label: approvalStatus === "CANCELLED" ? "确认已取消" : "确认已过期",
      tone: "pending",
      canRun: true,
      actionLabel: "重新创建确认",
      detail: suggestion.reason
    };
  }

  if (suggestion.requireApproval) {
    if (!approvalStatus) {
      return {
        label: "从这条消息启动协作",
        tone: "pending",
        canRun: true,
        actionLabel: "创建协作确认",
        detail: suggestion.reason
      };
    }

    return {
      label: approvalStatus === "APPROVED" ? "已确认，等待启动" : "需要确认协作",
      tone: approvalStatus === "APPROVED" ? "ready" : "pending",
      canRun: true,
      actionLabel: approvalStatus === "APPROVED" ? "启动已确认协作" : "确认并启动",
      detail: suggestion.reason
    };
  }

  return {
    label: "建议启动协作",
    tone: "ready",
    canRun: true,
    actionLabel: "启动协作",
    detail: suggestion.reason
  };
}

function getTaskSummary(message: Message): string {
  const normalized = (message.content || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "使用附件和上下文作为任务需求。";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function hasAnyToken(content: string, tokens: string[]): boolean {
  const lower = content.toLowerCase();
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

function getExpectedAgents(message: Message, targetAgentLabel?: string | null): string[] {
  const content = message.content || "";
  const agents = ["Orchestrator"];

  if (targetAgentLabel) {
    agents.push(...targetAgentLabel.split("@").map((label) => label.trim()).filter(Boolean));
  }
  if (hasAnyToken(content, ["react", "ui", "page", "login", "页面", "前端", "代码"])) {
    agents.push("Frontend Builder");
  }
  if (hasAnyToken(content, ["api", "backend", "接口", "后端", "数据结构"])) {
    agents.push("Backend Worker");
  }
  if (hasAnyToken(content, ["review", "检查", "质量", "建议", "blocker"])) {
    agents.push("Reviewer");
  }
  if (agents.length === 1) {
    agents.push("Frontend Builder", "Backend Worker", "Reviewer");
  }

  return Array.from(new Set(agents));
}

function getExpectedArtifacts(message: Message): string[] {
  const content = message.content || "";
  const artifacts: string[] = [];

  if (hasAnyToken(content, ["react", "ui", "page", "login", "页面", "前端", "代码"])) {
    artifacts.push("CODE");
  }
  if (hasAnyToken(content, ["readme", "doc", "文档", "说明"])) {
    artifacts.push("MARKDOWN");
  }
  if (hasAnyToken(content, ["api", "backend", "接口", "后端", "数据结构"])) {
    artifacts.push("API_CONTRACT");
  }
  if (hasAnyToken(content, ["review", "检查", "质量", "建议", "blocker"])) {
    artifacts.push("REVIEW_REPORT");
  }

  return artifacts.length > 0 ? Array.from(new Set(artifacts)) : ["CODE", "MARKDOWN", "REVIEW_REPORT"];
}

function getContextSources(message: Message): string[] {
  const sources = ["最近会话"];

  if (message.replyToMessageId || message.quotedMessageId) {
    sources.push("引用消息");
  }
  if ((message.attachments ?? []).length > 0) {
    sources.push("附件");
  }
  if ((message.mentionedAgentIds ?? []).length > 0 || message.targetAgentId) {
    sources.push("@Agent 目标");
  }

  return sources;
}

function isDownloadableAttachment(attachmentId?: string | null): boolean {
  return Boolean(attachmentId && !attachmentId.startsWith("demo-") && !attachmentId.startsWith("local-"));
}

function getAttachmentDownloadHref(attachment: LightweightAttachment): string | null {
  return isDownloadableAttachment(attachment.attachmentId)
    ? getAttachmentDownloadUrl(attachment.attachmentId as string)
    : null;
}

function getMessageKind(message: Message, attachments: Message["attachments"], artifacts: Artifact[]): {
  label: string;
  detail: string;
  tone: string;
} {
  if (message.messageType === "DEPLOY_STATUS") {
    return { label: "Deploy Status", detail: "部署状态卡 / 本地 Preview URL", tone: "deploy" };
  }
  if (message.messageType === "ARTIFACT_CARD" || artifacts.length > 0) {
    return { label: "Artifact", detail: "产物卡片 / 可选择预览", tone: "artifact" };
  }
  if (message.messageType === "TASK_STATUS") {
    return { label: "Task Status", detail: "任务状态 / 执行进度", tone: "task" };
  }
  if (message.messageType === "TASK_SPEC") {
    return { label: "Task Spec", detail: "任务规格 / 协作输入", tone: "task" };
  }
  if ((attachments ?? []).length > 0) {
    return { label: "Attachment", detail: "文件附件预览 / 下载", tone: "attachment" };
  }
  if (message.content.includes("Diff") || message.content.includes("diff") || message.content.includes("增删")) {
    return { label: "Diff", detail: "变更摘要 / 风险判断", tone: "diff" };
  }
  if (message.content.includes("/preview/") || message.content.includes("Preview URL")) {
    return { label: "Preview", detail: "预览卡片 / 本地静态页面", tone: "preview" };
  }
  return { label: "Text", detail: "文本消息 / 可复制引用", tone: "text" };
}

function getAttachmentKind(attachment: LightweightAttachment): {
  label: string;
  boundary: string;
  tone: string;
} {
  const contentType = String(attachment.contentType || attachment.mimeType || "").toLowerCase();
  const fileName = attachment.fileName.toLowerCase();

  if (contentType.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(fileName)) {
    return { label: "图片附件", boundary: "文件附件预览：暂不做图片编辑或 OCR。", tone: "image" };
  }
  if (
    contentType.includes("presentation") ||
    contentType.includes("powerpoint") ||
    /\.(ppt|pptx)$/.test(fileName)
  ) {
    return { label: "PPT 附件", boundary: "文件附件预览：暂不做 PPT 在线渲染。", tone: "ppt" };
  }
  if (contentType.startsWith("text/") || /\.(md|txt|json|yaml|yml|csv)$/.test(fileName)) {
    return { label: "文本附件", boundary: "显示文本摘要，原文件可下载。", tone: "text" };
  }
  return { label: "文件附件", boundary: "仅展示 metadata / download，不做富媒体渲染。", tone: "file" };
}

function getSourceLabel(sourceKind?: string | null): string {
  if (!sourceKind) {
    return "UNKNOWN_SOURCE";
  }
  return sourceKind;
}

function getQualityLabel(artifact: Artifact): string {
  return artifact.realAdapterOutcome || artifact.qualityStatus || artifact.status || "UNKNOWN";
}

function getDeployIntentStatusLabel(status: DeployIntentDraft["status"]): string {
  const labels: Record<DeployIntentDraft["status"], string> = {
    PENDING: "等待确认",
    APPROVAL_REQUIRED: "等待审批",
    DEPLOYING: "正在生成预览",
    COMPLETED: "已生成预览",
    CANCELLED: "已取消",
    FAILED: "失败"
  };
  return labels[status] || status;
}

export function MessageBubble({
  message,
  senderLabel,
  senderRoleLabel,
  agentStepLabel,
  targetAgentLabel,
  pinnedContextId,
  savedAsMemory = false,
  artifacts = [],
  rerunning,
  regenerating,
  autoTriggerSuggestion,
  autoTriggerApproval,
  autoTriggerRunning,
  agentCreationDraft,
  agentCreationRunning,
  deployIntent,
  deployIntentArtifact,
  deployIntentRunning,
  replyMessages = [],
  threadExpanded = false,
  highlighted = false,
  onSelectArtifact,
  onTogglePin,
  onSaveAsMemory,
  onCopyMessage,
  onQuoteMessage,
  onReplyMessage,
  onRerunFromMessage,
  onRegenerateAgentReply,
  onConfirmOrchestratorTrigger,
  onCancelOrchestratorTrigger,
  onRefreshOrchestratorSuggestion,
  onConfirmAgentCreation,
  onCancelAgentCreation,
  onStartDeployIntent,
  onApproveDeployIntent,
  onCancelDeployIntent,
  onDownloadArtifactBundle,
  onToggleThread,
  onJumpToMessage
}: MessageBubbleProps) {
  const variant = getBubbleVariant(message);
  const messageId = formatId(message.id);
  const referenceMessageId = getReferenceMessageId(message);
  const artifactIds = message.artifactIds.map((artifactId) => formatId(artifactId)).filter(Boolean);
  const protocolLabel = getProtocolLabel(message.messageType);
  const agentLane = getAgentLane(message);
  const attachments = message.attachments ?? [];
  const messageKind = getMessageKind(message, attachments, artifacts);
  const autoTriggerStatus = getAutoTriggerStatus(autoTriggerSuggestion, autoTriggerApproval);
  const pendingTriggerApproval = autoTriggerApproval ?? autoTriggerSuggestion?.pendingApproval ?? null;
  const canCancelTriggerApproval = pendingTriggerApproval?.status?.toUpperCase() === "PENDING";
  const expectedAgents = getExpectedAgents(message, targetAgentLabel);
  const expectedArtifacts = getExpectedArtifacts(message);
  const contextSources = getContextSources(message);

  return (
    <div
      className={`message-row message-row--${message.senderType.toLowerCase()} ${highlighted ? "message-row--highlighted" : ""}`}
      data-testid="message-row"
    >
      <div
        className={`message-bubble message-bubble--${variant} message-bubble--lane-${agentLane}`}
        data-testid="message-bubble"
      >
        <div className="message-bubble__header">
          <span className="message-bubble__sender">
            <span>{senderLabel}</span>
            {message.senderType === "AGENT" && senderRoleLabel ? (
              <span className="message-agent-role">{senderRoleLabel}</span>
            ) : null}
            {message.senderType === "AGENT" && agentStepLabel ? (
              <span className="message-agent-step">{agentStepLabel}</span>
            ) : null}
            {protocolLabel ? (
              <span className={`message-protocol-pill message-protocol-pill--${protocolLabel.toLowerCase()}`}>
                {protocolLabel}
              </span>
            ) : null}
          </span>
          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>

        <div className={`message-type-ribbon message-type-ribbon--${messageKind.tone}`} data-testid="message-type-ribbon">
          <span>{messageKind.label}</span>
          <strong>{messageKind.detail}</strong>
          {pinnedContextId ? <em>已固定</em> : null}
          {savedAsMemory ? <em>已保存记忆</em> : null}
          {rerunning ? <em>重跑中</em> : null}
          {regenerating ? <em>再生成中</em> : null}
        </div>

        {protocolLabel ? (
          <div className={`message-protocol-card message-protocol-card--${protocolLabel.toLowerCase()}`}>
            <div>
              <span className="message-protocol-card__label">{protocolLabel}</span>
              <strong>{agentLane === "orchestrator" ? "Orchestrator 协调消息" : "Specialist Agent 协作消息"}</strong>
              <p>{getProtocolDescription(protocolLabel)}</p>
            </div>
            <span className="message-protocol-card__cta">{getProtocolCta(protocolLabel)}</span>
          </div>
        ) : null}

        <div className="message-action-bar" data-testid="message-action-bar">
          <div className="message-action-bar__label">
            <span>Message Action Bar</span>
            <strong>{message.senderType === "AGENT" ? "Agent 回复操作" : message.senderType === "USER" ? "用户消息操作" : "系统消息操作"}</strong>
          </div>
          <div className="message-action-bar__buttons">
          <button type="button" className="message-action-button" data-testid="message-copy-button" onClick={() => onCopyMessage(message)}>
            复制
          </button>
          <button type="button" className="message-action-button" data-testid="message-quote-button" onClick={() => onQuoteMessage(message)}>
            引用
          </button>
          <button type="button" className="message-action-button" data-testid="message-reply-button" onClick={() => onReplyMessage(message)}>
            回复
          </button>
          {message.senderType === "USER" ? (
            <button
              type="button"
              className="message-action-button message-action-button--primary"
              data-testid="message-rerun-button"
              disabled={rerunning}
              onClick={() => onRerunFromMessage(message)}
            >
              {rerunning ? "重新运行中..." : "从此消息重新运行"}
            </button>
          ) : null}
          {message.senderType === "AGENT" ? (
            <button
              type="button"
              className="message-action-button message-action-button--primary"
              data-testid="message-regenerate-button"
              disabled={regenerating}
              onClick={() => onRegenerateAgentReply(message)}
            >
              {regenerating ? "重新生成中..." : "重新生成回复"}
            </button>
          ) : null}
          <button
            type="button"
            className={`message-action-button message-pin-button ${pinnedContextId ? "message-pin-button--active" : ""}`}
            data-testid="message-pin-button"
            onClick={() => onTogglePin(messageId, pinnedContextId)}
            aria-pressed={Boolean(pinnedContextId)}
          >
            {pinnedContextId ? "已固定 / 取消固定" : "固定到 Context"}
          </button>
          <button
            type="button"
            className={`message-action-button ${savedAsMemory ? "message-action-button--active" : ""}`}
            data-testid="message-memory-button"
            onClick={() => onSaveAsMemory(message)}
          >
            {savedAsMemory ? "已保存记忆" : "保存为记忆"}
          </button>
          </div>
        </div>

        {message.senderType === "USER" && (message.targetAgentId || (message.mentionedAgentIds?.length ?? 0) > 0) ? (
          <div className="message-target-agent message-target-agent--routing" data-testid="message-target-agent">
            <span>{(message.mentionedAgentIds?.length ?? 0) > 1 ? "多 Agent 路由：" : "路由目标："}</span>
            <span className="message-target-agent-name">
              @{targetAgentLabel || message.targetAgentId}
            </span>
            <small>
              {(message.mentionedAgentIds?.length ?? 0) > 1
                ? "写入 mentionedAgentIds，Orchestrator 会把这些 Agent 纳入 TaskGraph。"
                : "写入 targetAgentId，作为 selectedAgent 优先路由。"}
            </small>
          </div>
        ) : null}

        {autoTriggerStatus ? (
          <div
            className={`message-auto-trigger message-auto-trigger--${autoTriggerStatus.tone}`}
            data-testid="message-auto-trigger"
          >
            <div className="message-auto-trigger__header">
              <div>
                <strong>{autoTriggerStatus.label}</strong>
                <p>{autoTriggerStatus.detail}</p>
              </div>
              <span>{autoTriggerSuggestion?.mode || "AUTO_TRIGGER"}</span>
            </div>
            {autoTriggerSuggestion?.matchedKeywords?.length ? (
              <div className="message-auto-trigger__keywords">
                {autoTriggerSuggestion.matchedKeywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            ) : null}
            <div className="message-auto-trigger__plan-grid">
              <div className="message-auto-trigger__plan-cell">
                <span>任务摘要</span>
                <p>{getTaskSummary(message)}</p>
              </div>
              <div className="message-auto-trigger__plan-cell">
                <span>预计参与 Agent</span>
                <div className="message-auto-trigger__plan-chips">
                  {expectedAgents.map((agent) => (
                    <strong key={agent}>{agent}</strong>
                  ))}
                </div>
              </div>
              <div className="message-auto-trigger__plan-cell">
                <span>预计产物</span>
                <div className="message-auto-trigger__plan-chips">
                  {expectedArtifacts.map((artifactType) => (
                    <strong key={artifactType}>{artifactType}</strong>
                  ))}
                </div>
              </div>
              <div className="message-auto-trigger__plan-cell">
                <span>上下文来源</span>
                <p>{contextSources.join(" / ")}</p>
              </div>
            </div>
            <div className="message-auto-trigger__actions">
              {autoTriggerStatus.canRun ? (
                <button
                  type="button"
                  className="message-action-button message-action-button--primary"
                  data-testid="message-start-collaboration"
                  disabled={autoTriggerRunning}
                  onClick={() => onConfirmOrchestratorTrigger(message)}
                >
                  {autoTriggerRunning ? "处理中..." : autoTriggerStatus.actionLabel}
                </button>
              ) : null}
              <button
                type="button"
                className="message-action-button"
                disabled={autoTriggerRunning}
                onClick={() => onQuoteMessage(message)}
              >
                编辑需求
              </button>
              {canCancelTriggerApproval && pendingTriggerApproval ? (
                <button
                  type="button"
                  className="message-action-button"
                  data-testid="message-cancel-collaboration"
                  disabled={autoTriggerRunning}
                  onClick={() => onCancelOrchestratorTrigger(pendingTriggerApproval.approvalId)}
                >
                  取消
                </button>
              ) : null}
              <button
                type="button"
                className="message-action-button"
                disabled={autoTriggerRunning}
                onClick={() => onRefreshOrchestratorSuggestion(message)}
              >
                刷新建议
              </button>
            </div>
          </div>
        ) : null}

        {agentCreationDraft ? (
          <div className="message-agent-creation" data-testid="message-agent-creation-card">
            <div className="message-agent-creation__header">
              <div>
                <strong>建议创建自定义 Agent</strong>
                <p>已从这条消息生成 Agent 草案。确认后会进入左侧联系人，并可被 @Agent 路由到 TaskGraph。</p>
              </div>
              <span>{agentCreationDraft.preferredAdapterType}</span>
            </div>
            <div className="message-agent-creation__grid">
              <div>
                <span>名称</span>
                <strong>{agentCreationDraft.name}</strong>
              </div>
              <div>
                <span>能力</span>
                <strong>{agentCreationDraft.capabilityTags.join(" / ")}</strong>
              </div>
              <div>
                <span>工具</span>
                <strong>{agentCreationDraft.toolTags.join(" / ")}</strong>
              </div>
              <div>
                <span>来源</span>
                <strong>{agentCreationDraft.draftSource || "UNKNOWN"}</strong>
              </div>
            </div>
            <p className="message-agent-creation__prompt">{agentCreationDraft.systemPrompt}</p>
            {agentCreationDraft.fallbackReason ? (
              <p className="message-agent-creation__prompt">Fallback reason: {agentCreationDraft.fallbackReason}</p>
            ) : null}
            <div className="message-agent-creation__reasons">
              {agentCreationDraft.reasoning.map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
            <div className="message-auto-trigger__actions">
              <button
                type="button"
                className="message-action-button message-action-button--primary"
                data-testid="message-confirm-agent-creation"
                disabled={agentCreationRunning}
                onClick={() => onConfirmAgentCreation(getIdValue(message.id))}
              >
                {agentCreationRunning ? "创建中..." : "确认创建 Agent"}
              </button>
              <button
                type="button"
                className="message-action-button"
                disabled={agentCreationRunning}
                onClick={() => onQuoteMessage(message)}
              >
                编辑描述
              </button>
              <button
                type="button"
                className="message-action-button"
                disabled={agentCreationRunning}
                onClick={() => onCancelAgentCreation(getIdValue(message.id))}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}

        {deployIntent ? (
          <div className={`message-deploy-intent message-deploy-intent--${deployIntent.status.toLowerCase()}`} data-testid="message-deploy-intent">
            <div className="message-deploy-intent__header">
              <div>
                <strong>建议生成本地静态预览</strong>
                <p>已识别部署 / 发布意图。确认后会走 Approval Gate，并调用现有静态 Preview 部署链路。</p>
              </div>
              <span>{getDeployIntentStatusLabel(deployIntent.status)}</span>
            </div>
            <div className="message-deploy-intent__grid">
              <div>
                <span>目标产物</span>
                <strong>{deployIntentArtifact?.title || deployIntent.artifactId || "暂无可部署产物"}</strong>
              </div>
              <div>
                <span>来源 / 质量</span>
                <strong>
                  {deployIntentArtifact
                    ? `${getSourceLabel(deployIntentArtifact.sourceKind)} / ${getQualityLabel(deployIntentArtifact)}`
                    : "等待 Artifact"}
                </strong>
              </div>
              <div>
                <span>部署目标</span>
                <strong>STATIC_PREVIEW</strong>
              </div>
              <div>
                <span>边界</span>
                <strong>本地静态预览，不是真实云部署</strong>
              </div>
            </div>
            {deployIntent.errorMessage ? <p className="message-deploy-intent__error">{deployIntent.errorMessage}</p> : null}
            <div className="message-auto-trigger__actions">
              {deployIntent.status === "PENDING" ? (
                <button
                  type="button"
                  className="message-action-button message-action-button--primary"
                  data-testid="message-start-deploy"
                  disabled={deployIntentRunning || !deployIntentArtifact}
                  onClick={() => onStartDeployIntent(message, deployIntentArtifact ? getIdValue(deployIntentArtifact.id) : deployIntent.artifactId)}
                >
                  {deployIntentRunning ? "创建审批中..." : "确认生成预览 URL"}
                </button>
              ) : null}
              {deployIntent.status === "APPROVAL_REQUIRED" ? (
                <button
                  type="button"
                  className="message-action-button message-action-button--primary"
                  data-testid="message-approve-deploy"
                  disabled={deployIntentRunning}
                  onClick={() => onApproveDeployIntent(getIdValue(message.id))}
                >
                  {deployIntentRunning ? "部署中..." : "审批并生成预览"}
                </button>
              ) : null}
              {deployIntentArtifact ? (
                <button
                  type="button"
                  className="message-action-button"
                  data-testid="message-download-bundle"
                  onClick={() => onDownloadArtifactBundle([getIdValue(deployIntentArtifact.id)])}
                >
                  下载源码包
                </button>
              ) : null}
              <button
                type="button"
                className="message-action-button"
                disabled={deployIntentRunning || deployIntent.status === "COMPLETED"}
                onClick={() => onCancelDeployIntent(getIdValue(message.id))}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}

        {referenceMessageId ? (
          <div className="message-reference-card" data-testid="message-reference-card">
            <div className="message-reference-card__header">
              <span>
                {message.senderType === "AGENT" ? "关联 / 再生成来源" : message.replyToMessageId ? "回复" : "引用"}：{referenceMessageId}
              </span>
              <button
                type="button"
                className="message-reference-card__jump"
                onClick={() => onJumpToMessage(referenceMessageId)}
              >
                定位原消息
              </button>
            </div>
            {message.quotedMessageContent ? <p>{message.quotedMessageContent}</p> : null}
          </div>
        ) : null}

        <div className="message-bubble__body">{message.content}</div>

        {attachments.length > 0 ? (
          <div className="message-attachment-list" data-testid="message-attachment-list">
            {attachments.map((attachment, index) => {
              const attachmentKind = getAttachmentKind(attachment);
              const attachmentDownloadHref = getAttachmentDownloadHref(attachment);
              return (
                <article
                  className={`message-attachment-card message-attachment-card--${attachmentKind.tone}`}
                  data-testid="message-attachment-card"
                  key={attachment.attachmentId || attachment.id || `${attachment.fileName}-${index}`}
                >
                  <div className="message-attachment-card__header">
                    <div>
                      <span className="message-attachment-card__kind">{attachmentKind.label}</span>
                      <strong>{attachment.fileName}</strong>
                    </div>
                    <span>{attachment.source || "ATTACHMENT"}</span>
                  </div>
                  <div className="message-attachment-card__meta">
                    {attachment.contentType || attachment.mimeType ? <span>{attachment.contentType || attachment.mimeType}</span> : null}
                    {typeof (attachment.size ?? attachment.sizeBytes) === "number" ? (
                      <span>{attachment.size ?? attachment.sizeBytes} bytes</span>
                    ) : null}
                    <span>{attachmentKind.boundary}</span>
                  </div>
                  {attachmentKind.tone === "image" && attachmentDownloadHref ? (
                    <a
                      className="message-attachment-image-preview"
                      data-testid="message-attachment-image-preview"
                      href={attachmentDownloadHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={attachmentDownloadHref} alt={`图片附件预览：${attachment.fileName}`} loading="lazy" />
                    </a>
                  ) : null}
                  {attachmentKind.tone === "ppt" ? (
                    <div className="message-attachment-ppt-preview" data-testid="message-attachment-ppt-preview">
                      <span>PPT</span>
                      <div>
                        <strong>演示文稿附件</strong>
                        <small>当前提供 metadata、文本摘要和下载；在线幻灯片渲染后置。</small>
                      </div>
                    </div>
                  ) : null}
                  {attachment.contentPreview || attachment.previewText ? <p>{attachment.contentPreview || attachment.previewText}</p> : null}
                  {attachmentDownloadHref ? (
                    <a
                      className="message-attachment-card__download"
                      href={attachmentDownloadHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      下载附件
                    </a>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {artifactIds.length > 0 ? (
          <div className="message-bubble__artifacts" data-testid="message-artifact-card-list">
            {artifactIds.map((artifactId) => {
              const artifact = artifacts.find((item) => getIdValue(item.id) === artifactId);
              return (
                <article className="message-artifact-card" data-testid="message-artifact-card" key={artifactId}>
                  <div className="message-artifact-card__header">
                    <div>
                      <span>Artifact</span>
                      <strong>{artifact?.title || artifactId}</strong>
                    </div>
                    <em>{artifact?.type || "UNKNOWN"}</em>
                  </div>
                  <div className="message-artifact-card__meta">
                    <span>来源：{getSourceLabel(artifact?.sourceKind)}</span>
                    <span>质量：{artifact ? getQualityLabel(artifact) : "UNKNOWN"}</span>
                    {artifact?.language ? <span>语言：{artifact.language}</span> : null}
                  </div>
                  <div className="message-artifact-card__actions">
                    <button type="button" className="artifact-link" onClick={() => onSelectArtifact(artifactId)}>
                      选择产物
                    </button>
                    <a className="artifact-link artifact-link--preview" href={`/preview/${artifactId}`} target="_blank" rel="noreferrer">
                      打开 Preview
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {replyMessages.length > 0 ? (
          <div className="message-thread" data-testid="message-thread">
            <button type="button" className="message-thread__toggle" data-testid="message-thread-toggle" onClick={onToggleThread}>
              {threadExpanded ? "隐藏回复线程" : `查看 ${replyMessages.length} 条回复`}
            </button>
            {threadExpanded ? (
              <div className="message-thread__list">
                {replyMessages.map((reply) => (
                  <button
                    key={getIdValue(reply.id)}
                    type="button"
                    className="message-thread__item"
                    onClick={() => onJumpToMessage(getIdValue(reply.id))}
                  >
                    <span>{reply.senderType === "USER" ? "用户" : reply.senderId}</span>
                    <p>{getMessagePreview(reply)}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
