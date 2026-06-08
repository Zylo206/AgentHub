import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const API_BASE = process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080";
const DOC_COLLAB_WS_BASE = process.env.DOC_COLLAB_WS_BASE_URL || "ws://127.0.0.1:8091";

const requireFromDocCollab = createRequire(path.resolve("doc-collab/package.json"));

let Y;
let WebSocket;
try {
  Y = requireFromDocCollab("yjs");
  WebSocket = requireFromDocCollab("ws");
} catch (error) {
  fail(`doc-collab dependencies are missing. Run "cd doc-collab && npm install" first. ${error.message}`);
}

function log(message) {
  console.log(`[INFO] ${message}`);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

function idValue(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value.value || "";
}

async function api(pathname, options = {}, token = null) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload.data;
}

async function login(username = "demo", password = "demo") {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  return result.token;
}

async function waitFor(condition, description, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await condition();
    if (result) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function ensureArtifact(token) {
  if (process.env.AGENTHUB_COLLAB_SMOKE_ARTIFACT_ID) {
    const artifact = await api(`/api/artifacts/${process.env.AGENTHUB_COLLAB_SMOKE_ARTIFACT_ID}`, {}, token);
    return artifact;
  }
  const conversation = await api("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Collab V2 Smoke", type: "GROUP" })
  }, token);
  const conversationId = idValue(conversation.id);
  const message = await api(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "Generate a small React login component for collaboration smoke.",
      mentionedAgentIds: []
    })
  }, token);
  await api(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId: idValue(message.id),
      userInput: "Generate a small React login component for collaboration smoke."
    })
  }, token);
  const artifact = await waitFor(async () => {
    const artifacts = await api(`/api/conversations/${conversationId}/artifacts`, {}, token);
    return artifacts.find((item) => item.type === "CODE" || item.type === "MARKDOWN") || null;
  }, "CODE or MARKDOWN artifact");
  return artifact;
}

function encodeUpdate(update) {
  const frame = new Uint8Array(update.length + 1);
  frame[0] = 1;
  frame.set(update, 1);
  return frame;
}

function decodeBase64(value) {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

async function connectClient(name, artifactId, token) {
  const doc = new Y.Doc();
  const text = doc.getText("content");
  let socket;
  let ready = false;
  let remote = false;
  const url = `${DOC_COLLAB_WS_BASE.replace(/\/$/, "")}/rooms/${encodeURIComponent(artifactId)}?access_token=${encodeURIComponent(token)}&deviceId=${encodeURIComponent(name)}`;

  await new Promise((resolve, reject) => {
    socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    const timer = setTimeout(() => reject(new Error(`${name} connect timeout`)), 10000);
    socket.on("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on("error", reject);
  });

  doc.on("update", (update) => {
    if (!remote && socket.readyState === WebSocket.OPEN) {
      socket.send(encodeUpdate(update));
    }
  });

  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      const frame = new Uint8Array(data);
      if (frame[0] === 1) {
        remote = true;
        Y.applyUpdate(doc, frame.slice(1));
        remote = false;
      }
      return;
    }
    const payload = JSON.parse(String(data));
    if (payload.type === "COLLAB_ERROR") {
      throw new Error(payload.message);
    }
    if (payload.yjsUpdateBase64) {
      remote = true;
      Y.applyUpdate(doc, decodeBase64(payload.yjsUpdateBase64));
      remote = false;
      ready = true;
    }
  });

  await waitFor(() => ready, `${name} room state`, 10000);
  return {
    name,
    doc,
    text,
    socket,
    content: () => text.toString(),
    insert: (index, value) => {
      doc.transact(() => text.insert(index, value));
    },
    close: () => socket.close()
  };
}

async function createAndApprovePublish(token, artifact, content, roomVersion) {
  const artifactId = idValue(artifact.id);
  const conversationId = idValue(artifact.conversationId);
  const approval = await api(`/api/conversations/${conversationId}/approval-requests`, {
    method: "POST",
    body: JSON.stringify({
      actionType: "PUBLISH_COLLAB_DRAFT",
      targetType: "ARTIFACT",
      targetId: artifactId,
      riskLevel: "HIGH",
      summary: "Collab smoke publish",
      affectedItems: [`Artifact: ${artifact.title}`, `Room version: ${roomVersion}`]
    })
  }, token);
  await api(`/api/approval-requests/${approval.approvalId}/approve`, { method: "POST" }, token);
  return api(`/api/artifacts/${artifactId}/collab-room/publish`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: approval.approvalId,
      summary: "Collab smoke publish",
      protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
      roomVersion,
      content
    })
  }, token);
}

async function main() {
  log(`API ${API_BASE}`);
  log(`Doc collab ${DOC_COLLAB_WS_BASE}`);
  const token = await login();
  pass("demo login");
  const artifact = await ensureArtifact(token);
  const artifactId = idValue(artifact.id);
  pass(`artifact ready: ${artifact.title} / ${artifactId}`);

  const left = await connectClient("collab-left", artifactId, token);
  const right = await connectClient("collab-right", artifactId, token);
  pass("two V2 clients joined");

  left.insert(0, "/* collab-left */\n");
  right.insert(right.text.length, "\n/* collab-right */");
  await waitFor(() => {
    const leftContent = left.content();
    const rightContent = right.content();
    return leftContent.includes("collab-left")
      && leftContent.includes("collab-right")
      && leftContent === rightContent;
  }, "two-client convergence");
  pass("concurrent edits converged");

  right.close();
  left.insert(left.text.length, "\n/* reconnect-proof */");
  const reconnected = await connectClient("collab-right-reconnect", artifactId, token);
  await waitFor(() => reconnected.content().includes("reconnect-proof"), "reconnect recovery");
  pass("reconnect recovered latest Yjs state");

  const published = await createAndApprovePublish(token, artifact, left.content(), left.text.length);
  if (!idValue(published.id)) {
    fail("publish did not return an Artifact revision");
  }
  pass(`published collaborative draft as revision: ${published.title} v${published.version}`);

  left.close();
  reconnected.close();
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
