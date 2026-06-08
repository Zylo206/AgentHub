import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { getActiveRealtimeState, getConversationEventsUrl } from "../../api/agenthubApi";
import { notifyDesktopRealtimeEvent } from "../../features/desktop/desktopBridge";
import type { StreamingPreviewState, TaskRun, TaskStep } from "../../features/chat/chatTypes";
import { getIdValue } from "../../utils/id";

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

export function reconcileStreamingStateByTaskRuns(
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

interface UseWorkspaceRealtimeParams {
  currentConversationId: string | null;
  loadConversationData: (conversationId: string, options?: { silent?: boolean }) => Promise<void>;
  loadConversationIndex: () => Promise<unknown>;
  setStreamingPreviewsByStepId: Dispatch<SetStateAction<Record<string, StreamingPreviewState>>>;
}

export function useWorkspaceRealtime({
  currentConversationId,
  loadConversationData,
  loadConversationIndex,
  setStreamingPreviewsByStepId
}: UseWorkspaceRealtimeParams) {
  const [realtimeStatus, setRealtimeStatus] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR">(
    "DISCONNECTED"
  );
  const [activeRealtimeRunSummary, setActiveRealtimeRunSummary] = useState<string | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

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
        void loadConversationData(currentConversationId, { silent: true });
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
        const streamPayload = normalizeStreamingPayload(event.data);
        if (streamPayload) {
          setStreamingPreviewsByStepId((previous) => ({
            ...previous,
            [streamPayload.taskStepId]: appendStreamingPreview(previous[streamPayload.taskStepId], streamPayload)
          }));
          return;
        }
        console.warn("Invalid AgentHub streaming event:", event.data);
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
          "PRESENCE_UPDATED",
          "DEPLOYMENT_CREATED",
          "APPROVAL_UPDATED",
          "ACTION_AUDIT_CREATED",
          "CONTROL_COMMAND_RECEIVED",
          "CONTROL_COMMAND_REJECTED"
        ].includes(event.type)
      ) {
        setRealtimeStatus("CONNECTED");
        if (["TASK_RUN_UPDATED", "TASK_STEP_UPDATED", "DEPLOYMENT_CREATED", "APPROVAL_UPDATED"].includes(event.type)) {
          void notifyDesktopRealtimeEvent(event.type, event.data);
        }
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
      "PRESENCE_UPDATED",
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
  }, [currentConversationId, loadConversationData, loadConversationIndex, setStreamingPreviewsByStepId]);

  return { realtimeStatus, activeRealtimeRunSummary };
}
