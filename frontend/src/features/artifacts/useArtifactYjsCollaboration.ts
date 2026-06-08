import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { getArtifactYjsCollabWebSocketUrl } from "../../api/agenthubApi";
import type { ArtifactCollabParticipant, ArtifactCollabRoom } from "./artifactCollaborationTypes";

const YJS_UPDATE_FRAME = 1;

type YjsCollabStatus = "disabled" | "connecting" | "connected" | "reconnecting" | "failed";

interface UseArtifactYjsCollaborationParams {
  artifactId: string;
  deviceId: string;
  initialContent: string;
  enabled: boolean;
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function frameYjsUpdate(update: Uint8Array): Uint8Array {
  const frame = new Uint8Array(update.byteLength + 1);
  frame[0] = YJS_UPDATE_FRAME;
  frame.set(update, 1);
  return frame;
}

function normalizeBinaryMessage(data: unknown): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) {
    return Promise.resolve(new Uint8Array(data));
  }
  if (data instanceof Blob) {
    return data.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  return Promise.resolve(new Uint8Array());
}

export function useArtifactYjsCollaboration({
  artifactId,
  deviceId,
  initialContent,
  enabled
}: UseArtifactYjsCollaborationParams) {
  const [status, setStatus] = useState<YjsCollabStatus>(enabled ? "connecting" : "disabled");
  const [content, setContent] = useState(initialContent);
  const [room, setRoom] = useState<ArtifactCollabRoom | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const textRef = useRef<Y.Text | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const remoteUpdateRef = useRef(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!enabled || !artifactId) {
      setStatus("disabled");
      return;
    }

    let closedByEffect = false;
    const doc = new Y.Doc();
    const text = doc.getText("content");
    text.insert(0, initialContent || "");
    docRef.current = doc;
    textRef.current = text;
    setContent(text.toString());
    setStatus("connecting");
    setErrorMessage(null);

    const onUpdate = (update: Uint8Array, origin: unknown) => {
      setContent(text.toString());
      if (remoteUpdateRef.current || origin === "remote") {
        return;
      }
      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(frameYjsUpdate(update));
      }
    };
    doc.on("update", onUpdate);

    function connect(nextStatus: YjsCollabStatus) {
      setStatus(nextStatus);
      const socket = new WebSocket(getArtifactYjsCollabWebSocketUrl(artifactId, deviceId));
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        setErrorMessage(null);
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const payload = JSON.parse(event.data) as {
              type?: string;
              message?: string;
              room?: ArtifactCollabRoom;
              yjsUpdateBase64?: string;
            };
            if (payload.type === "COLLAB_ERROR") {
              setErrorMessage(payload.message || "Yjs 协同服务返回错误。");
              setStatus("failed");
              return;
            }
            if (payload.room) {
              setRoom(payload.room);
            }
            if (payload.yjsUpdateBase64) {
              remoteUpdateRef.current = true;
              Y.applyUpdate(doc, base64ToUint8Array(payload.yjsUpdateBase64), "remote");
              remoteUpdateRef.current = false;
              setContent(text.toString());
            }
          } catch {
            setErrorMessage("Yjs 协同服务返回了无法解析的消息。");
          }
          return;
        }

        void normalizeBinaryMessage(event.data).then((frame) => {
          if (frame[0] !== YJS_UPDATE_FRAME) {
            return;
          }
          remoteUpdateRef.current = true;
          Y.applyUpdate(doc, frame.slice(1), "remote");
          remoteUpdateRef.current = false;
          setContent(text.toString());
        });
      };

      socket.onerror = () => {
        setErrorMessage("Yjs 协同服务连接失败，已回退到 V1。");
        setStatus("failed");
        closedByEffect = true;
        socket.close();
      };

      socket.onclose = () => {
        if (closedByEffect) {
          return;
        }
        socketRef.current = null;
        if (status === "failed") {
          return;
        }
        setStatus("reconnecting");
        reconnectTimerRef.current = window.setTimeout(() => connect("reconnecting"), 1200);
      };
    }

    connect("connecting");

    return () => {
      closedByEffect = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
      socketRef.current = null;
      doc.off("update", onUpdate);
      doc.destroy();
    };
  }, [artifactId, deviceId, enabled, initialContent]);

  function updateContent(nextContent: string) {
    const text = textRef.current;
    const doc = docRef.current;
    if (!text || !doc) {
      setContent(nextContent);
      return;
    }
    doc.transact(() => {
      text.delete(0, text.length);
      text.insert(0, nextContent);
    }, "local-textarea");
  }

  function updateCursor(cursorStart: number | null, cursorEnd: number | null, editing: boolean) {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify({
      action: "CURSOR",
      cursorStart,
      cursorEnd,
      editing
    }));
  }

  const participants: ArtifactCollabParticipant[] = room?.participants ?? [];

  return {
    status,
    active: status === "connected" || status === "connecting" || status === "reconnecting",
    connected: status === "connected",
    content,
    room,
    participants,
    errorMessage,
    protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
    roomVersion: room?.version ?? null,
    updateContent,
    updateCursor
  };
}
