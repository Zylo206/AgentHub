#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const EXPECT_STREAMING = process.env.AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING === "true";
const REQUIRE_REAL_CLI = process.env.AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI === "true";
let authToken = "";

const DEMO_PROMPT =
  "Generate a React login page artifact with email login and verification-code login. Return AgentHub artifact JSON only.";

const OUTCOME = {
  ACCEPTED: "ACCEPTED",
  PARSE_FAILED: "PARSE_FAILED",
  QUALITY_FAILED: "QUALITY_FAILED",
  BUILD_FAILED: "BUILD_FAILED",
  FALLBACK: "FALLBACK",
  NOT_INSTALLED: "NOT_INSTALLED",
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  TIMEOUT: "TIMEOUT",
  CONTRACT_INVALID: "CONTRACT_INVALID",
  CANCELLED: "CANCELLED"
};

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

function smokeError(outcome, message) {
  return new Error(`[${outcome}] ${message}`);
}

function classifyDiagnostic(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized.trim()) {
    return null;
  }
  if (normalized.includes("failuretype=not_installed") || normalized.includes("not available on path") || normalized.includes("cannot run program")) {
    return OUTCOME.NOT_INSTALLED;
  }
  if (normalized.includes("failuretype=not_authenticated") || normalized.includes("not authenticated") || normalized.includes("unauthorized")) {
    return OUTCOME.NOT_AUTHENTICATED;
  }
  if (normalized.includes("failuretype=permission_denied") || normalized.includes("permission denied") || normalized.includes("access is denied")) {
    return OUTCOME.PERMISSION_DENIED;
  }
  if (normalized.includes("failuretype=timeout") || normalized.includes("timed out") || normalized.includes("timeout")) {
    return OUTCOME.TIMEOUT;
  }
  if (normalized.includes("failuretype=cancelled") || normalized.includes("cancelled")) {
    return OUTCOME.CANCELLED;
  }
  if (normalized.includes("failuretype=contract_invalid")) {
    return OUTCOME.CONTRACT_INVALID;
  }
  if (
    normalized.includes("parse_failed") ||
    normalized.includes("artifact json schema validation") ||
    normalized.includes("artifact contract") ||
    normalized.includes("not valid json") ||
    normalized.includes("invalid json") ||
    normalized.includes("json output") ||
    normalized.includes("markdown fence")
  ) {
    return OUTCOME.PARSE_FAILED;
  }
  if (normalized.includes("build_failed") || normalized.includes("buildvalidationstatus=failed") || (normalized.includes("build validation") && normalized.includes("failed"))) {
    return OUTCOME.BUILD_FAILED;
  }
  if (normalized.includes("quality_failed") || normalized.includes("qualitystatus=rejected") || normalized.includes("quality checks") || normalized.includes("rejected")) {
    return OUTCOME.QUALITY_FAILED;
  }
  if (normalized.includes("fallback") || normalized.includes("fallback_used")) {
    return OUTCOME.FALLBACK;
  }
  return null;
}

function assertDescriptorCapabilities(descriptor) {
  const modes = Array.isArray(descriptor.supportedModes) ? descriptor.supportedModes : [];
  const policies = Array.isArray(descriptor.safetyPolicies) ? descriptor.safetyPolicies : [];
  const details = descriptor.capabilityDetails && typeof descriptor.capabilityDetails === "object"
    ? descriptor.capabilityDetails
    : {};

  if (!modes.includes("headless") || !modes.includes("artifact-only") || !modes.includes("exec")) {
    throw new Error(`CODEX descriptor missing headless/artifact-only/exec modes: ${modes.join(", ")}`);
  }
  if (!modes.includes("agenthub-session-bridge")) {
    throw new Error(`CODEX descriptor missing agenthub-session-bridge mode: ${modes.join(", ")}`);
  }
  if (!policies.some((policy) => String(policy).includes("workspace-write-disabled"))) {
    throw new Error(`CODEX descriptor missing workspace-write-disabled policy: ${policies.join(" | ")}`);
  }
  if (!policies.some((policy) => String(policy).includes("sandbox=read-only"))) {
    throw new Error(`CODEX descriptor missing read-only sandbox policy: ${policies.join(" | ")}`);
  }
  if (!policies.some((policy) => String(policy).includes("agenthub-managed-session-context"))) {
    throw new Error(`CODEX descriptor missing AgentHub session context policy: ${policies.join(" | ")}`);
  }
  if (details.adapterMode !== "HEADLESS_ARTIFACT_ONLY") {
    throw new Error(`CODEX adapterMode expected HEADLESS_ARTIFACT_ONLY, got ${details.adapterMode || "missing"}`);
  }
  if (details.externalCliSessionSupport !== true || details.externalCliSessionMode !== "AGENTHUB_CONTEXT_BRIDGE") {
    throw new Error(`CODEX descriptor missing external CLI session bridge details: ${JSON.stringify(details)}`);
  }
  if (details.workspaceWriteAllowed !== false) {
    throw new Error("CODEX descriptor must report workspaceWriteAllowed=false");
  }
  if (!details.cliPath) {
    throw new Error("CODEX descriptor missing cliPath capability detail");
  }
  if (REQUIRE_REAL_CLI) {
    if (details.availabilityProbe === "fixture") {
      throw new Error("AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true forbids fixture mode");
    }
    if (details.versionProbeStatus !== "PASSED") {
      throw new Error(`CODEX real CLI version probe did not pass: ${details.versionProbeFailure || "no reason"}`);
    }
    if (details.helpProbeStatus !== "PASSED") {
      throw new Error(`CODEX real CLI help probe did not pass: ${details.helpProbeFailure || "no reason"}`);
    }
    if (
      details.supportsExec !== true ||
      details.supportsOutputSchema !== true ||
      details.supportsOutputLastMessage !== true ||
      details.supportsSandbox !== true
    ) {
      throw new Error(`CODEX real CLI missing required exec/schema/output/sandbox support: ${JSON.stringify(details)}`);
    }
    if (EXPECT_STREAMING && details.supportsJsonEvents !== true) {
      throw new Error(`CODEX streaming smoke requires --json event support: ${JSON.stringify(details)}`);
    }
  }
  pass(`CODEX descriptor capabilities verified: modes=${modes.join(", ")}`);
}

function classifiedError(message, diagnostic, fallbackOutcome = OUTCOME.FALLBACK) {
  return smokeError(classifyDiagnostic(diagnostic) || fallbackOutcome, message);
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

function requireValue(value, message) {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

async function request(path, options = {}) {
  if (!authToken && path !== "/api/auth/login") {
    await loginForSmoke();
  }
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  if (body && Object.prototype.hasOwnProperty.call(body, "success")) {
    if (!body.success) {
      throw new Error(`${path} ApiResponse failed: ${body.message || text}`);
    }
    return body.data;
  }
  return body;
}

async function loginForSmoke() {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "demo", password: "demo" })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true || !payload?.data?.token) {
    throw new Error(payload?.message || `Codex smoke auth login failed: HTTP ${response.status}`);
  }
  authToken = payload.data.token;
}

function parseJsonValue(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseSseBlock(block) {
  const lines = block.split(/\r?\n/);
  const event = { eventId: "", eventType: "message", data: "" };
  for (const line of lines) {
    if (line.startsWith("id:")) {
      event.eventId = line.slice("id:".length).trim();
    } else if (line.startsWith("event:")) {
      event.eventType = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      event.data += line.slice("data:".length).trim();
    }
  }
  return event;
}

function parseSseEventData(event) {
  const payload = parseJsonValue(event.data);
  if (!payload || typeof payload !== "object") {
    return event;
  }
  return {
    ...event,
    resourceId: payload.resourceId || event.resourceId || "",
    payload: payload.payload || {},
    resourceType: payload.resourceType || event.resourceType || "",
    taskRunId: payload.taskRunId || payload.payload?.taskRunId || event.taskRunId || payload.resourceId || "",
    taskStepId: payload.taskStepId || payload.payload?.taskStepId || event.taskStepId || "",
    adapterType: payload.adapterType || payload.payload?.adapterType || event.adapterType || "",
    chunk: payload.chunk || payload.payload?.chunk || ""
  };
}

async function collectRealtimeEvents(conversationId, expectedEventTypes, trigger) {
  if (!authToken) {
    await loginForSmoke();
  }
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/events`, {
    signal: controller.signal,
    headers: {
      Accept: "text/event-stream",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE stream failed: HTTP ${response.status}`);
  }

  const seen = new Set();
  const events = [];
  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  const readerPromise = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        let parsed = parseSseBlock(block);
        if (!parsed.eventType || parsed.eventType === "HEARTBEAT") {
          continue;
        }
        parsed = parseSseEventData(parsed);
        events.push(parsed);
        seen.add(parsed.eventType);
        if (expectedEventTypes.every((eventType) => seen.has(eventType))) {
          controller.abort();
          return;
        }
      }
    }
  })();

  const triggered = await trigger();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Timed out waiting for SSE events. Seen: ${events.map((event) => event.eventType).join(", ")}`)),
      15000
    );
  });

  try {
    await Promise.race([readerPromise, timeoutPromise]);
  } catch (error) {
    if (error.name !== "AbortError") {
      throw error;
    }
  } finally {
    controller.abort();
  }

  const missing = expectedEventTypes.filter((eventType) => !seen.has(eventType));
  if (missing.length > 0) {
    throw new Error(`Missing SSE event types: ${missing.join(", ")}. Seen: ${events.map((event) => event.eventType).join(", ")}`);
  }

  return { triggered, events };
}

function assertArtifactJsonContract(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw smokeError(OUTCOME.PARSE_FAILED, `Codex adapter content was not valid JSON: ${error.message}`);
  }
  if (!parsed.assistantMessage || !Array.isArray(parsed.artifacts) || parsed.artifacts.length < 1) {
    throw smokeError(OUTCOME.PARSE_FAILED, "Codex adapter content did not match AgentHub artifact contract.");
  }
  const invalid = parsed.artifacts.find(
    (artifact) =>
      !artifact.title ||
      !artifact.type ||
      !artifact.language ||
      !artifact.content ||
      !artifact.summary
  );
  if (invalid) {
    throw smokeError(OUTCOME.PARSE_FAILED, `Codex artifact is missing required fields: ${JSON.stringify(invalid).slice(0, 300)}`);
  }
  pass(`${OUTCOME.ACCEPTED}: adapter execute returned artifact JSON: ${parsed.artifacts.length} artifact(s)`);
}

function describeTaskStep(step) {
  return [
    step.stepOrder,
    step.actualAdapterType || "-",
    `realOutputUsed=${step.realOutputUsed}`,
    `parse=${step.artifactParseStatus || "-"}`,
    `build=${step.artifactBuildValidationStatus || "-"}`,
    `quality=${step.artifactQualityStatus || "-"}`,
    `qualityReason=${step.artifactQualityReason || "-"}`,
    `adapterError=${step.adapterErrorMessage || "-"}`
  ].join(":");
}

function assertStreamingEvents(taskRunId, events) {
  const streamEvents = events.filter((event) => {
    const payload = event.payload || {};
    const chunk = String(payload.chunk || event.chunk || "").trim();
    const adapterType = String(payload.adapterType || event.adapterType || "");
    const eventTaskRunId = String(payload.taskRunId || event.taskRunId || "");
    return event.eventType === "ADAPTER_STREAM_CHUNK"
      && chunk
      && adapterType === "CODEX"
      && (!taskRunId || !eventTaskRunId || eventTaskRunId === taskRunId);
  });
  if (streamEvents.length < 1) {
    throw new Error(`expected CODEX ADAPTER_STREAM_CHUNK event for taskRun=${taskRunId}`);
  }
  pass(`Codex streaming chunk event observed: ${streamEvents.length}`);
}

function assertCodexArtifact(artifact) {
  if (artifact.sourceKind !== "REAL_ADAPTER") {
    throw classifiedError(`sourceKind expected REAL_ADAPTER, got ${artifact.sourceKind}`, JSON.stringify(artifact), OUTCOME.FALLBACK);
  }
  if (artifact.sourceAdapterType !== "CODEX") {
    throw classifiedError(`sourceAdapterType expected CODEX, got ${artifact.sourceAdapterType}`, JSON.stringify(artifact), OUTCOME.FALLBACK);
  }
  if (artifact.generationMode !== "REAL_FIRST") {
    throw classifiedError(`generationMode expected REAL_FIRST, got ${artifact.generationMode}`, JSON.stringify(artifact), OUTCOME.FALLBACK);
  }
  if (artifact.qualityStatus !== "ACCEPTED") {
    throw classifiedError(
      `qualityStatus expected ACCEPTED, got ${artifact.qualityStatus}`,
      JSON.stringify(artifact),
      OUTCOME.QUALITY_FAILED
    );
  }
  requireValue(artifact.content, "REAL_ADAPTER artifact content missing");
}

async function runDemoTask(conversationId, messageId, agentId) {
  const runRequest = () => request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: DEMO_PROMPT,
      selectedAgentId: agentId
    })
  });

  if (!EXPECT_STREAMING) {
    return { taskRun: await runRequest(), events: [] };
  }

  const { triggered, events } = await collectRealtimeEvents(
    conversationId,
    ["TASK_RUN_CREATED", "TASK_RUN_UPDATED", "ADAPTER_STREAM_CHUNK"],
    runRequest
  );
  return { taskRun: triggered, events };
}

async function run() {
  console.log(`AgentHub Codex smoke target: ${API_BASE}`);
  console.log(`Codex streaming assertion: ${EXPECT_STREAMING ? "enabled" : "disabled"}`);
  console.log(`Backend Codex streaming flag: ${process.env.AGENTHUB_CODEX_STREAMING_ENABLED || "false"}`);

  await request("/api/health");
  pass("health check");

  const adapters = await request("/api/adapters");
  const codex = adapters.find((adapter) => adapter.adapterType === "CODEX");
  if (!codex) {
    throw new Error("CODEX adapter is missing from /api/adapters.");
  }
  if (codex.status !== "AVAILABLE") {
    throw new Error(`CODEX expected AVAILABLE, got ${codex.status}: ${codex.failureReason || codex.description || ""}`);
  }
  pass(`CODEX adapter available: ${codex.description}`);
  assertDescriptorCapabilities(codex);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Codex Smoke Conversation", type: "GROUP" })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  pass(`conversation created: ${conversationId}`);

  const executeResponse = await request("/api/adapters/CODEX/execute", {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      taskRunId: "codex_smoke_execute_run",
      taskStepId: "codex_smoke_execute_step",
      agentId: "codex_smoke_agent",
      agentName: "Codex Smoke Agent",
      userInput: DEMO_PROMPT,
      systemPrompt: "Return AgentHub artifact JSON only.",
      taskDescription: "Generate a React login page artifact.",
      contextItems: [],
      artifactSummaries: [],
      metadata: { requiredSkill: "frontend" }
    })
  });
  if (executeResponse.status !== "COMPLETED") {
    throw classifiedError(
      `adapter execute expected COMPLETED, got ${executeResponse.status}: ${executeResponse.errorMessage || ""}`,
      `${executeResponse.errorMessage || ""}\n${executeResponse.content || ""}`
    );
  }
  if (executeResponse.actualAdapterType && executeResponse.actualAdapterType !== "CODEX") {
    throw classifiedError(
      `adapter execute expected actualAdapterType=CODEX, got ${executeResponse.actualAdapterType}`,
      `${executeResponse.errorMessage || ""}\n${executeResponse.content || ""}`
    );
  }
  if (executeResponse.fallbackUsed) {
    throw classifiedError(
      "adapter execute used fallback; expected direct CODEX output",
      `${executeResponse.errorMessage || ""}\n${executeResponse.content || ""}`
    );
  }
  assertArtifactJsonContract(executeResponse.content);

  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `Codex Smoke Agent ${Date.now()}`,
      role: "CUSTOM",
      systemPrompt: "Return AgentHub artifact JSON only.",
      capabilityTags: ["codex", "smoke"],
      toolTags: ["code", "preview"],
      preferredAdapterType: "CODEX"
    })
  });
  const agentId = requireValue(getIdValue(agent.id), "agentId missing");
  pass(`Codex custom agent created: ${agentId}`);

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: DEMO_PROMPT,
      targetAgentId: agentId,
      mentionedAgentIds: [agentId]
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");
  pass(`message sent: ${messageId}`);

  const { taskRun, events } = await runDemoTask(conversationId, messageId, agentId);
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  pass(`demo task completed: ${taskRunId}, status=${taskRun.status}`);
  if (!["COMPLETED", "BLOCKED"].includes(taskRun.status)) {
    throw classifiedError(
      `demo task expected COMPLETED or BLOCKED with explainable review gate, got ${taskRun.status}`,
      JSON.stringify(taskRun),
      OUTCOME.FALLBACK
    );
  }
  if (EXPECT_STREAMING) {
    assertStreamingEvents(taskRunId, events);
  }
  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  const acceptedRealStep = steps.find(
    (step) => step.actualAdapterType === "CODEX"
      && step.realOutputUsed === true
      && step.artifactQualityStatus === "ACCEPTED"
  );
  if (!acceptedRealStep) {
    const diagnostic = steps.map(describeTaskStep).join(" | ");
    throw classifiedError(
      `no TaskStep accepted real CODEX output. steps=${diagnostic}`,
      diagnostic,
      OUTCOME.QUALITY_FAILED
    );
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const realArtifacts = artifacts.filter(
    (artifact) => artifact.sourceKind === "REAL_ADAPTER"
      && artifact.sourceAdapterType === "CODEX"
      && artifact.generationMode === "REAL_FIRST"
      && artifact.qualityStatus === "ACCEPTED"
  );
  if (realArtifacts.length < 1) {
    const observed = artifacts
      .map((artifact) =>
        `${artifact.title || artifact.id}:${artifact.sourceKind || "-"}:${artifact.sourceAdapterType || "-"}:${artifact.generationMode || "-"}:${artifact.qualityStatus || "-"}`
      )
      .join(" | ");
    throw classifiedError(
      `expected at least one CODEX REAL_ADAPTER REAL_FIRST ACCEPTED artifact. Observed: ${observed}`,
      observed,
      OUTCOME.QUALITY_FAILED
    );
  }
  realArtifacts.forEach(assertCodexArtifact);
  pass(`${OUTCOME.ACCEPTED}: CODEX REAL_ADAPTER artifacts created: ${realArtifacts.length}`);

  console.log("Codex smoke test completed successfully.");
}

run().catch((error) => fail("Codex smoke test failed", error));
