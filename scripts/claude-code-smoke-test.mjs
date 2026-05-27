#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const EXPECT_STREAMING = process.env.AGENTHUB_CLAUDE_CODE_SMOKE_EXPECT_STREAMING === "true";

const DEMO_PROMPT =
  "Generate a React login page artifact with email login and verification-code login. Return AgentHub artifact JSON only.";

const OUTCOME = {
  ACCEPTED: "ACCEPTED",
  PARSE_FAILED: "PARSE_FAILED",
  QUALITY_FAILED: "QUALITY_FAILED",
  BUILD_FAILED: "BUILD_FAILED",
  FALLBACK: "FALLBACK"
};

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[WARN] ${message}`);
}

function smokeError(outcome, message) {
  return new Error(`[${outcome}] ${message}`);
}

function classifyDiagnostic(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized.trim()) {
    return null;
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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
  if (!event.data) {
    return event;
  }
  try {
    const payload = JSON.parse(event.data);
    return {
      ...event,
      resourceId: payload.resourceId || "",
      payload: payload.payload || {},
      taskRunId: payload.taskRunId || payload.payload?.taskRunId || "",
      taskStepId: payload.taskStepId || payload.payload?.taskStepId || "",
      adapterType: payload.adapterType || payload.payload?.adapterType || "",
      chunk: payload.chunk || payload.payload?.chunk || ""
    };
  } catch {
    return event;
  }
}

async function collectRealtimeEvents(conversationId, expectedEventTypes, trigger) {
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/events`, {
    signal: controller.signal,
    headers: { Accept: "text/event-stream" }
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
    throw smokeError(OUTCOME.PARSE_FAILED, `Claude Code adapter content was not valid JSON: ${error.message}`);
  }
  if (!parsed.assistantMessage || !Array.isArray(parsed.artifacts) || parsed.artifacts.length < 1) {
    throw smokeError(OUTCOME.PARSE_FAILED, "Claude Code adapter content did not match AgentHub artifact contract.");
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
    throw smokeError(OUTCOME.PARSE_FAILED, `Claude Code artifact is missing required fields: ${JSON.stringify(invalid).slice(0, 300)}`);
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
    step.adapterErrorMessage || step.artifactQualityReason || ""
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
      && adapterType === "CLAUDE_CODE"
      && (!taskRunId || !eventTaskRunId || eventTaskRunId === taskRunId);
  });
  if (streamEvents.length < 1) {
    throw new Error(`expected CLAUDE_CODE ADAPTER_STREAM_CHUNK event for taskRun=${taskRunId}`);
  }
  pass(`Claude Code streaming chunk event observed: ${streamEvents.length}`);
}

async function run() {
  console.log(`AgentHub Claude Code smoke target: ${API_BASE}`);
  console.log(`Claude Code streaming assertion: ${EXPECT_STREAMING ? "enabled" : "disabled"}`);
  console.log(`Backend Claude Code streaming flag: ${process.env.AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED || "false"}`);

  await request("/api/health");
  pass("health check");

  const adapters = await request("/api/adapters");
  const claude = adapters.find((adapter) => adapter.adapterType === "CLAUDE_CODE");
  if (!claude) {
    throw new Error("CLAUDE_CODE adapter is missing from /api/adapters.");
  }
  if (claude.status !== "AVAILABLE") {
    throw new Error(`CLAUDE_CODE expected AVAILABLE, got ${claude.status}: ${claude.failureReason || claude.description || ""}`);
  }
  pass(`CLAUDE_CODE adapter available: ${claude.description}`);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "Claude Code Smoke Conversation", type: "GROUP" })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  pass(`conversation created: ${conversationId}`);

  const executeResponse = await request("/api/adapters/CLAUDE_CODE/execute", {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      taskRunId: "claude_smoke_execute_run",
      taskStepId: "claude_smoke_execute_step",
      agentId: "claude_smoke_agent",
      agentName: "Claude Code Smoke Agent",
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
  if (executeResponse.fallbackUsed) {
    throw classifiedError(
      `adapter execute used fallback: ${executeResponse.errorMessage || "no reason"}`,
      `${executeResponse.errorMessage || ""}\n${executeResponse.content || ""}`
    );
  }
  assertArtifactJsonContract(executeResponse.content);

  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `Claude Code Smoke Agent ${Date.now()}`,
      role: "CUSTOM",
      systemPrompt: "Return AgentHub artifact JSON only.",
      capabilityTags: ["claude-code", "smoke"],
      toolTags: ["code", "preview"],
      preferredAdapterType: "CLAUDE_CODE"
    })
  });
  const agentId = requireValue(getIdValue(agent.id), "agentId missing");
  pass(`Claude Code custom agent created: ${agentId}`);

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

  const expectedEvents = EXPECT_STREAMING
    ? ["TASK_RUN_CREATED", "TASK_RUN_UPDATED", "ADAPTER_STREAM_CHUNK"]
    : ["TASK_RUN_CREATED", "TASK_RUN_UPDATED"];
  const { triggered: taskRun, events } = await collectRealtimeEvents(
    conversationId,
    expectedEvents,
    () => request(`/api/conversations/${conversationId}/demo-task`, {
      method: "POST",
      body: JSON.stringify({
        messageId,
        userInput: DEMO_PROMPT,
        selectedAgentId: agentId
      })
    })
  );
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  pass(`demo task completed: ${taskRunId}, status=${taskRun.status}`);
  if (taskRun.status !== "COMPLETED") {
    throw classifiedError(`demo task expected COMPLETED, got ${taskRun.status}`, JSON.stringify(taskRun), OUTCOME.FALLBACK);
  }
  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  const acceptedRealStep = steps.find(
    (step) => step.actualAdapterType === "CLAUDE_CODE"
      && step.realOutputUsed === true
      && step.artifactQualityStatus === "ACCEPTED"
  );
  if (!acceptedRealStep) {
    const diagnostic = steps.map(describeTaskStep).join(" | ");
    throw classifiedError(
      `no TaskStep accepted real CLAUDE_CODE output. steps=${diagnostic}`,
      diagnostic,
      OUTCOME.QUALITY_FAILED
    );
  }
  if (EXPECT_STREAMING) {
    assertStreamingEvents(taskRunId, events);
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const realArtifacts = artifacts.filter(
    (artifact) => artifact.sourceKind === "REAL_ADAPTER"
      && artifact.sourceAdapterType === "CLAUDE_CODE"
      && artifact.generationMode === "REAL_FIRST"
  );
  if (realArtifacts.length < 1) {
    throw classifiedError(
      `expected at least one CLAUDE_CODE REAL_ADAPTER artifact, got ${realArtifacts.length}`,
      JSON.stringify(artifacts.slice(0, 5)),
      OUTCOME.FALLBACK
    );
  }
  const rejected = realArtifacts.find((artifact) => artifact.qualityStatus === "REJECTED");
  if (rejected) {
    throw classifiedError(
      `CLAUDE_CODE REAL_ADAPTER artifact was rejected: ${rejected.qualityReason || rejected.title}`,
      JSON.stringify(rejected),
      OUTCOME.QUALITY_FAILED
    );
  }
  pass(`${OUTCOME.ACCEPTED}: CLAUDE_CODE REAL_ADAPTER artifacts created: ${realArtifacts.length}`);

  console.log("Claude Code smoke test completed successfully.");
}

run().catch((error) => fail("Claude Code smoke test failed", error));
