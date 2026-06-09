import type { Conversation } from "../../features/conversations/conversationTypes";

const WORKSPACE_SESSION_CACHE_KEY = "agenthub.workspace.session-cache";

interface WorkspaceSessionCache {
  conversations: Conversation[];
  currentConversationId: string | null;
}

function getEmptyCache(): WorkspaceSessionCache {
  return {
    conversations: [],
    currentConversationId: null
  };
}

export function readWorkspaceSessionCache(): WorkspaceSessionCache {
  if (typeof window === "undefined") {
    return getEmptyCache();
  }

  try {
    const raw = window.sessionStorage.getItem(WORKSPACE_SESSION_CACHE_KEY);
    if (!raw) {
      return getEmptyCache();
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceSessionCache> | null;
    return {
      conversations: Array.isArray(parsed?.conversations) ? (parsed?.conversations as Conversation[]) : [],
      currentConversationId:
        typeof parsed?.currentConversationId === "string" && parsed.currentConversationId.trim().length > 0
          ? parsed.currentConversationId
          : null
    };
  } catch {
    return getEmptyCache();
  }
}

export function writeWorkspaceSessionCache(cache: WorkspaceSessionCache): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    WORKSPACE_SESSION_CACHE_KEY,
    JSON.stringify({
      conversations: cache.conversations,
      currentConversationId: cache.currentConversationId
    })
  );
}
