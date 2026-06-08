import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const DOC_COLLAB_CLUSTER_URLS = (process.env.DOC_COLLAB_CLUSTER_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const API_BASE = process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080";
let artifactId = process.env.AGENTHUB_COLLAB_SMOKE_ARTIFACT_ID || "";
let token = process.env.AGENTHUB_COLLAB_SMOKE_TOKEN || "";

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message) {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

if (DOC_COLLAB_CLUSTER_URLS.length < 2) {
  console.log("[SKIP] Set DOC_COLLAB_CLUSTER_URLS to at least two doc-collab nodes to run cluster smoke.");
  process.exit(0);
}

const requireFromDocCollab = createRequire(path.resolve("doc-collab/package.json"));
let Y;
let WebSocket;
try {
  Y = requireFromDocCollab("yjs");
  WebSocket = requireFromDocCollab("ws");
} catch (error) {
  fail(`doc-collab dependencies are missing. Run "cd doc-collab && npm install" first. ${error.message}`);
}

function frame(update) {
  const output = new Uint8Array(update.length + 1);
  output[0] = 1;
  output.set(update, 1);
  return output;
}

function decodeBase64(value) {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

function idValue(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value.value || "";
}

async function api(pathname, options = {}, bearerToken = null) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
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

async function login() {
  const result = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "demo", password: "demo" })
  });
  return result.token;
}

async function waitFor(condition, description, timeoutMs = 60000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await condition();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function ensureArtifact() {
  if (!token) {
    token = await login();
  }
  if (artifactId) {
    return;
  }
  const conversation = await api("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Collab V2 Cluster Smoke", type: "GROUP" })
  }, token);
  const conversationId = idValue(conversation.id);
  const message = await api(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "Generate a short Markdown collaboration cluster smoke document.",
      mentionedAgentIds: []
    })
  }, token);
  await api(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId: idValue(message.id),
      userInput: "Generate a short Markdown collaboration cluster smoke document."
    })
  }, token);
  const artifact = await waitFor(async () => {
    const artifacts = await api(`/api/conversations/${conversationId}/artifacts`, {}, token);
    return artifacts.find((item) => item.type === "CODE" || item.type === "MARKDOWN") || null;
  }, "cluster smoke artifact");
  artifactId = idValue(artifact.id);
  pass(`cluster artifact ready: ${artifact.title} / ${artifactId}`);
}

function healthUrl(webSocketUrl) {
  const url = new URL(webSocketUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/health";
  url.search = "";
  return url.toString();
}

async function waitForNodes() {
  for (const nodeUrl of DOC_COLLAB_CLUSTER_URLS) {
    await waitFor(async () => {
      try {
        const response = await fetch(healthUrl(nodeUrl));
        const payload = await response.json();
        return response.ok && payload.status === "UP";
      } catch {
        return false;
      }
    }, `doc-collab node ${nodeUrl}`);
  }
}

async function connect(index) {
  const doc = new Y.Doc();
  const text = doc.getText("content");
  const base = DOC_COLLAB_CLUSTER_URLS[index % DOC_COLLAB_CLUSTER_URLS.length].replace(/\/$/, "");
  const socket = new WebSocket(`${base}/rooms/${encodeURIComponent(artifactId)}?access_token=${encodeURIComponent(token)}&deviceId=cluster-${index}`);
  let ready = false;
  let remote = false;
  doc.on("update", (update) => {
    if (!remote && socket.readyState === WebSocket.OPEN) {
      socket.send(frame(update));
    }
  });
  socket.on("error", (error) => fail(`client ${index} socket error: ${error.message}`));
  socket.on("message", (data, isBinary) => {
    if (isBinary) {
      const incoming = new Uint8Array(data);
      if (incoming[0] === 1) {
        remote = true;
        Y.applyUpdate(doc, incoming.slice(1));
        remote = false;
      }
      return;
    }
    const payload = JSON.parse(String(data));
    if (payload.type === "COLLAB_ERROR") {
      fail(`client ${index} join failed: ${payload.message}`);
    }
    if (payload.yjsUpdateBase64) {
      remote = true;
      Y.applyUpdate(doc, decodeBase64(payload.yjsUpdateBase64));
      remote = false;
      ready = true;
    }
  });
  await waitFor(() => ready, `client ${index} join`);
  return { doc, text, socket };
}

await waitForNodes();
await ensureArtifact();
const clients = [];
for (let index = 0; index < 20; index += 1) {
  clients.push(await connect(index));
}

for (let index = 0; index < clients.length; index += 1) {
  const marker = `\n/* cluster-client-${index} */`;
  clients[index].doc.transact(() => clients[index].text.insert(clients[index].text.length, marker));
}

const converged = await waitFor(() => {
  const values = clients.map((client) => client.text.toString());
  const first = values[0];
  return values.every((value) => value === first)
    && Array.from({ length: 20 }).every((_, index) => first.includes(`cluster-client-${index}`));
}, "20-client cluster convergence").catch(() => false);

if (!converged) {
  const markerCounts = clients.map((client) => {
    const content = client.text.toString();
    return Array.from({ length: 20 }).filter((_, index) => content.includes(`cluster-client-${index}`)).length;
  });
  fail(`20-client cluster convergence failed; marker counts per client: ${markerCounts.join(",")}`);
}

clients.forEach((client) => client.socket.close());
pass("20 clients converged across configured doc-collab nodes");
