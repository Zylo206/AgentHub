#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const DEMO_PROMPT = "SSE smoke: generate a React login page and review it.";
const EXPECT_ACTIVE_CANCEL = process.env.AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL === "true";
const EXPECT_ACTIVE_STOP = process.env.AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP === "true";
const EXPECT_STREAMING_CANCEL = process.env.AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL === "true";
const EXPECT_STREAMING_STOP = process.env.AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_STOP === "true";
const STREAMING_CANCEL_ADAPTER = (process.env.AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER || "CODEX").toUpperCase();
const REQUIRE_REAL_STREAMING_CONTROL =
  process.env.AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CONTROL === "true" ||
  process.env.AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL === "true";
const STREAMING_CANCEL_TIMEOUT_MS = Number(process.env.AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_TIMEOUT_MS || (REQUIRE_REAL_STREAMING_CONTROL ? 180000 : 10000));

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
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload.data;
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

function parseEventPayload(event) {
  if (!event?.data) {
    return null;
  }
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

async function collectSseEvents(conversationId, expectedEventTypes, trigger) {
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/events`, {
    signal: controller.signal,
    headers: { Accept: "text/event-stream" }
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE stream failed: HTTP ${response.status}`);
  }

  const seenEventTypes = new Set();
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
        const parsed = parseSseBlock(block);
        if (!parsed.eventType || parsed.eventType === "HEARTBEAT") {
          continue;
        }
        seenEventTypes.add(parsed.eventType);
        events.push(parsed);
        if (expectedEventTypes.every((eventType) => seenEventTypes.has(eventType))) {
          controller.abort();
          return;
        }
      }
    }
  })();

  await trigger();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out waiting for SSE events. Seen: ${events.map((event) => event.eventType).join(", ")}`)), 10000);
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

  const missing = expectedEventTypes.filter((eventType) => !seenEventTypes.has(eventType));
  if (missing.length > 0) {
    throw new Error(`Missing SSE event types: ${missing.join(", ")}. Seen: ${events.map((event) => event.eventType).join(", ")}`);
  }
  return events;
}

async function collectReplayedSseEvents(conversationId, lastEventId, expectedEventTypes) {
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/events`, {
    signal: controller.signal,
    headers: {
      Accept: "text/event-stream",
      "Last-Event-ID": lastEventId
    }
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE replay stream failed: HTTP ${response.status}`);
  }

  const seenEventTypes = new Set();
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
        const parsed = parseSseBlock(block);
        if (!parsed.eventType || parsed.eventType === "CONNECTED" || parsed.eventType === "HEARTBEAT") {
          continue;
        }
        seenEventTypes.add(parsed.eventType);
        events.push(parsed);
        if (expectedEventTypes.every((eventType) => seenEventTypes.has(eventType))) {
          controller.abort();
          return;
        }
      }
    }
  })();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out waiting for replayed SSE events. Seen: ${events.map((event) => event.eventType).join(", ")}`)), 10000);
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

  const missing = expectedEventTypes.filter((eventType) => !seenEventTypes.has(eventType));
  if (missing.length > 0) {
    throw new Error(`Missing replayed SSE event types: ${missing.join(", ")}. Seen: ${events.map((event) => event.eventType).join(", ")}`);
  }
  return events;
}

async function waitForSseEvent(conversationId, expectedEventType, trigger, timeoutMs = 10000) {
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}/api/conversations/${conversationId}/events`, {
    signal: controller.signal,
    headers: { Accept: "text/event-stream" }
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE stream failed: HTTP ${response.status}`);
  }

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
        const parsed = parseSseBlock(block);
        if (parsed.eventType === expectedEventType) {
          controller.abort();
          return parsed;
        }
      }
    }
    throw new Error(`SSE stream closed before ${expectedEventType}`);
  })();

  const triggerPromise = trigger();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out waiting for ${expectedEventType}`)), timeoutMs);
  });

  try {
    const event = await Promise.race([readerPromise, timeoutPromise]);
    return { event, triggerPromise };
  } finally {
    controller.abort();
  }
}

async function assertStreamingControlAdapterReady(adapterType, actionLabel) {
  if (!REQUIRE_REAL_STREAMING_CONTROL) {
    return;
  }
  const adapters = await request("/api/adapters");
  const adapter = Array.isArray(adapters)
    ? adapters.find((item) => item.adapterType === adapterType)
    : null;
  if (!adapter) {
    throw new Error(`streaming ${actionLabel} real smoke expected ${adapterType} adapter, but it was missing`);
  }
  if (adapter.status !== "AVAILABLE") {
    throw new Error(`streaming ${actionLabel} real smoke expected ${adapterType}=AVAILABLE, got ${adapter.status}: ${adapter.failureReason || adapter.description || ""}`);
  }
  const details = adapter.capabilityDetails && typeof adapter.capabilityDetails === "object"
    ? adapter.capabilityDetails
    : {};
  if (details.availabilityProbe === "fixture" || String(adapter.description || "").toLowerCase().includes("fixture")) {
    throw new Error(`streaming ${actionLabel} real smoke forbids fixture mode for ${adapterType}`);
  }
  if (details.streamingEnabled !== true) {
    throw new Error(`streaming ${actionLabel} real smoke requires ${adapterType} streamingEnabled=true: ${JSON.stringify(details)}`);
  }
  if (adapterType === "CLAUDE_CODE" && details.supportsStreamJson !== true) {
    throw new Error(`CLAUDE_CODE real streaming ${actionLabel} requires stream-json support: ${JSON.stringify(details)}`);
  }
  if (adapterType === "CODEX" && details.supportsJsonEvents !== true) {
    throw new Error(`CODEX real streaming ${actionLabel} requires JSON event support: ${JSON.stringify(details)}`);
  }
  pass(`streaming ${actionLabel} real adapter ready: ${adapterType}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTaskRunStatus(taskRunId, expectedStatuses, timeoutMs = 15000) {
  const expected = new Set(Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses]);
  const deadline = Date.now() + timeoutMs;
  let lastTaskRun = null;
  while (Date.now() < deadline) {
    lastTaskRun = await request(`/api/task-runs/${taskRunId}`);
    if (expected.has(lastTaskRun?.status)) {
      return lastTaskRun;
    }
    await sleep(300);
  }
  throw new Error(`Timed out waiting for taskRun ${taskRunId} status ${[...expected].join(", ")}. Last=${JSON.stringify(lastTaskRun)}`);
}

async function runActiveControlSmoke({ action, endpoint, expectedStatus, title, prompt, reason }) {
  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, type: "GROUP" })
  });
  const conversationId = getIdValue(conversation.id);
  if (!conversationId) {
    throw new Error(`active ${action} conversationId missing`);
  }

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: prompt })
  });
  const messageId = getIdValue(message.id);
  if (!messageId) {
    throw new Error(`active ${action} messageId missing`);
  }

  const { event, triggerPromise } = await waitForSseEvent(conversationId, "TASK_RUN_CREATED", () =>
    request(`/api/conversations/${conversationId}/demo-task`, {
      method: "POST",
      body: JSON.stringify({ messageId, userInput: prompt })
    })
  );
  let taskRunId = event.resourceId;
  if (!taskRunId && event.data) {
    try {
      taskRunId = JSON.parse(event.data).resourceId;
    } catch {
      taskRunId = "";
    }
  }
  if (!taskRunId) {
    throw new Error(`TASK_RUN_CREATED did not include resourceId: ${JSON.stringify(event)}`);
  }

  const controlResult = await request(`/api/task-runs/${taskRunId}/${endpoint}`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  if (!controlResult?.accepted) {
    throw new Error(`active ${action} was not accepted: ${JSON.stringify(controlResult)}`);
  }
  if (controlResult.action !== action) {
    throw new Error(`active ${action} returned unexpected action: ${JSON.stringify(controlResult)}`);
  }
  pass(`active ${action} accepted for running taskRun: ${taskRunId}`);

  const controlRunState = await request(`/api/task-runs/${taskRunId}/realtime-state`);
  if (
    !controlRunState ||
    controlRunState.taskRunId !== taskRunId ||
    controlRunState.sourceMessageId !== messageId ||
    controlRunState.status !== expectedStatus
  ) {
    throw new Error(`active ${action} realtime state not synchronized: ${JSON.stringify(controlRunState)}`);
  }
  pass(`active ${action} realtime state synchronized: ${controlRunState.status}`);

  await triggerPromise.catch(() => null);
  const taskRun = await request(`/api/task-runs/${taskRunId}`);
  if (taskRun?.status !== expectedStatus) {
    throw new Error(`taskRun status expected ${expectedStatus} after active ${action}: ${JSON.stringify(taskRun)}`);
  }
  const skippedSteps = (taskRun.steps || []).filter((step) =>
    step.status === "SKIPPED" || step.adapterStatus === "CANCELLED" || step.adapterStatus === "STOPPED"
  );
  if (skippedSteps.length < 1) {
    throw new Error(`active ${action} did not skip or discard any step result: ${JSON.stringify(taskRun.steps || [])}`);
  }
  const actionAudits = await request(`/api/conversations/${conversationId}/action-audits`);
  const controlAudit = (actionAudits || []).find((audit) =>
    audit.actionType === action && audit.targetId === taskRunId && audit.status === "ACCEPTED"
  );
  if (!controlAudit) {
    throw new Error(`active ${action} did not record accepted ActionAuditLog: ${JSON.stringify(actionAudits || [])}`);
  }
  pass(`active ${action} marked TaskRun ${expectedStatus} and skipped/discarded ${skippedSteps.length} step(s)`);
}

async function runStreamingControlSmoke({ action, endpoint, expectedStatus, actionLabel }) {
  const adapterType = STREAMING_CANCEL_ADAPTER === "CLAUDE_CODE" ? "CLAUDE_CODE" : "CODEX";
  await assertStreamingControlAdapterReady(adapterType, actionLabel);
  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `SSE Streaming ${actionLabel} ${adapterType} ${Date.now()}`,
      systemPrompt: `Return AgentHub Artifact JSON contract and stream fixture chunks for ${actionLabel} validation.`,
      capabilityTags: ["sse", "streaming", actionLabel],
      toolTags: ["code", "preview"],
      preferredAdapterType: adapterType
    })
  });
  const agentId = getIdValue(agent.id);
  if (!agentId) {
    throw new Error("streaming cancel agentId missing");
  }

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: `SSE Streaming ${actionLabel} ${adapterType}`, type: "GROUP" })
  });
  const conversationId = getIdValue(conversation.id);
  if (!conversationId) {
    throw new Error("streaming cancel conversationId missing");
  }

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `@${agent.name} Streaming ${actionLabel} smoke: generate a compact TSX artifact, then ${actionLabel} mid-stream.`,
      targetAgentId: agentId,
      mentionedAgentIds: [agentId]
    })
  });
  const messageId = getIdValue(message.id);
  if (!messageId) {
    throw new Error("streaming cancel messageId missing");
  }

  const runController = new AbortController();
  const { event, triggerPromise } = await waitForSseEvent(conversationId, "ADAPTER_STREAM_CHUNK", () =>
    request(`/api/conversations/${conversationId}/demo-task`, {
      method: "POST",
      signal: runController.signal,
      body: JSON.stringify({
        messageId,
        userInput: `Streaming ${actionLabel} smoke: ${actionLabel} after the first adapter stream chunk.`,
        selectedAgentId: agentId
      })
    })
  , STREAMING_CANCEL_TIMEOUT_MS);

  const payload = parseEventPayload(event);
  const taskRunId = payload?.payload?.taskRunId || payload?.resourceId || event.resourceId;
  if (!taskRunId) {
    throw new Error(`streaming cancel chunk did not include taskRunId: ${JSON.stringify(event)}`);
  }
  const chunkAdapterType = payload?.payload?.adapterType;
  if (chunkAdapterType !== adapterType) {
    throw new Error(`expected ${adapterType} stream chunk, got ${chunkAdapterType || "unknown"}: ${JSON.stringify(payload)}`);
  }
  pass(`streaming ${actionLabel} received first ${adapterType} chunk for taskRun: ${taskRunId}`);

  const controlResult = await request(`/api/task-runs/${taskRunId}/${endpoint}`, {
    method: "POST",
    body: JSON.stringify({ reason: `SSE streaming ${actionLabel} ${REQUIRE_REAL_STREAMING_CONTROL ? "real CLI" : "fixture"} smoke requested after first stream chunk.` })
  });
  if (!controlResult?.accepted) {
    throw new Error(`streaming ${actionLabel} was not accepted: ${JSON.stringify(controlResult)}`);
  }
  if (controlResult.action !== action) {
    throw new Error(`streaming ${actionLabel} returned unexpected action: ${JSON.stringify(controlResult)}`);
  }
  pass(`streaming ${actionLabel} accepted for running taskRun: ${taskRunId}`);

  runController.abort();
  triggerPromise.catch(() => null);
  const taskRun = await waitForTaskRunStatus(taskRunId, expectedStatus, STREAMING_CANCEL_TIMEOUT_MS);
  const discardedSteps = (taskRun.steps || []).filter((step) =>
    step.status === "SKIPPED" || step.adapterStatus === "CANCELLED" || step.adapterStatus === "STOPPED"
  );
  if ((taskRun.steps || []).length > 0 && discardedSteps.length < 1) {
    throw new Error(`streaming ${actionLabel} did not discard any step: ${JSON.stringify(taskRun.steps || [])}`);
  }

  const artifacts = await request(`/api/task-runs/${taskRunId}/artifacts`);
  const realArtifacts = (artifacts || []).filter((artifact) =>
    artifact.sourceKind === "REAL_ADAPTER" && artifact.sourceAdapterType === adapterType
  );
  if (realArtifacts.length > 0) {
    throw new Error(`streaming ${actionLabel} persisted REAL_ADAPTER artifact after ${actionLabel}: ${JSON.stringify(realArtifacts)}`);
  }

  const actionAudits = await request(`/api/conversations/${conversationId}/action-audits`);
  const controlAudit = (actionAudits || []).find((audit) =>
    audit.actionType === action && audit.targetId === taskRunId && audit.status === "ACCEPTED"
  );
  if (!controlAudit) {
    throw new Error(`streaming ${actionLabel} did not record accepted ActionAuditLog: ${JSON.stringify(actionAudits || [])}`);
  }
  const actionPast = actionLabel === "stop" ? "stopped" : "cancelled";
  const stepMessage = (taskRun.steps || []).length === 0
    ? `${actionPast} before any TaskStep result was persisted`
    : `discarded ${discardedSteps.length} step(s)`;
  pass(`streaming ${actionLabel} ${stepMessage} and did not persist ${adapterType} REAL_ADAPTER artifacts`);
}

async function runSseSmokeTest() {
  console.log(`AgentHub SSE smoke test target: ${API_BASE}`);

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }
  pass("health check");

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: "SSE Smoke Test Conversation", type: "GROUP" })
  });
  const conversationId = getIdValue(conversation.id);
  if (!conversationId) {
    throw new Error("conversationId missing");
  }
  pass(`conversation created: ${conversationId}`);

  let messageId = null;
  let taskRunId = null;
  const events = await collectSseEvents(
    conversationId,
    ["MESSAGE_CREATED", "TASK_RUN_CREATED", "TASK_RUN_UPDATED", "ARTIFACT_CREATED"],
    async () => {
      const message = await request(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: DEMO_PROMPT })
      });
      messageId = getIdValue(message.id);
      const taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
        method: "POST",
        body: JSON.stringify({ messageId, userInput: DEMO_PROMPT })
      });
      taskRunId = getIdValue(taskRun.id);
    }
  );
  const eventLog = events.map((event) => event.eventType);
  pass(`SSE events received: ${eventLog.join(", ")}`);

  const replayStartEvent = events.find((event) => event.eventId && event.eventType === "MESSAGE_CREATED");
  if (!replayStartEvent) {
    throw new Error("SSE events did not include an event id for Last-Event-ID replay verification");
  }
  const replayedEvents = await collectReplayedSseEvents(
    conversationId,
    replayStartEvent.eventId,
    ["TASK_RUN_CREATED", "TASK_RUN_UPDATED", "ARTIFACT_CREATED"]
  );
  pass(`SSE Last-Event-ID replay loaded: ${replayedEvents.map((event) => event.eventType).join(", ")}`);

  const activeState = await request(`/api/conversations/${conversationId}/active-realtime-state`);
  if (!activeState || activeState.taskRunId !== taskRunId || !["COMPLETED", "BLOCKED"].includes(activeState.status)) {
    throw new Error(`active realtime state invalid: ${JSON.stringify(activeState)}`);
  }
  pass(`active realtime state loaded: ${activeState.status}`);

  const taskRunState = await request(`/api/task-runs/${taskRunId}/realtime-state`);
  if (!taskRunState || taskRunState.sourceMessageId !== messageId || !taskRunState.lastEventId) {
    throw new Error(`task run realtime state invalid: ${JSON.stringify(taskRunState)}`);
  }
  pass(`task run realtime state loaded: ${taskRunState.taskRunId}`);
  pass(`SSE recovery state validated: lastEventId=${taskRunState.lastEventId}`);

  const controlResult = await request(`/api/task-runs/${taskRunId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: "SSE smoke validates REST fallback for realtime control plane." })
  });
  if (!controlResult || controlResult.accepted !== false || !String(controlResult.message || "").includes("terminal")) {
    throw new Error(`completed task run cancel should be rejected as terminal: ${JSON.stringify(controlResult)}`);
  }
  pass("realtime control REST cancel rejected terminal TaskRun as expected");

  if (EXPECT_ACTIVE_CANCEL) {
    await runActiveControlSmoke({
      action: "CANCEL_RUN",
      endpoint: "cancel",
      expectedStatus: "CANCELLED",
      title: "SSE Active Cancel Smoke",
      prompt: "Active cancel smoke: run a slow multi-agent task.",
      reason: "SSE active cancel smoke requested during execution."
    });
  }

  if (EXPECT_ACTIVE_STOP) {
    await runActiveControlSmoke({
      action: "STOP_RUN",
      endpoint: "stop",
      expectedStatus: "STOPPED",
      title: "SSE Active Stop Smoke",
      prompt: "Active stop smoke: run a slow multi-agent task.",
      reason: "SSE active stop smoke requested during execution."
    });
  }

  if (EXPECT_STREAMING_CANCEL) {
    await runStreamingControlSmoke({
      action: "CANCEL_RUN",
      endpoint: "cancel",
      expectedStatus: "CANCELLED",
      actionLabel: "cancel"
    });
  }

  if (EXPECT_STREAMING_STOP) {
    await runStreamingControlSmoke({
      action: "STOP_RUN",
      endpoint: "stop",
      expectedStatus: "STOPPED",
      actionLabel: "stop"
    });
  }

  console.log("SSE smoke test completed successfully.");
}

runSseSmokeTest().catch((error) => {
  fail("SSE smoke test failed", error);
});
