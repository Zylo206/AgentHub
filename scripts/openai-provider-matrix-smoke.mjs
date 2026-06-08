#!/usr/bin/env node

const API_BASE_URL = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const MATRIX_JSON = process.env.AGENTHUB_OPENAI_PROVIDER_MATRIX_JSON || "";
const USERNAME = process.env.AGENTHUB_OPENAI_PROVIDER_MATRIX_USERNAME || "demo";
const PASSWORD = process.env.AGENTHUB_OPENAI_PROVIDER_MATRIX_PASSWORD || "demo";
let authToken = "";

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

async function request(path, init = {}) {
  if (!authToken && path !== "/api/auth/login") {
    await login();
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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

async function login() {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });
  authToken = result.token;
}

function loadMatrix() {
  if (!MATRIX_JSON.trim()) {
    throw new Error("AGENTHUB_OPENAI_PROVIDER_MATRIX_JSON is required.");
  }
  const parsed = JSON.parse(MATRIX_JSON);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("AGENTHUB_OPENAI_PROVIDER_MATRIX_JSON must be a non-empty JSON array.");
  }
  return parsed.map((item, index) => ({
    providerName: requireValue(item.providerName, `provider[${index}] providerName missing`),
    baseUrl: requireValue(item.baseUrl, `provider[${index}] baseUrl missing`),
    apiKey: requireValue(item.apiKey, `provider[${index}] apiKey missing`),
    model: requireValue(item.model, `provider[${index}] model missing`),
    scopeType: item.scopeType || "USER"
  }));
}

async function ensureOpenAiAgent() {
  const agents = await request("/api/agents");
  const existing = agents.find((agent) =>
    String(agent.preferredAdapterType || "").toUpperCase() === "OPENAI_COMPATIBLE" &&
    String(agent.name || "").includes("IM API")
  );
  if (existing) {
    return requireValue(getIdValue(existing.id), "existing OPENAI agent id missing");
  }
  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `IM API Matrix Agent ${Date.now()}`,
      systemPrompt: "Return concise Chinese answers using AgentHub artifact JSON with assistantMessage and at least one MARKDOWN artifact when useful.",
      capabilityTags: ["chat", "im-api"],
      toolTags: ["code", "api"],
      preferredAdapterType: "OPENAI_COMPATIBLE"
    })
  });
  return requireValue(getIdValue(agent.id), "created OPENAI agent id missing");
}

async function verifyAdapterAvailable(label) {
  const adapters = await request("/api/adapters");
  const openai = adapters.find((adapter) => adapter.adapterType === "OPENAI_COMPATIBLE");
  if (!openai) {
    throw new Error(`${label}: OPENAI_COMPATIBLE adapter missing`);
  }
  if (openai.status !== "AVAILABLE") {
    throw new Error(`${label}: OPENAI_COMPATIBLE expected AVAILABLE, got ${openai.status}: ${openai.failureReason || ""}`);
  }
  return openai;
}

async function runProviderCase(provider, agentId) {
  await request("/api/adapters/openai-compatible/runtime-config", {
    method: "POST",
    body: JSON.stringify({
      scopeType: provider.scopeType,
      enabled: true,
      providerName: provider.providerName,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model
    })
  });
  pass(`runtime config updated: ${provider.providerName} / ${provider.model}`);

  const adapter = await verifyAdapterAvailable(provider.providerName);
  pass(`adapter available for ${provider.providerName}: ${adapter.status}`);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: `Provider Matrix ${provider.providerName} ${Date.now()}`,
      type: "SINGLE"
    })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  const sentMessage = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `请用一句中文说明当前供应商是 ${provider.providerName}，并确认模型 ${provider.model} 已用于 IM 远程问答。`,
      targetAgentId: agentId,
      mentionedAgentIds: [agentId]
    })
  });
  const messageId = requireValue(getIdValue(sentMessage.id), "messageId missing");

  const replyResult = await request(`/api/conversations/${conversationId}/messages/${messageId}/direct-agent-reply`, {
    method: "POST"
  });
  if (replyResult.fallbackUsed) {
    throw new Error(`${provider.providerName}: direct IM reply unexpectedly used fallback.`);
  }
  if (replyResult.actualAdapterType !== "OPENAI_COMPATIBLE") {
    throw new Error(`${provider.providerName}: expected OPENAI_COMPATIBLE direct reply, got ${replyResult.actualAdapterType}`);
  }
  const replyMessageId = requireValue(getIdValue(replyResult.message?.id), "reply message id missing");
  const messages = await request(`/api/conversations/${conversationId}/messages`);
  const replyMessage = messages.find((message) => getIdValue(message.id) === replyMessageId);
  if (!replyMessage || !String(replyMessage.content || "").trim()) {
    throw new Error(`${provider.providerName}: direct reply message content missing.`);
  }
  pass(`IM direct reply verified: ${provider.providerName} -> ${replyMessageId}`);

  if (Array.isArray(replyResult.producedArtifactIds) && replyResult.producedArtifactIds.length > 0) {
    const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
    const missingArtifacts = replyResult.producedArtifactIds.filter(
      (artifactId) => !artifacts.some((artifact) => getIdValue(artifact.id) === artifactId)
    );
    if (missingArtifacts.length > 0) {
      throw new Error(`${provider.providerName}: missing produced artifacts ${missingArtifacts.join(", ")}`);
    }
    pass(`artifact persistence verified: ${provider.providerName} -> ${replyResult.producedArtifactIds.length}`);
  }
}

async function main() {
  const matrix = loadMatrix();
  await login();
  const agentId = await ensureOpenAiAgent();
  pass(`OPENAI-compatible IM agent ready: ${agentId}`);
  for (const provider of matrix) {
    await runProviderCase(provider, agentId);
  }
  console.log("OpenAI-compatible provider matrix smoke completed successfully.");
}

main().catch((error) => fail("OpenAI-compatible provider matrix smoke failed", error));
