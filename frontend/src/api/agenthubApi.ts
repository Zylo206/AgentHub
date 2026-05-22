import type { AdapterDescriptor, Agent } from "../features/agents/agentTypes";
import type { Artifact } from "../features/artifacts/artifactTypes";
import type { Message, TaskRun, TaskSpec } from "../features/chat/chatTypes";
import type { Conversation } from "../features/conversations/conversationTypes";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../features/context/contextTypes";
import type { DeploymentRecord } from "../features/deployments/deploymentTypes";

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
  targetAgentId?: string | null
): Promise<Message> {
  return request<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, targetAgentId: targetAgentId ?? null })
  });
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${conversationId}/messages`);
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
