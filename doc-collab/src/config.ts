import path from "node:path";
import os from "node:os";

function intEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: intEnv("DOC_COLLAB_PORT", 8091),
  host: process.env.DOC_COLLAB_HOST || "0.0.0.0",
  agenthubApiBaseUrl: process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080",
  storageDir: process.env.DOC_COLLAB_STORAGE_DIR || path.join(os.homedir(), ".agenthub", "agenthub", "doc-collab-v2"),
  snapshotStorageType: process.env.DOC_COLLAB_SNAPSHOT_STORAGE_TYPE || "file",
  objectStorageDir: process.env.DOC_COLLAB_OBJECT_STORAGE_DIR || path.join(os.homedir(), ".agenthub", "agenthub", "object-storage"),
  objectStorageBucket: process.env.DOC_COLLAB_OBJECT_STORAGE_BUCKET || "doc-collab",
  redisUrl: process.env.REDIS_URL || "",
  snapshotEveryUpdates: intEnv("DOC_COLLAB_SNAPSHOT_EVERY_UPDATES", 50),
  maxUpdateBytes: intEnv("DOC_COLLAB_MAX_UPDATE_BYTES", 262144),
  maxDocumentChars: intEnv("DOC_COLLAB_MAX_DOCUMENT_CHARS", 200000),
  roomIdleTtlMs: intEnv("DOC_COLLAB_ROOM_IDLE_TTL_MS", 10 * 60 * 1000),
  heartbeatMs: intEnv("DOC_COLLAB_HEARTBEAT_MS", 25000),
  instanceId: process.env.DOC_COLLAB_INSTANCE_ID || `doc-collab-${process.pid}-${Date.now().toString(16)}`
};
