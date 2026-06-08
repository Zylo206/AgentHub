export interface ArtifactCollabParticipant {
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

export interface ArtifactCollabOperation {
  operationId: string;
  operationType: string;
  userId: string;
  displayName: string;
  deviceId: string;
  version: number;
  summary: string;
  contentHash: string;
  createdAt: string;
}

export interface ArtifactCollabRoom {
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
  lastCompactedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  participants: ArtifactCollabParticipant[];
  operations: ArtifactCollabOperation[];
  redisFanoutEnabled?: boolean;
  instanceId?: string;
}
