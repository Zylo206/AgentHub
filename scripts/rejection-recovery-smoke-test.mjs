#!/usr/bin/env node

const API_BASE_URL = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const USERNAME = process.env.AGENTHUB_REJECTION_SMOKE_USERNAME || "demo";
const PASSWORD = process.env.AGENTHUB_REJECTION_SMOKE_PASSWORD || "demo";
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

async function createAndApproveApproval(conversationId, requestBody) {
  const approval = await request(`/api/conversations/${conversationId}/approval-requests`, {
    method: "POST",
    body: JSON.stringify(requestBody)
  });
  const approvalId = requireValue(approval.approvalId, "approvalId missing");
  const approved = await request(`/api/approval-requests/${approvalId}/approve`, {
    method: "POST"
  });
  if (approved.status !== "APPROVED") {
    throw new Error(`approval expected APPROVED, got ${approved.status}`);
  }
  return approvalId;
}

async function runOrchestratorWithOptionalApproval(conversationId, messageId) {
  try {
    return await request(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
      method: "POST",
      body: JSON.stringify({})
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("approvalId is required")) {
      throw error;
    }
  }
  const approvalId = await createAndApproveApproval(conversationId, {
    actionType: "ORCHESTRATOR_RUN",
    targetType: "MESSAGE",
    targetId: messageId,
    riskLevel: "MEDIUM",
    summary: "Rejection recovery smoke approves message-level orchestrator run.",
    affectedItems: [`Message: ${messageId}`]
  });
  return request(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
    method: "POST",
    body: JSON.stringify({ approvalId })
  });
}

async function main() {
  await login();
  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: `Rejection Recovery Smoke ${Date.now()}`,
      type: "GROUP"
    })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: [
        "Build a React login page artifact and run reviewer quality gates.",
        "Reviewer instruction: decision: reject because blocker risk must trigger retry/revise."
      ].join(" ")
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");

  const blockedRun = await runOrchestratorWithOptionalApproval(conversationId, messageId);
  if (String(blockedRun.status || "").toUpperCase() !== "BLOCKED") {
    throw new Error(`expected blocked task run, got ${blockedRun.status}`);
  }
  pass(`blocked task run verified: ${getIdValue(blockedRun.id)}`);

  const messages = await request(`/api/conversations/${conversationId}/messages`);
  const rejectionMessages = messages.filter((item) => item.messageType === "REJECTION");
  if (rejectionMessages.length === 0) {
    throw new Error("REJECTION protocol messages were not emitted.");
  }
  const hasRetryHint = rejectionMessages.some((item) =>
    String(item.content || "").toLowerCase().includes("retry") ||
    String(item.content || "").toLowerCase().includes("revise")
  );
  if (!hasRetryHint) {
    throw new Error("REJECTION messages did not include retry/revise guidance.");
  }
  pass(`rejection protocol verified: ${rejectionMessages.length} messages`);

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const initialRevisionCandidate =
    artifacts.find((artifact) => String(artifact.type || artifact.artifactType || "").toUpperCase() === "CODE") ||
    artifacts.find((artifact) => String(artifact.status || "").toUpperCase() !== "REJECTED") ||
    artifacts[0];
  let recoveryArtifactId = requireValue(getIdValue(initialRevisionCandidate?.id), "revision candidate artifact missing");
  let recoveryResult = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    recoveryResult = await request(`/api/artifacts/${recoveryArtifactId}/demo-revision`, {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        revisionInstruction: `Recovery attempt ${attempt}: resolve the review issues, remove the high-risk wording, keep verification-code login, rerun review, and return an accepted revision.`
      })
    });
    const runStatus = String(recoveryResult.taskRun?.status || "").toUpperCase();
    const reviewStatus = String(recoveryResult.reviewArtifact?.status || "").toUpperCase();
    if (runStatus === "COMPLETED" && reviewStatus === "ACCEPTED") {
      pass(`revision recovery verified on attempt ${attempt}: ${getIdValue(recoveryResult.revisedArtifact?.id)}`);
      break;
    }
    recoveryArtifactId = requireValue(
      getIdValue(recoveryResult.revisedArtifact?.id) || getIdValue(recoveryResult.reviewArtifact?.id),
      `recovery attempt ${attempt} did not return a usable artifact id`
    );
    if (attempt === 3) {
      throw new Error(
        `recovery revision did not converge after ${attempt} attempts, last run=${recoveryResult.taskRun?.status}, last review=${recoveryResult.reviewArtifact?.status}`
      );
    }
  }

  const taskRuns = await request(`/api/conversations/${conversationId}/task-runs`);
  const completedRuns = taskRuns.filter((taskRun) => String(taskRun.status || "").toUpperCase() === "COMPLETED");
  if (completedRuns.length === 0) {
    throw new Error("No completed recovery task run was found after revise/retry.");
  }

  const observability = await request(`/api/conversations/${conversationId}/task-run-observability`);
  if (typeof observability.retryCount !== "number") {
    throw new Error("Task-run observability summary missing retryCount.");
  }
  pass(`observability loaded for rejection recovery: retry=${observability.retryCount}`);

  console.log("Rejection recovery smoke completed successfully.");
}

main().catch((error) => fail("Rejection recovery smoke failed", error));
