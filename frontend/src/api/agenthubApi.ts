import type { Agent } from "../features/agents/agentTypes";
import type { Artifact } from "../features/artifacts/artifactTypes";
import type { Message, TaskRun, TaskSpec } from "../features/chat/chatTypes";
import type { Conversation } from "../features/conversations/conversationTypes";
import type { ContextSnapshot, HandoffSummary } from "../features/context/contextTypes";

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
    const message = error instanceof Error ? error.message : "Unknown network error";
    throw new Error(`Request failed: ${message}`);
  }

  let payload: ApiResponse<T> | null = null;
  const text = await response.text();

  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      throw new Error("Invalid server response");
    }
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Empty server response");
  }

  if (!payload.success) {
    throw new Error(payload.message || payload.errorCode || "Unknown API error");
  }

  return payload.data;
}

export interface ArtifactRevisionResponse {
  taskRun: TaskRun;
  revisedArtifact: Artifact;
  reviewArtifact: Artifact;
}

export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>("/api/agents");
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

export function sendMessage(conversationId: string, content: string): Promise<Message> {
  return request<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${conversationId}/messages`);
}

export function createDemoTask(
  conversationId: string,
  messageId: string,
  userInput: string
): Promise<TaskRun> {
  return request<TaskRun>(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({ messageId, userInput })
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
