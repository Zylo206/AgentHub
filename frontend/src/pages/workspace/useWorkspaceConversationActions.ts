import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  archiveConversation,
  createConversation,
  markConversationRead,
  pinConversation,
  unarchiveConversation,
  unpinConversation
} from "../../api/agenthubApi";
import type { ArtifactSelectionReference } from "../../features/artifacts/artifactTypes";
import type { ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { getIdValue } from "../../utils/id";

interface UseWorkspaceConversationActionsParams {
  conversationQuery: string;
  conversationFilter: ConversationFilter;
  loadConversationIndex: (query?: string, filter?: ConversationFilter) => Promise<Conversation[]>;
  setCurrentConversationId: Dispatch<SetStateAction<string | null>>;
  setCreatingConversation: Dispatch<SetStateAction<boolean>>;
  setConversationQuery: Dispatch<SetStateAction<string>>;
  setConversationFilter: Dispatch<SetStateAction<ConversationFilter>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setArtifactSelectionReference: Dispatch<SetStateAction<ArtifactSelectionReference | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function useWorkspaceConversationActions({
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
}: UseWorkspaceConversationActionsParams) {
  const handleCreateDemoConversation = useCallback(async () => {
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
  }, [setConversations, setCreatingConversation, setCurrentConversationId, setErrorMessage]);

  const handleConversationQueryChange = useCallback(
    async (nextQuery: string) => {
      setConversationQuery(nextQuery);
      setErrorMessage(null);
      try {
        await loadConversationIndex(nextQuery, conversationFilter);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [conversationFilter, loadConversationIndex, setConversationQuery, setErrorMessage]
  );

  const handleConversationFilterChange = useCallback(
    async (nextFilter: ConversationFilter) => {
      setConversationFilter(nextFilter);
      setErrorMessage(null);
      try {
        await loadConversationIndex(conversationQuery, nextFilter);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [conversationQuery, loadConversationIndex, setConversationFilter, setErrorMessage]
  );

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
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
    },
    [setArtifactSelectionReference, setConversations, setCurrentConversationId]
  );

  const handleToggleConversationPinned = useCallback(
    async (conversation: Conversation) => {
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
    },
    [loadConversationIndex, setErrorMessage]
  );

  const handleArchiveConversation = useCallback(
    async (conversation: Conversation) => {
      const conversationId = getIdValue(conversation.id);
      setErrorMessage(null);
      try {
        await archiveConversation(conversationId);
        await loadConversationIndex();
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [loadConversationIndex, setErrorMessage]
  );

  const handleRestoreConversation = useCallback(
    async (conversation: Conversation) => {
      const conversationId = getIdValue(conversation.id);
      setErrorMessage(null);
      try {
        await unarchiveConversation(conversationId);
        await loadConversationIndex();
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [loadConversationIndex, setErrorMessage]
  );

  return {
    handleCreateDemoConversation,
    handleConversationQueryChange,
    handleConversationFilterChange,
    handleSelectConversation,
    handleToggleConversationPinned,
    handleArchiveConversation,
    handleRestoreConversation
  };
}
