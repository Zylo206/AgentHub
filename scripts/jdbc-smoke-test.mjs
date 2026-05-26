#!/usr/bin/env node

import { spawn } from "node:child_process";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const VERIFY_CONVERSATION_ID = process.env.AGENTHUB_JDBC_VERIFY_CONVERSATION_ID || "";
const VERIFY_TASK_RUN_ID = process.env.AGENTHUB_JDBC_VERIFY_TASK_RUN_ID || "";
const VERIFY_ARTIFACT_ID = process.env.AGENTHUB_JDBC_VERIFY_ARTIFACT_ID || "";
const VERIFY_ATTACHMENT_ID = process.env.AGENTHUB_JDBC_VERIFY_ATTACHMENT_ID || "";

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
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend in JDBC mode first. ${error.message}`);
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  return payload.data;
}

async function runVerifyMode() {
  console.log("AgentHub JDBC restart verification");
  console.log(`API base: ${API_BASE}`);
  console.log("Expected backend mode: jdbc");

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`unexpected health response: ${JSON.stringify(health)}`);
  }
  pass("health check");

  if (!VERIFY_CONVERSATION_ID) {
    throw new Error("AGENTHUB_JDBC_VERIFY_CONVERSATION_ID is required in verify mode");
  }
  if (!VERIFY_TASK_RUN_ID) {
    throw new Error("AGENTHUB_JDBC_VERIFY_TASK_RUN_ID is required to verify TaskRun, ContextSnapshot, and Handoff persistence");
  }

  const conversation = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}`);
  if (getIdValue(conversation.id) !== VERIFY_CONVERSATION_ID) {
    throw new Error(`conversation was not loaded after restart: ${JSON.stringify(conversation)}`);
  }
  pass(`conversation persisted after restart: ${VERIFY_CONVERSATION_ID}`);

  const messages = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/messages`);
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("messages were not loaded after restart");
  }
  pass(`messages persisted after restart: ${messages.length}`);

  const attachments = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/attachments`);
  if (!Array.isArray(attachments) || attachments.length === 0) {
    throw new Error("attachments were not loaded after restart");
  }
  const attachmentToVerify = VERIFY_ATTACHMENT_ID
    ? attachments.find((attachment) => attachment.attachmentId === VERIFY_ATTACHMENT_ID)
    : attachments[0];
  if (!attachmentToVerify?.attachmentId) {
    throw new Error(`attachment ${VERIFY_ATTACHMENT_ID || "(first attachment)"} was not loaded after restart`);
  }
  const attachmentDownload = await fetch(`${API_BASE}/api/attachments/${attachmentToVerify.attachmentId}/download`);
  if (attachmentDownload.status !== 200) {
    throw new Error(`attachment download failed after restart: HTTP ${attachmentDownload.status}`);
  }
  pass(`attachments persisted and downloadable after restart: ${attachments.length}`);

  const pinnedContexts = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/pinned-contexts`);
  if (!Array.isArray(pinnedContexts) || pinnedContexts.length === 0) {
    throw new Error("pinned contexts were not loaded after restart");
  }
  pass(`pinned contexts persisted after restart: ${pinnedContexts.length}`);

  const artifacts = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/artifacts`);
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new Error("artifacts were not loaded after restart");
  }
  if (VERIFY_ARTIFACT_ID && !artifacts.some((artifact) => getIdValue(artifact.id) === VERIFY_ARTIFACT_ID)) {
    throw new Error(`artifact ${VERIFY_ARTIFACT_ID} was not loaded after restart`);
  }
  pass(`artifacts persisted after restart: ${artifacts.length}`);

  const taskRuns = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/task-runs`);
  if (!Array.isArray(taskRuns) || taskRuns.length === 0) {
    throw new Error("task runs were not loaded after restart");
  }
  if (VERIFY_TASK_RUN_ID && !taskRuns.some((taskRun) => getIdValue(taskRun.id) === VERIFY_TASK_RUN_ID)) {
    throw new Error(`taskRun ${VERIFY_TASK_RUN_ID} was not loaded after restart`);
  }
  pass(`task runs persisted after restart: ${taskRuns.length}`);

  const conversationSnapshots = await request(`/api/conversations/${VERIFY_CONVERSATION_ID}/context-snapshots`);
  if (!Array.isArray(conversationSnapshots) || conversationSnapshots.length === 0) {
    throw new Error("conversation context snapshots were not loaded after restart");
  }
  pass(`conversation context snapshots persisted after restart: ${conversationSnapshots.length}`);

  const snapshots = await request(`/api/task-runs/${VERIFY_TASK_RUN_ID}/context-snapshots`);
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error(`context snapshots for ${VERIFY_TASK_RUN_ID} were not loaded after restart`);
  }
  pass(`task run context snapshots persisted after restart: ${snapshots.length}`);

  const handoffSummaries = await request(`/api/task-runs/${VERIFY_TASK_RUN_ID}/handoff-summaries`);
  if (!Array.isArray(handoffSummaries) || handoffSummaries.length === 0) {
    throw new Error(`handoff summaries for ${VERIFY_TASK_RUN_ID} were not loaded after restart`);
  }
  pass(`handoff summaries persisted after restart: ${handoffSummaries.length}`);

  console.log("JDBC restart verification completed successfully.");
}

function runCreateMode() {
  const env = {
    ...process.env,
    AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE: "true",
    AGENTHUB_PERSISTENCE_MODE: process.env.AGENTHUB_PERSISTENCE_MODE || "jdbc"
  };

  console.log("AgentHub JDBC smoke test");
  console.log(`API base: ${env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080"}`);
  console.log("Expected backend mode: jdbc");
  console.log("Run backend with AGENTHUB_PERSISTENCE_MODE=jdbc and a configured AGENTHUB_JDBC_URL before this script.");
  console.log("After it passes, restart backend and rerun this script with:");
  console.log("  AGENTHUB_JDBC_VERIFY_CONVERSATION_ID=<conv_id>");
  console.log("  AGENTHUB_JDBC_VERIFY_TASK_RUN_ID=<run_id>");
  console.log("  AGENTHUB_JDBC_VERIFY_ARTIFACT_ID=<artifact_id>");
  console.log("  AGENTHUB_JDBC_VERIFY_ATTACHMENT_ID=<attachment_id> (optional; first attachment is used if omitted)");

  const child = spawn(process.execPath, ["scripts/smoke-test.mjs"], {
    stdio: "inherit",
    env,
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`[FAIL] JDBC smoke test terminated by signal ${signal}`);
      process.exitCode = 1;
      return;
    }
    process.exitCode = code ?? 1;
  });
}

if (VERIFY_CONVERSATION_ID || VERIFY_TASK_RUN_ID || VERIFY_ARTIFACT_ID) {
  runVerifyMode().catch((error) => fail("JDBC restart verification failed", error));
} else {
  runCreateMode();
}
