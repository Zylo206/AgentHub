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

export interface DesktopAttachmentFile {
  fileName: string;
  path: string;
  sizeBytes: number;
  contentType: string;
  contentPreview: string;
  contentBase64: string;
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

export interface DesktopConfig {
  recentDirectories: string[];
  javaCommand: string;
  backendJarPath: string;
  backendWorkingDirectory: string;
  backendPort: number;
  claudeCommand: string;
  codexCommand: string;
  opencodeCommand: string;
  notifyTaskRun: boolean;
  notifyApproval: boolean;
  notifyDeploy: boolean;
  notifyAdapterFallback: boolean;
}

export interface DesktopPortStatus {
  host: string;
  port: number;
  open: boolean;
  message: string;
}

const DESKTOP_NOTIFICATION_SETTINGS_KEY = "agenthub.desktop.notificationSettings";

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

export function readDesktopFileForAttachment(path: string, maxBytes = 5 * 1024 * 1024): Promise<DesktopAttachmentFile> {
  return invokeDesktop<DesktopAttachmentFile>("read_file_for_attachment", { path, maxBytes });
}

export function loadDesktopConfig(): Promise<DesktopConfig> {
  return invokeDesktop<DesktopConfig>("load_desktop_config");
}

export function saveDesktopConfig(config: DesktopConfig): Promise<DesktopConfig> {
  return invokeDesktop<DesktopConfig>("save_desktop_config", { config });
}

export function checkDesktopPort(host: string, port: number, timeoutMillis = 700): Promise<DesktopPortStatus> {
  return invokeDesktop<DesktopPortStatus>("check_tcp_port", { host, port, timeoutMillis });
}

export function probeDesktopAgentCli(command: string): Promise<DesktopCliProbeResult> {
  return invokeDesktop<DesktopCliProbeResult>("probe_agent_cli", { command });
}

export function sendDesktopNotification(title: string, body: string): Promise<void> {
  return invokeDesktop<void>("send_system_notification", { title, body });
}

export function startDesktopBackend(
  javaCommand: string,
  jarPath: string,
  workingDirectory: string,
  backendPort: number
): Promise<DesktopManagedProcess> {
  return invokeDesktop<DesktopManagedProcess>("start_agenthub_backend", {
    javaCommand,
    jarPath,
    workingDirectory,
    backendPort
  });
}

export function stopDesktopManagedProcess(pid: number): Promise<void> {
  return invokeDesktop<void>("stop_managed_process", { pid });
}

export function listDesktopManagedProcesses(): Promise<DesktopManagedProcess[]> {
  return invokeDesktop<DesktopManagedProcess[]>("list_managed_processes");
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

function getDesktopNotificationSettings(): Partial<DesktopConfig> {
  try {
    return JSON.parse(window.localStorage.getItem(DESKTOP_NOTIFICATION_SETTINGS_KEY) || "{}") as Partial<DesktopConfig>;
  } catch {
    return {};
  }
}

export function persistDesktopNotificationSettings(config: Partial<DesktopConfig>): void {
  window.localStorage.setItem(DESKTOP_NOTIFICATION_SETTINGS_KEY, JSON.stringify(config));
}

function isNotificationTypeEnabled(type: string): boolean {
  const settings = getDesktopNotificationSettings();
  if (type.startsWith("TASK_RUN_")) {
    return settings.notifyTaskRun !== false;
  }
  if (type === "APPROVAL_PENDING") {
    return settings.notifyApproval !== false;
  }
  if (type === "DEPLOY_COMPLETED") {
    return settings.notifyDeploy !== false;
  }
  if (type === "ADAPTER_FALLBACK") {
    return settings.notifyAdapterFallback !== false;
  }
  return true;
}

function buildRealtimeNotification(
  eventType: string,
  rawData: string
): { title: string; body: string; type: string; targetType?: string; targetId?: string } | null {
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
  const resourceId = stringifyPayloadValue(payload.resourceId);
  const taskRunId = stringifyPayloadValue(payload.taskRunId) ?? resourceId;
  const approvalId = stringifyPayloadValue(payload.approvalId) ?? resourceId;
  const deploymentId = stringifyPayloadValue(payload.deploymentId) ?? resourceId;

  if (eventType === "TASK_RUN_UPDATED") {
    if (status === "COMPLETED") {
      return {
        type: "TASK_RUN_COMPLETED",
        title: "AgentHub 任务已完成",
        body: summary || "多 Agent 协作已经完成。",
        targetType: "TASK_RUN",
        targetId: taskRunId ?? undefined
      };
    }
    if (status === "BLOCKED") {
      return {
        type: "TASK_RUN_BLOCKED",
        title: "AgentHub 任务被阻断",
        body: summary || "评审发现阻断项，请修订后重新评审。",
        targetType: "TASK_RUN",
        targetId: taskRunId ?? undefined
      };
    }
    if (status === "FAILED") {
      return {
        type: "TASK_RUN_FAILED",
        title: "AgentHub 任务失败",
        body: summary || "任务运行失败，请查看 TaskRun 和审计记录。",
        targetType: "TASK_RUN",
        targetId: taskRunId ?? undefined
      };
    }
  }

  if (eventType === "APPROVAL_UPDATED" && (!status || status === "PENDING")) {
    return {
      type: "APPROVAL_PENDING",
      title: "AgentHub 等待审批",
      body: summary || "有一项高风险操作需要确认。",
      targetType: "APPROVAL",
      targetId: approvalId ?? undefined
    };
  }

  if (eventType === "DEPLOYMENT_CREATED") {
    return {
      type: "DEPLOY_COMPLETED",
      title: "AgentHub 本地预览已生成",
      body: summary || "本地静态预览链接已就绪。",
      targetType: "DEPLOYMENT",
      targetId: deploymentId ?? undefined
    };
  }

  if (eventType === "TASK_STEP_UPDATED" || eventType === "TASK_RUN_UPDATED") {
    const fallbackReason = stringifyPayloadValue(payload.fallbackReason) ?? stringifyPayloadValue(payload.artifactQualityReason);
    if (fallbackReason || status === "FALLBACK") {
      return {
        type: "ADAPTER_FALLBACK",
        title: "AgentHub 备用路径提醒",
        body: `${adapter || "Adapter"} 输出未被采纳：${fallbackReason || "已切换到本地备用路径。"}`,
        targetType: "TASK_RUN",
        targetId: taskRunId ?? undefined
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
  if (!notification || !isNotificationTypeEnabled(notification.type)) {
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
        createdAt: new Date().toISOString(),
        targetType: notification.targetType,
        targetId: notification.targetId
      }
    })
  );
}
