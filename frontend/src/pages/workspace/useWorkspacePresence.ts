import { useEffect, useMemo, useState } from "react";
import {
  getConversationPresence,
  getCurrentUser,
  heartbeatConversationPresence,
  type AuthUser,
  type PresenceRecord
} from "../../api/agenthubApi";

const PRESENCE_DEVICE_ID_KEY = "agenthub.presence.deviceId";

function getPresenceDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = window.localStorage.getItem(PRESENCE_DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(PRESENCE_DEVICE_ID_KEY, generated);
  return generated;
}

interface UseWorkspacePresenceParams {
  currentConversationId: string | null;
  draftMessage: string;
  selectedArtifactId: string | null;
  realtimeStatus: string;
}

export function useWorkspacePresence({
  currentConversationId,
  draftMessage,
  selectedArtifactId,
  realtimeStatus
}: UseWorkspacePresenceParams) {
  const [presenceRecords, setPresenceRecords] = useState<PresenceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const deviceId = useMemo(() => getPresenceDeviceId(), []);
  const presenceStatus = draftMessage.trim() ? "TYPING" : "ACTIVE";

  useEffect(() => {
    let cancelled = false;
    void getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentConversationId) {
      setPresenceRecords([]);
      setPresenceError(null);
      return;
    }

    let cancelled = false;
    const syncPresence = async () => {
      try {
        await heartbeatConversationPresence(currentConversationId, {
          deviceId,
          status: presenceStatus,
          activeArtifactId: selectedArtifactId,
          lastSeenEventId: realtimeStatus
        });
        const records = await getConversationPresence(currentConversationId);
        if (!cancelled) {
          setPresenceRecords(records);
          setPresenceError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPresenceError(error instanceof Error ? error.message : "Presence 同步失败");
        }
      }
    };

    void syncPresence();
    const timer = window.setInterval(() => void syncPresence(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [currentConversationId, deviceId, presenceStatus, realtimeStatus, selectedArtifactId]);

  return {
    currentUser,
    deviceId,
    presenceError,
    presenceRecords,
    presenceStatus
  };
}
