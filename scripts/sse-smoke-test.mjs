#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const DEMO_PROMPT = "SSE smoke: generate a React login page and review it.";

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
  const event = { eventType: "message", data: "" };
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event.eventType = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      event.data += line.slice("data:".length).trim();
    }
  }
  return event;
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
  const eventLog = [];
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
        eventLog.push(parsed.eventType);
        if (expectedEventTypes.every((eventType) => seenEventTypes.has(eventType))) {
          controller.abort();
          return;
        }
      }
    }
  })();

  await trigger();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timed out waiting for SSE events. Seen: ${eventLog.join(", ")}`)), 10000);
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
    throw new Error(`Missing SSE event types: ${missing.join(", ")}. Seen: ${eventLog.join(", ")}`);
  }
  return eventLog;
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
  const eventLog = await collectSseEvents(
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
  pass(`SSE events received: ${eventLog.join(", ")}`);

  const activeState = await request(`/api/conversations/${conversationId}/active-realtime-state`);
  if (!activeState || activeState.taskRunId !== taskRunId || !["COMPLETED", "BLOCKED"].includes(activeState.status)) {
    throw new Error(`active realtime state invalid: ${JSON.stringify(activeState)}`);
  }
  pass(`active realtime state loaded: ${activeState.status}`);

  const taskRunState = await request(`/api/task-runs/${taskRunId}/realtime-state`);
  if (!taskRunState || taskRunState.sourceMessageId !== messageId) {
    throw new Error(`task run realtime state invalid: ${JSON.stringify(taskRunState)}`);
  }
  pass(`task run realtime state loaded: ${taskRunState.taskRunId}`);

  console.log("SSE smoke test completed successfully.");
}

runSseSmokeTest().catch((error) => {
  fail("SSE smoke test failed", error);
});
