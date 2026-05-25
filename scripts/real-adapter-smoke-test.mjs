#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const REQUIRED_ENV = [
  "AGENTHUB_OPENAI_ENABLED",
  "AGENTHUB_OPENAI_BASE_URL",
  "AGENTHUB_OPENAI_API_KEY",
  "AGENTHUB_OPENAI_MODEL",
  "AGENTHUB_ARTIFACT_GENERATION_MODE"
];

const DEMO_PROMPT =
  "Generate a React login page artifact with email login and verification-code login. Return AgentHub artifact JSON only.";

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

function assertRequiredEnvironment() {
  const missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());
  if (missing.length > 0) {
    throw new Error(`missing required environment variables: ${missing.join(", ")}`);
  }
  if (process.env.AGENTHUB_OPENAI_ENABLED !== "true") {
    throw new Error("AGENTHUB_OPENAI_ENABLED must be true for real adapter smoke.");
  }
  if (process.env.AGENTHUB_OPENAI_FIXTURE_ENABLED === "true") {
    throw new Error("AGENTHUB_OPENAI_FIXTURE_ENABLED must not be true; fixture mode is not a real provider test.");
  }
  if (process.env.AGENTHUB_ARTIFACT_GENERATION_MODE !== "REAL_FIRST") {
    throw new Error("AGENTHUB_ARTIFACT_GENERATION_MODE must be REAL_FIRST for this smoke test.");
  }
}

async function request(path, init = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
  } catch (error) {
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend first. ${error.message}`);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 160)}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  if (!payload) {
    throw new Error(`Empty response from ${path}`);
  }
  if (payload.success !== true) {
    throw new Error(payload.message || payload.errorCode || `API failure from ${path}`);
  }

  return payload.data;
}

function parseArtifactJson(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    throw new Error("adapter response content is empty");
  }
  if (raw.startsWith("```")) {
    throw new Error("adapter response is wrapped in a Markdown code fence; expected raw JSON only");
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`adapter response is not valid JSON: ${error.message}`);
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("adapter response JSON root must be an object");
  }
  if (typeof payload.assistantMessage !== "string" || !payload.assistantMessage.trim()) {
    throw new Error("adapter response JSON missing assistantMessage");
  }
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    throw new Error("adapter response JSON missing non-empty artifacts[]");
  }
  payload.artifacts.forEach((artifact, index) => {
    for (const field of ["title", "type", "language", "content", "summary"]) {
      if (typeof artifact?.[field] !== "string" || !artifact[field].trim()) {
        throw new Error(`artifact[${index}] missing ${field}`);
      }
    }
    if (artifact.type === "CODE" && artifact.content.trim().startsWith("```")) {
      throw new Error(`artifact[${index}] CODE content must be raw source, not Markdown fenced`);
    }
  });
  return payload;
}

async function assertOpenAiAdapterAvailable() {
  const adapters = await request("/api/adapters");
  if (!Array.isArray(adapters)) {
    throw new Error("/api/adapters did not return an array");
  }
  const openai = adapters.find((adapter) => adapter.adapterType === "OPENAI_COMPATIBLE");
  if (!openai) {
    throw new Error("OPENAI_COMPATIBLE adapter is missing from /api/adapters");
  }
  if (openai.status !== "AVAILABLE") {
    throw new Error(`OPENAI_COMPATIBLE expected AVAILABLE, got ${openai.status}: ${openai.failureReason || openai.description || ""}`);
  }
  if (String(openai.description || "").toLowerCase().includes("fixture")) {
    throw new Error("OPENAI_COMPATIBLE appears to be fixture-backed; this script requires a real provider.");
  }
  pass("OPENAI_COMPATIBLE adapter available");
}

async function executeOpenAiAdapter() {
  const response = await request("/api/adapters/OPENAI_COMPATIBLE/execute", {
    method: "POST",
    body: JSON.stringify({
      conversationId: "real-adapter-smoke-conversation",
      taskRunId: "real-adapter-smoke-run",
      taskStepId: "real-adapter-smoke-step",
      agentId: "real_adapter_smoke_agent",
      agentName: "Real Adapter Smoke Agent",
      userInput: DEMO_PROMPT,
      systemPrompt:
        "You are validating AgentHub real adapter integration. Return raw JSON only using assistantMessage and artifacts[].",
      taskDescription: "Validate OpenAI-compatible provider artifact JSON contract.",
      contextItems: ["This is an opt-in real provider smoke test. Do not use Markdown fences."],
      artifactSummaries: ["Expected: one CODE artifact for LoginPage.tsx"],
      metadata: {
        source: "real-adapter-smoke-test",
        requireRealProvider: true
      }
    })
  });

  if (response.actualAdapterType !== "OPENAI_COMPATIBLE") {
    throw new Error(`expected actualAdapterType=OPENAI_COMPATIBLE, got ${response.actualAdapterType}`);
  }
  if (response.fallbackUsed) {
    throw new Error(`adapter execution used fallback: ${response.errorMessage || "no reason"}`);
  }
  if (response.status !== "COMPLETED") {
    throw new Error(`adapter execution expected COMPLETED, got ${response.status}: ${response.errorMessage || ""}`);
  }
  parseArtifactJson(response.content);
  pass("OPENAI_COMPATIBLE execute returned valid artifact JSON");
}

async function createOpenAiAgent(name, toolTags) {
  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `${name} ${Date.now()}`,
      systemPrompt:
        "Return AgentHub artifact JSON only. Include assistantMessage and artifacts[] with title, type, language, content, and summary.",
      capabilityTags: ["real-adapter", "smoke"],
      toolTags,
      preferredAdapterType: "OPENAI_COMPATIBLE"
    })
  });
  return requireValue(getIdValue(agent.id), `${name} id missing`);
}

async function runDemoTaskWithRealAdapter() {
  const codeAgentId = await createOpenAiAgent("Real OpenAI Code Agent", ["code", "preview"]);
  const reviewAgentId = await createOpenAiAgent("Real OpenAI Review Agent", ["review"]);
  pass(`real adapter agents created: ${codeAgentId}, ${reviewAgentId}`);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: "Real Adapter Smoke Conversation",
      type: "GROUP"
    })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  pass(`conversation created: ${conversationId}`);

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: DEMO_PROMPT,
      targetAgentId: codeAgentId,
      mentionedAgentIds: [codeAgentId, reviewAgentId]
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");
  pass(`message sent: ${messageId}`);

  const taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: DEMO_PROMPT,
      selectedAgentId: codeAgentId
    })
  });
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  if (taskRun.status !== "COMPLETED") {
    throw new Error(`demo task expected COMPLETED, got ${taskRun.status}`);
  }
  pass(`demo task completed: ${taskRunId}`);

  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  const acceptedRealStep = steps.find(
    (step) => step.actualAdapterType === "OPENAI_COMPATIBLE" &&
      step.realOutputUsed === true &&
      step.artifactQualityStatus === "ACCEPTED"
  );
  if (!acceptedRealStep) {
    throw new Error(
      `no TaskStep accepted real OPENAI_COMPATIBLE output. steps=${steps
        .map((step) => `${step.stepOrder}:${step.actualAdapterType}:${step.realOutputUsed}:${step.artifactQualityStatus}:${step.artifactQualityReason}`)
        .join(" | ")}`
    );
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  if (!Array.isArray(artifacts)) {
    throw new Error("artifacts response is not an array");
  }
  const realArtifacts = artifacts.filter((artifact) => artifact.sourceKind === "REAL_ADAPTER");
  if (realArtifacts.length === 0) {
    throw new Error("expected at least one REAL_ADAPTER artifact");
  }
  const acceptedPrimary = realArtifacts.find((artifact) => artifact.qualityStatus === "ACCEPTED");
  if (!acceptedPrimary) {
    throw new Error(`no REAL_ADAPTER artifact passed quality checks: ${JSON.stringify(realArtifacts.slice(0, 3))}`);
  }
  if (!acceptedPrimary.sourceAdapterType || acceptedPrimary.sourceAdapterType !== "OPENAI_COMPATIBLE") {
    throw new Error(`expected sourceAdapterType=OPENAI_COMPATIBLE, got ${acceptedPrimary.sourceAdapterType}`);
  }
  if (String(acceptedPrimary.content || "").includes("# Real Adapter Output") || String(acceptedPrimary.content || "").includes("Persisted Because:")) {
    throw new Error("REAL_ADAPTER primary artifact content is wrapped with adapter metadata");
  }
  const archivedFallbacks = artifacts.filter(
    (artifact) => artifact.status === "ARCHIVED" && String(artifact.generationMode || "").includes("REAL_FIRST_STATIC_FALLBACK")
  );
  if (archivedFallbacks.length === 0) {
    throw new Error("REAL_FIRST expected static template fallback artifacts to be archived");
  }
  pass(`REAL_FIRST accepted primary artifact: ${acceptedPrimary.title}`);
  pass(`static fallback archived: ${archivedFallbacks.length}`);
}

async function run() {
  console.log(`AgentHub real adapter smoke target: ${API_BASE}`);
  assertRequiredEnvironment();

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }
  pass("health check");

  await assertOpenAiAdapterAvailable();
  await executeOpenAiAdapter();
  await runDemoTaskWithRealAdapter();
  console.log("Real adapter smoke test completed successfully.");
}

run().catch((error) => {
  fail("real adapter smoke test failed", error);
});
