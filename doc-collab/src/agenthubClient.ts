export interface AgentHubCollabParticipant {
  userId: string;
  displayName: string;
  role: string;
  deviceId: string;
  status: string;
  cursorStart?: number | null;
  cursorEnd?: number | null;
  editing: boolean;
  lastSeenAt: string;
}

export interface AgentHubCollabRoom {
  roomId: string;
  artifactId: string;
  conversationId: string;
  title: string;
  artifactType: string;
  language: string;
  protocol: string;
  version: number;
  baseArtifactVersion: number;
  baseArtifactHash: string;
  currentArtifactVersion: number;
  currentArtifactHash: string;
  content: string;
  contentHash: string;
  maxDocumentChars: number;
  participants: AgentHubCollabParticipant[];
}

export interface AgentHubAuthUser {
  userId: string;
  displayName: string;
  role: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface AgentHubAuthorization {
  protocol: string;
  mode: "READ" | "WRITE";
  room: AgentHubCollabRoom;
  user: AgentHubAuthUser;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
  errorCode?: string | null;
}

export class AgentHubClient {
  constructor(private readonly baseUrl: string) {}

  async authorize(artifactId: string, token: string, mode: "READ" | "WRITE"): Promise<AgentHubAuthorization> {
    const response = await fetch(`${this.baseUrl}/api/artifacts/${encodeURIComponent(artifactId)}/collab-room/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mode, protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS" })
    });
    return this.read<ApiResponse<AgentHubAuthorization>>(response).then((payload) => {
      if (!payload.success) {
        throw new Error(payload.message || payload.errorCode || "AgentHub authorization failed.");
      }
      return payload.data;
    });
  }

  private async read<T>(response: Response): Promise<T> {
    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      payload = JSON.parse(text);
    }
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message)
          : `AgentHub API failed with ${response.status}`;
      throw new Error(message);
    }
    return payload as T;
  }
}
