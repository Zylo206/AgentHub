import { useEffect, useMemo, useState } from "react";
import {
  getDesktopEnvironment,
  isDesktopBridgeAvailable,
  listDesktopDirectory,
  listDesktopManagedProcesses,
  loadDesktopConfig,
  persistDesktopNotificationSettings,
  probeDesktopAgentCli,
  readDesktopFileForAttachment,
  readDesktopTextPreview,
  saveDesktopConfig,
  checkDesktopPort,
  sendDesktopNotification,
  startDesktopBackend,
  stopDesktopManagedProcess,
  type DesktopCliProbeResult,
  type DesktopConfig,
  type DesktopEnvironment,
  type DesktopFileEntry,
  type DesktopFilePreview,
  type DesktopManagedProcess,
  type DesktopPortStatus
} from "./desktopBridge";
import type { LightweightAttachment } from "../chat/chatTypes";

const DEFAULT_BACKEND_JAR = "backend/target/agenthub-backend-0.1.0-SNAPSHOT.jar";

type DesktopTab = "files" | "notifications" | "agents" | "backend";

interface LocalContextCandidate {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  attachmentId?: string;
  status: "LOCAL_ONLY" | "UPLOADED_ATTACHMENT";
}

interface NotificationLogItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  status: "SENT" | "FAILED";
}

type DesktopRealtimeNotificationType =
  | "TASK_RUN_COMPLETED"
  | "TASK_RUN_BLOCKED"
  | "TASK_RUN_FAILED"
  | "APPROVAL_PENDING"
  | "DEPLOY_COMPLETED"
  | "ADAPTER_FALLBACK";

interface DesktopRealtimeNotification {
  id: string;
  type: DesktopRealtimeNotificationType;
  title: string;
  body: string;
  createdAt: string;
  targetType?: string;
  targetId?: string;
}

declare global {
  interface WindowEventMap {
    "agenthub:desktop-notification": CustomEvent<DesktopRealtimeNotification>;
  }
}

interface DesktopCapabilityPanelProps {
  conversationId?: string | null;
  onUseLocalFileAsAttachment?: (file: File, sourcePath: string) => Promise<LightweightAttachment>;
  onPinAttachmentAsContext?: (attachmentId: string) => Promise<void>;
  onSaveAttachmentAsMemory?: (attachmentId: string) => Promise<void>;
  onNavigateToDesktopNotificationTarget?: (targetType?: string, targetId?: string) => void;
}

function formatSize(size?: number | null): string {
  if (!size && size !== 0) {
    return "-";
  }
  if (size > 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  if (size > 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

function normalizeDesktopError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fileFromBase64(name: string, contentType: string, contentBase64: string): File {
  const binary = window.atob(contentBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], name, { type: contentType || "application/octet-stream" });
}

function getFileKind(entry: DesktopFileEntry | DesktopFilePreview): string {
  const name = "name" in entry ? entry.name : entry.fileName;
  const normalized = name.toLowerCase();
  if (normalized.endsWith(".md") || normalized.endsWith(".txt") || normalized.endsWith(".json")) {
    return "text";
  }
  if (normalized.endsWith(".ts") || normalized.endsWith(".tsx") || normalized.endsWith(".java")) {
    return "code";
  }
  if (normalized.endsWith(".png") || normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image";
  }
  if (normalized.endsWith(".ppt") || normalized.endsWith(".pptx")) {
    return "ppt";
  }
  return "file";
}

function canReadTextPreview(kind: string): boolean {
  return kind === "text" || kind === "code";
}

function createMetadataPreview(entry: DesktopFileEntry): DesktopFilePreview {
  const kind = getFileKind(entry);
  const boundary =
    kind === "image"
      ? "图片文件当前作为本地文件 metadata / preview shell 展示；本轮不做图片编辑、OCR 或完整渲染。"
      : kind === "ppt"
        ? "PPT/PPTX 当前作为本地文件 metadata / download 候选展示；本轮不做在线幻灯片渲染。"
        : "该文件类型当前不做文本读取，仅展示 metadata。";

  return {
    fileName: entry.name,
    path: entry.path,
    sizeBytes: entry.sizeBytes ?? 0,
    contentPreview: boundary,
    truncated: false
  };
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

const DEFAULT_DESKTOP_CONFIG: DesktopConfig = {
  recentDirectories: [],
  javaCommand: "java",
  backendJarPath: DEFAULT_BACKEND_JAR,
  backendWorkingDirectory: ".",
  claudeCommand: "claude",
  codexCommand: "codex",
  opencodeCommand: "opencode",
  notifyTaskRun: true,
  notifyApproval: true,
  notifyDeploy: true,
  notifyAdapterFallback: true
};

export function DesktopCapabilityPanel({
  conversationId,
  onUseLocalFileAsAttachment,
  onPinAttachmentAsContext,
  onSaveAttachmentAsMemory,
  onNavigateToDesktopNotificationTarget
}: DesktopCapabilityPanelProps) {
  const desktopAvailable = isDesktopBridgeAvailable();
  const [activeTab, setActiveTab] = useState<DesktopTab>("files");
  const [environment, setEnvironment] = useState<DesktopEnvironment | null>(null);
  const [desktopConfig, setDesktopConfig] = useState<DesktopConfig>(DEFAULT_DESKTOP_CONFIG);
  const [directoryPath, setDirectoryPath] = useState(".");
  const [filePath, setFilePath] = useState("");
  const [javaCommand, setJavaCommand] = useState("java");
  const [backendJarPath, setBackendJarPath] = useState(DEFAULT_BACKEND_JAR);
  const [backendWorkingDirectory, setBackendWorkingDirectory] = useState(".");
  const [claudeCommand, setClaudeCommand] = useState("claude");
  const [codexCommand, setCodexCommand] = useState("codex");
  const [opencodeCommand, setOpencodeCommand] = useState("opencode");
  const [directoryEntries, setDirectoryEntries] = useState<DesktopFileEntry[]>([]);
  const [filePreview, setFilePreview] = useState<DesktopFilePreview | null>(null);
  const [contextCandidates, setContextCandidates] = useState<LocalContextCandidate[]>([]);
  const [notificationLog, setNotificationLog] = useState<NotificationLogItem[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<DesktopRealtimeNotification[]>([]);
  const [cliProbes, setCliProbes] = useState<DesktopCliProbeResult[]>([]);
  const [managedProcesses, setManagedProcesses] = useState<DesktopManagedProcess[]>([]);
  const [portStatus, setPortStatus] = useState<DesktopPortStatus | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cliSummary = useMemo(() => {
    if (cliProbes.length === 0) {
      return "未探测";
    }
    const available = cliProbes.filter((probe) => probe.available).length;
    return `${available}/${cliProbes.length} 可用`;
  }, [cliProbes]);

  const runningProcessCount = managedProcesses.filter((process) => process.running).length;

  useEffect(() => {
    if (!desktopAvailable) {
      return;
    }

    void getDesktopEnvironment()
      .then(setEnvironment)
      .catch((error) => setErrorMessage(normalizeDesktopError(error)));
    void loadDesktopConfig()
      .then((config) => {
        const nextConfig = { ...DEFAULT_DESKTOP_CONFIG, ...config };
        setDesktopConfig(nextConfig);
        setDirectoryPath(nextConfig.recentDirectories[0] || ".");
        setJavaCommand(nextConfig.javaCommand);
        setBackendJarPath(nextConfig.backendJarPath);
        setBackendWorkingDirectory(nextConfig.backendWorkingDirectory);
        setClaudeCommand(nextConfig.claudeCommand);
        setCodexCommand(nextConfig.codexCommand);
        setOpencodeCommand(nextConfig.opencodeCommand);
        persistDesktopNotificationSettings(nextConfig);
      })
      .catch((error) => setErrorMessage(normalizeDesktopError(error)));
    void listDesktopManagedProcesses()
      .then(setManagedProcesses)
      .catch(() => undefined);
  }, [desktopAvailable]);

  useEffect(() => {
    if (!desktopAvailable) {
      return;
    }
    const timer = window.setInterval(() => {
      void listDesktopManagedProcesses().then(setManagedProcesses).catch(() => undefined);
      void checkDesktopPort("127.0.0.1", 8080).then(setPortStatus).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [desktopAvailable]);

  useEffect(() => {
    const handleDesktopNotification = (event: CustomEvent<DesktopRealtimeNotification>) => {
      setRealtimeNotifications((current) => [event.detail, ...current].slice(0, 8));
      setNotificationLog((current) => [
        {
          id: event.detail.id,
          title: event.detail.title,
          body: event.detail.body,
          createdAt: event.detail.createdAt,
          status: "SENT" as const
        },
        ...current
      ].slice(0, 8));
    };

    window.addEventListener("agenthub:desktop-notification", handleDesktopNotification);
    return () => window.removeEventListener("agenthub:desktop-notification", handleDesktopNotification);
  }, []);

  async function runAction(label: string, action: () => Promise<void>) {
    setLoadingAction(label);
    setErrorMessage(null);
    try {
      await action();
    } catch (error) {
      setErrorMessage(normalizeDesktopError(error));
    } finally {
      setLoadingAction(null);
    }
  }

  async function persistDesktopConfig(nextConfig: DesktopConfig) {
    setDesktopConfig(nextConfig);
    persistDesktopNotificationSettings(nextConfig);
    if (!desktopAvailable) {
      return;
    }
    await runAction("save-desktop-config", async () => {
      await saveDesktopConfig(nextConfig);
    });
  }

  async function handleToggleNotificationSetting(key: keyof Pick<DesktopConfig, "notifyTaskRun" | "notifyApproval" | "notifyDeploy" | "notifyAdapterFallback">) {
    await persistDesktopConfig({ ...desktopConfig, [key]: !desktopConfig[key] });
  }

  async function handlePersistRuntimeConfig() {
    const nextDirectories = [directoryPath, ...desktopConfig.recentDirectories.filter((item) => item !== directoryPath)].slice(0, 5);
    await persistDesktopConfig({
      ...desktopConfig,
      recentDirectories: nextDirectories,
      javaCommand,
      backendJarPath,
      backendWorkingDirectory,
      claudeCommand,
      codexCommand,
      opencodeCommand
    });
  }

  async function handleListDirectory() {
    await runAction("list-directory", async () => {
      const entries = await listDesktopDirectory(directoryPath);
      setDirectoryEntries(entries);
      await saveDesktopConfig({
        ...desktopConfig,
        recentDirectories: [directoryPath, ...desktopConfig.recentDirectories.filter((item) => item !== directoryPath)].slice(0, 5),
        javaCommand,
        backendJarPath,
        backendWorkingDirectory,
        claudeCommand,
        codexCommand,
        opencodeCommand
      });
    });
  }

  async function handleReadFilePreview(path = filePath) {
    await runAction("read-file", async () => {
      const preview = await readDesktopTextPreview(path, 4096);
      setFilePath(preview.path);
      setFilePreview(preview);
      setActiveTab("files");
    });
  }

  function handleSelectFileEntry(entry: DesktopFileEntry) {
    if (entry.isDirectory) {
      setDirectoryPath(entry.path);
      return;
    }

    const kind = getFileKind(entry);
    setFilePath(entry.path);
    if (canReadTextPreview(kind)) {
      void handleReadFilePreview(entry.path);
      return;
    }

    setFilePreview(createMetadataPreview(entry));
  }

  async function handleProbeCli(command: string) {
    await runAction(`probe-${command}`, async () => {
      const probe = await probeDesktopAgentCli(command);
      setCliProbes((previous) => [
        probe,
        ...previous.filter((item) => item.command !== probe.command)
      ].slice(0, 6));
      setActiveTab("agents");
    });
  }

  async function handleNotify() {
    const createdAt = new Date().toISOString();
    await runAction("notification", async () => {
      const title = "AgentHub 桌面通知";
      const body = "桌面通知桥已连通，可用于任务完成、审批待确认和部署完成提醒。";
      try {
        await sendDesktopNotification(title, body);
        setNotificationLog((current) => [{ id: createdAt, title, body, createdAt, status: "SENT" as const }, ...current].slice(0, 5));
      } catch (error) {
        setNotificationLog((current) => [
          { id: createdAt, title, body: normalizeDesktopError(error), createdAt, status: "FAILED" as const },
          ...current
        ].slice(0, 5));
        throw error;
      }
    });
  }

  async function handleStartBackend() {
    await runAction("start-backend", async () => {
      const process = await startDesktopBackend(javaCommand, backendJarPath, backendWorkingDirectory);
      setManagedProcesses((previous) => [process, ...previous.filter((item) => item.pid !== process.pid)]);
      setActiveTab("backend");
    });
  }

  async function handleStopProcess(pid: number) {
    await runAction(`stop-${pid}`, async () => {
      await stopDesktopManagedProcess(pid);
      const processes = await listDesktopManagedProcesses();
      setManagedProcesses(processes);
    });
  }

  async function handleAddPreviewToContext() {
    if (!filePreview) {
      return;
    }
    if (!conversationId || !onUseLocalFileAsAttachment) {
      const candidate: LocalContextCandidate = {
        path: filePreview.path,
        name: filePreview.fileName,
        sizeBytes: filePreview.sizeBytes,
        createdAt: new Date().toISOString(),
        status: "LOCAL_ONLY"
      };
      setContextCandidates((current) => [
        candidate,
        ...current.filter((item) => item.path !== filePreview.path)
      ].slice(0, 5));
      return;
    }

    await runAction("upload-local-context", async () => {
      const desktopFile = await readDesktopFileForAttachment(filePreview.path);
      const uploaded = await onUseLocalFileAsAttachment(
        fileFromBase64(desktopFile.fileName, desktopFile.contentType, desktopFile.contentBase64),
        desktopFile.path
      );
      const candidate: LocalContextCandidate = {
        path: desktopFile.path,
        name: desktopFile.fileName,
        sizeBytes: desktopFile.sizeBytes,
        createdAt: new Date().toISOString(),
        attachmentId: uploaded.attachmentId ?? uploaded.id,
        status: "UPLOADED_ATTACHMENT"
      };
      setContextCandidates((current) => [
        candidate,
        ...current.filter((item) => item.path !== desktopFile.path)
      ].slice(0, 5));
    });
  }

  async function handlePinAttachmentCandidate(attachmentId?: string) {
    if (!attachmentId || !onPinAttachmentAsContext) {
      return;
    }
    await runAction("pin-local-attachment", async () => {
      await onPinAttachmentAsContext(attachmentId);
    });
  }

  async function handleSaveAttachmentCandidateAsMemory(attachmentId?: string) {
    if (!attachmentId || !onSaveAttachmentAsMemory) {
      return;
    }
    await runAction("memory-local-attachment", async () => {
      await onSaveAttachmentAsMemory(attachmentId);
    });
  }

  async function handleCheckBackendPort() {
    await runAction("check-backend-port", async () => {
      const status = await checkDesktopPort("127.0.0.1", 8080);
      setPortStatus(status);
    });
  }

  function renderDesktopBoundary() {
    if (desktopAvailable) {
      return null;
    }
    return (
      <div className="desktop-console__boundary">
        <strong>当前是 Web 模式</strong>
        <p>本地文件、系统通知和进程管理需要通过 `desktop/` 下的 Tauri 壳启动。Web 主路径仍可完整演示。</p>
      </div>
    );
  }

  return (
    <section className="desktop-console" data-testid="desktop-capability-panel">
      <div className="desktop-console__header">
        <div>
          <span className="desktop-console__eyebrow">Desktop Console</span>
          <strong>本地能力中心</strong>
          <p>本地文件访问、系统通知、Agent CLI 与 backend 进程管理。</p>
        </div>
        <span className={desktopAvailable ? "desktop-console__status desktop-console__status--active" : "desktop-console__status"}>
          {desktopAvailable ? "Tauri 已连接" : "Web 模式"}
        </span>
      </div>

      <div className="desktop-console__metrics">
        <article>
          <span>平台</span>
          <strong>{environment?.platform || "browser"}</strong>
        </article>
        <article>
          <span>Agent CLI</span>
          <strong>{cliSummary}</strong>
        </article>
        <article>
          <span>进程</span>
          <strong>{runningProcessCount}</strong>
        </article>
        <article>
          <span>上下文候选</span>
          <strong>{contextCandidates.length}</strong>
        </article>
      </div>

      {renderDesktopBoundary()}

      <div className="desktop-console__tabs" role="tablist" aria-label="桌面能力">
        {[
          ["files", "本地文件"],
          ["notifications", "通知中心"],
          ["agents", "Agent 进程"],
          ["backend", "Backend 管理"]
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "desktop-console__tab desktop-console__tab--active" : "desktop-console__tab"}
            onClick={() => setActiveTab(tab as DesktopTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "files" ? (
        <div className="desktop-console__grid">
          <article className="desktop-console__card desktop-console__card--span">
            <div className="desktop-console__card-header">
              <div>
                <strong>本地文件访问</strong>
                <p>浏览目录、预览文本文件，并可上传为当前消息附件进入上下文检索。</p>
              </div>
              <span>Read-only</span>
            </div>
            <div className="desktop-console__row">
              <input value={directoryPath} onChange={(event) => setDirectoryPath(event.target.value)} placeholder="本地目录路径" disabled={!desktopAvailable} />
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "list-directory"} onClick={handleListDirectory}>
                读取目录
              </button>
            </div>
            {directoryEntries.length > 0 ? (
              <div className="desktop-console__file-list">
                {directoryEntries.slice(0, 8).map((entry) => (
                  <button
                    type="button"
                    key={entry.path}
                    onClick={() => handleSelectFileEntry(entry)}
                  >
                    <span>{entry.isDirectory ? "DIR" : getFileKind(entry).toUpperCase()}</span>
                    <strong>{entry.name}</strong>
                    <em>{formatSize(entry.sizeBytes)}</em>
                  </button>
                ))}
              </div>
            ) : (
              <p className="desktop-console__empty">选择一个本地目录后，这里会显示可读取的文件和子目录。</p>
            )}
          </article>

          <article className="desktop-console__card">
            <div className="desktop-console__card-header">
              <div>
                <strong>文件预览</strong>
                <p>文本类文件最多预览 4096 字节。</p>
              </div>
            </div>
            <div className="desktop-console__row desktop-console__row--stack">
              <input value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="本地文件路径" disabled={!desktopAvailable} />
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "read-file"} onClick={() => void handleReadFilePreview()}>
                预览文件
              </button>
            </div>
            {filePreview ? (
              <>
                <div className="desktop-console__preview-meta">
                  <span>{getFileKind(filePreview)}</span>
                  <strong>{filePreview.fileName}</strong>
                  <em>{formatSize(filePreview.sizeBytes)}{filePreview.truncated ? " · 已截断" : ""}</em>
                </div>
                <pre className="desktop-console__preview">{filePreview.contentPreview}</pre>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={loadingAction === "upload-local-context"}
                  onClick={handleAddPreviewToContext}
                >
                  {conversationId ? "加入当前消息附件" : "标记为上下文候选"}
                </button>
              </>
            ) : null}
          </article>

          <article className="desktop-console__card">
            <div className="desktop-console__card-header">
              <div>
                <strong>上下文候选</strong>
                <p>上传成功后会进入当前消息附件；发送消息后可被 Attachment / Context Retrieval 使用。</p>
              </div>
            </div>
            {contextCandidates.length > 0 ? (
              <div className="desktop-console__candidate-list">
                {contextCandidates.map((item) => (
                  <div key={item.path}>
                    <strong>{item.name}</strong>
                    <span>
                      {formatSize(item.sizeBytes)} · {formatTime(item.createdAt)} ·{" "}
                      {item.status === "UPLOADED_ATTACHMENT" ? `已上传 ${item.attachmentId || ""}` : "本地候选"}
                    </span>
                    {item.attachmentId ? (
                      <div className="desktop-console__actions">
                        <button type="button" className="ghost-button" onClick={() => void handlePinAttachmentCandidate(item.attachmentId)}>
                          固定到 Context
                        </button>
                        <button type="button" className="ghost-button" onClick={() => void handleSaveAttachmentCandidateAsMemory(item.attachmentId)}>
                          保存为 Memory
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="desktop-console__empty">还没有本地上下文候选。</p>
            )}
          </article>
        </div>
      ) : null}

      {activeTab === "notifications" ? (
        <div className="desktop-console__grid">
          <article className="desktop-console__card desktop-console__card--span">
            <div className="desktop-console__card-header">
              <div>
                <strong>系统通知</strong>
              <p>用于任务完成、审批待确认、部署完成和 Agent fallback 提醒。</p>
              </div>
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "notification"} onClick={handleNotify}>
                测试通知
              </button>
            </div>
            <div className="desktop-console__notification-rules">
              {[
                ["notifyTaskRun", "任务状态"],
                ["notifyApproval", "审批待确认"],
                ["notifyDeploy", "部署完成"],
                ["notifyAdapterFallback", "Agent fallback"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={desktopConfig[key as keyof DesktopConfig] ? "status-pill status-pill--accepted" : "status-pill status-pill--disabled"}
                  onClick={() => void handleToggleNotificationSetting(key as "notifyTaskRun" | "notifyApproval" | "notifyDeploy" | "notifyAdapterFallback")}
                >
                  {label}: {desktopConfig[key as keyof DesktopConfig] ? "开" : "关"}
                </button>
              ))}
            </div>
            {realtimeNotifications.length > 0 ? (
              <div className="desktop-console__notification-log">
                {realtimeNotifications.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onNavigateToDesktopNotificationTarget?.(item.targetType, item.targetId)}
                  >
                    <span className="status-pill status-pill--accepted">{item.type}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <em>{formatTime(item.createdAt)}</em>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
          <article className="desktop-console__card">
            <div className="desktop-console__card-header">
              <div>
                <strong>最近通知</strong>
                <p>本地运行时通知发送记录。</p>
              </div>
            </div>
            {notificationLog.length > 0 ? (
              <div className="desktop-console__notification-log">
                {notificationLog.map((item) => (
                  <div key={item.id}>
                    <span className={item.status === "SENT" ? "status-pill status-pill--accepted" : "status-pill status-pill--pending"}>{item.status}</span>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <em>{formatTime(item.createdAt)}</em>
                  </div>
                ))}
              </div>
            ) : (
              <p className="desktop-console__empty">尚未发送通知。</p>
            )}
          </article>
        </div>
      ) : null}

      {activeTab === "agents" ? (
        <div className="desktop-console__grid">
          <article className="desktop-console__card desktop-console__card--span">
            <div className="desktop-console__card-header">
              <div>
                <strong>Agent CLI 状态</strong>
                <p>探测本机 Claude Code、Codex 和 OpenCode 命令，不执行真实任务。</p>
              </div>
              <div className="desktop-console__actions">
                <button type="button" className="secondary-button" disabled={!desktopAvailable} onClick={() => void handleProbeCli(claudeCommand)}>Claude Code</button>
                <button type="button" className="secondary-button" disabled={!desktopAvailable} onClick={() => void handleProbeCli(codexCommand)}>Codex</button>
                <button type="button" className="secondary-button" disabled={!desktopAvailable} onClick={() => void handleProbeCli(opencodeCommand)}>OpenCode</button>
              </div>
            </div>
            <div className="desktop-console__row">
              <input value={claudeCommand} onChange={(event) => setClaudeCommand(event.target.value)} placeholder="Claude command" disabled={!desktopAvailable} />
              <input value={codexCommand} onChange={(event) => setCodexCommand(event.target.value)} placeholder="Codex command" disabled={!desktopAvailable} />
              <input value={opencodeCommand} onChange={(event) => setOpencodeCommand(event.target.value)} placeholder="OpenCode command" disabled={!desktopAvailable} />
            </div>
            {cliProbes.length > 0 ? (
              <div className="desktop-console__probe-list">
                {cliProbes.map((probe) => (
                  <article key={`${probe.command}-${probe.version || probe.failureReason}`}>
                    <div>
                      <strong>{probe.command}</strong>
                      <p>{probe.executablePath || "未解析到可执行路径"}</p>
                      <p>{probe.version || probe.failureReason || probe.helpProbe}</p>
                      <div className="desktop-console__runtime-grid">
                        <span>Auth: {probe.authProbeStatus}</span>
                        <span>Stream: {probe.streamSupport}</span>
                        <span>Schema: {probe.schemaSupport}</span>
                        <span>Sandbox: {probe.sandboxPolicy}</span>
                        <span>Tools: {probe.toolPolicy}</span>
                      </div>
                    </div>
                    <span className={probe.available ? "status-pill status-pill--accepted" : "status-pill status-pill--pending"}>
                      {probe.available ? "available" : "unavailable"}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="desktop-console__empty">点击上方按钮探测本机 Agent CLI。</p>
            )}
          </article>
        </div>
      ) : null}

      {activeTab === "backend" ? (
        <div className="desktop-console__grid">
          <article className="desktop-console__card desktop-console__card--span">
            <div className="desktop-console__card-header">
              <div>
                <strong>Backend 进程管理</strong>
                <p>只管理由当前 Tauri shell 启动的本地 backend 进程。</p>
              </div>
            </div>
            <div className="desktop-console__row">
              <input value={javaCommand} onChange={(event) => setJavaCommand(event.target.value)} placeholder="java 命令" disabled={!desktopAvailable} />
              <input value={backendWorkingDirectory} onChange={(event) => setBackendWorkingDirectory(event.target.value)} placeholder="工作目录" disabled={!desktopAvailable} />
            </div>
            <div className="desktop-console__row">
              <input value={backendJarPath} onChange={(event) => setBackendJarPath(event.target.value)} placeholder="backend jar path" disabled={!desktopAvailable} />
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "start-backend"} onClick={handleStartBackend}>
                启动 backend
              </button>
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "save-desktop-config"} onClick={() => void handlePersistRuntimeConfig()}>
                保存配置
              </button>
              <button type="button" className="secondary-button" disabled={!desktopAvailable || loadingAction === "check-backend-port"} onClick={() => void handleCheckBackendPort()}>
                诊断 8080
              </button>
            </div>
            {portStatus ? (
              <div className={portStatus.open ? "desktop-console__boundary desktop-console__boundary--success" : "desktop-console__boundary"}>
                <strong>127.0.0.1:{portStatus.port} {portStatus.open ? "可连接" : "不可连接"}</strong>
                <p>{portStatus.message}</p>
              </div>
            ) : null}
          </article>

          <article className="desktop-console__card">
            <div className="desktop-console__card-header">
              <div>
                <strong>托管进程</strong>
                <p>当前 Tauri 会话启动的进程。</p>
              </div>
            </div>
            {managedProcesses.length > 0 ? (
              <div className="desktop-console__processes">
                {managedProcesses.map((process) => (
                  <article key={process.pid}>
                    <div>
                      <strong>{process.label}</strong>
                      <span>PID {process.pid} · {formatTime(process.startedAt)} · {process.running ? "running" : "stopped"}</span>
                      {process.logPath ? <span>Log: {process.logPath}</span> : null}
                    </div>
                    <button type="button" className="ghost-button" disabled={!process.running} onClick={() => void handleStopProcess(process.pid)}>
                      停止
                    </button>
                    {process.recentOutput?.length ? (
                      <pre className="desktop-console__process-log">{process.recentOutput.slice(-6).join("\n")}</pre>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="desktop-console__empty">没有由桌面壳托管的进程。</p>
            )}
          </article>
        </div>
      ) : null}

      {errorMessage ? <p className="desktop-console__error">{errorMessage}</p> : null}
    </section>
  );
}
