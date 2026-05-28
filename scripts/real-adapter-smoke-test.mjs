#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const FRONTEND_DIR = path.join(REPO_ROOT, "frontend");
const CODE_BUILD_DIR = path.join(FRONTEND_DIR, ".vite", "agenthub-real-adapter-smoke");
const REQUIRED_ENV = [
  "AGENTHUB_OPENAI_ENABLED",
  "AGENTHUB_OPENAI_BASE_URL",
  "AGENTHUB_OPENAI_API_KEY",
  "AGENTHUB_OPENAI_MODEL",
  "AGENTHUB_ARTIFACT_GENERATION_MODE"
];
const STRICT_MODE = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_STRICT === "true";
const EXPECT_BUILD_VALIDATION = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_BUILD_VALIDATION === "true";
const EXPECT_QUALITY_SCORE = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_SCORE === "true";
const EXPECT_QUALITY_REASON = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_REASON === "true";
const EXPECT_EXECUTE_JSON_CONTRACT = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_EXECUTE_JSON_CONTRACT === "true";
const EXPECT_REAL_FIRST_ARTIFACT = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_REAL_FIRST_ARTIFACT === "true";
const EXPECT_CODE_BUILD = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD === "true";
const EXPECT_STREAMING = process.env.AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING === "true";

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
  if (normalized.includes("build_failed") || normalized.includes("buildvalidationstatus=failed") || normalized.includes("build validation") && normalized.includes("failed")) {
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

function parseSseEventData(event) {
  const payload = parseJsonValue(event.data);
  if (!payload || typeof payload !== "object") {
    return event;
  }
  return {
    ...event,
    resourceId: event.resourceId || payload.resourceId || "",
    payload: payload.payload || {},
    resourceType: event.resourceType || payload.resourceType || "",
    conversationId: payload.conversationId || event.conversationId || "",
    taskRunId: payload.taskRunId || payload.payload?.taskRunId || event.taskRunId || event.resourceId || "",
    taskStepId: payload.taskStepId || payload.payload?.taskStepId || event.taskStepId || "",
    adapterType: payload.adapterType || payload.payload?.adapterType || event.adapterType || "",
    chunk: payload.chunk || payload.payload?.chunk || "",
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
        let parsed = parseSseBlock(block);
        if (!parsed.eventType || parsed.eventType === "HEARTBEAT") {
          continue;
        }
        parsed = parseSseEventData(parsed);
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
    setTimeout(() => reject(new Error(`Timed out waiting for SSE events. Seen: ${events.map((event) => event.eventType).join(", ")}`)), 12000);
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

function assertStreamingEventsForTaskRun(taskRunId, events) {
  const streamEvents = events.filter((event) => event.eventType === "ADAPTER_STREAM_CHUNK");
  if (streamEvents.length === 0) {
    throw new Error(`expected ADAPTER_STREAM_CHUNK event, taskRunId=${taskRunId}`);
  }

  const runStreamEvents = streamEvents.filter((event) => {
    const payload = event.payload || {};
    const eventTaskRunId = String(event.taskRunId || "").trim();
    const eventChunk = String(payload.chunk || event.chunk || "").trim();
    const eventAdapterType = String(payload.adapterType || event.adapterType || "").trim();
    if (!eventChunk) {
      return false;
    }
    if (eventTaskRunId && taskRunId && eventTaskRunId !== taskRunId) {
      return false;
    }
    if (!eventTaskRunId && !taskRunId) {
      return false;
    }
    if (eventAdapterType) {
      return eventAdapterType === "OPENAI_COMPATIBLE";
    }
    return true;
  });
  if (runStreamEvents.length === 0) {
    throw new Error(`expected OPENAI_COMPATIBLE ADAPTER_STREAM_CHUNK with taskRunId=${taskRunId} and non-empty chunk`);
  }

  pass(`streaming chunk event observed for taskRun ${taskRunId} (${runStreamEvents.length} chunks)`);
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

function classifyTaskStepFailure(steps) {
  const diagnostic = steps.map(describeTaskStep).join(" | ");
  const failedStep = steps.find((step) => step.artifactParseStatus === "PARSE_FAILED")
    || steps.find((step) => step.artifactBuildValidationStatus === "FAILED")
    || steps.find((step) => step.artifactQualityStatus === "REJECTED")
    || steps.find((step) => step.adapterStatus === "FALLBACK_USED" || step.actualAdapterType === "MOCK")
    || steps[0];
  return classifiedError(
    `no TaskStep accepted real OPENAI_COMPATIBLE output. steps=${diagnostic}`,
    `${diagnostic}\n${failedStep?.adapterErrorMessage || ""}\n${failedStep?.artifactQualityReason || ""}`,
    OUTCOME.QUALITY_FAILED
  );
}

function assertRequiredEnvironment() {
  const missing = REQUIRED_ENV.filter((name) => !String(process.env[name] || "").trim());
  const isConfigured = missing.length === 0 && process.env.AGENTHUB_OPENAI_ENABLED === "true" && process.env.AGENTHUB_OPENAI_FIXTURE_ENABLED !== "true";
  if (!isConfigured && !STRICT_MODE) {
    return false;
  }
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
  return true;
}

function isFixtureBackedOpenAiAdapter(adapter) {
  const description = String(adapter?.description || "").toLowerCase();
  const failureReason = String(adapter?.failureReason || "").toLowerCase();
  return description.includes("fixture") || failureReason.includes("fixture");
}

function assertAdapterExecutionResponseContract(response) {
  if (!response || typeof response !== "object") {
    throw smokeError(OUTCOME.FALLBACK, "adapter execute response is not an object");
  }
  if (response.actualAdapterType !== "OPENAI_COMPATIBLE") {
    throw classifiedError(
      `expected actualAdapterType=OPENAI_COMPATIBLE, got ${response.actualAdapterType}`,
      `${response.errorMessage || ""}\n${response.content || ""}`
    );
  }
  if (response.status !== "COMPLETED") {
    throw classifiedError(
      `adapter execution expected COMPLETED, got ${response.status}: ${response.errorMessage || ""}`,
      `${response.errorMessage || ""}\n${response.content || ""}`
    );
  }
  if (response.fallbackUsed) {
    throw classifiedError(
      `adapter execution used fallback: ${response.errorMessage || "no reason"}`,
      `${response.errorMessage || ""}\n${response.content || ""}`
    );
  }
  if (typeof response.content !== "string" || !response.content.trim()) {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter execution response content is empty");
  }
  if (!Array.isArray(response.producedArtifactHints)) {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter execution response missing producedArtifactHints[]");
  }
}

function extensionForArtifact(artifact) {
  const title = String(artifact?.title || "").trim();
  const titleExtension = path.extname(title).replace(".", "").toLowerCase();
  if (["ts", "tsx", "js", "jsx"].includes(titleExtension)) {
    return titleExtension;
  }
  const language = String(artifact?.language || "").trim().toLowerCase();
  if (["ts", "tsx", "js", "jsx"].includes(language)) {
    return language;
  }
  return "tsx";
}

function safeArtifactBaseName(artifact) {
  const rawTitle = String(artifact?.title || "RealAdapterArtifact").replace(/\.[^.]+$/, "");
  const sanitized = rawTitle.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return sanitized || "RealAdapterArtifact";
}

function tscCommand() {
  const localTscJs = path.join(FRONTEND_DIR, "node_modules", "typescript", "bin", "tsc");
  if (existsSync(localTscJs)) {
    return {
      command: process.execPath,
      baseArgs: [localTscJs]
    };
  }
  const executable = process.platform === "win32" ? "tsc.cmd" : "tsc";
  const local = path.join(FRONTEND_DIR, "node_modules", ".bin", executable);
  return {
    command: existsSync(local) ? local : executable,
    baseArgs: []
  };
}

async function verifyCodeArtifactBuild(artifact) {
  await rm(CODE_BUILD_DIR, { recursive: true, force: true });
  const srcDir = path.join(CODE_BUILD_DIR, "src");
  await mkdir(srcDir, { recursive: true });
  try {
    const extension = extensionForArtifact(artifact);
    const fileName = `${safeArtifactBaseName(artifact)}.${extension}`;
    const artifactPath = path.join(srcDir, fileName);
    const content = String(artifact.content || "");
    if (!content.trim()) {
      throw new Error(`CODE artifact ${artifact.title} has empty content`);
    }
    if (content.trim().startsWith("```")) {
      throw new Error(`CODE artifact ${artifact.title} is Markdown fenced, expected raw source`);
    }
    await writeFile(artifactPath, content, "utf8");
    await writeFile(path.join(CODE_BUILD_DIR, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        noEmit: true,
        types: ["react", "react-dom"]
      },
      include: ["src/**/*"]
    }, null, 2), "utf8");

    const tsc = tscCommand();
    const result = spawnSync(tsc.command, [...tsc.baseArgs, "--project", path.join(CODE_BUILD_DIR, "tsconfig.json"), "--noEmit"], {
      cwd: FRONTEND_DIR,
      encoding: "utf8",
      shell: false
    });
    if (result.error) {
      throw new Error(`TypeScript build check could not start for ${artifact.title}: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
      const diagnostic = output || `tsc exited with status=${result.status}, signal=${result.signal || "none"}, command=${tsc.command}`;
      throw new Error(`TypeScript build check failed for ${artifact.title}: ${diagnostic.slice(0, 1200)}`);
    }
    pass(`CODE artifact TypeScript build check passed: ${artifact.title}`);
  } finally {
    await rm(CODE_BUILD_DIR, { recursive: true, force: true });
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
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter response content is empty");
  }
  if (raw.startsWith("```")) {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter response is wrapped in a Markdown code fence; expected raw JSON only");
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw smokeError(OUTCOME.PARSE_FAILED, `adapter response is not valid JSON: ${error.message}`);
  }
  if (!payload || typeof payload !== "object") {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter response JSON root must be an object");
  }
  if (typeof payload.assistantMessage !== "string" || !payload.assistantMessage.trim()) {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter response JSON missing assistantMessage");
  }
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length === 0) {
    throw smokeError(OUTCOME.PARSE_FAILED, "adapter response JSON missing non-empty artifacts[]");
  }
  payload.artifacts.forEach((artifact, index) => {
    for (const field of ["title", "type", "language", "content", "summary"]) {
      if (typeof artifact?.[field] !== "string" || !artifact[field].trim()) {
        throw smokeError(OUTCOME.PARSE_FAILED, `artifact[${index}] missing ${field}`);
      }
    }
    if (artifact.type === "CODE" && artifact.content.trim().startsWith("```")) {
      throw smokeError(OUTCOME.PARSE_FAILED, `artifact[${index}] CODE content must be raw source, not Markdown fenced`);
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
    if (STRICT_MODE) {
      throw new Error("OPENAI_COMPATIBLE adapter is missing from /api/adapters");
    }
    warn("OPENAI_COMPATIBLE adapter is not configured; skipping real adapter assertions.");
    return false;
  }
  if (openai.status !== "AVAILABLE") {
    if (STRICT_MODE) {
      throw new Error(`OPENAI_COMPATIBLE expected AVAILABLE, got ${openai.status}: ${openai.failureReason || openai.description || ""}`);
    }
    warn(`OPENAI_COMPATIBLE is not AVAILABLE (${openai.status}), skipping real adapter assertions.`);
    return false;
  }
  if (isFixtureBackedOpenAiAdapter(openai)) {
    if (STRICT_MODE) {
      throw new Error("OPENAI_COMPATIBLE is fixture-backed; real provider is required for this smoke test.");
    }
    warn("OPENAI_COMPATIBLE is fixture-backed; this is not real provider output and will be skipped.");
    return false;
  }
  if (openai.placeholder === true) {
    if (STRICT_MODE) {
      throw new Error("OPENAI_COMPATIBLE is placeholder-backed; this script requires real provider output.");
    }
    warn("OPENAI_COMPATIBLE is placeholder-backed; skipping strict real-provider assertions.");
    return false;
  }
  pass("OPENAI_COMPATIBLE adapter available");
  return true;
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

  if (EXPECT_EXECUTE_JSON_CONTRACT) {
    assertAdapterExecutionResponseContract(response);
  } else {
    if (response.actualAdapterType !== "OPENAI_COMPATIBLE") {
      throw classifiedError(
        `expected actualAdapterType=OPENAI_COMPATIBLE, got ${response.actualAdapterType}`,
        `${response.errorMessage || ""}\n${response.content || ""}`
      );
    }
    if (response.fallbackUsed) {
      throw classifiedError(
        `adapter execution used fallback: ${response.errorMessage || "no reason"}`,
        `${response.errorMessage || ""}\n${response.content || ""}`
      );
    }
    if (response.status !== "COMPLETED") {
      throw classifiedError(
        `adapter execution expected COMPLETED, got ${response.status}: ${response.errorMessage || ""}`,
        `${response.errorMessage || ""}\n${response.content || ""}`
      );
    }
    if (typeof response.content !== "string" || !response.content.trim()) {
      throw smokeError(OUTCOME.PARSE_FAILED, "adapter response content is empty");
    }
  }
  parseArtifactJson(response.content);
  pass(`${OUTCOME.ACCEPTED}: OPENAI_COMPATIBLE execute returned valid artifact JSON`);
  if (EXPECT_EXECUTE_JSON_CONTRACT) {
    pass("OPENAI_COMPATIBLE execute response contract validated");
  }
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

  const expectedEvents = EXPECT_STREAMING
    ? ["TASK_RUN_CREATED", "TASK_RUN_UPDATED", "ADAPTER_STREAM_CHUNK"]
    : ["TASK_RUN_CREATED", "TASK_RUN_UPDATED"];
  let taskRun = null;
  const events = await collectRealtimeEvents(
    conversationId,
    expectedEvents,
    async () => {
      taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
        method: "POST",
        body: JSON.stringify({
          messageId,
          userInput: DEMO_PROMPT,
          selectedAgentId: codeAgentId
        })
      });
    }
  );
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  pass(`demo task created: ${taskRunId}`);
  if (EXPECT_STREAMING) {
    assertStreamingEventsForTaskRun(taskRunId, events);
  }
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
    throw classifyTaskStepFailure(steps);
  }
  if (EXPECT_BUILD_VALIDATION || EXPECT_QUALITY_SCORE || EXPECT_QUALITY_REASON) {
    if (!acceptedRealStep.artifactParseStatus) {
      throw new Error(`accepted real step missing artifactParseStatus: ${acceptedRealStep.stepOrder}`);
    }
    pass(`accepted real step parse status: ${acceptedRealStep.artifactParseStatus}`);
  }
  if (EXPECT_BUILD_VALIDATION && !acceptedRealStep.artifactBuildValidationStatus) {
    throw new Error(`accepted real step missing artifactBuildValidationStatus: ${acceptedRealStep.stepOrder}`);
  }
  if (EXPECT_BUILD_VALIDATION && !String(acceptedRealStep.artifactBuildValidationReason || "").trim()) {
    throw new Error(`accepted real step missing artifactBuildValidationReason: ${acceptedRealStep.stepOrder}`);
  }
  if (EXPECT_QUALITY_SCORE && (typeof acceptedRealStep.artifactQualityScore !== "number" || !Number.isFinite(acceptedRealStep.artifactQualityScore))) {
    throw new Error(`accepted real step missing artifactQualityScore: ${acceptedRealStep.stepOrder}`);
  }
  if (EXPECT_QUALITY_REASON && !String(acceptedRealStep.artifactQualityReason || "").trim()) {
    throw new Error(`accepted real step missing artifactQualityReason: ${acceptedRealStep.stepOrder}`);
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  if (!Array.isArray(artifacts)) {
    throw new Error("artifacts response is not an array");
  }
  const realArtifacts = artifacts.filter((artifact) => artifact.sourceKind === "REAL_ADAPTER");
  if (realArtifacts.length === 0) {
    throw classifiedError(
      "expected at least one REAL_ADAPTER artifact",
      JSON.stringify(artifacts.slice(0, 5)),
      OUTCOME.FALLBACK
    );
  }
  const acceptedPrimary = realArtifacts.find((artifact) => artifact.qualityStatus === "ACCEPTED");
  if (!acceptedPrimary) {
    throw classifiedError(
      `no REAL_ADAPTER artifact passed quality checks: ${JSON.stringify(realArtifacts.slice(0, 3))}`,
      JSON.stringify(realArtifacts.slice(0, 3)),
      OUTCOME.QUALITY_FAILED
    );
  }
  if (EXPECT_BUILD_VALIDATION && !acceptedPrimary.buildValidationStatus) {
    throw new Error("accepted REAL_ADAPTER artifact missing buildValidationStatus");
  }
  if (EXPECT_BUILD_VALIDATION && !String(acceptedPrimary.buildValidationReason || "").trim()) {
    throw new Error("accepted REAL_ADAPTER artifact missing buildValidationReason");
  }
  if (EXPECT_QUALITY_SCORE && (typeof acceptedPrimary.qualityScore !== "number" || !Number.isFinite(acceptedPrimary.qualityScore))) {
    throw new Error("accepted REAL_ADAPTER artifact missing qualityScore");
  }
  if (EXPECT_QUALITY_REASON && !String(acceptedPrimary.qualityReason || "").trim()) {
    throw new Error("accepted REAL_ADAPTER artifact missing qualityReason");
  }
  if (EXPECT_CODE_BUILD) {
    const acceptedCodeArtifact = realArtifacts.find(
      (artifact) => artifact.type === "CODE" && artifact.qualityStatus === "ACCEPTED"
    );
    if (!acceptedCodeArtifact) {
      throw new Error("AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true but no accepted REAL_ADAPTER CODE artifact was produced.");
    }
    await verifyCodeArtifactBuild(acceptedCodeArtifact);
  }
  if (!acceptedPrimary.sourceAdapterType || acceptedPrimary.sourceAdapterType !== "OPENAI_COMPATIBLE") {
    throw new Error(`expected sourceAdapterType=OPENAI_COMPATIBLE, got ${acceptedPrimary.sourceAdapterType}`);
  }
  if (EXPECT_REAL_FIRST_ARTIFACT && !String(acceptedPrimary.generationMode || "").includes("REAL_FIRST")) {
    throw new Error(`expected REAL_FIRST primary artifact; got generationMode=${acceptedPrimary.generationMode || "UNKNOWN"}`);
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
  pass(`${OUTCOME.ACCEPTED}: REAL_FIRST accepted primary artifact: ${acceptedPrimary.title}`);
  if (EXPECT_REAL_FIRST_ARTIFACT) {
    pass(`REAL_FIRST primary artifact generationMode: ${acceptedPrimary.generationMode}`);
  }
  if (EXPECT_BUILD_VALIDATION) {
    pass(`accepted primary artifact build validation: ${acceptedPrimary.buildValidationStatus}`);
    pass(`accepted primary artifact build reason: ${acceptedPrimary.buildValidationReason}`);
  }
  if (EXPECT_QUALITY_SCORE) {
    pass(`accepted primary artifact quality score: ${String(acceptedPrimary.qualityScore)}`);
  }
  if (EXPECT_QUALITY_REASON) {
    pass(`accepted primary artifact quality reason: ${acceptedPrimary.qualityReason}`);
  }
  pass(`static fallback archived: ${archivedFallbacks.length}`);
}

async function run() {
  console.log(`AgentHub real adapter smoke target: ${API_BASE}`);
  console.log(`AgentHub real adapter strict mode: ${STRICT_MODE ? "enabled" : "disabled"}`);
  console.log(`AgentHub real adapter streaming assertion: ${EXPECT_STREAMING ? "enabled" : "disabled"}`);
  console.log(`AgentHub OpenAI streaming flag: ${process.env.AGENTHUB_OPENAI_STREAMING_ENABLED || "false"}`);
  console.log(`AgentHub real adapter execute JSON contract assertion: ${EXPECT_EXECUTE_JSON_CONTRACT ? "enabled" : "disabled"}`);
  console.log(`AgentHub real adapter REAL_FIRST artifact assertion: ${EXPECT_REAL_FIRST_ARTIFACT ? "enabled" : "disabled"}`);
  console.log(`AgentHub real build validation assertion: ${EXPECT_BUILD_VALIDATION ? "enabled" : "disabled"}`);
  console.log(`AgentHub real quality score assertion: ${EXPECT_QUALITY_SCORE ? "enabled" : "disabled"}`);
  console.log(`AgentHub real quality reason assertion: ${EXPECT_QUALITY_REASON ? "enabled" : "disabled"}`);
  console.log(`AgentHub real CODE TypeScript build assertion: ${EXPECT_CODE_BUILD ? "enabled" : "disabled"}`);

  const canRun = assertRequiredEnvironment();
  if (!canRun) {
    warn("required real-provider env is not configured. this smoke script is skipped in non-real mode.");
    if (!STRICT_MODE) {
      warn("Non-strict mode: fixture or config-only environments are treated as explicit skip signals.");
    }
    return;
  }

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }
  pass("health check");

  const openAiReady = await assertOpenAiAdapterAvailable();
  if (!openAiReady) {
    warn("OPENAI_COMPATIBLE adapter is not ready; skipping strict real adapter assertions.");
    return;
  }
  await executeOpenAiAdapter();
  await runDemoTaskWithRealAdapter();
  console.log("Real adapter smoke test completed successfully.");
}

run().catch((error) => {
  fail("real adapter smoke test failed", error);
});
