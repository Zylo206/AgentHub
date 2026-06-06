import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createAgent,
  createConversation,
  draftAgentFromNaturalLanguage,
  approveApprovalRequest,
  cancelTaskRun,
  createApprovalRequest,
  createDemoTask,
  getAgents,
  getArtifact,
  getConversation,
  getMemoriesByConversation,
  getMessages,
  getApprovalRequestsByConversation,
  getOrchestratorTriggerSuggestion,
  getPinnedContextsByConversation,
  archiveConversation,
  markConversationRead,
  pinConversation,
  pinMessageAsContext,
  regenerateAgentReply,
  runOrchestratorFromMessage,
  saveMessageAsMemory,
  sendMessage,
  stopTaskRun,
  uploadConversationAttachment,
  unarchiveConversation,
  unpinConversation,
  unpinContext
} from "../../api/agenthubApi";
import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import { AdapterQualityDashboard } from "../../features/agents/AdapterQualityDashboard";
import { AdapterRoutingPanel } from "../../features/agents/AdapterRoutingPanel";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { inferAgentCreationDraft, type AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { ArtifactPanel } from "../../features/artifacts/ArtifactPanel";
import type { Artifact, ArtifactSelectionReference } from "../../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../../features/artifacts/artifactSnapshotTypes";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import { ActionAuditTimelinePanel } from "../../features/audit/ActionAuditTimelinePanel";
import type { ActionAuditLog } from "../../features/audit/auditTypes";
import { ChatInput } from "../../features/chat/ChatInput";
import { parseLeadingAgentMention } from "../../features/chat/agentMention";
import { MessageStream } from "../../features/chat/MessageStream";
import { TaskRunPanel } from "../../features/chat/TaskRunPanel";
import type {
  LightweightAttachment,
  Message,
  OrchestratorTriggerSuggestion,
  StreamingPreviewState,
  TaskRun,
  TaskSpec,
  TaskStep
} from "../../features/chat/chatTypes";
import type { ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { ContextPanel } from "../../features/context/ContextPanel";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../../features/context/contextTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { WorkspaceCollaborationToolbar } from "./WorkspaceCollaborationToolbar";
import { WorkspaceArtifactInspectorShell } from "./WorkspaceArtifactInspectorShell";
import { WorkspaceChatLane } from "./WorkspaceChatLane";
import { WorkspaceDiagnosticsDrawer } from "./WorkspaceDiagnosticsDrawer";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceSessionSummary } from "./WorkspaceSessionSummary";
import { useArtifactInspectorLayout } from "./useArtifactInspectorLayout";
import { useWorkspaceArtifactOperations } from "./useWorkspaceArtifactOperations";
import { useWorkspaceDataLoaders } from "./useWorkspaceDataLoaders";
import { useWorkspaceRealtime } from "./useWorkspaceRealtime";
import "../../styles/workspace.css";
import "../../styles/workspace/tokens.css";
import "../../styles/workspace/shell.css";
import "../../styles/workspace/diagnostics.css";
import "../../styles/workspace/coze-light.css";
import "../../styles/workspace/components.css";
import "../../styles/workspace/message.css";
import "../../styles/workspace/inspector.css";
import "../../styles/workspace/layout-guard.css";
import "../../styles/production-alignment.css";
import "../../styles/workspace/production.css";

type DiagnosticPanelKey = "taskrun" | "context" | "adapter" | "audit" | "local";
const DIAGNOSTIC_PANELS: Array<{ key: DiagnosticPanelKey; label: string; summary: string }> = [
  { key: "taskrun", label: "TaskRun", summary: "任务运行" },
  { key: "context", label: "Context", summary: "上下文" },
  { key: "adapter", label: "Adapter", summary: "适配器" },
  { key: "audit", label: "Audit", summary: "审计" },
  { key: "local", label: "Local", summary: "本地能力" }
];

const PRODUCT_DEMO_PROMPT =
  "帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。";

const DEPLOY_INTENT_PATTERN = /(部署|发布|生成预览|预览\s*url|preview\s*url|open\s*preview)/i;

function isDeployIntent(content: string): boolean {
  return DEPLOY_INTENT_PATTERN.test(content || "");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

function findTaskStep(taskRuns: TaskRun[], taskRunId: string | null, taskStepId: string | null): TaskStep | null {
  if (!taskRunId || !taskStepId) {
    return null;
  }

  const taskRun = taskRuns.find((item) => getIdValue(item.id) === taskRunId);
  return taskRun?.steps.find((step) => getIdValue(step.id) === taskStepId) ?? null;
}

export function WorkspacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [adapterDescriptors, setAdapterDescriptors] = useState<AdapterDescriptor[]>([]);
  const [adapterQualityMetrics, setAdapterQualityMetrics] = useState<AdapterQualityMetrics[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [taskSpecs, setTaskSpecs] = useState<TaskSpec[]>([]);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [artifactSnapshots, setArtifactSnapshots] = useState<ArtifactSnapshot[]>([]);
  const [actionAudits, setActionAudits] = useState<ActionAuditLog[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [triggerSuggestionsByMessageId, setTriggerSuggestionsByMessageId] = useState<
    Record<string, OrchestratorTriggerSuggestion | null>
  >({});
  const [agentCreationDraftsByMessageId, setAgentCreationDraftsByMessageId] = useState<
    Record<string, AgentCreationDraft | null>
  >({});
  const [pinnedContexts, setPinnedContexts] = useState<PinnedContext[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [contextSnapshots, setContextSnapshots] = useState<ContextSnapshot[]>([]);
  const [handoffSummaries, setHandoffSummaries] = useState<HandoffSummary[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("ALL");
  const [selectedTaskRunId, setSelectedTaskRunId] = useState<string | null>(null);
  const [selectedTaskStepId, setSelectedTaskStepId] = useState<string | null>(null);
  const [showAllArtifacts, setShowAllArtifacts] = useState(true);
  const [draftMessage, setDraftMessage] = useState(PRODUCT_DEMO_PROMPT);
  const [draftAttachments, setDraftAttachments] = useState<LightweightAttachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [streamingPreviewsByStepId, setStreamingPreviewsByStepId] = useState<Record<string, StreamingPreviewState>>({});
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [quoteMode, setQuoteMode] = useState<"quote" | "reply">("quote");
  const [artifactSelectionReference, setArtifactSelectionReference] = useState<ArtifactSelectionReference | null>(null);

  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTaskRuns, setLoadingTaskRuns] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [loadingArtifactDetail, setLoadingArtifactDetail] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [runningDemoTask, setRunningDemoTask] = useState(false);
  const [showDebugActions, setShowDebugActions] = useState(false);
  const [activeDiagnosticPanel, setActiveDiagnosticPanel] = useState<DiagnosticPanelKey | null>(null);
  const [artifactInspectorCollapsed, setArtifactInspectorCollapsed] = useState(false);
  const { workspaceStyle, onArtifactInspectorResizeStart } = useArtifactInspectorLayout(artifactInspectorCollapsed);
  const [rerunningMessageId, setRerunningMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [autoTriggerRunningMessageId, setAutoTriggerRunningMessageId] = useState<string | null>(null);
  const [agentCreationRunningMessageId, setAgentCreationRunningMessageId] = useState<string | null>(null);

  const currentConversation =
    conversations.find((conversation) => getIdValue(conversation.id) === currentConversationId) ?? null;
  const latestUserMessage = [...messages].reverse().find((message) => message.senderType === "USER") ?? null;
  const currentParticipantAgents = useMemo(() => {
    if (!currentConversation) {
      return [];
    }

    return (currentConversation.participantAgentIds ?? []).map((participantAgentId) => {
      const participantId = getIdValue(participantAgentId);
      const agent = agents.find((item) => getIdValue(item.id) === participantId);
      return {
        id: participantId,
        name: agent?.name || participantId,
        role: agent?.role || "AGENT"
      };
    });
  }, [agents, currentConversation]);

  const selectedTaskRun =
    taskRuns.find((taskRun) => getIdValue(taskRun.id) === selectedTaskRunId) ?? taskRuns[taskRuns.length - 1] ?? null;
  const activeTaskSpec =
    taskSpecs.find((taskSpec) => getIdValue(taskSpec.id) === getIdValue(selectedTaskRun?.taskSpecId)) ??
    taskSpecs[taskSpecs.length - 1] ??
    null;
  const selectedTaskStep = findTaskStep(taskRuns, selectedTaskRunId, selectedTaskStepId);
  const selectedArtifactDeployments = useMemo(
    () => deployments.filter((deployment) => getIdValue(deployment.artifactId) === selectedArtifactId),
    [deployments, selectedArtifactId]
  );
  const selectedArtifactSnapshots = useMemo(
    () => artifactSnapshots.filter((snapshot) => getIdValue(snapshot.artifactId) === selectedArtifactId),
    [artifactSnapshots, selectedArtifactId]
  );
  const approvalByMessageId = useMemo(() => {
    const byMessageId: Record<string, ApprovalRequest | null> = {};
    approvalRequests.forEach((approvalRequest) => {
      if (approvalRequest.targetType !== "MESSAGE" || approvalRequest.actionType !== "ORCHESTRATOR_RUN") {
        return;
      }

      const previous = byMessageId[approvalRequest.targetId];
      if (!previous || approvalRequest.status === "PENDING" || approvalRequest.status === "APPROVED") {
        byMessageId[approvalRequest.targetId] = approvalRequest;
      }
    });
    Object.entries(triggerSuggestionsByMessageId).forEach(([messageId, suggestion]) => {
      if (!suggestion?.pendingApproval || byMessageId[messageId]) {
        return;
      }
      byMessageId[messageId] = suggestion.pendingApproval;
    });
    return byMessageId;
  }, [approvalRequests, triggerSuggestionsByMessageId]);

  const latestUserMessageId = latestUserMessage ? getIdValue(latestUserMessage.id) : null;
  const latestTriggerSuggestion = latestUserMessageId ? triggerSuggestionsByMessageId[latestUserMessageId] ?? null : null;
  const latestTriggerApproval = latestUserMessageId ? approvalByMessageId[latestUserMessageId] ?? null : null;
  const latestTriggerReady = Boolean(latestTriggerSuggestion?.enabled && latestTriggerSuggestion.matched);
  const latestTriggerApprovalStatus = latestTriggerApproval?.status?.toUpperCase() ?? null;
  const latestTriggerPrimaryLabel =
    latestTriggerApprovalStatus === "APPROVED"
      ? "启动已确认协作"
      : latestTriggerApprovalStatus === "PENDING"
        ? "确认并启动协作"
        : latestTriggerSuggestion?.requireApproval
          ? "创建协作确认"
          : "启动 Agent 协作";

  const highlightedArtifactIds = useMemo(
    () => (selectedTaskStep ? selectedTaskStep.producedArtifactIds.map((artifactId) => getIdValue(artifactId)) : []),
    [selectedTaskStep]
  );

  const visibleArtifacts = useMemo(() => {
    if (!selectedTaskStep || showAllArtifacts) {
      return artifacts;
    }

    return artifacts.filter((artifact) => highlightedArtifactIds.includes(getIdValue(artifact.id)));
  }, [artifacts, highlightedArtifactIds, selectedTaskStep, showAllArtifacts]);

  const selectedAgentAdapterDescriptor = useMemo(() => {
    if (!selectedAgent) {
      return null;
    }

    const preferredAdapterType = selectedAgent.preferredAdapterType || "MOCK";
    return adapterDescriptors.find((descriptor) => descriptor.adapterType === preferredAdapterType) ?? null;
  }, [adapterDescriptors, selectedAgent]);

  const {
    loadConversationIndex,
    loadInitialData,
    loadConversationData,
    loadContextData
  } = useWorkspaceDataLoaders({
    conversationQuery,
    conversationFilter,
    setErrorMessage,
    setLoadingAgents,
    setLoadingConversations,
    setLoadingMessages,
    setLoadingTaskRuns,
    setLoadingArtifacts,
    setLoadingContext,
    setAgents,
    setAdapterDescriptors,
    setAdapterQualityMetrics,
    setSelectedAgent,
    setConversations,
    setCurrentConversationId,
    setMessages,
    setTaskSpecs,
    setTaskRuns,
    setArtifacts,
    setDeployments,
    setArtifactSnapshots,
    setActionAudits,
    setApprovalRequests,
    setTriggerSuggestionsByMessageId,
    setPinnedContexts,
    setMemories,
    setStreamingPreviewsByStepId,
    setShowAllArtifacts,
    setSelectedTaskStepId,
    setSelectedTaskRunId,
    setContextSnapshots,
    setHandoffSummaries
  });
  const { realtimeStatus, activeRealtimeRunSummary } = useWorkspaceRealtime({
    currentConversationId,
    loadConversationData,
    loadConversationIndex,
    setStreamingPreviewsByStepId
  });
  const {
    deployIntentsByMessageId,
    deployingMessageId,
    revisingArtifact,
    deployingArtifact,
    restoringSnapshot,
    handleCreateArtifactRevision,
    handleApplyArtifactDiff,
    handleForceApplyArtifactDiff,
    handleCreateDeployment,
    handleQueueDeployIntent,
    handleStartDeployIntent,
    handleApproveDeployIntent,
    handleCancelDeployIntent,
    handleDownloadArtifactBundle,
    handleRestoreArtifactSnapshot,
    handleCreateApprovalRequest,
    handleApproveApprovalRequest,
    handleCancelApprovalRequest
  } = useWorkspaceArtifactOperations({
    currentConversationId,
    artifacts,
    selectedArtifactId,
    loadConversationData,
    setMessages,
    setDeployments,
    setArtifactSnapshots,
    setActionAudits,
    setApprovalRequests,
    setSelectedTaskRunId,
    setSelectedTaskStepId,
    setShowAllArtifacts,
    setSelectedArtifactId,
    setErrorMessage,
    setOperationMessage
  });

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    function handleAgentCreated(event: Event) {
      const createdAgent = (event as CustomEvent<{ agent?: Agent }>).detail?.agent ?? null;
      void getAgents()
        .then((agentData) => {
          setAgents(agentData);
          if (createdAgent) {
            const createdAgentId = getIdValue(createdAgent.id);
            setSelectedAgent(agentData.find((agent) => getIdValue(agent.id) === createdAgentId) ?? createdAgent);
            setOperationMessage(`已创建 ${createdAgent.name}。现在可以在输入框使用 @${createdAgent.name} 参与协作。`);
          }
        })
        .catch((error) => setErrorMessage(getErrorMessage(error)));
    }

    window.addEventListener("agenthub:agent-created", handleAgentCreated);
    return () => window.removeEventListener("agenthub:agent-created", handleAgentCreated);
  }, []);

  useEffect(() => {
    function handleCreateConversationRequest() {
      void handleCreateDemoConversation();
    }

    window.addEventListener("agenthub:create-conversation", handleCreateConversationRequest);
    return () => window.removeEventListener("agenthub:create-conversation", handleCreateConversationRequest);
  }, []);

  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      setTaskSpecs([]);
      setTaskRuns([]);
      setArtifacts([]);
      setDeployments([]);
      setArtifactSnapshots([]);
      setActionAudits([]);
      setApprovalRequests([]);
      setTriggerSuggestionsByMessageId({});
      setPinnedContexts([]);
      setMemories([]);
      setContextSnapshots([]);
      setHandoffSummaries([]);
      setStreamingPreviewsByStepId({});
      setSelectedArtifactId(null);
      setSelectedArtifact(null);
      setArtifactSelectionReference(null);
      setSelectedTaskRunId(null);
      setSelectedTaskStepId(null);
      return;
    }

    void loadConversationData(currentConversationId);
  }, [currentConversationId, loadConversationData]);

  useEffect(() => {
    if (!selectedTaskRunId) {
      setContextSnapshots([]);
      setHandoffSummaries([]);
      return;
    }

    void loadContextData(selectedTaskRunId);
  }, [selectedTaskRunId, loadContextData]);

  useEffect(() => {
    if (!selectedTaskRunId) {
      return;
    }
    const selectedRunStillExists = taskRuns.some((taskRun) => getIdValue(taskRun.id) === selectedTaskRunId);
    if (selectedRunStillExists) {
      void loadContextData(selectedTaskRunId);
    }
  }, [taskRuns, selectedTaskRunId, loadContextData]);

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId(null);
      setSelectedArtifact(null);
      return;
    }

    const selectedExists = selectedArtifactId
      ? artifacts.some((artifact) => getIdValue(artifact.id) === selectedArtifactId)
      : false;

    if (!selectedArtifactId || !selectedExists) {
      setSelectedArtifactId(getIdValue(visibleArtifacts[0]?.id) || getIdValue(artifacts[0]?.id));
    }
  }, [artifacts, selectedArtifactId, visibleArtifacts]);

  useEffect(() => {
    if (!selectedArtifactId) {
      setSelectedArtifact(null);
      return;
    }

    let cancelled = false;
    setLoadingArtifactDetail(true);
    setErrorMessage(null);

    void getArtifact(selectedArtifactId)
      .then((artifact) => {
        if (!cancelled) {
          setSelectedArtifact(artifact);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArtifactDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArtifactId]);

  function handleSelectAgent(agent: Agent) {
    setSelectedAgent(agent);
  }

  function handleClearSelectedAgent() {
    setSelectedAgent(null);
  }

  async function handleCreateDemoConversation() {
    setCreatingConversation(true);
    setErrorMessage(null);

    try {
      const conversation = await createConversation("登录页 Demo", "GROUP");
      const createdId = getIdValue(conversation.id);

      setConversations((previous) => {
        const next = previous.filter((item) => getIdValue(item.id) !== createdId);
        return [conversation, ...next];
      });
      setCurrentConversationId(createdId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCreatingConversation(false);
    }
  }

  async function handleConversationQueryChange(nextQuery: string) {
    setConversationQuery(nextQuery);
    setErrorMessage(null);
    try {
      await loadConversationIndex(nextQuery, conversationFilter);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleConversationFilterChange(nextFilter: ConversationFilter) {
    setConversationFilter(nextFilter);
    setErrorMessage(null);
    try {
      await loadConversationIndex(conversationQuery, nextFilter);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSelectConversation(conversationId: string) {
    setCurrentConversationId(conversationId);
    setArtifactSelectionReference(null);
    try {
      const updatedConversation = await markConversationRead(conversationId);
      setConversations((previous) =>
        previous.map((conversation) =>
          getIdValue(conversation.id) === conversationId ? updatedConversation : conversation
        )
      );
    } catch (error) {
      console.warn("Failed to mark conversation as read.", error);
    }
  }

  async function handleToggleConversationPinned(conversation: Conversation) {
    const conversationId = getIdValue(conversation.id);
    setErrorMessage(null);
    try {
      if (conversation.pinned) {
        await unpinConversation(conversationId);
      } else {
        await pinConversation(conversationId);
      }
      await loadConversationIndex();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleArchiveConversation(conversation: Conversation) {
    const conversationId = getIdValue(conversation.id);
    setErrorMessage(null);
    try {
      await archiveConversation(conversationId);
      await loadConversationIndex();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleRestoreConversation(conversation: Conversation) {
    const conversationId = getIdValue(conversation.id);
    setErrorMessage(null);
    try {
      await unarchiveConversation(conversationId);
      await loadConversationIndex();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function buildArtifactSelectionRevisionInstruction(
    selection: ArtifactSelectionReference,
    userRequest: string,
    sourceMessageId: string | null
  ): string {
    return [
      `用户在聊天中请求对 Artifact "${selection.artifactTitle}" v${selection.artifactVersion} 做局部修改。`,
      `Artifact ID: ${selection.artifactId}`,
      `选区范围: 第 ${selection.startLine}-${selection.endLine} 行`,
      `语言: ${selection.language || selection.artifactType}`,
      sourceMessageId ? `来源聊天消息: ${sourceMessageId}` : null,
      "",
      "用户修改要求:",
      userRequest,
      "",
      "选中的代码片段:",
      selection.selectedText,
      "",
      "请只围绕选中片段生成新的 Draft Revision；不要直接覆盖当前 Artifact。生成后仍需通过 Diff Summary 与 Approval Gate 应用。"
    ].filter(Boolean).join("\n");
  }

  function handleSendArtifactSelectionToChat(selection: ArtifactSelectionReference) {
    setArtifactSelectionReference(selection);
    setDraftMessage((current) => {
      if (current.trim() && current !== PRODUCT_DEMO_PROMPT) {
        return current;
      }
      return `请基于选中的 ${selection.artifactTitle} 第 ${selection.startLine}-${selection.endLine} 行做局部修改：`;
    });
    setOperationMessage("已引用选中的 Artifact 代码片段。请在聊天框描述修改需求并发送。");
  }

  async function runArtifactSelectionRevisionFromChat(
    selection: ArtifactSelectionReference,
    userRequest: string,
    sourceMessageId: string
  ) {
    if (!currentConversationId) {
      return;
    }

    try {
      const revisionInstruction = buildArtifactSelectionRevisionInstruction(
        selection,
        userRequest,
        sourceMessageId
      );
      await handleCreateArtifactRevision(selection.artifactId, revisionInstruction);
      setOperationMessage("已根据聊天中的局部修改请求生成 Draft Revision，请在右侧 Diff Preview 中审批应用。");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSendMessage() {
    if (!currentConversationId || (!draftMessage.trim() && draftAttachments.length === 0)) {
      return;
    }

    const parsedMention = parseLeadingAgentMention(draftMessage, agents);
    if (parsedMention.error) {
      setErrorMessage(parsedMention.error);
      return;
    }

    const mentionedAgents = parsedMention.matchedAgents;
    const targetAgent = mentionedAgents[0] ?? selectedAgent;
    const contentToSend = mentionedAgents.length > 0 ? parsedMention.cleanedContent.trim() : draftMessage.trim();

    if (!contentToSend && draftAttachments.length === 0) {
      setErrorMessage(parsedMention.rawMention ? `请在 ${parsedMention.rawMention} 后补充消息内容。` : "请先输入消息内容。");
      return;
    }

    const referencedMessageId = quotedMessage ? getIdValue(quotedMessage.id) : null;
    const selectedArtifactSnippet = artifactSelectionReference;

    setSendingMessage(true);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const sentMessage = await sendMessage(
        currentConversationId,
        contentToSend,
        targetAgent ? getIdValue(targetAgent.id) : null,
        mentionedAgents.map((agent) => getIdValue(agent.id)).filter(Boolean),
        quoteMode === "reply" ? referencedMessageId : null,
        referencedMessageId,
        draftAttachments
      );
      const sentMessageId = getIdValue(sentMessage.id);
      if (selectedArtifactSnippet) {
        void runArtifactSelectionRevisionFromChat(
          selectedArtifactSnippet,
          contentToSend,
          sentMessageId
        );
        setOperationMessage("已发送局部修改请求，系统正在后台生成 Draft Revision。");
      }
      const localAgentCreationDraft = inferAgentCreationDraft(contentToSend);
      if (localAgentCreationDraft) {
        const messageId = getIdValue(sentMessage.id);
        let agentCreationDraft = localAgentCreationDraft;
        try {
          agentCreationDraft = await draftAgentFromNaturalLanguage(contentToSend);
        } catch {
          agentCreationDraft = {
            ...localAgentCreationDraft,
            draftSource: "CLIENT_RULE_BASED_FALLBACK",
            fallbackReason: "Backend natural-language draft API was unavailable."
          };
        }
        setAgentCreationDraftsByMessageId((current) => ({
          ...current,
          [messageId]: agentCreationDraft
        }));
        setOperationMessage("已识别为创建 Agent 请求，请在消息卡片中确认草案。");
      }
      if (parsedMention.matchedAgent) {
        setSelectedAgent(parsedMention.matchedAgent);
      }
      if (isDeployIntent(contentToSend)) {
        handleQueueDeployIntent(sentMessage);
        setOperationMessage("已识别部署 / 发布意图，请在消息卡片中确认生成本地静态预览 URL。");
      }
      await loadConversationData(currentConversationId);
      await loadConversationIndex();
      setDraftMessage("");
      setDraftAttachments([]);
      setQuotedMessage(null);
      setQuoteMode("quote");
      setArtifactSelectionReference(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleConfirmAgentCreation(messageId: string) {
    const draft = agentCreationDraftsByMessageId[messageId];
    if (!draft) {
      return;
    }

    setAgentCreationRunningMessageId(messageId);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const createdAgent = await createAgent({
        name: draft.name,
        avatarUrl: draft.avatarUrl,
        systemPrompt: draft.systemPrompt,
        capabilityTags: draft.capabilityTags,
        toolTags: draft.toolTags,
        preferredAdapterType: draft.preferredAdapterType
      });
      setAgents(await getAgents());
      setSelectedAgent(createdAgent);
      setAgentCreationDraftsByMessageId((current) => {
        const next = { ...current };
        delete next[messageId];
        return next;
      });
      setOperationMessage(`已创建 ${createdAgent.name}。现在可以在输入框使用 @${createdAgent.name} 参与协作。`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setAgentCreationRunningMessageId(null);
    }
  }

  function handleCancelAgentCreation(messageId: string) {
    setAgentCreationDraftsByMessageId((current) => {
      const next = { ...current };
      delete next[messageId];
      return next;
    });
    setOperationMessage("已取消本次 Agent 创建草案。");
  }

  async function handleUploadAttachments(files: File[]): Promise<LightweightAttachment[]> {
    if (!currentConversationId) {
      throw new Error("Please select a conversation before uploading attachments.");
    }

    const uploadedAttachments = await Promise.all(
      files.map(async (file) => {
        const attachment = await uploadConversationAttachment(currentConversationId, file);
        return {
          attachmentId: attachment.attachmentId,
          id: attachment.attachmentId,
          fileName: attachment.fileName,
          contentType: attachment.contentType || "application/octet-stream",
          mimeType: attachment.contentType || "application/octet-stream",
          size: attachment.sizeBytes,
          sizeBytes: attachment.sizeBytes,
          contentPreview: attachment.contentPreview || "",
          previewText: attachment.contentPreview || "",
          source: "UPLOADED_FILE"
        };
      })
    );
    return uploadedAttachments;
  }

  async function handleToggleMessagePin(messageId: string, pinnedContextId?: string | null) {
    if (!currentConversationId) {
      return;
    }

    setErrorMessage(null);

    try {
      if (pinnedContextId) {
        await unpinContext(pinnedContextId);
      } else {
        await pinMessageAsContext(currentConversationId, messageId);
      }

      const refreshedPinnedContexts = await getPinnedContextsByConversation(currentConversationId);
      setPinnedContexts(refreshedPinnedContexts);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSaveMessageAsMemory(message: Message) {
    if (!currentConversationId) {
      return;
    }

    const messageId = getIdValue(message.id);
    if (!messageId) {
      setErrorMessage("无法识别消息 ID，不能保存为长期记忆。");
      return;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      await saveMessageAsMemory(currentConversationId, messageId, "PROJECT_FACT");
      const refreshedMemories = await getMemoriesByConversation(currentConversationId);
      setMemories(refreshedMemories);
      setOperationMessage("消息已保存为长期记忆。");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function copyTextToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  async function handleCopyMessage(message: Message) {
    setErrorMessage(null);

    try {
      await copyTextToClipboard(message.content);
      setOperationMessage("消息内容已复制。");
    } catch (error) {
      setErrorMessage(`复制失败：${getErrorMessage(error)}`);
    }
  }

  function handleQuoteMessage(message: Message) {
    setQuotedMessage(message);
    setQuoteMode("quote");
    setOperationMessage("已引用消息，发送时会带入引用内容。");
  }

  function handleReplyMessage(message: Message) {
    setQuotedMessage(message);
    setQuoteMode("reply");
    setOperationMessage("已选择回复消息，发送时会带入被回复内容。");
  }

  async function runDemoTaskFromMessage(message: Message) {
    const sourceConversationId = currentConversationId;
    if (!sourceConversationId) {
      return;
    }

    const sourceMessageId = getIdValue(message.id);
    if (!sourceMessageId) {
      setErrorMessage("无法识别消息 ID，不能重新运行 Demo Task。");
      return;
    }

    setRunningDemoTask(true);
    setRerunningMessageId(sourceMessageId);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const createdTaskRun = await createDemoTask(
        sourceConversationId,
        sourceMessageId,
        message.content,
        selectedAgent ? getIdValue(selectedAgent.id) : null
      );
      const createdTaskRunId = getIdValue(createdTaskRun.id);
      const refreshedConversation = await getConversation(sourceConversationId);

      await loadConversationData(sourceConversationId);
      setConversations((previous) =>
        previous.map((conversation) =>
          getIdValue(conversation.id) === sourceConversationId ? refreshedConversation : conversation
        )
      );
      setSelectedTaskRunId(createdTaskRunId);
      setSelectedTaskStepId(null);
      setShowAllArtifacts(true);
      setOperationMessage("已基于选中消息重新运行 Demo Task。");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRunningDemoTask(false);
      setRerunningMessageId(null);
    }
  }

  async function handleRunDemoTask() {
    if (!currentConversationId || !latestUserMessage) {
      setErrorMessage("请先发送一条用户消息，再运行 Demo Task。");
      return;
    }

    await runDemoTaskFromMessage(latestUserMessage);
  }

  async function handleRerunFromMessage(message: Message) {
    if (message.senderType !== "USER") {
      return;
    }

    await runDemoTaskFromMessage(message);
  }

  async function handleRefreshOrchestratorSuggestion(message: Message) {
    if (!currentConversationId || message.senderType !== "USER") {
      return;
    }

    const messageId = getIdValue(message.id);
    setErrorMessage(null);

    try {
      const suggestion = await getOrchestratorTriggerSuggestion(currentConversationId, messageId);
      const refreshedApprovals = await getApprovalRequestsByConversation(currentConversationId);
      setTriggerSuggestionsByMessageId((previous) => ({ ...previous, [messageId]: suggestion }));
      setApprovalRequests(refreshedApprovals);
      setOperationMessage("Auto-trigger suggestion refreshed.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleConfirmOrchestratorTrigger(message: Message) {
    if (!currentConversationId || message.senderType !== "USER") {
      return;
    }

    const messageId = getIdValue(message.id);
    const suggestion = triggerSuggestionsByMessageId[messageId];
    if (!suggestion?.matched) {
      setErrorMessage("No matched auto-trigger suggestion is available for this message.");
      return;
    }

    setAutoTriggerRunningMessageId(messageId);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      let approvalId: string | null = null;
      if (suggestion.requireApproval) {
        let approval = approvalByMessageId[messageId] ?? suggestion.pendingApproval ?? null;
        const approvalStatus = approval?.status.toUpperCase() ?? null;
        if (!approval || approvalStatus === "CANCELLED" || approvalStatus === "EXPIRED") {
          approval = await createApprovalRequest(currentConversationId, {
            actionType: "ORCHESTRATOR_RUN",
            targetType: "MESSAGE",
            targetId: messageId,
            riskLevel: "MEDIUM",
            summary: "Run Orchestrator from message after auto-trigger match.",
            affectedItems: [
              `messageId=${messageId}`,
              `mode=${suggestion.mode}`,
              `reason=${suggestion.reason}`
            ]
          });
          const refreshedApprovals = await getApprovalRequestsByConversation(currentConversationId);
          setApprovalRequests(refreshedApprovals);
          setOperationMessage("已创建 Agent 协作确认请求，请再次点击批准并运行。");
          return;
        }

        approvalId = approval.approvalId;
        if (approval.status.toUpperCase() !== "APPROVED") {
          await approveApprovalRequest(approvalId);
        }
      }

      const taskRun = await runOrchestratorFromMessage(currentConversationId, messageId, {
        selectedAgentId: selectedAgent ? getIdValue(selectedAgent.id) : null,
        approvalId
      });
      const refreshedConversation = await getConversation(currentConversationId);

      await loadConversationData(currentConversationId);
      setConversations((previous) =>
        previous.map((conversation) =>
          getIdValue(conversation.id) === currentConversationId ? refreshedConversation : conversation
        )
      );
      setSelectedTaskRunId(getIdValue(taskRun.id));
      setSelectedTaskStepId(null);
      setShowAllArtifacts(true);
      setOperationMessage("Approved auto-trigger flow and started Agent collaboration.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setAutoTriggerRunningMessageId(null);
    }
  }

  async function handleRegenerateAgentReply(message: Message) {
    if (!currentConversationId || message.senderType !== "AGENT") {
      return;
    }

    const messageId = getIdValue(message.id);
    setRegeneratingMessageId(messageId);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const regeneratedMessage = await regenerateAgentReply(currentConversationId, messageId);
      const refreshedMessages = await getMessages(currentConversationId);
      setMessages(refreshedMessages);
      setOperationMessage(`已重新生成单条 Agent 回复：${getIdValue(regeneratedMessage.id)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRegeneratingMessageId(null);
    }
  }

  async function handleCancelTaskRun(taskRunId: string) {
    if (!currentConversationId) {
      return;
    }

    setErrorMessage(null);
    setOperationMessage(null);
    try {
      const result = await cancelTaskRun(taskRunId, "Workspace user requested cancel.");
      await loadConversationData(currentConversationId);
      setOperationMessage(result.message || `Cancel result: ${result.status}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleStopTaskRun(taskRunId: string) {
    if (!currentConversationId) {
      return;
    }

    setErrorMessage(null);
    setOperationMessage(null);
    try {
      const result = await stopTaskRun(taskRunId, "Workspace user requested stop.");
      await loadConversationData(currentConversationId);
      setOperationMessage(result.message || `Stop result: ${result.status}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function handleSelectTaskStep(taskRunId: string, step: TaskStep) {
    setSelectedTaskRunId(taskRunId);
    setSelectedTaskStepId(getIdValue(step.id));
    setShowAllArtifacts(false);

    const firstArtifactId = step.producedArtifactIds.length > 0 ? getIdValue(step.producedArtifactIds[0]) : null;

    if (firstArtifactId) {
      setSelectedArtifactId(firstArtifactId);
    }
  }

  function handleShowAllArtifacts() {
    setShowAllArtifacts(true);
  }

  const diagnosticSections = {
    taskrun: (
      <TaskRunPanel
        agents={agents}
        artifacts={artifacts}
        taskSpecs={taskSpecs}
        taskRuns={taskRuns}
        loading={loadingTaskRuns}
        selectedTaskRunId={selectedTaskRunId}
        selectedTaskStepId={selectedTaskStepId}
        streamingPreviewsByStepId={streamingPreviewsByStepId}
        onSelectStep={handleSelectTaskStep}
        onCancelTaskRun={handleCancelTaskRun}
        onStopTaskRun={handleStopTaskRun}
      />
    ),
    context: (
      <ContextPanel
        taskSpec={activeTaskSpec}
        taskRuns={taskRuns}
        pinnedContexts={pinnedContexts}
        memories={memories}
        contextSnapshots={contextSnapshots}
        handoffSummaries={handoffSummaries}
        loading={loadingContext}
      />
    ),
    adapter: (
      <>
        <AdapterRoutingPanel adapterDescriptors={adapterDescriptors} selectedAgent={selectedAgent} />
        <AdapterQualityDashboard
          adapterDescriptors={adapterDescriptors}
          taskRuns={taskRuns}
          qualityMetrics={adapterQualityMetrics}
        />
      </>
    ),
    audit: <ActionAuditTimelinePanel audits={actionAudits} />,
    local: (
      <section className="workspace-local-entry" data-testid="workspace-desktop-console-entry">
        <span className="workspace-local-entry__eyebrow">Desktop Console</span>
        <h3>本机文件、通知和进程管理已移到独立控制台</h3>
        <p>
          Workspace 默认只保留 IM 协作主链路。本地文件预览、系统通知、Claude Code / Codex CLI 探测和 backend managed
          process 请在 Desktop Console 中操作。
        </p>
        <Link className="secondary-button" to="/desktop">
          打开 Desktop Console
        </Link>
      </section>
    )
  };

  return (
    <section
      className={`workspace-page ${artifactInspectorCollapsed ? "workspace-page--artifact-inspector-collapsed" : ""}`}
      data-testid="workspace-page"
      style={workspaceStyle}
    >
      <WorkspaceSidebar
        agents={agents}
        adapterDescriptors={adapterDescriptors}
        conversations={conversations}
        conversationFilter={conversationFilter}
        conversationQuery={conversationQuery}
        creatingConversation={creatingConversation}
        currentConversationId={currentConversationId}
        loadingAgents={loadingAgents}
        loadingConversations={loadingConversations}
        selectedAgent={selectedAgent}
        onArchiveConversation={handleArchiveConversation}
        onConversationFilterChange={handleConversationFilterChange}
        onConversationQueryChange={handleConversationQueryChange}
        onCreateConversation={handleCreateDemoConversation}
        onRestoreConversation={handleRestoreConversation}
        onSelectAgent={handleSelectAgent}
        onSelectConversation={handleSelectConversation}
        onToggleConversationPinned={handleToggleConversationPinned}
      />

      <main className={`workspace-main ${currentConversationId ? "" : "workspace-main--empty"}`}>
        <WorkspaceHeader
          currentConversation={currentConversation}
          currentParticipantAgents={currentParticipantAgents}
          actionAuditCount={actionAudits.length}
          realtimeStatus={realtimeStatus}
          activeRealtimeRunSummary={activeRealtimeRunSummary}
        />

        {errorMessage ? (
          <div className="workspace-error">
            <span>{errorMessage}</span>
            <button type="button" className="secondary-button" onClick={() => setErrorMessage(null)}>
              关闭
            </button>
          </div>
        ) : null}
        {operationMessage ? (
          <div className="workspace-notice">
            <span>{operationMessage}</span>
            <button type="button" className="secondary-button" onClick={() => setOperationMessage(null)}>
              关闭
            </button>
          </div>
        ) : null}

        <WorkspaceCollaborationToolbar
          currentConversationId={currentConversationId}
          latestUserMessage={latestUserMessage}
          latestTriggerReady={latestTriggerReady}
          latestTriggerPrimaryLabel={latestTriggerPrimaryLabel}
          autoTriggerRunningMessageId={autoTriggerRunningMessageId}
          showDebugActions={showDebugActions}
          runningDemoTask={runningDemoTask}
          onStartCollaboration={handleConfirmOrchestratorTrigger}
          onToggleDebugActions={() => setShowDebugActions((current) => !current)}
          onRunManualDebug={handleRunDemoTask}
        />

        <WorkspaceSessionSummary
          currentConversation={currentConversation}
          selectedAgent={selectedAgent}
          selectedAgentAdapterDescriptor={selectedAgentAdapterDescriptor}
          participants={currentParticipantAgents}
          messages={messages}
          latestTaskRun={selectedTaskRun}
          pinnedContextCount={pinnedContexts.length}
          memoryCount={memories.length}
          artifactCount={artifacts.length}
        />

        {selectedAgent ? (
          <div className="selected-agent-banner">
            <div>
              <div className="selected-agent-name">当前 Agent：{selectedAgent.name}</div>
              <div className="selected-agent-adapter">
                首选 Adapter：{selectedAgent.preferredAdapterType || "MOCK"} / 角色：{displayAgentRole(selectedAgent.role)}
              </div>
              {selectedAgentAdapterDescriptor ? (
                <div className="selected-agent-health">
                  <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}`}>
                    Adapter 状态：{displayStatus(selectedAgentAdapterDescriptor.status)}
                  </span>
                  {selectedAgentAdapterDescriptor.status !== "AVAILABLE" ? (
                    <span className="selected-agent-health__hint">不可用时会回退到 MOCK。</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button type="button" className="secondary-button clear-selected-agent-button" onClick={handleClearSelectedAgent}>
              清除选择
            </button>
          </div>
        ) : null}

        <WorkspaceChatLane
          messageStream={
            <MessageStream
              messages={messages}
              agents={agents}
              artifacts={artifacts}
              pinnedContexts={pinnedContexts}
              memorySourceIds={new Set(memories.filter((memory) => memory.sourceType === "MESSAGE").map((memory) => memory.sourceId))}
              loading={loadingMessages}
              rerunningMessageId={rerunningMessageId}
              regeneratingMessageId={regeneratingMessageId}
              triggerSuggestionsByMessageId={triggerSuggestionsByMessageId}
              approvalByMessageId={approvalByMessageId}
              autoTriggerRunningMessageId={autoTriggerRunningMessageId}
              agentCreationDraftsByMessageId={agentCreationDraftsByMessageId}
              agentCreationRunningMessageId={agentCreationRunningMessageId}
              deployIntentsByMessageId={deployIntentsByMessageId}
              deployingMessageId={deployingMessageId}
              streamingPreviewsByStepId={streamingPreviewsByStepId}
              onSelectArtifact={setSelectedArtifactId}
              onToggleMessagePin={handleToggleMessagePin}
              onSaveMessageAsMemory={handleSaveMessageAsMemory}
              onCopyMessage={handleCopyMessage}
              onQuoteMessage={handleQuoteMessage}
              onReplyMessage={handleReplyMessage}
              onRerunFromMessage={handleRerunFromMessage}
              onRegenerateAgentReply={handleRegenerateAgentReply}
              onConfirmOrchestratorTrigger={handleConfirmOrchestratorTrigger}
              onCancelOrchestratorTrigger={handleCancelApprovalRequest}
              onRefreshOrchestratorSuggestion={handleRefreshOrchestratorSuggestion}
              onConfirmAgentCreation={handleConfirmAgentCreation}
              onCancelAgentCreation={handleCancelAgentCreation}
              onStartDeployIntent={handleStartDeployIntent}
              onApproveDeployIntent={handleApproveDeployIntent}
              onCancelDeployIntent={handleCancelDeployIntent}
              onDownloadArtifactBundle={handleDownloadArtifactBundle}
            />
          }
          composer={
            <ChatInput
              value={draftMessage}
              disabled={!currentConversationId}
              sending={sendingMessage}
              agents={agents}
              selectedAgent={selectedAgent}
              quotedMessage={quotedMessage}
              quoteMode={quoteMode}
              artifactSelectionReference={artifactSelectionReference}
              attachments={draftAttachments}
              onChange={setDraftMessage}
              onAttachmentsChange={setDraftAttachments}
              onUploadFiles={handleUploadAttachments}
              onClearQuote={() => {
                setQuotedMessage(null);
                setQuoteMode("quote");
              }}
              onClearArtifactSelection={() => setArtifactSelectionReference(null)}
              onSend={handleSendMessage}
            />
          }
          diagnostics={
            <WorkspaceDiagnosticsDrawer
              panels={DIAGNOSTIC_PANELS}
              activePanel={activeDiagnosticPanel}
              sections={diagnosticSections}
              onTogglePanel={(panel) => setActiveDiagnosticPanel((current) => (current === panel ? null : panel))}
            />
          }
        />
      </main>

      <WorkspaceArtifactInspectorShell
        collapsed={artifactInspectorCollapsed}
        onToggleCollapsed={() => setArtifactInspectorCollapsed((current) => !current)}
        onResizeStart={onArtifactInspectorResizeStart}
      >
        <ArtifactPanel
          artifacts={visibleArtifacts}
          allArtifacts={artifacts}
          totalArtifactCount={artifacts.length}
          selectedArtifact={selectedArtifact}
          selectedArtifactId={selectedArtifactId}
          loadingArtifacts={loadingArtifacts}
          loadingArtifactDetail={loadingArtifactDetail}
          highlightedArtifactIds={highlightedArtifactIds}
          filteredByTaskStep={Boolean(selectedTaskStep) && !showAllArtifacts}
          revisingArtifact={revisingArtifact}
          deployments={selectedArtifactDeployments}
          snapshots={selectedArtifactSnapshots}
          deployingArtifact={deployingArtifact}
          restoringSnapshot={restoringSnapshot}
          conversationId={currentConversationId}
          onSelectArtifact={setSelectedArtifactId}
          onShowAllArtifacts={handleShowAllArtifacts}
          onCreateRevision={handleCreateArtifactRevision}
          onSendSelectionToChat={handleSendArtifactSelectionToChat}
          onCreateDeployment={handleCreateDeployment}
          onDownloadArtifactBundle={handleDownloadArtifactBundle}
          onRestoreSnapshot={handleRestoreArtifactSnapshot}
          onApplyDiff={handleApplyArtifactDiff}
          onForceApplyDiff={handleForceApplyArtifactDiff}
          onCreateApprovalRequest={handleCreateApprovalRequest}
          onApproveApprovalRequest={handleApproveApprovalRequest}
          onCancelApprovalRequest={handleCancelApprovalRequest}
        />
      </WorkspaceArtifactInspectorShell>
    </section>
  );
}
