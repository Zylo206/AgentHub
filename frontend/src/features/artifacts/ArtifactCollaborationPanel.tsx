import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  getArtifactCollabRoom,
  getArtifactCollabWebSocketUrl,
  publishArtifactCollabDraft,
  updateArtifactCollabDocument,
  updateArtifactCollabPresence
} from "../../api/agenthubApi";
import { getIdValue } from "../../utils/id";
import type { ArtifactCollabRoom } from "./artifactCollaborationTypes";
import type { Artifact } from "./artifactTypes";
import { useArtifactYjsCollaboration } from "./useArtifactYjsCollaboration";

interface ArtifactCollaborationPanelProps {
  artifact: Artifact;
  onSelectArtifact: (artifactId: string) => void;
  onCreateApprovalRequest: (request: {
    actionType: string;
    targetType: string;
    targetId: string;
    riskLevel: string;
    summary: string;
    affectedItems: string[];
  }) => Promise<string | null>;
  onApproveApprovalRequest: (approvalId: string) => Promise<void>;
}

function getDeviceId(): string {
  const key = "agenthub.collab.deviceId";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next = `web-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function isCollaborativeArtifact(artifact: Artifact): boolean {
  return artifact.type === "CODE" || artifact.type === "MARKDOWN";
}

function getSelectionRange(textarea: HTMLTextAreaElement): { start: number; end: number } {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd
  };
}

export function ArtifactCollaborationPanel({
  artifact,
  onSelectArtifact,
  onCreateApprovalRequest,
  onApproveApprovalRequest
}: ArtifactCollaborationPanelProps) {
  const artifactId = getIdValue(artifact.id);
  const [room, setRoom] = useState<ArtifactCollabRoom | null>(null);
  const [content, setContent] = useState(artifact.content || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deviceId] = useState(() => getDeviceId());
  const socketRef = useRef<WebSocket | null>(null);
  const dirtyRef = useRef(false);
  const yjsCollab = useArtifactYjsCollaboration({
    artifactId,
    deviceId,
    initialContent: room?.content || artifact.content || "",
    enabled: isCollaborativeArtifact(artifact) && import.meta.env.VITE_DOC_COLLAB_V2_ENABLED !== "false"
  });
  const usingYjs = yjsCollab.active;
  const displayedContent = usingYjs ? yjsCollab.content : content;
  const displayedParticipants = usingYjs ? yjsCollab.participants : room?.participants || [];

  useEffect(() => {
    let cancelled = false;
    setRoom(null);
    setContent(artifact.content || "");
    setErrorMessage(null);
    setStatusMessage(null);
    dirtyRef.current = false;

    if (!artifactId || !isCollaborativeArtifact(artifact)) {
      return () => {
        cancelled = true;
      };
    }

    async function loadRoom() {
      try {
        const loadedRoom = await getArtifactCollabRoom(artifactId);
        if (!cancelled) {
          setRoom(loadedRoom);
          setContent(loadedRoom.content || "");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "协同房间加载失败。");
        }
      }
    }

    void loadRoom();
    return () => {
      cancelled = true;
    };
  }, [artifact, artifactId]);

  useEffect(() => {
    if (!room || !artifactId || !isCollaborativeArtifact(artifact) || usingYjs) {
      return;
    }

    const socket = new WebSocket(getArtifactCollabWebSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        action: "JOIN",
        artifactId,
        deviceId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type?: string;
          message?: string;
          room?: ArtifactCollabRoom;
        };
        if (payload.type === "COLLAB_ERROR") {
          setErrorMessage(payload.message || "协同操作失败。");
          setSyncing(false);
          return;
        }
        if (payload.room) {
          setRoom(payload.room);
          if (!dirtyRef.current || payload.type === "ROOM_STATE") {
            setContent(payload.room.content || "");
            dirtyRef.current = false;
          }
          setSyncing(false);
        }
      } catch {
        setErrorMessage("协同通道返回了无法解析的消息。");
      }
    };

    socket.onerror = () => {
      setErrorMessage("协同 WebSocket 连接失败，将继续保留 REST 兜底同步。");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, [artifact, artifactId, deviceId, room?.roomId, usingYjs]);

  useEffect(() => {
    if (!room || !dirtyRef.current || usingYjs) {
      return;
    }

    const handle = window.setTimeout(() => {
      const summary = "Artifact collaborative editor draft update.";
      setSyncing(true);
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          action: "UPDATE_DOCUMENT",
          baseVersion: room.version,
          content,
          summary
        }));
        dirtyRef.current = false;
        return;
      }

      updateArtifactCollabDocument(artifactId, {
        baseVersion: room.version,
        content,
        deviceId,
        summary
      })
        .then((updatedRoom) => {
          setRoom(updatedRoom);
          setContent(updatedRoom.content || "");
          dirtyRef.current = false;
        })
        .catch((error) => {
          setErrorMessage(error instanceof Error ? error.message : "协同草稿同步失败。");
        })
        .finally(() => setSyncing(false));
    }, 600);

    return () => window.clearTimeout(handle);
  }, [artifactId, content, deviceId, room, usingYjs]);

  function handleContentChange(value: string) {
    if (usingYjs) {
      yjsCollab.updateContent(value);
      return;
    }
    if (room && value.length > room.maxDocumentChars) {
      setErrorMessage(`协同草稿超过 ${room.maxDocumentChars} 字符上限。`);
      return;
    }
    setContent(value);
    dirtyRef.current = true;
    setErrorMessage(null);
  }

  function handleSelectionChange(event: SyntheticEvent<HTMLTextAreaElement>) {
    const range = getSelectionRange(event.currentTarget);
    if (usingYjs) {
      yjsCollab.updateCursor(range.start, range.end, true);
      return;
    }
    const socket = socketRef.current;
    const payload = {
      action: "CURSOR",
      cursorStart: range.start,
      cursorEnd: range.end,
      editing: true
    };
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return;
    }
    void updateArtifactCollabPresence(artifactId, {
      deviceId,
      cursorStart: range.start,
      cursorEnd: range.end,
      editing: true
    }).then(setRoom).catch(() => undefined);
  }

  async function handlePublishDraft() {
    if (!room || publishing || dirtyRef.current) {
      return;
    }

    setPublishing(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const approvalId = await onCreateApprovalRequest({
        actionType: "PUBLISH_COLLAB_DRAFT",
        targetType: "ARTIFACT",
        targetId: artifactId,
        riskLevel: "HIGH",
        summary: `发布 ${artifact.title} 的多人协同草稿为正式 Artifact Revision。`,
        affectedItems: [
          `Artifact: ${artifact.title} v${artifact.version}`,
          `Collab room: ${room.roomId} / version ${room.version}`,
          `Participants: ${room.participants.length}`,
          `Draft hash: ${room.contentHash}`,
          "Publish only creates a reviewable revision; Apply Diff still uses the existing approval gate."
        ]
      });
      if (!approvalId) {
        setErrorMessage("无法创建协同发布审批。");
        return;
      }
      await onApproveApprovalRequest(approvalId);
      const protocol = usingYjs ? yjsCollab.protocol : room.protocol;
      const roomVersion = usingYjs ? yjsCollab.roomVersion : room.version;
      const revision = await publishArtifactCollabDraft(
        artifactId,
        approvalId,
        `Published collaborative room ${room.roomId} version ${roomVersion ?? room.version}.`,
        {
          protocol,
          roomVersion,
          content: usingYjs ? yjsCollab.content : null
        }
      );
      onSelectArtifact(getIdValue(revision.id));
      setStatusMessage(`已发布协同草稿为 ${revision.title} v${revision.version}。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "协同草稿发布失败。");
    } finally {
      setPublishing(false);
    }
  }

  if (!isCollaborativeArtifact(artifact)) {
    return (
      <section className="artifact-collab-panel artifact-collab-panel--disabled">
        <div className="artifact-collab-panel__header">
          <div>
            <strong>多人实时协同</strong>
            <p>第一阶段只开放 CODE 和 MARKDOWN Artifact。</p>
          </div>
          <span>Unsupported</span>
        </div>
      </section>
    );
  }

  return (
    <section className="artifact-collab-panel" data-testid="artifact-collab-panel">
      <div className="artifact-collab-panel__header">
        <div>
          <strong>多人实时协同草稿</strong>
          <p>Artifact 级协同房间。发布后生成 Revision，再进入现有 Diff / Approval / Audit 链路。</p>
        </div>
        <span>
          {usingYjs
            ? yjsCollab.connected
              ? `Yjs v${yjsCollab.roomVersion ?? room?.version ?? 1}`
              : yjsCollab.status
            : syncing
              ? "Syncing"
              : room
                ? `Room v${room.version}`
                : "Loading"}
        </span>
      </div>

      <div className="artifact-collab-panel__meta">
        <span>{usingYjs ? yjsCollab.protocol : room?.protocol || "AGENTHUB_ARTIFACT_COLLAB_V1"}</span>
        <span>{room ? `${displayedParticipants.length} 人在线` : "等待房间"}</span>
        <span>{room?.lastCompactedAt ? "Op log compacted" : "Op log active"}</span>
      </div>

      <textarea
        className="artifact-collab-panel__editor"
        data-testid="artifact-collab-editor"
        value={displayedContent}
        spellCheck={false}
        disabled={!room || publishing}
        onChange={(event) => handleContentChange(event.target.value)}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onMouseUp={handleSelectionChange}
      />

      <div className="artifact-collab-panel__participants">
        {displayedParticipants.map((participant) => (
          <span key={`${participant.userId}:${participant.deviceId}`}>
            {participant.displayName} · {participant.editing ? "editing" : participant.status}
          </span>
        ))}
      </div>

      {errorMessage ? <p className="artifact-collab-panel__message artifact-collab-panel__message--error">{errorMessage}</p> : null}
      {yjsCollab.errorMessage && !usingYjs ? (
        <p className="artifact-collab-panel__message artifact-collab-panel__message--error">
          {yjsCollab.errorMessage}
        </p>
      ) : null}
      {statusMessage ? <p className="artifact-collab-panel__message">{statusMessage}</p> : null}

      <div className="artifact-collab-panel__actions">
        <button
          type="button"
          className="primary-button"
          data-testid="artifact-collab-publish"
          disabled={!room || publishing || dirtyRef.current || (usingYjs && !yjsCollab.connected)}
          onClick={() => {
            void handlePublishDraft();
          }}
        >
          {publishing ? "发布中..." : "发布为 Revision"}
        </button>
      </div>
    </section>
  );
}
