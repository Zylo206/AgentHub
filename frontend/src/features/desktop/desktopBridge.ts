export interface DesktopEnvironment {
  available: boolean;
  platform: string;
  appVersion: string;
  appDataDir?: string | null;
}

export interface DesktopFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  sizeBytes?: number | null;
}

export interface DesktopFilePreview {
  fileName: string;
  path: string;
  sizeBytes: number;
  contentPreview: string;
  truncated: boolean;
}

export interface DesktopCliProbeResult {
  command: string;
  available: boolean;
  executablePath?: string | null;
  version?: string | null;
  helpProbe: string;
  authProbeStatus: string;
  streamSupport: string;
  schemaSupport: string;
  sandboxPolicy: string;
  toolPolicy: string;
  failureReason?: string | null;
}

export interface DesktopManagedProcess {
  pid: number;
  label: string;
  startedAt: string;
  running: boolean;
  logPath?: string | null;
  recentOutput: string[];
}

type TauriInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  const tauriWindow = window as unknown as {
    __TAURI__?: { core?: { invoke?: TauriInvoke }; invoke?: TauriInvoke };
    __TAURI_INTERNALS__?: { invoke?: TauriInvoke };
  };

  return (
    tauriWindow.__TAURI__?.core?.invoke ??
    tauriWindow.__TAURI__?.invoke ??
    tauriWindow.__TAURI_INTERNALS__?.invoke ??
    null
  );
}

export function isDesktopBridgeAvailable(): boolean {
  return Boolean(getTauriInvoke());
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = getTauriInvoke();
  if (!invoke) {
    throw new Error("Desktop bridge is only available inside the AgentHub Tauri shell.");
  }
  return invoke<T>(command, args);
}

export function getDesktopEnvironment(): Promise<DesktopEnvironment> {
  return invokeDesktop<DesktopEnvironment>("desktop_environment");
}

export function listDesktopDirectory(path: string): Promise<DesktopFileEntry[]> {
  return invokeDesktop<DesktopFileEntry[]>("list_directory", { path });
}

export function readDesktopTextPreview(path: string, maxBytes = 4096): Promise<DesktopFilePreview> {
  return invokeDesktop<DesktopFilePreview>("read_text_preview", { path, maxBytes });
}

export function probeDesktopAgentCli(command: string): Promise<DesktopCliProbeResult> {
  return invokeDesktop<DesktopCliProbeResult>("probe_agent_cli", { command });
}

export function sendDesktopNotification(title: string, body: string): Promise<void> {
  return invokeDesktop<void>("send_system_notification", { title, body });
}

function tryParseRealtimePayload(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Realtime events may intentionally carry lightweight non-JSON payloads.
  }
  return {};
}

function stringifyPayloadValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function buildRealtimeNotification(eventType: string, rawData: string): { title: string; body: string; type: string } | null {
  const payload = tryParseRealtimePayload(rawData);
  const status =
    stringifyPayloadValue(payload.status) ??
    stringifyPayloadValue(payload.taskRunStatus) ??
    stringifyPayloadValue(payload.batchStatus);
  const summary =
    stringifyPayloadValue(payload.summary) ??
    stringifyPayloadValue(payload.message) ??
    stringifyPayloadValue(payload.reason) ??
    stringifyPayloadValue(payload.errorMessage);
  const adapter =
    stringifyPayloadValue(payload.adapterType) ??
    stringifyPayloadValue(payload.actualAdapter) ??
    stringifyPayloadValue(payload.sourceAdapterType);

  if (eventType === "TASK_RUN_UPDATED") {
    if (status === "COMPLETED") {
      return { type: "TASK_RUN_COMPLETED", title: "AgentHub 任务已完成", body: summary || "多 Agent 协作运行已完成。" };
    }
    if (status === "BLOCKED") {
      return { type: "TASK_RUN_BLOCKED", title: "AgentHub 任务被 Reviewer 阻塞", body: summary || "Reviewer 发现阻塞问题，需要修复后重新评审。" };
    }
    if (status === "FAILED") {
      return { type: "TASK_RUN_FAILED", title: "AgentHub 任务失败", body: summary || "任务运行失败，请查看 TaskRun 和审计记录。" };
    }
  }

  if (eventType === "APPROVAL_UPDATED") {
    if (!status || status === "PENDING") {
      return { type: "APPROVAL_PENDING", title: "AgentHub 有待审批操作", body: summary || "Apply Diff / Deploy / Restore 等高风险操作等待确认。" };
    }
  }

  if (eventType === "DEPLOYMENT_CREATED") {
    return { type: "DEPLOY_COMPLETED", title: "AgentHub 预览已生成", body: summary || "本地静态 Preview URL 已生成，可在 Preview Studio 打开。" };
  }

  if (eventType === "TASK_STEP_UPDATED" || eventType === "TASK_RUN_UPDATED") {
    const fallbackReason = stringifyPayloadValue(payload.fallbackReason) ?? stringifyPayloadValue(payload.artifactQualityReason);
    if (fallbackReason || status === "FALLBACK") {
      return {
        type: "ADAPTER_FALLBACK",
        title: "AgentHub Adapter 已 fallback",
        body: `${adapter || "Adapter"} 输出未被采纳：${fallbackReason || "已回退到 Mock / Static fallback。"}`
      };
    }
  }

  return null;
}

export async function notifyDesktopRealtimeEvent(eventType: string, rawData: string): Promise<void> {
  if (!isDesktopBridgeAvailable()) {
    return;
  }
  const notification = buildRealtimeNotification(eventType, rawData);
  if (!notification) {
    return;
  }
  await sendDesktopNotification(notification.title, notification.body);
  window.dispatchEvent(
    new CustomEvent("agenthub:desktop-notification", {
      detail: {
        id: `${Date.now()}-${eventType}`,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        createdAt: new Date().toISOString()
      }
    })
  );
}

export function startDesktopBackend(
  javaCommand: string,
  jarPath: string,
  workingDirectory: string
): Promise<DesktopManagedProcess> {
  return invokeDesktop<DesktopManagedProcess>("start_agenthub_backend", {
    javaCommand,
    jarPath,
    workingDirectory
  });
}

export function stopDesktopManagedProcess(pid: number): Promise<void> {
  return invokeDesktop<void>("stop_managed_process", { pid });
}

export function listDesktopManagedProcesses(): Promise<DesktopManagedProcess[]> {
  return invokeDesktop<DesktopManagedProcess[]>("list_managed_processes");
}
