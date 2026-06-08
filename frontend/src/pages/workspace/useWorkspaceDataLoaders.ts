import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  getActionAuditsByConversation,
  getAdapterQualityMetrics,
  getAdapters,
  getAgents,
  getArtifactSnapshotsByConversation,
  getArtifactsByConversation,
  getContextSnapshotsByTaskRun,
  getConversations,
  getDeploymentsByConversation,
  getHandoffSummariesByTaskRun,
  getMemoriesByConversation,
  getMessages,
  getApprovalRequestsByConversation,
  getOrchestratorTriggerSuggestion,
  getPinnedContextsByConversation,
  getTaskRunsByConversation,
  getTaskRunObservabilityByConversation,
  getTaskSpecsByConversation
} from "../../api/agenthubApi";
import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../../features/artifacts/artifactSnapshotTypes";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import type { ActionAuditLog } from "../../features/audit/auditTypes";
import type {
  Message,
  OrchestratorTriggerSuggestion,
  StreamingPreviewState,
  TaskRunObservabilitySummary,
  TaskRun,
  TaskSpec
} from "../../features/chat/chatTypes";
import type { ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../../features/context/contextTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import { getIdValue } from "../../utils/id";
import { reconcileStreamingStateByTaskRuns } from "./useWorkspaceRealtime";

interface UseWorkspaceDataLoadersParams {
  conversationQuery: string;
  conversationFilter: ConversationFilter;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setLoadingAgents: Dispatch<SetStateAction<boolean>>;
  setLoadingConversations: Dispatch<SetStateAction<boolean>>;
  setLoadingMessages: Dispatch<SetStateAction<boolean>>;
  setLoadingTaskRuns: Dispatch<SetStateAction<boolean>>;
  setLoadingArtifacts: Dispatch<SetStateAction<boolean>>;
  setLoadingContext: Dispatch<SetStateAction<boolean>>;
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  setAdapterDescriptors: Dispatch<SetStateAction<AdapterDescriptor[]>>;
  setAdapterQualityMetrics: Dispatch<SetStateAction<AdapterQualityMetrics[]>>;
  setSelectedAgent: Dispatch<SetStateAction<Agent | null>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setCurrentConversationId: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setTaskSpecs: Dispatch<SetStateAction<TaskSpec[]>>;
  setTaskRuns: Dispatch<SetStateAction<TaskRun[]>>;
  setTaskRunObservability: Dispatch<SetStateAction<TaskRunObservabilitySummary | null>>;
  setArtifacts: Dispatch<SetStateAction<Artifact[]>>;
  setDeployments: Dispatch<SetStateAction<DeploymentRecord[]>>;
  setArtifactSnapshots: Dispatch<SetStateAction<ArtifactSnapshot[]>>;
  setActionAudits: Dispatch<SetStateAction<ActionAuditLog[]>>;
  setApprovalRequests: Dispatch<SetStateAction<ApprovalRequest[]>>;
  setTriggerSuggestionsByMessageId: Dispatch<SetStateAction<Record<string, OrchestratorTriggerSuggestion | null>>>;
  setPinnedContexts: Dispatch<SetStateAction<PinnedContext[]>>;
  setMemories: Dispatch<SetStateAction<MemoryItem[]>>;
  setStreamingPreviewsByStepId: Dispatch<SetStateAction<Record<string, StreamingPreviewState>>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
  setSelectedTaskStepId: Dispatch<SetStateAction<string | null>>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setContextSnapshots: Dispatch<SetStateAction<ContextSnapshot[]>>;
  setHandoffSummaries: Dispatch<SetStateAction<HandoffSummary[]>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useWorkspaceDataLoaders({
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
  setTaskRunObservability,
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
}: UseWorkspaceDataLoadersParams) {
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
    [conversationQuery, conversationFilter, setConversations, setCurrentConversationId, setLoadingConversations]
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
  }, [
    setAdapterDescriptors,
    setAdapterQualityMetrics,
    setAgents,
    setConversations,
    setCurrentConversationId,
    setErrorMessage,
    setLoadingAgents,
    setLoadingConversations,
    setSelectedAgent
  ]);

  const loadMessageTriggerSuggestions = useCallback(
    async (conversationId: string, messageData: Message[]) => {
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
    },
    [setTriggerSuggestionsByMessageId]
  );

  const loadConversationData = useCallback(
    async (conversationId: string, options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      setErrorMessage(null);
      if (!silent) {
        setLoadingMessages(true);
        setLoadingTaskRuns(true);
        setLoadingArtifacts(true);
      }

      try {
        const [
          messageData,
          taskSpecData,
          taskRunData,
          taskRunObservability,
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
          getTaskRunObservabilityByConversation(conversationId).catch(() => null),
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
        setTaskRunObservability(taskRunObservability);
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
          const previousExists = previousId
            ? taskRunData.some((taskRun) => getIdValue(taskRun.id) === previousId)
            : false;

          return previousExists ? previousId : getIdValue(taskRunData[taskRunData.length - 1]?.id) || null;
        });
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (!silent) {
          setLoadingMessages(false);
          setLoadingTaskRuns(false);
          setLoadingArtifacts(false);
        }
      }
    },
    [
      loadMessageTriggerSuggestions,
      setActionAudits,
      setAdapterQualityMetrics,
      setApprovalRequests,
      setArtifactSnapshots,
      setArtifacts,
      setDeployments,
      setErrorMessage,
      setLoadingArtifacts,
      setLoadingMessages,
      setLoadingTaskRuns,
      setMemories,
      setMessages,
      setPinnedContexts,
      setSelectedTaskRunId,
      setSelectedTaskStepId,
      setShowAllArtifacts,
      setStreamingPreviewsByStepId,
      setTaskRuns,
      setTaskSpecs,
      setTaskRunObservability
    ]
  );

  const loadContextData = useCallback(
    async (taskRunId: string) => {
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
    },
    [setContextSnapshots, setErrorMessage, setHandoffSummaries, setLoadingContext]
  );

  return {
    loadConversationIndex,
    loadInitialData,
    loadMessageTriggerSuggestions,
    loadConversationData,
    loadContextData
  };
}
