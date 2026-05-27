#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const EXPECT_STREAMING = process.env.AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING === "true";

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
  const parsed = JSON.parse(content);
  if (!parsed.assistantMessage || !Array.isArray(parsed.artifacts) || parsed.artifacts.length < 1) {
    throw new Error("Codex adapter content did not match AgentHub artifact contract.");
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
    throw new Error(`Codex artifact is missing required fields: ${JSON.stringify(invalid).slice(0, 300)}`);
  }
  pass(`adapter execute returned artifact JSON: ${parsed.artifacts.length} artifact(s)`);
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
    throw new Error(`sourceKind expected REAL_ADAPTER, got ${artifact.sourceKind}`);
  }
  if (artifact.sourceAdapterType !== "CODEX") {
    throw new Error(`sourceAdapterType expected CODEX, got ${artifact.sourceAdapterType}`);
  }
  if (artifact.generationMode !== "REAL_FIRST") {
    throw new Error(`generationMode expected REAL_FIRST, got ${artifact.generationMode}`);
  }
  if (artifact.qualityStatus !== "ACCEPTED") {
    throw new Error(`qualityStatus expected ACCEPTED, got ${artifact.qualityStatus}`);
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
    throw new Error(`adapter execute expected COMPLETED, got ${executeResponse.status}: ${executeResponse.errorMessage || ""}`);
  }
  if (executeResponse.actualAdapterType && executeResponse.actualAdapterType !== "CODEX") {
    throw new Error(`adapter execute expected actualAdapterType=CODEX, got ${executeResponse.actualAdapterType}`);
  }
  if (executeResponse.fallbackUsed) {
    throw new Error("adapter execute used fallback; expected direct CODEX output");
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
  if (EXPECT_STREAMING) {
    assertStreamingEvents(taskRunId, events);
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
    throw new Error(`expected at least one CODEX REAL_ADAPTER REAL_FIRST ACCEPTED artifact. Observed: ${observed}`);
  }
  realArtifacts.forEach(assertCodexArtifact);
  pass(`CODEX REAL_ADAPTER artifacts created: ${realArtifacts.length}`);

  console.log("Codex smoke test completed successfully.");
}

run().catch((error) => fail("Codex smoke test failed", error));
