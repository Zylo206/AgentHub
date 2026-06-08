#!/usr/bin/env node

const API_BASE_URL = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const ADMIN_USERNAME = process.env.AGENTHUB_OBJECT_STORAGE_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.AGENTHUB_OBJECT_STORAGE_ADMIN_PASSWORD || "admin";
const DEMO_USERNAME = process.env.AGENTHUB_OBJECT_STORAGE_DEMO_USERNAME || "demo";
const DEMO_PASSWORD = process.env.AGENTHUB_OBJECT_STORAGE_DEMO_PASSWORD || "demo";
const ATTACHMENT_TEXT = "Object storage smoke attachment: verify MinIO roundtrip and attachment download.";
let adminToken = "";
let demoToken = "";

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

function requireValue(value, message) {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

function getIdValue(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && typeof value.value === "string") {
    return value.value;
  }
  return null;
}

async function api(path, init = {}, token = "") {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: isFormData
      ? {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {})
        }
      : {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {})
        }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload?.data;
}

async function binary(path, init = {}, token = "") {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `HTTP ${response.status}`);
  }
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    headers: response.headers
  };
}

async function login(username, password) {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  return result.token;
}

async function ensureTaskArtifact(conversationId) {
  const message = await api(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "Create a minimal markdown artifact for object-storage smoke verification."
    })
  }, demoToken);
  const messageId = requireValue(getIdValue(message.id), "smoke message id missing");
  const taskRun = await api(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: "Create a minimal markdown artifact for object-storage smoke verification."
    })
  }, demoToken);
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  const artifacts = await api(`/api/task-runs/${taskRunId}/artifacts`, {}, demoToken);
  const artifact = artifacts.find((item) => ["CODE", "MARKDOWN"].includes(String(item.type || item.artifactType || "").toUpperCase()));
  if (!artifact) {
    throw new Error("No CODE or MARKDOWN artifact was produced for collab snapshot smoke.");
  }
  return requireValue(getIdValue(artifact.id), "artifactId missing");
}

async function main() {
  adminToken = await login(ADMIN_USERNAME, ADMIN_PASSWORD);
  demoToken = await login(DEMO_USERNAME, DEMO_PASSWORD);

  const health = await api("/api/admin/object-storage/health", { method: "GET" }, adminToken);
  if (String(health.provider || "").toUpperCase() !== "S3") {
    throw new Error(`Expected real S3/MinIO provider, got ${health.provider}`);
  }
  if (health.configured !== true) {
    throw new Error("Object storage is not fully configured.");
  }
  const buckets = Array.isArray(health.buckets) ? health.buckets : [];
  if (buckets.length < 2) {
    throw new Error("Object-storage health did not expose default buckets.");
  }
  pass(`object storage health: provider=${health.provider}, buckets=${buckets.map((item) => item.bucketName).join(", ")}`);

  await api("/api/admin/object-storage/default-buckets/ensure", { method: "POST" }, adminToken);
  pass("default object-storage buckets ensured");

  for (const bucket of buckets) {
    const verified = await api(`/api/admin/object-storage/buckets/${encodeURIComponent(bucket.bucketName)}/verify`, {
      method: "POST"
    }, adminToken);
    if (!verified.roundtripMatched) {
      throw new Error(`Bucket roundtrip mismatch for ${bucket.bucketName}`);
    }
    pass(`bucket verified: ${bucket.bucketName} checksum=${verified.actualChecksumSha256}`);
  }

  const conversation = await api("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: `Object Storage Smoke ${Date.now()}`, type: "GROUP" })
  }, demoToken);
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");

  const formData = new FormData();
  formData.append("file", new Blob([ATTACHMENT_TEXT], { type: "text/plain" }), "object-storage-smoke.txt");
  const attachment = await api(`/api/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData
  }, demoToken);
  const attachmentId = requireValue(attachment.attachmentId, "attachmentId missing");
  pass(`attachment uploaded through object storage: ${attachmentId}`);

  const download = await binary(`/api/attachments/${attachmentId}/download`, {}, demoToken);
  const downloadedText = new TextDecoder().decode(download.bytes);
  if (downloadedText !== ATTACHMENT_TEXT) {
    throw new Error("Downloaded attachment content did not match uploaded bytes.");
  }
  pass(`attachment roundtrip verified: ${attachmentId}`);

  const artifactId = await ensureTaskArtifact(conversationId);
  const snapshotBytes = new TextEncoder().encode(`collab snapshot smoke ${Date.now()}`);
  const roomId = `room-${Date.now()}`;
  await fetch(`${API_BASE_URL}/api/artifacts/${artifactId}/collab-room/v2/snapshot`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${demoToken}`,
      "Content-Type": "application/octet-stream",
      "X-AgentHub-Room-Id": roomId,
      "X-AgentHub-Protocol": "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
      "X-AgentHub-Room-Version": "7"
    },
    body: snapshotBytes
  }).then(async (response) => {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `HTTP ${response.status}`);
    }
    const payload = text ? JSON.parse(text) : null;
    if (payload?.success !== true) {
      throw new Error(payload?.message || "Snapshot upload failed");
    }
  });
  pass(`collab snapshot persisted for artifact ${artifactId}`);

  const snapshotDownload = await binary(`/api/artifacts/${artifactId}/collab-room/v2/snapshot`, {}, demoToken);
  const downloadedSnapshot = new Uint8Array(snapshotDownload.bytes);
  if (downloadedSnapshot.length !== snapshotBytes.length) {
    throw new Error("Downloaded snapshot size mismatch.");
  }
  for (let index = 0; index < snapshotBytes.length; index += 1) {
    if (downloadedSnapshot[index] !== snapshotBytes[index]) {
      throw new Error("Downloaded snapshot bytes mismatch.");
    }
  }
  if (snapshotDownload.headers.get("x-agenthub-storage-provider") !== "S3") {
    throw new Error("Expected snapshot response to report S3 object storage provider.");
  }
  pass(`collab snapshot roundtrip verified for artifact ${artifactId}`);

  console.log("Object-storage smoke completed successfully.");
}

main().catch((error) => fail("Object-storage smoke failed", error));
