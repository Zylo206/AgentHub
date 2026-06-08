import type {
  AdapterDescriptor,
  AdapterExecutionResponse,
  Agent,
  ToolCapabilityKey
} from "../features/agents/agentTypes";
import type { AgentCreationDraft } from "../features/agents/conversationalAgentDraft";
import type { Artifact } from "../features/artifacts/artifactTypes";
import type { ArtifactCollabRoom } from "../features/artifacts/artifactCollaborationTypes";
import type { ArtifactSnapshot } from "../features/artifacts/artifactSnapshotTypes";
import type { ActionAuditLog } from "../features/audit/auditTypes";
import type { ApprovalRequest } from "../features/approval/approvalTypes";
import type {
  LightweightAttachment,
  Message,
  OrchestratorTriggerSuggestion,
  TaskRun,
  TaskSpec
} from "../features/chat/chatTypes";
import type { Conversation } from "../features/conversations/conversationTypes";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../features/context/contextTypes";
import type { DeploymentRecord } from "../features/deployments/deploymentTypes";
import type { MemoryItem } from "../features/memory/memoryTypes";
import type { IdValue } from "../utils/id";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  errorCode: string | null;
}

export class ApiError extends Error {
  status: number;
  errorCode: string | null;

  constructor(message: string, status: number, errorCode: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

function isTauriRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const tauriWindow = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  return Boolean(tauriWindow.__TAURI__ || tauriWindow.__TAURI_INTERNALS__);
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (isTauriRuntime() ? "http://127.0.0.1:8080" : "http://localhost:8080");
export const API_BASE_URL = API_BASE;
const AUTH_TOKEN_STORAGE_KEY = "agenthub.auth.token";

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  orgTags: string[];
}

export interface AuthLoginResult {
  token: string;
  user: AuthUser;
}

export interface PresenceRecord {
  conversationId: string;
  userId: string;
  displayName: string;
  deviceId: string;
  status: string;
  activeArtifactId?: string | null;
  lastSeenEventId?: string | null;
  updatedAt: string;
}

export interface RealtimeEvent {
  eventId: string;
  conversationId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface RealtimeRunState {
  taskRunId: string;
  conversationId: string;
  sourceMessageId: string;
  status: string;
  lastEventId?: string | null;
  summary?: string | null;
  resourceRefs: string[];
  createdAt: string;
  updatedAt: string;
  errorMessage?: string | null;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

function withAuthQuery(url: string): string {
  const token = getAuthToken();
  if (!token) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${encodeURIComponent(token)}`;
}

export function getConversationEventsUrl(conversationId: string): string {
  return withAuthQuery(`${API_BASE}/api/conversations/${conversationId}/events`);
}

export function getArtifactCollabWebSocketUrl(): string {
  const websocketBase = API_BASE.replace(/^http/i, "ws");
  return withAuthQuery(`${websocketBase}/api/doc-collab`);
}

async function request<T>(path: string, init?: RequestInit, retryOnUnauthorized = true): Promise<T> {
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  let authToken = getAuthToken();
  if (!authToken && path !== "/api/auth/login") {
    const loginResult = await login("demo", "demo");
    authToken = loginResult.token;
  }

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: isFormData
        ? {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...(init?.headers ?? {})
          }
        : {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...(init?.headers ?? {})
          }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知网络错误";
    throw new ApiError(`请求失败：${message}`, 0);
  }

  let payload: ApiResponse<T> | null = null;
  const text = await response.text();

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      if (!response.ok) {
        throw new ApiError(`请求失败，状态码：${response.status}`, response.status);
      }
      throw new Error("服务端响应格式无效");
    }
  }

  if (response.status === 401 && retryOnUnauthorized && path !== "/api/auth/login") {
    await login("demo", "demo");
    return request<T>(path, init, false);
  }

  if (!response.ok) {
    const message = payload?.message || `请求失败，状态码：${response.status}`;
    throw new ApiError(message, response.status, payload?.errorCode ?? null);
  }

  if (!payload) {
    throw new Error("服务端响应为空");
  }

  if (!payload.success) {
    throw new ApiError(payload.message || payload.errorCode || "未知 API 错误", response.status, payload.errorCode);
  }

  return payload.data;
}

export async function login(username: string, password: string): Promise<AuthLoginResult> {
  const result = await request<AuthLoginResult>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password })
    },
    false
  );
  setAuthToken(result.token);
  return result;
}

export function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me");
}

export async function logout(): Promise<void> {
  await request<boolean>("/api/auth/logout", { method: "POST" }).catch(() => false);
  setAuthToken(null);
}

export interface ArtifactRevisionResponse {
  taskRun: TaskRun;
  revisedArtifact: Artifact;
  reviewArtifact: Artifact;
}

export interface ApplyDiffResponse {
  appliedArtifact: Artifact | null;
  baseArtifactId: string;
  revisionArtifactId: string;
  addedLines: number;
  removedLines: number;
  unchangedLines: number;
  changedLines: number;
  conflict: boolean;
  conflictReason?: string | null;
  latestAppliedArtifactId?: string | null;
  snapshotId?: string | null;
  conflictBypassed: boolean;
}

export interface CreateAgentRequest {
  name: string;
  avatarUrl?: string;
  systemPrompt?: string;
  capabilityTags: string[];
  toolTags: Array<ToolCapabilityKey | string>;
  preferredAdapterType: string;
}

export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>("/api/agents");
}

export function draftAgentFromNaturalLanguage(description: string): Promise<AgentCreationDraft> {
  return request<AgentCreationDraft>("/api/agents/draft", {
    method: "POST",
    body: JSON.stringify({ description })
  });
}

export function createAgent(requestBody: CreateAgentRequest): Promise<Agent> {
  return request<Agent>("/api/agents", {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

export function getAdapters(): Promise<AdapterDescriptor[]> {
  return request<AdapterDescriptor[]>("/api/adapters");
}

export interface AdapterQualityMetrics {
  adapterType: string;
  attempts: number;
  successes: number;
  fallbacks: number;
  realOutputAccepted: number;
  parseFailures: number;
  qualityFailures: number;
  buildFailures: number;
  successRate: number;
  fallbackRate: number;
  realAcceptanceRate?: number;
  parseFailureRate?: number;
  qualityFailureRate?: number;
  buildFailureRate?: number;
  totalFailureRate?: number;
  healthLabel?: string | null;
  acceptedOutcomes?: number;
  fallbackOutcomes?: number;
  failureOutcomes?: number;
  outcomeSummary?: string | null;
  lastParseStatus?: string | null;
  lastBuildValidationStatus?: string | null;
  lastQualityStatus?: string | null;
  lastQualityReason?: string | null;
  lastOutcome?: string | null;
  updatedAt?: string | null;
}

export function getAdapterQualityMetrics(): Promise<AdapterQualityMetrics[]> {
  return request<AdapterQualityMetrics[]>("/api/adapters/quality-metrics");
}

export interface ExecuteAdapterRequest {
  conversationId: string;
  taskRunId?: string | null;
  taskStepId?: string | null;
  agentId: string;
  agentName: string;
  userInput?: string | null;
  systemPrompt?: string | null;
  taskDescription?: string | null;
  contextItems?: string[];
  artifactSummaries?: string[];
  metadata?: Record<string, unknown>;
}

export function executeAdapter(
  adapterType: string,
  requestBody: ExecuteAdapterRequest
): Promise<AdapterExecutionResponse> {
  return request<AdapterExecutionResponse>(`/api/adapters/${adapterType}/execute`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

export function createConversation(title: string, type: "SINGLE" | "GROUP"): Promise<Conversation> {
  return request<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, type })
  });
}

export interface GetConversationsOptions {
  query?: string;
  includeArchived?: boolean;
}

export function getConversations(options: GetConversationsOptions = {}): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (options.query?.trim()) {
    params.set("query", options.query.trim());
  }
  if (options.includeArchived) {
    params.set("includeArchived", "true");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<Conversation[]>(`/api/conversations${suffix}`);
}

export function getConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}`);
}

export function pinConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/pin`, {
    method: "POST"
  });
}

export function unpinConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/unpin`, {
    method: "POST"
  });
}

export function archiveConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/archive`, {
    method: "POST"
  });
}

export function unarchiveConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/unarchive`, {
    method: "POST"
  });
}

export function markConversationRead(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/read`, {
    method: "POST"
  });
}

export function updateConversationVisibility(
  conversationId: string,
  visibility: "PRIVATE" | "ORG" | "PUBLIC",
  orgTag?: string | null
): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/visibility`, {
    method: "POST",
    body: JSON.stringify({ visibility, orgTag: orgTag ?? null })
  });
}

export function upsertConversationMember(
  conversationId: string,
  userId: string,
  memberRole: "OWNER" | "EDITOR" | "REVIEWER" | "VIEWER" | string
): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/members/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({ memberRole })
  });
}

export function removeConversationMember(conversationId: string, userId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}/members/${encodeURIComponent(userId)}`, {
    method: "DELETE"
  });
}

export function heartbeatConversationPresence(
  conversationId: string,
  requestBody: {
    deviceId?: string | null;
    status?: string | null;
    activeArtifactId?: string | null;
    lastSeenEventId?: string | null;
  }
): Promise<PresenceRecord> {
  return request<PresenceRecord>(`/api/conversations/${conversationId}/presence`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

export function getConversationPresence(conversationId: string): Promise<PresenceRecord[]> {
  return request<PresenceRecord[]>(`/api/conversations/${conversationId}/presence`);
}

export function sendMessage(
  conversationId: string,
  content: string,
  targetAgentId?: string | null,
  mentionedAgentIds?: string[] | null,
  replyToMessageId?: string | null,
  quotedMessageId?: string | null,
  attachments?: LightweightAttachment[] | null
): Promise<Message> {
  const normalizedAttachments = (attachments ?? []).map((attachment) => ({
    attachmentId: attachment.attachmentId || attachment.id || `demo-${attachment.fileName}`,
    fileName: attachment.fileName,
    contentType: attachment.contentType || attachment.mimeType || "text/plain",
    size: attachment.size ?? attachment.sizeBytes ?? 0,
    contentPreview: attachment.contentPreview || attachment.previewText || null
  }));

  return request<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      targetAgentId: targetAgentId ?? null,
      mentionedAgentIds: mentionedAgentIds ?? [],
      replyToMessageId: replyToMessageId ?? null,
      quotedMessageId: quotedMessageId ?? null,
      attachments: normalizedAttachments
    })
  });
}

export interface AttachmentRecord {
  attachmentId: string;
  conversationId: IdValue;
  messageId?: string | null;
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
  storagePath?: string;
  storageKey?: string | null;
  checksumSha256?: string | null;
  visibility?: string | null;
  ownerUserId?: string | null;
  scanStatus?: string | null;
  contentPreview?: string | null;
  createdAt: string;
  deletedAt?: string | null;
}

export function uploadConversationAttachment(conversationId: string, file: File): Promise<AttachmentRecord> {
  const formData = new FormData();
  formData.append("file", file);
  return request<AttachmentRecord>(`/api/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData
  });
}

export function getAttachmentDownloadUrl(attachmentId: string): string {
  return withAuthQuery(`${API_BASE}/api/attachments/${attachmentId}/download`);
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${conversationId}/messages`);
}

export function regenerateAgentReply(conversationId: string, messageId: string): Promise<Message> {
  return request<Message>(`/api/conversations/${conversationId}/messages/${messageId}/regenerate-agent-reply`, {
    method: "POST"
  });
}

export function createDemoTask(
  conversationId: string,
  messageId: string,
  userInput: string,
  selectedAgentId?: string | null
): Promise<TaskRun> {
  return request<TaskRun>(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({ messageId, userInput, selectedAgentId: selectedAgentId ?? null })
  });
}

export interface RunOrchestratorFromMessageRequest {
  selectedAgentId?: string | null;
  approvalId?: string | null;
}

export function getOrchestratorTriggerSuggestion(
  conversationId: string,
  messageId: string
): Promise<OrchestratorTriggerSuggestion> {
  return request<OrchestratorTriggerSuggestion>(
    `/api/conversations/${conversationId}/messages/${messageId}/orchestrator-trigger-suggestion`
  );
}

export function runOrchestratorFromMessage(
  conversationId: string,
  messageId: string,
  requestBody: RunOrchestratorFromMessageRequest = {}
): Promise<TaskRun> {
  return request<TaskRun>(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
    method: "POST",
    body: JSON.stringify({
      selectedAgentId: requestBody.selectedAgentId ?? null,
      approvalId: requestBody.approvalId ?? null
    })
  });
}

export function getTaskSpecsByConversation(conversationId: string): Promise<TaskSpec[]> {
  return request<TaskSpec[]>(`/api/conversations/${conversationId}/task-specs`);
}

export function getTaskRunsByConversation(conversationId: string): Promise<TaskRun[]> {
  return request<TaskRun[]>(`/api/conversations/${conversationId}/task-runs`);
}

export function getTaskRun(taskRunId: string): Promise<TaskRun> {
  return request<TaskRun>(`/api/task-runs/${taskRunId}`);
}

export function getTaskRunRealtimeState(taskRunId: string): Promise<RealtimeRunState | null> {
  return request<RealtimeRunState | null>(`/api/task-runs/${taskRunId}/realtime-state`);
}

export function getActiveRealtimeState(conversationId: string): Promise<RealtimeRunState | null> {
  return request<RealtimeRunState | null>(`/api/conversations/${conversationId}/active-realtime-state`);
}

export interface RealtimeControlResult {
  accepted: boolean;
  action: string;
  taskRunId: string;
  conversationId: string;
  previousStatus: string;
  status: string;
  message: string;
}

export function cancelTaskRun(taskRunId: string, reason: string): Promise<RealtimeControlResult> {
  return request<RealtimeControlResult>(`/api/task-runs/${taskRunId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function stopTaskRun(taskRunId: string, reason: string): Promise<RealtimeControlResult> {
  return request<RealtimeControlResult>(`/api/task-runs/${taskRunId}/stop`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export function getContextSnapshotsByConversation(conversationId: string): Promise<ContextSnapshot[]> {
  return request<ContextSnapshot[]>(`/api/conversations/${conversationId}/context-snapshots`);
}

export function getContextSnapshotsByTaskRun(taskRunId: string): Promise<ContextSnapshot[]> {
  return request<ContextSnapshot[]>(`/api/task-runs/${taskRunId}/context-snapshots`);
}

export function getPinnedContextsByConversation(conversationId: string): Promise<PinnedContext[]> {
  return request<PinnedContext[]>(`/api/conversations/${conversationId}/pinned-contexts`);
}

export function pinMessageAsContext(conversationId: string, messageId: string): Promise<PinnedContext> {
  return request<PinnedContext>(`/api/conversations/${conversationId}/messages/${messageId}/pin`, {
    method: "POST"
  });
}

export function pinAttachmentAsContext(conversationId: string, attachmentId: string): Promise<PinnedContext> {
  return request<PinnedContext>(`/api/conversations/${conversationId}/attachments/${attachmentId}/pin`, {
    method: "POST"
  });
}

export function unpinContext(pinnedContextId: string): Promise<PinnedContext> {
  return request<PinnedContext>(`/api/pinned-contexts/${pinnedContextId}`, {
    method: "DELETE"
  });
}

export function getHandoffSummariesByTaskRun(taskRunId: string): Promise<HandoffSummary[]> {
  return request<HandoffSummary[]>(`/api/task-runs/${taskRunId}/handoff-summaries`);
}

export function getArtifactsByConversation(conversationId: string): Promise<Artifact[]> {
  return request<Artifact[]>(`/api/conversations/${conversationId}/artifacts`);
}

export function getArtifactsByTaskRun(taskRunId: string): Promise<Artifact[]> {
  return request<Artifact[]>(`/api/task-runs/${taskRunId}/artifacts`);
}

export function getArtifact(artifactId: string): Promise<Artifact> {
  return request<Artifact>(`/api/artifacts/${artifactId}`);
}

export function getArtifactCollabRoom(artifactId: string): Promise<ArtifactCollabRoom> {
  return request<ArtifactCollabRoom>(`/api/artifacts/${artifactId}/collab-room`);
}

export function updateArtifactCollabDocument(
  artifactId: string,
  body: {
    baseVersion?: number | null;
    content: string;
    deviceId?: string | null;
    summary?: string | null;
  }
): Promise<ArtifactCollabRoom> {
  return request<ArtifactCollabRoom>(`/api/artifacts/${artifactId}/collab-room/document`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function updateArtifactCollabPresence(
  artifactId: string,
  body: {
    deviceId?: string | null;
    status?: string | null;
    cursorStart?: number | null;
    cursorEnd?: number | null;
    editing?: boolean;
  }
): Promise<ArtifactCollabRoom> {
  return request<ArtifactCollabRoom>(`/api/artifacts/${artifactId}/collab-room/presence`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export function publishArtifactCollabDraft(
  artifactId: string,
  approvalId: string,
  summary: string
): Promise<Artifact> {
  return request<Artifact>(`/api/artifacts/${artifactId}/collab-room/publish`, {
    method: "POST",
    body: JSON.stringify({ approvalId, summary })
  });
}

export function getArtifactBundleDownloadUrl(
  conversationId: string,
  artifactIds: string[] = [],
  includeRelated = true
): string {
  const params = new URLSearchParams();
  if (artifactIds.length > 0) {
    params.set("artifactIds", artifactIds.join(","));
  }
  params.set("includeRelated", includeRelated ? "true" : "false");
  return withAuthQuery(`${API_BASE}/api/conversations/${conversationId}/artifact-bundle/download?${params.toString()}`);
}

export function getArtifactSnapshotsByConversation(conversationId: string): Promise<ArtifactSnapshot[]> {
  return request<ArtifactSnapshot[]>(`/api/conversations/${conversationId}/artifact-snapshots`);
}

export function getArtifactSnapshotsByArtifact(artifactId: string): Promise<ArtifactSnapshot[]> {
  return request<ArtifactSnapshot[]>(`/api/artifacts/${artifactId}/snapshots`);
}

export function restoreArtifactSnapshot(snapshotId: string): Promise<Artifact> {
  return restoreArtifactSnapshotWithApproval(snapshotId, null);
}

export function restoreArtifactSnapshotWithApproval(
  snapshotId: string,
  approvalId?: string | null,
  baseVersion?: number | null,
  baseContentHash?: string | null
): Promise<Artifact> {
  return request<Artifact>(`/api/artifact-snapshots/${snapshotId}/restore`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: approvalId ?? null,
      baseVersion: baseVersion ?? null,
      baseContentHash: baseContentHash ?? null
    })
  });
}

export interface CreateApprovalRequest {
  actionType: string;
  targetType: string;
  targetId: string;
  riskLevel: string;
  summary: string;
  affectedItems: string[];
}

export function createApprovalRequest(
  conversationId: string,
  requestBody: CreateApprovalRequest
): Promise<ApprovalRequest> {
  return request<ApprovalRequest>(`/api/conversations/${conversationId}/approval-requests`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

export function approveApprovalRequest(approvalId: string): Promise<ApprovalRequest> {
  return request<ApprovalRequest>(`/api/approval-requests/${approvalId}/approve`, {
    method: "POST"
  });
}

export function cancelApprovalRequest(approvalId: string): Promise<ApprovalRequest> {
  return request<ApprovalRequest>(`/api/approval-requests/${approvalId}/cancel`, {
    method: "POST"
  });
}

export function getApprovalRequestsByConversation(conversationId: string): Promise<ApprovalRequest[]> {
  return request<ApprovalRequest[]>(`/api/conversations/${conversationId}/approval-requests`);
}

export function getActionAuditsByConversation(conversationId: string): Promise<ActionAuditLog[]> {
  return request<ActionAuditLog[]>(`/api/conversations/${conversationId}/action-audits`);
}

export interface RecordActionAuditRequest {
  actionType: string;
  targetType: string;
  targetId: string;
  status: string;
  summary: string;
}

export function recordActionAudit(
  conversationId: string,
  requestBody: RecordActionAuditRequest
): Promise<ActionAuditLog> {
  return request<ActionAuditLog>(`/api/conversations/${conversationId}/action-audits`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
}

export function createDemoArtifactRevision(
  artifactId: string,
  conversationId: string,
  revisionInstruction: string
): Promise<ArtifactRevisionResponse> {
  return request<ArtifactRevisionResponse>(`/api/artifacts/${artifactId}/demo-revision`, {
    method: "POST",
    body: JSON.stringify({ conversationId, revisionInstruction })
  });
}

export function applyArtifactDiff(
  artifactId: string,
  force = false,
  approvalId?: string | null,
  baseVersion?: number | null,
  baseContentHash?: string | null
): Promise<ApplyDiffResponse> {
  return request<ApplyDiffResponse>(`/api/artifacts/${artifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({
      force,
      approvalId: approvalId ?? null,
      baseVersion: baseVersion ?? null,
      baseContentHash: baseContentHash ?? null
    })
  });
}

export function createDemoDeployment(
  artifactId: string,
  approvalId?: string | null,
  baseVersion?: number | null,
  baseContentHash?: string | null
): Promise<DeploymentRecord> {
  return request<DeploymentRecord>(`/api/artifacts/${artifactId}/demo-deploy`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: approvalId ?? null,
      baseVersion: baseVersion ?? null,
      baseContentHash: baseContentHash ?? null
    })
  });
}

export function getDeploymentsByConversation(conversationId: string): Promise<DeploymentRecord[]> {
  return request<DeploymentRecord[]>(`/api/conversations/${conversationId}/deployments`);
}

export function getDeploymentsByArtifact(artifactId: string): Promise<DeploymentRecord[]> {
  return request<DeploymentRecord[]>(`/api/artifacts/${artifactId}/deployments`);
}

export function getDeployment(deploymentId: string): Promise<DeploymentRecord> {
  return request<DeploymentRecord>(`/api/deployments/${deploymentId}`);
}

export function getMemoriesByConversation(conversationId: string): Promise<MemoryItem[]> {
  return request<MemoryItem[]>(`/api/conversations/${conversationId}/memories`);
}

export function getRelevantMemoriesByConversation(conversationId: string, limit = 6): Promise<MemoryItem[]> {
  return request<MemoryItem[]>(`/api/conversations/${conversationId}/memories/relevant?limit=${limit}`);
}

export function saveMessageAsMemory(
  conversationId: string,
  messageId: string,
  category = "PROJECT_FACT"
): Promise<MemoryItem> {
  return request<MemoryItem>(`/api/conversations/${conversationId}/messages/${messageId}/memory`, {
    method: "POST",
    body: JSON.stringify({ category })
  });
}

export function saveAttachmentAsMemory(
  conversationId: string,
  attachmentId: string,
  category = "PROJECT_FACT"
): Promise<MemoryItem> {
  return request<MemoryItem>(`/api/conversations/${conversationId}/attachments/${attachmentId}/memory`, {
    method: "POST",
    body: JSON.stringify({ category })
  });
}

export function updateMemory(
  memoryId: string,
  payload: Partial<Pick<MemoryItem, "category" | "scope" | "content" | "importance">>
): Promise<MemoryItem> {
  return request<MemoryItem>(`/api/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteMemory(memoryId: string): Promise<MemoryItem> {
  return request<MemoryItem>(`/api/memories/${memoryId}`, {
    method: "DELETE"
  });
}
