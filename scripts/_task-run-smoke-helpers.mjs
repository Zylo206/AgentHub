#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";

export const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
export const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");

let authToken = "";

export function pass(message) {
  console.log(`[PASS] ${message}`);
}

export function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

export function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function getIdValue(value) {
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

export async function login(username = "demo", password = "demo") {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true || !payload?.data?.token) {
    throw new Error(payload?.message || `auth login failed: HTTP ${response.status}`);
  }
  authToken = payload.data.token;
  return payload.data;
}

export async function request(pathname, init = {}) {
  if (!authToken && pathname !== "/api/auth/login") {
    await login();
  }
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...init,
    headers: isFormData
      ? {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(init.headers || {})
        }
      : {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(init.headers || {})
        }
  }).catch((error) => {
    throw new Error(`Cannot reach backend at ${API_BASE}: ${error.message}`);
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    payload = JSON.parse(text);
  }

  if (!response.ok) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  if (!payload?.success) {
    throw new Error(payload?.message || payload?.errorCode || `API failure from ${pathname}`);
  }
  return payload.data;
}

export async function waitFor(label, producer, predicate, timeout = 30000, interval = 500) {
  const startedAt = Date.now();
  let lastValue = null;
  let lastError = null;

  while (Date.now() - startedAt < timeout) {
    try {
      lastValue = await producer();
      const result = predicate(lastValue);
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const detail = lastError
    ? getErrorMessage(lastError)
    : JSON.stringify(lastValue).slice(0, 600);
  throw new Error(`${label} timed out after ${timeout}ms. Last state: ${detail}`);
}

export async function ensureBackendHealth() {
  const health = await request("/api/health");
  ensure(health?.status === "UP", `unexpected health status: ${JSON.stringify(health)}`);
  pass("backend health is UP");
}

export async function createConversation(title, type = "GROUP") {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title, type })
  });
}

export async function createMessage(conversationId, content) {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export async function createDemoTask(conversationId, messageId, userInput) {
  return request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({ messageId, userInput, selectedAgentId: null })
  });
}

export async function waitForTaskRunTerminal(conversationId, taskRunId, timeout = 45000) {
  return waitFor(
    "task run terminal",
    () => request(`/api/task-runs/${taskRunId}`),
    (taskRun) => {
      const status = String(taskRun?.status || "").toUpperCase();
      if (["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "STOPPED"].includes(status)) {
        return taskRun;
      }
      return null;
    },
    timeout,
    750
  );
}

export async function createAndWaitDemoTask(conversationId, prompt, timeout = 45000) {
  const message = await createMessage(conversationId, prompt);
  const messageId = getIdValue(message.id);
  ensure(messageId, "messageId missing");
  const taskRun = await createDemoTask(conversationId, messageId, prompt);
  const taskRunId = getIdValue(taskRun.id);
  ensure(taskRunId, "taskRunId missing");
  return waitForTaskRunTerminal(conversationId, taskRunId, timeout);
}

export async function listArtifacts(conversationId) {
  return request(`/api/conversations/${conversationId}/artifacts`);
}

export async function getCodeArtifact(conversationId) {
  const artifacts = await listArtifacts(conversationId);
  const artifact = artifacts.find((item) => item.type === "CODE" || item.artifactType === "CODE");
  ensure(artifact, "CODE artifact missing");
  return artifact;
}

export async function createRevision(artifactId, conversationId, revisionInstruction) {
  return request(`/api/artifacts/${artifactId}/demo-revision`, {
    method: "POST",
    body: JSON.stringify({ conversationId, revisionInstruction })
  });
}

export async function createAndApproveApproval(conversationId, requestBody) {
  const approval = await request(`/api/conversations/${conversationId}/approval-requests`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
  const approvalId = approval?.approvalId;
  ensure(approvalId, "approvalId missing");
  const approved = await request(`/api/approval-requests/${approvalId}/approve`, {
    method: "POST"
  });
  ensure(String(approved.status).toUpperCase() === "APPROVED", `expected APPROVED, got ${approved.status}`);
  return approvalId;
}

export async function compareDiff(artifactId, baseVersion) {
  const suffix = typeof baseVersion === "number" ? `?baseVersion=${baseVersion}` : "";
  return request(`/api/artifacts/${artifactId}/compare-diff${suffix}`);
}

export async function applyDiff(artifactId, body) {
  return request(`/api/artifacts/${artifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

export async function getActionAudits(conversationId) {
  return request(`/api/conversations/${conversationId}/action-audits`);
}

export async function getTaskRunObservability(conversationId) {
  return request(`/api/conversations/${conversationId}/task-run-observability`);
}

export function authTokenValue() {
  return authToken;
}

export async function seedArtifactConflictScenario(prefix) {
  const conversation = await createConversation(`${prefix} Conflict`);
  const conversationId = getIdValue(conversation.id);
  ensure(conversationId, "conversationId missing");
  const taskRun = await createAndWaitDemoTask(
    conversationId,
    `${prefix}: generate a React login page with code artifact and quality review.`
  );
  ensure(String(taskRun.status).toUpperCase() === "COMPLETED", `expected COMPLETED, got ${taskRun.status}`);
  const baseArtifact = await getCodeArtifact(conversationId);
  const baseArtifactId = getIdValue(baseArtifact.id);
  ensure(baseArtifactId, "base artifact id missing");

  const revisionOne = await createRevision(
    baseArtifactId,
    conversationId,
    `${prefix}: revision one changes the primary CTA copy to Continue securely.`
  );
  const revisionOneArtifactId = getIdValue(revisionOne.revisedArtifact?.id);
  ensure(revisionOneArtifactId, "revision one artifact missing");
  const applyApprovalId = await createAndApproveApproval(conversationId, {
    actionType: "APPLY_DIFF",
    targetType: "ARTIFACT",
    targetId: revisionOneArtifactId,
    riskLevel: "MEDIUM",
    summary: `${prefix}: approve apply diff for revision one.`,
    affectedItems: [`Artifact: ${revisionOneArtifactId}`]
  });
  const applied = await applyDiff(revisionOneArtifactId, {
    force: false,
    approvalId: applyApprovalId,
    baseVersion: baseArtifact.version
  });
  const appliedArtifactId = getIdValue(applied.appliedArtifact?.id);
  ensure(appliedArtifactId, "applied artifact id missing");

  const revisionTwo = await createRevision(
    baseArtifactId,
    conversationId,
    `${prefix}: revision two keeps the CTA but adds a visible loading-state notice.`
  );
  const revisionTwoArtifactId = getIdValue(revisionTwo.revisedArtifact?.id);
  ensure(revisionTwoArtifactId, "revision two artifact missing");

  return {
    conversationId,
    baseArtifact,
    baseArtifactId,
    revisionOneArtifactId,
    appliedArtifactId,
    revisionTwoArtifactId
  };
}

export async function loadPlaywright() {
  const frontendRequire = createRequire(new URL("../frontend/package.json", import.meta.url));
  try {
    return frontendRequire("playwright");
  } catch {
    try {
      return frontendRequire("@playwright/test");
    } catch {
      try {
        return frontendRequire("playwright-core");
      } catch {
        throw new Error("Playwright runtime is not installed in frontend/node_modules.");
      }
    }
  }
}
