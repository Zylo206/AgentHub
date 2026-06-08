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

export interface AgentHubSnapshotManifest {
  roomId: string;
  protocol: string;
  roomVersion: number;
  storageProvider: string;
  storageBucket: string;
  storageKey: string;
  checksumSha256: string;
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

  async loadSnapshot(
    artifactId: string,
    token: string
  ): Promise<{ manifest: AgentHubSnapshotManifest; snapshotBytes: Uint8Array } | null> {
    const response = await fetch(
      `${this.baseUrl}/api/artifacts/${encodeURIComponent(artifactId)}/collab-room/v2/snapshot`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `AgentHub snapshot load failed with ${response.status}`);
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    return {
      manifest: {
        roomId: response.headers.get("X-AgentHub-Room-Id") || "",
        protocol: response.headers.get("X-AgentHub-Protocol") || "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
        roomVersion: Number.parseInt(response.headers.get("X-AgentHub-Room-Version") || "0", 10) || 0,
        storageProvider: response.headers.get("X-AgentHub-Storage-Provider") || "",
        storageBucket: response.headers.get("X-AgentHub-Storage-Bucket") || "",
        storageKey: response.headers.get("X-AgentHub-Storage-Key") || "",
        checksumSha256: response.headers.get("X-AgentHub-Checksum-Sha256") || ""
      },
      snapshotBytes: buffer
    };
  }

  async saveSnapshot(
    artifactId: string,
    token: string,
    payload: {
      roomId: string;
      protocol: string;
      roomVersion: number;
      snapshotBytes: Uint8Array;
    }
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/artifacts/${encodeURIComponent(artifactId)}/collab-room/v2/snapshot`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "X-AgentHub-Room-Id": payload.roomId,
          "X-AgentHub-Protocol": payload.protocol,
          "X-AgentHub-Room-Version": String(payload.roomVersion)
        },
        body: Buffer.from(payload.snapshotBytes)
      }
    );
    await this.read<ApiResponse<unknown>>(response).then((apiResponse) => {
      if (!apiResponse.success) {
        throw new Error(apiResponse.message || apiResponse.errorCode || "AgentHub snapshot save failed.");
      }
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
