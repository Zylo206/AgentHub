import { useCallback, type Dispatch, type SetStateAction } from "react";
import { cancelTaskRun, stopTaskRun } from "../../api/agenthubApi";
import type { TaskStep } from "../../features/chat/chatTypes";
import { getIdValue } from "../../utils/id";

interface UseWorkspaceTaskRunControlsParams {
  currentConversationId: string | null;
  loadConversationData: (conversationId: string) => Promise<void>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setSelectedTaskStepId: Dispatch<SetStateAction<string | null>>;
  setSelectedArtifactId: Dispatch<SetStateAction<string | null>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useWorkspaceTaskRunControls({
  currentConversationId,
  loadConversationData,
  setSelectedTaskRunId,
  setSelectedTaskStepId,
  setSelectedArtifactId,
  setShowAllArtifacts,
  setErrorMessage,
  setOperationMessage
}: UseWorkspaceTaskRunControlsParams) {
  const handleCancelTaskRun = useCallback(
    async (taskRunId: string) => {
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
    },
    [currentConversationId, loadConversationData, setErrorMessage, setOperationMessage]
  );

  const handleStopTaskRun = useCallback(
    async (taskRunId: string) => {
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
    },
    [currentConversationId, loadConversationData, setErrorMessage, setOperationMessage]
  );

  const handleSelectTaskStep = useCallback(
    (taskRunId: string, step: TaskStep) => {
      setSelectedTaskRunId(taskRunId);
      setSelectedTaskStepId(getIdValue(step.id));
      setShowAllArtifacts(false);

      const firstArtifactId = step.producedArtifactIds.length > 0 ? getIdValue(step.producedArtifactIds[0]) : null;

      if (firstArtifactId) {
        setSelectedArtifactId(firstArtifactId);
      }
    },
    [setSelectedArtifactId, setSelectedTaskRunId, setSelectedTaskStepId, setShowAllArtifacts]
  );

  const handleShowAllArtifacts = useCallback(() => {
    setShowAllArtifacts(true);
  }, [setShowAllArtifacts]);

  return {
    handleCancelTaskRun,
    handleStopTaskRun,
    handleSelectTaskStep,
    handleShowAllArtifacts
  };
}
