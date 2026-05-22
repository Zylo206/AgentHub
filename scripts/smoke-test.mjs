#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

const DEMO_PROMPT = "帮我生成一个 React 登录页面，支持邮箱登录和验证码登录，同时生成 README，并检查代码质量。";
const REVISION_INSTRUCTION = "把按钮改成蓝色，并增加 loading 状态。";

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
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
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

function requireValue(value, message) {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

function pickCodeArtifact(artifacts) {
  const codeArtifacts = artifacts.filter((artifact) => artifact.artifactType === "CODE" || artifact.type === "CODE");
  return (
    codeArtifacts.find((artifact) => String(artifact.title || "").includes("LoginPage")) ||
    codeArtifacts[0] ||
    null
  );
}

async function runSmokeTest() {
  console.log(`AgentHub smoke test target: ${API_BASE}`);

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }
  pass("health check");

  const adapters = await request("/api/adapters");
  if (!Array.isArray(adapters)) {
    throw new Error("/api/adapters did not return an array");
  }
  const adapterSummary = adapters
    .map((adapter) => `${adapter.adapterType}=${adapter.status}`)
    .join(", ");
  if (!adapters.some((adapter) => adapter.adapterType === "MOCK")) {
    throw new Error(`MOCK adapter not found. Loaded adapters: ${adapterSummary}`);
  }
  pass(`adapters loaded: ${adapterSummary}`);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke Test Conversation",
      type: "GROUP"
    })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  pass(`conversation created: ${conversationId}`);

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: DEMO_PROMPT
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");
  pass(`message sent: ${messageId}`);

  const taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: DEMO_PROMPT
    })
  });
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  if (taskRun.status !== "COMPLETED") {
    throw new Error(`demo task status expected COMPLETED, got ${taskRun.status}`);
  }
  if (steps.length < 3) {
    throw new Error(`demo task expected at least 3 steps, got ${steps.length}`);
  }
  pass(`demo task completed: ${taskRunId}, steps=${steps.length}`);

  const taskRuns = await request(`/api/conversations/${conversationId}/task-runs`);
  if (!Array.isArray(taskRuns) || taskRuns.length < 1) {
    throw new Error("expected at least 1 task run");
  }
  pass(`task runs loaded: ${taskRuns.length}`);

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  if (!Array.isArray(artifacts) || artifacts.length < 1) {
    throw new Error("expected at least 1 artifact");
  }
  const artifact = pickCodeArtifact(artifacts);
  if (!artifact) {
    throw new Error(`CODE artifact not found. artifacts=${artifacts.map((item) => item.title).join(", ")}`);
  }
  const artifactId = requireValue(getIdValue(artifact.id), "artifactId missing");
  pass(`artifacts loaded: ${artifacts.length}, selected=${artifact.title || artifactId}`);

  const revision = await request(`/api/artifacts/${artifactId}/demo-revision`, {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      revisionInstruction: REVISION_INSTRUCTION
    })
  });
  if (!revision?.taskRun && !revision?.revisedArtifact) {
    throw new Error("revision response did not include taskRun or revisedArtifact");
  }
  pass("revision completed");

  const deployment = await request(`/api/artifacts/${artifactId}/demo-deploy`, {
    method: "POST"
  });
  const deploymentId = requireValue(deployment.deploymentId, "deploymentId missing");
  if (deployment.status !== "SUCCESS") {
    throw new Error(`deployment status expected SUCCESS, got ${deployment.status}`);
  }
  requireValue(deployment.previewUrl, "deployment previewUrl missing");
  pass(`deployment created: ${deploymentId}`);

  const deployments = await request(`/api/conversations/${conversationId}/deployments`);
  if (!Array.isArray(deployments) || deployments.length < 1) {
    throw new Error("expected at least 1 deployment");
  }
  pass(`deployments loaded: ${deployments.length}`);

  const messages = await request(`/api/conversations/${conversationId}/messages`);
  if (!Array.isArray(messages) || messages.length < 1) {
    throw new Error("expected messages to be returned");
  }
  const hasUserMessage = messages.some((item) => item.senderType === "USER" && item.content === DEMO_PROMPT);
  const hasDeployMessage = messages.some((item) => {
    const content = String(item.content || "");
    return item.messageType === "DEPLOY_STATUS" ||
      content.includes("deployment") ||
      content.includes("Preview URL") ||
      content.includes("部署");
  });
  if (!hasUserMessage) {
    throw new Error("user message not found in message list");
  }
  if (!hasDeployMessage) {
    throw new Error("deployment status message not found in message list");
  }
  pass(`messages loaded: ${messages.length}`);

  console.log("Smoke test completed successfully.");
}

runSmokeTest().catch((error) => {
  fail("smoke test failed", error);
});
