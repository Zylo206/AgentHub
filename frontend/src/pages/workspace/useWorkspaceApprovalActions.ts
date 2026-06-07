import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  approveApprovalRequest,
  createApprovalRequest,
  getApprovalRequestsByConversation,
  getConversation,
  getOrchestratorTriggerSuggestion,
  runOrchestratorFromMessage
} from "../../api/agenthubApi";
import type { Agent } from "../../features/agents/agentTypes";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import type { Message, OrchestratorTriggerSuggestion } from "../../features/chat/chatTypes";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { getIdValue } from "../../utils/id";

interface UseWorkspaceApprovalActionsParams {
  currentConversationId: string | null;
  selectedAgent: Agent | null;
  triggerSuggestionsByMessageId: Record<string, OrchestratorTriggerSuggestion | null>;
  approvalByMessageId: Record<string, ApprovalRequest | null>;
  loadConversationData: (conversationId: string) => Promise<void>;
  setAutoTriggerRunningMessageId: Dispatch<SetStateAction<string | null>>;
  setApprovalRequests: Dispatch<SetStateAction<ApprovalRequest[]>>;
  setTriggerSuggestionsByMessageId: Dispatch<SetStateAction<Record<string, OrchestratorTriggerSuggestion | null>>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setSelectedTaskStepId: Dispatch<SetStateAction<string | null>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

export function useWorkspaceApprovalActions({
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
}: UseWorkspaceApprovalActionsParams) {
  const handleRefreshOrchestratorSuggestion = useCallback(
    async (message: Message) => {
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
    },
    [
      currentConversationId,
      setApprovalRequests,
      setErrorMessage,
      setOperationMessage,
      setTriggerSuggestionsByMessageId
    ]
  );

  const handleConfirmOrchestratorTrigger = useCallback(
    async (message: Message) => {
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
    },
    [
      approvalByMessageId,
      currentConversationId,
      loadConversationData,
      selectedAgent,
      setApprovalRequests,
      setAutoTriggerRunningMessageId,
      setConversations,
      setErrorMessage,
      setOperationMessage,
      setSelectedTaskRunId,
      setSelectedTaskStepId,
      setShowAllArtifacts,
      triggerSuggestionsByMessageId
    ]
  );

  return {
    handleRefreshOrchestratorSuggestion,
    handleConfirmOrchestratorTrigger
  };
}
