import type { AdapterDescriptor, Agent } from "../features/agents/agentTypes";
import type { Artifact } from "../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../features/artifacts/artifactSnapshotTypes";
import type { ActionAuditLog } from "../features/audit/auditTypes";
import type { Message, TaskRun, TaskSpec } from "../features/chat/chatTypes";
import type { Conversation } from "../features/conversations/conversationTypes";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../features/context/contextTypes";
import type { DeploymentRecord } from "../features/deployments/deploymentTypes";
import type { MemoryItem } from "../features/memory/memoryTypes";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  errorCode: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知网络错误";
    throw new Error(`请求失败：${message}`);
  }

  let payload: ApiResponse<T> | null = null;
  const text = await response.text();

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      if (!response.ok) {
        throw new Error(`请求失败，状态码：${response.status}`);
      }
      throw new Error("服务端响应格式无效");
    }
  }

  if (!response.ok) {
    const message = payload?.message || `请求失败，状态码：${response.status}`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("服务端响应为空");
  }

  if (!payload.success) {
    throw new Error(payload.message || payload.errorCode || "未知 API 错误");
  }

  return payload.data;
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
}

export interface CreateAgentRequest {
  name: string;
  avatarUrl?: string;
  systemPrompt?: string;
  capabilityTags: string[];
  toolTags: string[];
  preferredAdapterType: string;
}

export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>("/api/agents");
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

export function createConversation(title: string, type: "SINGLE" | "GROUP"): Promise<Conversation> {
  return request<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, type })
  });
}

export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/api/conversations");
}

export function getConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/api/conversations/${conversationId}`);
}

export function sendMessage(
  conversationId: string,
  content: string,
  targetAgentId?: string | null,
  mentionedAgentIds?: string[] | null,
  replyToMessageId?: string | null,
  quotedMessageId?: string | null
): Promise<Message> {
  return request<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content,
      targetAgentId: targetAgentId ?? null,
      mentionedAgentIds: mentionedAgentIds ?? [],
      replyToMessageId: replyToMessageId ?? null,
      quotedMessageId: quotedMessageId ?? null
    })
  });
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

export function getTaskSpecsByConversation(conversationId: string): Promise<TaskSpec[]> {
  return request<TaskSpec[]>(`/api/conversations/${conversationId}/task-specs`);
}

export function getTaskRunsByConversation(conversationId: string): Promise<TaskRun[]> {
  return request<TaskRun[]>(`/api/conversations/${conversationId}/task-runs`);
}

export function getTaskRun(taskRunId: string): Promise<TaskRun> {
  return request<TaskRun>(`/api/task-runs/${taskRunId}`);
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

export function getArtifactSnapshotsByConversation(conversationId: string): Promise<ArtifactSnapshot[]> {
  return request<ArtifactSnapshot[]>(`/api/conversations/${conversationId}/artifact-snapshots`);
}

export function getArtifactSnapshotsByArtifact(artifactId: string): Promise<ArtifactSnapshot[]> {
  return request<ArtifactSnapshot[]>(`/api/artifacts/${artifactId}/snapshots`);
}

export function restoreArtifactSnapshot(snapshotId: string): Promise<Artifact> {
  return request<Artifact>(`/api/artifact-snapshots/${snapshotId}/restore`, {
    method: "POST"
  });
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

export function applyArtifactDiff(artifactId: string, force = false): Promise<ApplyDiffResponse> {
  return request<ApplyDiffResponse>(`/api/artifacts/${artifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({ force })
  });
}

export function createDemoDeployment(artifactId: string): Promise<DeploymentRecord> {
  return request<DeploymentRecord>(`/api/artifacts/${artifactId}/demo-deploy`, {
    method: "POST"
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
