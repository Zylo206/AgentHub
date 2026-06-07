import { useCallback, type Dispatch, type SetStateAction } from "react";
import { createAgent, getAgents } from "../../api/agenthubApi";
import type { Agent } from "../../features/agents/agentTypes";
import type { AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";

interface UseWorkspaceInlineAgentCreationParams {
  agentCreationDraftsByMessageId: Record<string, AgentCreationDraft | null>;
  setAgentCreationDraftsByMessageId: Dispatch<SetStateAction<Record<string, AgentCreationDraft | null>>>;
  setAgentCreationRunningMessageId: Dispatch<SetStateAction<string | null>>;
  setAgents: Dispatch<SetStateAction<Agent[]>>;
  setSelectedAgent: Dispatch<SetStateAction<Agent | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

export function useWorkspaceInlineAgentCreation({
  agentCreationDraftsByMessageId,
  setAgentCreationDraftsByMessageId,
  setAgentCreationRunningMessageId,
  setAgents,
  setSelectedAgent,
  setErrorMessage,
  setOperationMessage
}: UseWorkspaceInlineAgentCreationParams) {
  const handleConfirmAgentCreation = useCallback(
    async (messageId: string) => {
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
    },
    [
      agentCreationDraftsByMessageId,
      setAgentCreationDraftsByMessageId,
      setAgentCreationRunningMessageId,
      setAgents,
      setErrorMessage,
      setOperationMessage,
      setSelectedAgent
    ]
  );

  const handleCancelAgentCreation = useCallback(
    (messageId: string) => {
      setAgentCreationDraftsByMessageId((current) => {
        const next = { ...current };
        delete next[messageId];
        return next;
      });
      setOperationMessage("已取消本次 Agent 创建草案。");
    },
    [setAgentCreationDraftsByMessageId, setOperationMessage]
  );

  return {
    handleConfirmAgentCreation,
    handleCancelAgentCreation
  };
}
