import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createConversation,
  approveApprovalRequest,
  cancelApprovalRequest,
  cancelTaskRun,
  createApprovalRequest,
  createDemoArtifactRevision,
  createDemoDeployment,
  applyArtifactDiff,
  createDemoTask,
  getActionAuditsByConversation,
  getActiveRealtimeState,
  getAdapterQualityMetrics,
  getAdapters,
  getAgents,
  getArtifact,
  getArtifactSnapshotsByConversation,
  getArtifactsByConversation,
  getContextSnapshotsByTaskRun,
  getConversation,
  getConversations,
  getDeploymentsByConversation,
  getHandoffSummariesByTaskRun,
  getMemoriesByConversation,
  getMessages,
  getApprovalRequestsByConversation,
  getConversationEventsUrl,
  getOrchestratorTriggerSuggestion,
  getPinnedContextsByConversation,
  getTaskRunsByConversation,
  getTaskSpecsByConversation,
  archiveConversation,
  markConversationRead,
  pinConversation,
  pinMessageAsContext,
  regenerateAgentReply,
  runOrchestratorFromMessage,
  restoreArtifactSnapshotWithApproval,
  saveMessageAsMemory,
  sendMessage,
  stopTaskRun,
  uploadConversationAttachment,
  unarchiveConversation,
  unpinConversation,
  unpinContext
} from "../../api/agenthubApi";
import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import { AgentList } from "../../features/agents/AgentList";
import { AdapterQualityDashboard } from "../../features/agents/AdapterQualityDashboard";
import { AdapterRoutingPanel } from "../../features/agents/AdapterRoutingPanel";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { ArtifactPanel } from "../../features/artifacts/ArtifactPanel";
import type { Artifact } from "../../features/artifacts/artifactTypes";
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
import { ConversationList, type ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { ContextPanel } from "../../features/context/ContextPanel";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../../features/context/contextTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { WorkspaceCollaborationToolbar } from "./WorkspaceCollaborationToolbar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import "../../styles/workspace.css";

const TASK_STEP_STREAM_CHUNK_EVENT_TYPES = ["TASK_STEP_STREAM_CHUNK", "ADAPTER_STREAM_CHUNK"] as const;
const STREAMING_PREVIEW_MAX_LENGTH = 1200;
const TERMINAL_STEP_STATUSES = new Set([
  "COMPLETED",
  "SUCCEEDED",
  "FAILED",
  "REJECTED",
  "CANCELLED",
  "TIMED_OUT",
  "SKIPPED",
  "BLOCKED",
  "DISABLED",
  "ABORTED"
]);

interface ParsedStreamingChunkPayload {
  taskRunId: string;
  taskStepId: string;
  adapterType?: string;
  chunk: string;
}

interface ParsedControlPayload {
  taskRunId: string;
  action?: string;
  status?: string;
  reason?: string;
}

function normalizeStreamingPayload(raw: string): ParsedStreamingChunkPayload | null {
  try {
    const parsed = JSON.parse(raw) as {
      taskRunId?: unknown;
      taskStepId?: unknown;
      resourceId?: unknown;
      chunk?: unknown;
      adapterType?: unknown;
      payload?: Record<string, unknown>;
    };
    const payload = parsed.payload ?? parsed;

    const taskRunId = String((payload.taskRunId as unknown) ?? parsed.taskRunId ?? "");
    const taskStepId = String((payload.taskStepId as unknown) ?? parsed.taskStepId ?? parsed.resourceId ?? "");
    const chunkRaw = (payload.chunk as unknown) ?? parsed.chunk;
    const chunk = typeof chunkRaw === "string" ? chunkRaw : typeof chunkRaw === "number" ? String(chunkRaw) : "";
    const adapterTypeRaw = payload.adapterType as unknown;

    if (!taskStepId || !chunk) {
      return null;
    }

    return {
      taskRunId,
      taskStepId,
      adapterType: typeof adapterTypeRaw === "string" ? adapterTypeRaw : undefined,
      chunk
    };
  } catch {
    return null;
  }
}

function isStreamingStepStatus(status: string): boolean {
  return !TERMINAL_STEP_STATUSES.has((status || "").toUpperCase());
}

function appendStreamingChunk(previous: string, nextChunk: string): string {
  return `${previous || ""}${nextChunk}`.slice(-STREAMING_PREVIEW_MAX_LENGTH);
}

function appendStreamingPreview(
  previous: StreamingPreviewState | undefined,
  payload: ParsedStreamingChunkPayload
): StreamingPreviewState {
  return {
    taskRunId: payload.taskRunId || previous?.taskRunId || "",
    taskStepId: payload.taskStepId,
    adapterType: payload.adapterType || previous?.adapterType,
    content: appendStreamingChunk(previous?.content || "", payload.chunk),
    chunkCount: (previous?.chunkCount ?? 0) + 1,
    status: "STREAMING",
    updatedAt: new Date().toISOString()
  };
}

function getStepStreamingTerminalStatus(taskRun: TaskRun, step: TaskStep): "ACTIVE" | "COMPLETE" | "PARTIAL" | "DISCARDED" {
  const runStatus = (taskRun.status || "").toUpperCase();
  const stepStatus = (step.status || "").toUpperCase();
  const adapterStatus = (step.adapterStatus || "").toUpperCase();

  if (["CANCELLED", "STOPPED"].includes(runStatus) || ["CANCELLED", "STOPPED"].includes(adapterStatus)) {
    return "DISCARDED";
  }

  if (stepStatus === "SKIPPED") {
    return "DISCARDED";
  }

  if (isStreamingStepStatus(step.status)) {
    return "ACTIVE";
  }

  if (["FAILED", "REJECTED", "BLOCKED", "TIMED_OUT", "ABORTED"].includes(stepStatus)) {
    return "PARTIAL";
  }

  return "COMPLETE";
}

function reconcileStreamingStateByTaskRuns(
  taskRuns: TaskRun[],
  state: Record<string, StreamingPreviewState>
): Record<string, StreamingPreviewState> {
  const stepIndex = new Map<string, { taskRun: TaskRun; step: TaskStep }>();
  taskRuns.forEach((taskRun) => {
    taskRun.steps.forEach((step) => {
      stepIndex.set(getIdValue(step.id), { taskRun, step });
    });
  });

  const next: Record<string, StreamingPreviewState> = {};
  Object.entries(state).forEach(([stepId, chunk]) => {
    if (!chunk.content) {
      return;
    }

    const indexedStep = stepIndex.get(stepId);
    if (!indexedStep) {
      next[stepId] = chunk;
      return;
    }

    const terminalStatus = getStepStreamingTerminalStatus(indexedStep.taskRun, indexedStep.step);
    if (terminalStatus === "ACTIVE") {
      next[stepId] = { ...chunk, status: "STREAMING" };
    } else if (terminalStatus === "DISCARDED") {
      next[stepId] = {
        ...chunk,
        status: "DISCARDED",
        finishReason: `${indexedStep.taskRun.status}: partial streaming output was discarded and not persisted.`
      };
    } else if (terminalStatus === "PARTIAL") {
      next[stepId] = {
        ...chunk,
        status: "PARTIAL",
        finishReason: `${indexedStep.step.status}: partial streaming output was not promoted to final Artifact.`
      };
    }
  });
  return next;
}

function normalizeControlPayload(raw: string): ParsedControlPayload | null {
  try {
    const parsed = JSON.parse(raw) as {
      resourceId?: unknown;
      payload?: Record<string, unknown>;
      action?: unknown;
      status?: unknown;
      reason?: unknown;
    };
    const payload = (parsed.payload ?? parsed) as Record<string, unknown>;
    const taskRunId = String(payload.taskRunId ?? parsed.resourceId ?? "");
    if (!taskRunId) {
      return null;
    }
    return {
      taskRunId,
      action: typeof payload.action === "string" ? payload.action : undefined,
      status: typeof payload.status === "string" ? payload.status : undefined,
      reason: typeof payload.reason === "string" ? payload.reason : undefined
    };
  } catch {
    return null;
  }
}

function markStreamingPreviewsForTaskRun(
  state: Record<string, StreamingPreviewState>,
  control: ParsedControlPayload
): Record<string, StreamingPreviewState> {
  const next = { ...state };
  Object.entries(next).forEach(([stepId, preview]) => {
    if (preview.taskRunId === control.taskRunId && preview.content) {
      next[stepId] = {
        ...preview,
        status: "DISCARDED",
        finishReason:
          `${control.action || "CONTROL"} accepted: partial output discarded before final persistence.`
          + (control.reason ? ` Reason: ${control.reason}` : "")
      };
    }
  });
  return next;
}

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
  const [realtimeStatus, setRealtimeStatus] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">(
    "DISCONNECTED"
  );
  const [activeRealtimeRunSummary, setActiveRealtimeRunSummary] = useState<string | null>(null);
  const [streamingPreviewsByStepId, setStreamingPreviewsByStepId] = useState<Record<string, StreamingPreviewState>>({});
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [quoteMode, setQuoteMode] = useState<"quote" | "reply">("quote");

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
  const [rerunningMessageId, setRerunningMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [autoTriggerRunningMessageId, setAutoTriggerRunningMessageId] = useState<string | null>(null);
  const [revisingArtifact, setRevisingArtifact] = useState(false);
  const [deployingArtifact, setDeployingArtifact] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState(false);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

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

  const loadConversationIndex = useCallback(
    async (query = conversationQuery, filter = conversationFilter) => {
      setLoadingConversations(true);
      try {
        const includeArchived = filter === "ARCHIVED";
        const conversationData = await getConversations({ query, includeArchived });
        setConversations(conversationData);
        setCurrentConversationId((previousId) => {
          if (previousId && conversationData.some((conversation) => getIdValue(conversation.id) === previousId)) {
            return previousId;
          }
          return getIdValue(conversationData[0]?.id) || null;
        });
        return conversationData;
      } finally {
        setLoadingConversations(false);
      }
    },
    [conversationQuery, conversationFilter]
  );

  const loadInitialData = useCallback(async () => {
    setErrorMessage(null);
    setLoadingAgents(true);
    setLoadingConversations(true);

    try {
      const [agentData, conversationData, adapterData, qualityMetricData] = await Promise.all([
        getAgents(),
        getConversations(),
        getAdapters().catch(() => []),
        getAdapterQualityMetrics().catch(() => [])
      ]);
      const firstConversationId = getIdValue(conversationData[0]?.id) || null;

      setAgents(agentData);
      setAdapterDescriptors(adapterData);
      setAdapterQualityMetrics(qualityMetricData);
      setSelectedAgent((previous) => {
        if (!previous) {
          return null;
        }

        const previousId = getIdValue(previous.id);
        return agentData.find((agent) => getIdValue(agent.id) === previousId) ?? null;
      });
      setConversations(conversationData);
      setCurrentConversationId((previousId) => previousId ?? firstConversationId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingAgents(false);
      setLoadingConversations(false);
    }
  }, []);

  const loadMessageTriggerSuggestions = useCallback(async (conversationId: string, messageData: Message[]) => {
    const userMessages = messageData
      .filter((message) => message.senderType === "USER")
      .slice(-20);

    if (userMessages.length === 0) {
      setTriggerSuggestionsByMessageId({});
      return;
    }

    const entries = await Promise.all(
      userMessages.map(async (message) => {
        const messageId = getIdValue(message.id);
        try {
          const suggestion = await getOrchestratorTriggerSuggestion(conversationId, messageId);
          return [messageId, suggestion] as const;
        } catch {
          return [messageId, null] as const;
        }
      })
    );

    setTriggerSuggestionsByMessageId(Object.fromEntries(entries));
  }, []);

  const loadConversationData = useCallback(async (conversationId: string) => {
    setErrorMessage(null);
    setLoadingMessages(true);
    setLoadingTaskRuns(true);
    setLoadingArtifacts(true);

    try {
      const [
        messageData,
        taskSpecData,
        taskRunData,
        artifactData,
        deploymentData,
        artifactSnapshotData,
        actionAuditData,
        approvalRequestData,
        pinnedContextData,
        memoryData,
        qualityMetricData
      ] = await Promise.all([
        getMessages(conversationId),
        getTaskSpecsByConversation(conversationId),
        getTaskRunsByConversation(conversationId),
        getArtifactsByConversation(conversationId),
        getDeploymentsByConversation(conversationId),
        getArtifactSnapshotsByConversation(conversationId),
        getActionAuditsByConversation(conversationId),
        getApprovalRequestsByConversation(conversationId),
        getPinnedContextsByConversation(conversationId),
        getMemoriesByConversation(conversationId),
        getAdapterQualityMetrics().catch(() => [])
      ]);

      setMessages(messageData);
      setTaskSpecs(taskSpecData);
      setTaskRuns(taskRunData);
      setArtifacts(artifactData);
      setDeployments(deploymentData);
      setArtifactSnapshots(artifactSnapshotData);
      setActionAudits(actionAuditData);
      setApprovalRequests(approvalRequestData);
      setPinnedContexts(pinnedContextData);
      setMemories(memoryData);
      setAdapterQualityMetrics(qualityMetricData);
      setStreamingPreviewsByStepId((previous) => reconcileStreamingStateByTaskRuns(taskRunData, previous));
      void loadMessageTriggerSuggestions(conversationId, messageData);
      setShowAllArtifacts(true);
      setSelectedTaskStepId(null);
      setSelectedTaskRunId((previousId) => {
        const previousExists = previousId ? taskRunData.some((taskRun) => getIdValue(taskRun.id) === previousId) : false;

        return previousExists ? previousId : getIdValue(taskRunData[taskRunData.length - 1]?.id) || null;
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingMessages(false);
      setLoadingTaskRuns(false);
      setLoadingArtifacts(false);
    }
  }, [loadMessageTriggerSuggestions]);

  const loadContextData = useCallback(async (taskRunId: string) => {
    setErrorMessage(null);
    setLoadingContext(true);

    try {
      const [snapshotData, handoffData] = await Promise.all([
        getContextSnapshotsByTaskRun(taskRunId),
        getHandoffSummariesByTaskRun(taskRunId)
      ]);

      setContextSnapshots(snapshotData);
      setHandoffSummaries(handoffData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

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
      setSelectedTaskRunId(null);
      setSelectedTaskStepId(null);
      return;
    }

    void loadConversationData(currentConversationId);
  }, [currentConversationId, loadConversationData]);

  useEffect(() => {
    if (!currentConversationId) {
      setRealtimeStatus("DISCONNECTED");
      setActiveRealtimeRunSummary(null);
      return;
    }

    let closed = false;
    setRealtimeStatus("CONNECTING");

    const scheduleRefresh = () => {
      if (closed) {
        return;
      }
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
      realtimeRefreshTimerRef.current = window.setTimeout(() => {
        realtimeRefreshTimerRef.current = null;
        void loadConversationData(currentConversationId);
        void loadConversationIndex();
        void getActiveRealtimeState(currentConversationId)
          .then((state) => {
            if (!closed) {
              setActiveRealtimeRunSummary(state ? `${state.status} / ${state.summary || state.taskRunId}` : null);
            }
          })
          .catch(() => {
            if (!closed) {
              setActiveRealtimeRunSummary(null);
            }
          });
      }, 250);
    };

    const eventSource = new EventSource(getConversationEventsUrl(currentConversationId));
    eventSource.onopen = () => {
      if (!closed) {
        setRealtimeStatus("CONNECTED");
      }
    };
    eventSource.onerror = () => {
      if (!closed) {
        setRealtimeStatus("ERROR");
      }
    };

    const handleRealtimeEvent = (event: MessageEvent) => {
      if (event.type === "HEARTBEAT" || event.type === "CONNECTED") {
        setRealtimeStatus("CONNECTED");
        return;
      }
      if (TASK_STEP_STREAM_CHUNK_EVENT_TYPES.includes(event.type as (typeof TASK_STEP_STREAM_CHUNK_EVENT_TYPES)[number])) {
        setRealtimeStatus("CONNECTED");
        try {
          const streamPayload = normalizeStreamingPayload(event.data);
          if (streamPayload) {
            setStreamingPreviewsByStepId((previous) => ({
              ...previous,
              [streamPayload.taskStepId]: appendStreamingPreview(previous[streamPayload.taskStepId], streamPayload)
            }));
            return;
          }
        } catch {
          console.warn("Invalid AgentHub streaming event:", event.data);
        }
        return;
      }
      if (
        [
          "MESSAGE_CREATED",
          "TASK_RUN_CREATED",
          "TASK_RUN_UPDATED",
          "TASK_STEP_UPDATED",
          "ARTIFACT_CREATED",
          "ARTIFACT_UPDATED",
          "CONTEXT_UPDATED",
          "HANDOFF_UPDATED",
          "DEPLOYMENT_CREATED",
          "APPROVAL_UPDATED",
          "ACTION_AUDIT_CREATED",
          "CONTROL_COMMAND_RECEIVED",
          "CONTROL_COMMAND_REJECTED"
        ].includes(event.type)
      ) {
        setRealtimeStatus("CONNECTED");
        if (event.type === "CONTROL_COMMAND_RECEIVED") {
          const controlPayload = normalizeControlPayload(event.data);
          if (controlPayload) {
            setStreamingPreviewsByStepId((previous) => markStreamingPreviewsForTaskRun(previous, controlPayload));
          }
        }
        scheduleRefresh();
        return;
      }

      if (event.type !== "ERROR") {
        console.warn("Unknown AgentHub realtime event:", event.type, event.data);
      }
    };

    [
      "CONNECTED",
      "HEARTBEAT",
      "MESSAGE_CREATED",
      "TASK_RUN_CREATED",
      "TASK_RUN_UPDATED",
      "TASK_STEP_UPDATED",
      "ADAPTER_STREAM_CHUNK",
      "TASK_STEP_STREAM_CHUNK",
      "ARTIFACT_CREATED",
      "ARTIFACT_UPDATED",
      "CONTEXT_UPDATED",
      "HANDOFF_UPDATED",
      "DEPLOYMENT_CREATED",
      "APPROVAL_UPDATED",
      "ACTION_AUDIT_CREATED",
      "CONTROL_COMMAND_RECEIVED",
      "CONTROL_COMMAND_REJECTED",
      "ERROR"
    ].forEach((eventType) => eventSource.addEventListener(eventType, handleRealtimeEvent));

    return () => {
      closed = true;
      eventSource.close();
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      setRealtimeStatus("DISCONNECTED");
    };
  }, [currentConversationId, loadConversationData, loadConversationIndex]);

  useEffect(() => {
    if (!selectedTaskRunId) {
      setContextSnapshots([]);
      setHandoffSummaries([]);
      return;
    }

    void loadContextData(selectedTaskRunId);
  }, [selectedTaskRunId, loadContextData]);

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

    setSendingMessage(true);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      await sendMessage(
        currentConversationId,
        contentToSend,
        targetAgent ? getIdValue(targetAgent.id) : null,
        mentionedAgents.map((agent) => getIdValue(agent.id)).filter(Boolean),
        quoteMode === "reply" ? referencedMessageId : null,
        referencedMessageId,
        draftAttachments
      );
      if (parsedMention.matchedAgent) {
        setSelectedAgent(parsedMention.matchedAgent);
      }
      await loadConversationData(currentConversationId);
      await loadConversationIndex();
      setDraftMessage("");
      setDraftAttachments([]);
      setQuotedMessage(null);
      setQuoteMode("quote");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
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

  async function handleCreateArtifactRevision(artifactId: string, revisionInstruction: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再修改产物。");
      return;
    }

    setRevisingArtifact(true);
    setErrorMessage(null);

    try {
      const revisionResult = await createDemoArtifactRevision(artifactId, currentConversationId, revisionInstruction);
      const createdTaskRunId = getIdValue(revisionResult.taskRun.id);
      const revisedArtifactId = getIdValue(revisionResult.revisedArtifact.id);

      await loadConversationData(currentConversationId);
      setSelectedTaskRunId(createdTaskRunId);
      setSelectedTaskStepId(null);
      setShowAllArtifacts(true);
      setSelectedArtifactId(revisedArtifactId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRevisingArtifact(false);
    }
  }

  async function handleApplyArtifactDiff(artifactId: string, approvalId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId, false, approvalId);
      if (applyResult.conflict) {
        const lineStats = `Diff 仍包含新增 ${applyResult.addedLines} 行、删除 ${applyResult.removedLines} 行。`;
        setOperationMessage(`${applyResult.conflictReason || "检测到 Diff 应用冲突，请查看最新已应用产物。"} ${lineStats}`);
        return null;
      }
      if (!applyResult.appliedArtifact) {
        setOperationMessage("Diff 应用未生成新产物。");
        return null;
      }
      const appliedArtifactId = getIdValue(applyResult.appliedArtifact.id);

      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(appliedArtifactId);
      setOperationMessage(
        `Diff 已应用为 ${applyResult.appliedArtifact.title} v${applyResult.appliedArtifact.version}，新增 ${applyResult.addedLines} 行，删除 ${applyResult.removedLines} 行。`
      );
      return applyResult.appliedArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }

  async function handleForceApplyArtifactDiff(artifactId: string, approvalId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再强制应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId, true, approvalId);
      if (!applyResult.appliedArtifact) {
        setOperationMessage("强制应用 Diff 未生成新产物。");
        return null;
      }

      const appliedArtifactId = getIdValue(applyResult.appliedArtifact.id);
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(appliedArtifactId);
      const bypassMessage = applyResult.conflictBypassed
        ? ` 已绕过冲突保护：${applyResult.conflictReason || "force apply bypassed the latest accepted artifact guard."}`
        : "";
      setOperationMessage(
        `已强制应用 Diff 为 ${applyResult.appliedArtifact.title} v${applyResult.appliedArtifact.version}，新增 ${applyResult.addedLines} 行，删除 ${applyResult.removedLines} 行。${bypassMessage}`
      );
      return applyResult.appliedArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }

  async function handleCreateDeployment(artifactId: string, approvalId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再部署产物。");
      return;
    }

    setDeployingArtifact(true);
    setErrorMessage(null);

    try {
      const deployment = await createDemoDeployment(artifactId, approvalId);
      const [refreshedMessages, refreshedDeployments, refreshedSnapshots, refreshedAudits] = await Promise.all([
        getMessages(currentConversationId),
        getDeploymentsByConversation(currentConversationId),
        getArtifactSnapshotsByConversation(currentConversationId),
        getActionAuditsByConversation(currentConversationId)
      ]);
      setMessages(refreshedMessages);
      setDeployments(refreshedDeployments);
      setArtifactSnapshots(refreshedSnapshots);
      setActionAudits(refreshedAudits);
      setSelectedArtifactId(getIdValue(deployment.artifactId) || artifactId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setDeployingArtifact(false);
    }
  }

  async function handleRestoreArtifactSnapshot(snapshotId: string, approvalId: string): Promise<Artifact | null> {
    if (!currentConversationId) {
      setErrorMessage("Please select a conversation before restoring a snapshot.");
      return null;
    }

    setRestoringSnapshot(true);
    setErrorMessage(null);

    try {
      const restoredArtifact = await restoreArtifactSnapshotWithApproval(snapshotId, approvalId);
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(getIdValue(restoredArtifact.id));
      setOperationMessage(`Restored snapshot as ${restoredArtifact.title} v${restoredArtifact.version}.`);
      return restoredArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    } finally {
      setRestoringSnapshot(false);
    }
  }

  async function handleCreateApprovalRequest(request: {
    actionType: string;
    targetType: string;
    targetId: string;
    riskLevel: string;
    summary: string;
    affectedItems: string[];
  }): Promise<string | null> {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再创建审批请求。");
      return null;
    }

    try {
      const approvalRequest = await createApprovalRequest(currentConversationId, request);
      const refreshedAudits = await getActionAuditsByConversation(currentConversationId);
      setActionAudits(refreshedAudits);
      return approvalRequest.approvalId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }

  async function handleApproveApprovalRequest(approvalId: string) {
    if (!currentConversationId) {
      return;
    }

    await approveApprovalRequest(approvalId);
    const [refreshedAudits, refreshedApprovals] = await Promise.all([
      getActionAuditsByConversation(currentConversationId),
      getApprovalRequestsByConversation(currentConversationId)
    ]);
    setActionAudits(refreshedAudits);
    setApprovalRequests(refreshedApprovals);
  }

  async function handleCancelApprovalRequest(approvalId: string) {
    if (!currentConversationId) {
      return;
    }

    await cancelApprovalRequest(approvalId);
    const [refreshedAudits, refreshedApprovals] = await Promise.all([
      getActionAuditsByConversation(currentConversationId),
      getApprovalRequestsByConversation(currentConversationId)
    ]);
    setActionAudits(refreshedAudits);
    setApprovalRequests(refreshedApprovals);
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

  return (
    <section className="workspace-page" data-testid="workspace-page">
      <aside className="workspace-sidebar" data-testid="workspace-sidebar">
        <div className="workspace-sidebar__header">
          <div className="workspace-brand">
            <h1>AgentHub</h1>
            <p>面向 Orchestrator、TaskRun 和 Artifact 的 IM 式协作工作台。</p>
          </div>
          <button
            type="button"
            className="primary-button"
            data-testid="create-conversation-button"
            disabled={creatingConversation}
            onClick={handleCreateDemoConversation}
          >
            {creatingConversation ? "创建中..." : "+ 新建对话"}
          </button>
        </div>

        <div className="workspace-sidebar__body">
          <section className="workspace-section">
            <div className="section-header">
              <h3>近期会话</h3>
              <span>{conversations.length}</span>
            </div>
            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              loading={loadingConversations}
              query={conversationQuery}
              filter={conversationFilter}
              onQueryChange={handleConversationQueryChange}
              onFilterChange={handleConversationFilterChange}
              onSelect={handleSelectConversation}
              onTogglePinned={handleToggleConversationPinned}
              onArchive={handleArchiveConversation}
              onRestore={handleRestoreConversation}
            />
          </section>

          <section className="workspace-section">
            <div className="section-header">
              <h3>我的 Agent</h3>
              <span>{agents.length}</span>
            </div>
            <AgentList
              agents={agents}
              adapterDescriptors={adapterDescriptors}
              loading={loadingAgents}
              selectedAgentId={selectedAgent ? getIdValue(selectedAgent.id) : null}
              onSelectAgent={handleSelectAgent}
            />
          </section>
        </div>
      </aside>

      <main className="workspace-main">
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

        <div className="selected-agent-banner">
          {selectedAgent ? (
            <>
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
            </>
          ) : (
            <div>
              <div className="selected-agent-name">未选择 Agent</div>
              <div className="selected-agent-adapter">未选择时，Demo 会使用内置 Agent 流程。</div>
            </div>
          )}
        </div>

        <div className="workspace-main__content">
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
          />
          <AdapterRoutingPanel adapterDescriptors={adapterDescriptors} selectedAgent={selectedAgent} />
          <AdapterQualityDashboard
            adapterDescriptors={adapterDescriptors}
            taskRuns={taskRuns}
            qualityMetrics={adapterQualityMetrics}
          />
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
          <ContextPanel
            taskSpec={activeTaskSpec}
            taskRuns={taskRuns}
            pinnedContexts={pinnedContexts}
            memories={memories}
            contextSnapshots={contextSnapshots}
            handoffSummaries={handoffSummaries}
            loading={loadingContext}
          />
          <ActionAuditTimelinePanel audits={actionAudits} />
          <ChatInput
            value={draftMessage}
            disabled={!currentConversationId}
            sending={sendingMessage}
            selectedAgent={selectedAgent}
            quotedMessage={quotedMessage}
            quoteMode={quoteMode}
            attachments={draftAttachments}
            onChange={setDraftMessage}
            onAttachmentsChange={setDraftAttachments}
            onUploadFiles={handleUploadAttachments}
            onClearQuote={() => {
              setQuotedMessage(null);
              setQuoteMode("quote");
            }}
            onSend={handleSendMessage}
          />
        </div>
      </main>

      <aside className="workspace-artifacts" data-testid="workspace-artifacts">
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
          onCreateDeployment={handleCreateDeployment}
          onRestoreSnapshot={handleRestoreArtifactSnapshot}
          onApplyDiff={handleApplyArtifactDiff}
          onForceApplyDiff={handleForceApplyArtifactDiff}
          onCreateApprovalRequest={handleCreateApprovalRequest}
          onApproveApprovalRequest={handleApproveApprovalRequest}
          onCancelApprovalRequest={handleCancelApprovalRequest}
        />
      </aside>
    </section>
  );
}
