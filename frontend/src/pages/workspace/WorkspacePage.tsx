import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAgents,
  getAdapters,
  getArtifact,
  removeConversationMember,
  updateConversationVisibility,
  upsertConversationMember
} from "../../api/agenthubApi";
import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import { AdapterQualityDashboard } from "../../features/agents/AdapterQualityDashboard";
import { AdapterRoutingPanel } from "../../features/agents/AdapterRoutingPanel";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import type { AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { ArtifactPanel } from "../../features/artifacts/ArtifactPanel";
import type { Artifact, ArtifactSelectionReference } from "../../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../../features/artifacts/artifactSnapshotTypes";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import { ActionAuditTimelinePanel } from "../../features/audit/ActionAuditTimelinePanel";
import type { ActionAuditLog } from "../../features/audit/auditTypes";
import { ChatInput } from "../../features/chat/ChatInput";
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
import { displayAdapterName } from "../../utils/productionLabels";
import { WorkspaceCollaborationToolbar } from "./WorkspaceCollaborationToolbar";
import { WorkspaceArtifactInspectorShell } from "./WorkspaceArtifactInspectorShell";
import { WorkspaceAccessPanel } from "./WorkspaceAccessPanel";
import { WorkspaceApiProviderPanel } from "./WorkspaceApiProviderPanel";
import { WorkspaceChatLane } from "./WorkspaceChatLane";
import { WorkspaceCommandDeck } from "./WorkspaceCommandDeck";
import { WorkspaceDiagnosticsDrawer } from "./WorkspaceDiagnosticsDrawer";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspacePresenceBar } from "./WorkspacePresenceBar";
import { WorkspaceSidebar, type WorkspaceConversationCreateMode } from "./WorkspaceSidebar";
import { WorkspaceSessionSummary } from "./WorkspaceSessionSummary";
import { useArtifactInspectorLayout } from "./useArtifactInspectorLayout";
import { useWorkspaceApprovalActions } from "./useWorkspaceApprovalActions";
import { useWorkspaceArtifactOperations } from "./useWorkspaceArtifactOperations";
import { useWorkspaceConversationActions } from "./useWorkspaceConversationActions";
import { useWorkspaceDataLoaders } from "./useWorkspaceDataLoaders";
import { useWorkspaceInlineAgentCreation } from "./useWorkspaceInlineAgentCreation";
import { useWorkspaceMessageActions } from "./useWorkspaceMessageActions";
import { useWorkspacePresence } from "./useWorkspacePresence";
import { useWorkspaceRealtime } from "./useWorkspaceRealtime";
import { useWorkspaceTaskRunControls } from "./useWorkspaceTaskRunControls";
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
import "../../styles/pages/workspace.css";
import "../../styles/pages/workspace-command-deck.css";
import "../../styles/pages/workspace-chat-lane.css";
import "../../styles/pages/artifact-inspector.css";

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
  const [conversationCreateMode, setConversationCreateMode] = useState<WorkspaceConversationCreateMode>("GROUP");
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
  const [savingAccessPolicy, setSavingAccessPolicy] = useState(false);
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
    currentUser,
    deviceId: presenceDeviceId,
    presenceError,
    presenceRecords
  } = useWorkspacePresence({
    currentConversationId,
    draftMessage,
    selectedArtifactId,
    realtimeStatus
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
  const {
    handleCreateDemoConversation,
    handleConversationQueryChange,
    handleConversationFilterChange,
    handleSelectConversation,
    handleToggleConversationPinned,
    handleArchiveConversation,
    handleRestoreConversation
  } = useWorkspaceConversationActions({
    conversationQuery,
    conversationFilter,
    loadConversationIndex,
    setCurrentConversationId,
    setCreatingConversation,
    setConversationQuery,
    setConversationFilter,
    setConversations,
    setArtifactSelectionReference,
    setErrorMessage
  });
  const {
    handleCancelTaskRun,
    handleStopTaskRun,
    handleSelectTaskStep,
    handleShowAllArtifacts
  } = useWorkspaceTaskRunControls({
    currentConversationId,
    loadConversationData,
    setSelectedTaskRunId,
    setSelectedTaskStepId,
    setSelectedArtifactId,
    setShowAllArtifacts,
    setErrorMessage,
    setOperationMessage
  });
  const {
    handleConfirmAgentCreation,
    handleCancelAgentCreation
  } = useWorkspaceInlineAgentCreation({
    agentCreationDraftsByMessageId,
    setAgentCreationDraftsByMessageId,
    setAgentCreationRunningMessageId,
    setAgents,
    setSelectedAgent,
    setErrorMessage,
    setOperationMessage
  });
  const {
    handleRefreshOrchestratorSuggestion,
    handleConfirmOrchestratorTrigger
  } = useWorkspaceApprovalActions({
    currentConversationId,
    selectedAgent,
    triggerSuggestionsByMessageId,
    approvalByMessageId,
    loadConversationData,
    setAutoTriggerRunningMessageId,
    setApprovalRequests,
    setTriggerSuggestionsByMessageId,
    setConversations,
    setSelectedTaskRunId,
    setSelectedTaskStepId,
    setShowAllArtifacts,
    setErrorMessage,
    setOperationMessage
  });
  const {
    handleSendArtifactSelectionToChat,
    handleSendMessage,
    handleUploadAttachments,
    handleToggleMessagePin,
    handleSaveMessageAsMemory,
    handleCopyMessage,
    handleQuoteMessage,
    handleReplyMessage,
    handleRunDemoTask,
    handleRerunFromMessage,
    handleRegenerateAgentReply
  } = useWorkspaceMessageActions({
    currentConversationId,
    productDemoPrompt: PRODUCT_DEMO_PROMPT,
    draftMessage,
    draftAttachments,
    agents,
    selectedAgent,
    latestUserMessage,
    quotedMessage,
    quoteMode,
    artifactSelectionReference,
    loadConversationData,
    loadConversationIndex,
    onCreateArtifactRevision: handleCreateArtifactRevision,
    onQueueDeployIntent: handleQueueDeployIntent,
    setDraftMessage,
    setDraftAttachments,
    setSendingMessage,
    setRunningDemoTask,
    setRerunningMessageId,
    setRegeneratingMessageId,
    setErrorMessage,
    setOperationMessage,
    setAgentCreationDraftsByMessageId,
    setSelectedAgent,
    setQuotedMessage,
    setQuoteMode,
    setArtifactSelectionReference,
    setPinnedContexts,
    setMemories,
    setMessages,
    setConversations,
    setSelectedTaskRunId,
    setSelectedTaskStepId,
    setShowAllArtifacts
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
  }, [handleCreateDemoConversation]);

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

  function replaceConversation(updatedConversation: Conversation) {
    setConversations((current) =>
      current.map((conversation) =>
        getIdValue(conversation.id) === getIdValue(updatedConversation.id) ? updatedConversation : conversation
      )
    );
  }

  async function handleUpdateConversationVisibility(
    visibility: "PRIVATE" | "ORG" | "PUBLIC",
    orgTag: string | null
  ) {
    if (!currentConversationId) {
      return;
    }

    setSavingAccessPolicy(true);
    setErrorMessage(null);
    try {
      const updatedConversation = await updateConversationVisibility(currentConversationId, visibility, orgTag);
      replaceConversation(updatedConversation);
      await loadConversationIndex();
      setOperationMessage("会话权限已更新。");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingAccessPolicy(false);
    }
  }

  async function handleUpsertConversationMember(userId: string, memberRole: string) {
    if (!currentConversationId) {
      return;
    }

    setSavingAccessPolicy(true);
    setErrorMessage(null);
    try {
      const updatedConversation = await upsertConversationMember(currentConversationId, userId, memberRole);
      replaceConversation(updatedConversation);
      await loadConversationIndex();
      setOperationMessage(`成员 ${userId} 已设置为 ${memberRole}。`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingAccessPolicy(false);
    }
  }

  async function handleRemoveConversationMember(userId: string) {
    if (!currentConversationId) {
      return;
    }

    setSavingAccessPolicy(true);
    setErrorMessage(null);
    try {
      const updatedConversation = await removeConversationMember(currentConversationId, userId);
      replaceConversation(updatedConversation);
      await loadConversationIndex();
      setOperationMessage(`成员 ${userId} 已移除。`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSavingAccessPolicy(false);
    }
  }

  async function handleApiProviderConfigured() {
    const adapters = await getAdapters();
    setAdapterDescriptors(adapters);
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
        <Link className="secondary-button" to={currentConversationId ? `/desktop?conversationId=${encodeURIComponent(currentConversationId)}` : "/desktop"}>
          打开 Desktop Console
        </Link>
      </section>
    )
  };

  const commandDeckNotices = (
    <>
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
    </>
  );

  const commandDeckSelectedAgentBanner = selectedAgent ? (
    <div className="selected-agent-banner">
      <div>
        <div className="selected-agent-name">当前 Agent：{selectedAgent.name}</div>
        <div className="selected-agent-adapter">
          首选执行通道：{displayAdapterName(selectedAgent.preferredAdapterType || "MOCK")} / 角色：{displayAgentRole(selectedAgent.role)}
        </div>
        {selectedAgentAdapterDescriptor ? (
          <div className="selected-agent-health">
            <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}`}>
              Adapter 状态：{displayStatus(selectedAgentAdapterDescriptor.status)}
            </span>
            {selectedAgentAdapterDescriptor.status !== "AVAILABLE" ? (
              <span className="selected-agent-health__hint">不可用时会切换本地备用路径。</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <button type="button" className="secondary-button clear-selected-agent-button" onClick={handleClearSelectedAgent}>
        清除选择
      </button>
    </div>
  ) : null;

  const commandDeckAdvanced = (
    <>
      <WorkspaceApiProviderPanel
        agents={agents}
        adapterDescriptors={adapterDescriptors}
        selectedAgent={selectedAgent}
        onSelectAgent={setSelectedAgent}
        onAgentCreated={(agent) => {
          setAgents((current) => {
            const agentId = getIdValue(agent.id);
            const exists = current.some((item) => getIdValue(item.id) === agentId);
            return exists
              ? current.map((item) => (getIdValue(item.id) === agentId ? agent : item))
              : [...current, agent];
          });
        }}
        onConfigured={handleApiProviderConfigured}
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
      <WorkspaceAccessPanel
        conversation={currentConversation}
        saving={savingAccessPolicy}
        onUpdateVisibility={handleUpdateConversationVisibility}
        onUpsertMember={handleUpsertConversationMember}
        onRemoveMember={handleRemoveConversationMember}
      />
    </>
  );

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
        conversationCreateMode={conversationCreateMode}
        conversationFilter={conversationFilter}
        conversationQuery={conversationQuery}
        creatingConversation={creatingConversation}
        currentConversationId={currentConversationId}
        loadingAgents={loadingAgents}
        loadingConversations={loadingConversations}
        selectedAgent={selectedAgent}
        onArchiveConversation={handleArchiveConversation}
        onConversationCreateModeChange={setConversationCreateMode}
        onConversationFilterChange={handleConversationFilterChange}
        onConversationQueryChange={handleConversationQueryChange}
        onCreateConversation={handleCreateDemoConversation}
        onRestoreConversation={handleRestoreConversation}
        onSelectAgent={handleSelectAgent}
        onSelectConversation={handleSelectConversation}
        onToggleConversationPinned={handleToggleConversationPinned}
      />

      <main className={`workspace-main ${currentConversationId ? "" : "workspace-main--empty"}`}>
        <WorkspaceCommandDeck
          header={
            <WorkspaceHeader
              currentConversation={currentConversation}
              currentParticipantAgents={currentParticipantAgents}
              actionAuditCount={actionAudits.length}
              realtimeStatus={realtimeStatus}
              activeRealtimeRunSummary={activeRealtimeRunSummary}
            />
          }
          presence={
            <WorkspacePresenceBar
              currentUser={currentUser}
              deviceId={presenceDeviceId}
              error={presenceError}
              records={presenceRecords}
            />
          }
          notices={commandDeckNotices}
          toolbar={
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
          }
          selectedAgentBanner={commandDeckSelectedAgentBanner}
          advanced={commandDeckAdvanced}
        />

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
