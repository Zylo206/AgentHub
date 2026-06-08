#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const ADAPTERS = parseCsv(process.env.AGENTHUB_ADAPTER_QUALITY_MATRIX_ADAPTERS || "OPENAI_COMPATIBLE,CLAUDE_CODE,CODEX")
  .map((value) => value.toUpperCase());
const TASK_FILTER = new Set(parseCsv(process.env.AGENTHUB_ADAPTER_QUALITY_MATRIX_TASKS || "").map((value) => value.toLowerCase()));
const REQUIRE_AVAILABLE = process.env.AGENTHUB_ADAPTER_QUALITY_MATRIX_REQUIRE_AVAILABLE === "true";
const REQUIRE_REAL = process.env.AGENTHUB_ADAPTER_QUALITY_MATRIX_REQUIRE_REAL === "true";
const STRICT = process.env.AGENTHUB_ADAPTER_QUALITY_MATRIX_STRICT === "true";
let authToken = "";

const OUTCOME = {
  ACCEPTED: "ACCEPTED",
  PARSE_FAILED: "PARSE_FAILED",
  QUALITY_FAILED: "QUALITY_FAILED",
  BUILD_FAILED: "BUILD_FAILED",
  FALLBACK: "FALLBACK",
  SKIPPED: "SKIPPED"
};

const TASKS = [
  {
    id: "frontend",
    requiredSkill: "code",
    prompt:
      "Create a compact React TypeScript UserBadge component with props for name, role, and status. Return AgentHub artifact JSON only."
  },
  {
    id: "api",
    requiredSkill: "api",
    prompt:
      "Design a small REST API contract for archiving a conversation and marking it read. Return AgentHub artifact JSON only."
  },
  {
    id: "review",
    requiredSkill: "review",
    prompt:
      "Review a login page implementation for security, accessibility, and maintainability. Return AgentHub artifact JSON only."
  },
  {
    id: "markdown",
    requiredSkill: "docs",
    prompt:
      "Write a short implementation note for AgentHub adapter fallback boundaries. Return AgentHub artifact JSON only."
  },
  {
    id: "web_preview",
    requiredSkill: "preview",
    prompt:
      "Create a small HTML preview card for an AgentHub deployment status panel. Return AgentHub artifact JSON only."
  },
  {
    id: "data_model",
    requiredSkill: "api",
    prompt:
      "Design a compact data model for conversation unread state with fields and constraints. Return AgentHub artifact JSON only."
  },
  {
    id: "deploy",
    requiredSkill: "deploy",
    prompt:
      "Draft a deployment handoff note that explains preview URL, static fallback, audit record, and rollback boundary. Return AgentHub artifact JSON only."
  },
  {
    id: "revision",
    requiredSkill: "code",
    prompt:
      "Revise a React TypeScript message action toolbar to make copy, reply, pin, and regenerate actions clearer. Return AgentHub artifact JSON only."
  }
].filter((task) => TASK_FILTER.size === 0 || TASK_FILTER.has(task.id));

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function warn(message) {
  console.warn(`[WARN] ${message}`);
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
  if (!authToken && path !== "/api/auth/login") {
    await loginForSmoke();
  }
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers || {})
      }
    });
  } catch (error) {
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend first. ${error.message}`);
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.message || `HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return payload.data;
}

async function loginForSmoke() {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "demo", password: "demo" })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true || !payload?.data?.token) {
    throw new Error(payload?.message || `Adapter quality matrix auth login failed: HTTP ${response.status}`);
  }
  authToken = payload.data.token;
}

function classifyDiagnostic(diagnostic) {
  const normalized = String(diagnostic || "").toLowerCase();
  if (normalized.includes("build_failed") || normalized.includes("build validation") && normalized.includes("failed")) {
    return OUTCOME.BUILD_FAILED;
  }
  if (normalized.includes("quality_failed") || normalized.includes("qualitystatus=rejected") || normalized.includes("quality") && normalized.includes("rejected")) {
    return OUTCOME.QUALITY_FAILED;
  }
  if (normalized.includes("parse_failed") || normalized.includes("contract") || normalized.includes("json") || normalized.includes("markdown fence")) {
    return OUTCOME.PARSE_FAILED;
  }
  if (normalized.includes("fallback") || normalized.includes("mock") || normalized.includes("misconfigured") || normalized.includes("disabled")) {
    return OUTCOME.FALLBACK;
  }
  return OUTCOME.FALLBACK;
}

function parseArtifactJson(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: "empty adapter content" };
  }
  if (raw.startsWith("```")) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: "adapter content is Markdown fenced" };
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: `invalid JSON: ${error.message}` };
  }
  if (typeof payload.assistantMessage !== "string" || !payload.assistantMessage.trim()) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: "missing assistantMessage" };
  }
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length < 1) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: "missing artifacts[]" };
  }
  const invalid = payload.artifacts.find((artifact) =>
    !artifact ||
    typeof artifact.title !== "string" ||
    typeof artifact.type !== "string" ||
    typeof artifact.language !== "string" ||
    typeof artifact.content !== "string" ||
    typeof artifact.summary !== "string" ||
    !artifact.title.trim() ||
    !artifact.type.trim() ||
    !artifact.language.trim() ||
    !artifact.content.trim() ||
    !artifact.summary.trim()
  );
  if (invalid) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: `artifact missing required fields: ${JSON.stringify(invalid).slice(0, 240)}` };
  }
  const fencedCode = payload.artifacts.find((artifact) => artifact.type === "CODE" && artifact.content.trim().startsWith("```"));
  if (fencedCode) {
    return { ok: false, outcome: OUTCOME.PARSE_FAILED, reason: `CODE artifact is Markdown fenced: ${fencedCode.title}` };
  }
  return { ok: true, outcome: OUTCOME.ACCEPTED, reason: `${payload.artifacts.length} artifact(s)` };
}

function isFixtureAdapter(adapter) {
  const details = adapter?.capabilityDetails && typeof adapter.capabilityDetails === "object"
    ? adapter.capabilityDetails
    : {};
  return details.availabilityProbe === "fixture" || String(adapter?.description || "").toLowerCase().includes("fixture");
}

async function executeAdapterTask(adapterType, conversationId, task) {
  const response = await request(`/api/adapters/${adapterType}/execute`, {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      taskRunId: `quality_matrix_${adapterType}_${task.id}_${Date.now()}`,
      taskStepId: `quality_matrix_step_${adapterType}_${task.id}`,
      agentId: `quality_matrix_agent_${adapterType}`,
      agentName: `${adapterType} Quality Matrix Agent`,
      userInput: task.prompt,
      systemPrompt:
        "Return one raw JSON object only. The object must have assistantMessage and artifacts[]. CODE content must be raw source, never Markdown fenced.",
      taskDescription: task.prompt,
      contextItems: [],
      artifactSummaries: [],
      metadata: {
        requiredSkill: task.requiredSkill,
        matrixTaskId: task.id
      }
    })
  });

  if (response.status !== "COMPLETED" || response.fallbackUsed) {
    const diagnostic = `${response.status || ""}\n${response.errorMessage || ""}\n${response.content || ""}`;
    return {
      outcome: classifyDiagnostic(diagnostic),
      reason: response.errorMessage || `status=${response.status || "UNKNOWN"}, fallback=${response.fallbackUsed === true}`
    };
  }
  if (response.actualAdapterType && response.actualAdapterType !== adapterType) {
    return {
      outcome: OUTCOME.FALLBACK,
      reason: `actualAdapterType=${response.actualAdapterType}`
    };
  }
  return parseArtifactJson(response.content);
}

function summarize(results) {
  const counters = new Map();
  for (const result of results) {
    const key = `${result.adapterType}:${result.outcome}`;
    counters.set(key, (counters.get(key) || 0) + 1);
  }
  console.log("\nAdapter quality matrix summary:");
  for (const adapterType of ADAPTERS) {
    const parts = Object.values(OUTCOME)
      .map((outcome) => `${outcome}=${counters.get(`${adapterType}:${outcome}`) || 0}`)
      .join(", ");
    console.log(`- ${adapterType}: ${parts}`);
  }
}

async function runMatrix() {
  console.log(`AgentHub Adapter quality matrix target: ${API_BASE}`);
  console.log(`Adapters: ${ADAPTERS.join(", ")}`);
  console.log(`Tasks: ${TASKS.map((task) => task.id).join(", ")}`);
  console.log(`Strict: ${STRICT}, requireAvailable: ${REQUIRE_AVAILABLE}, requireReal: ${REQUIRE_REAL}`);

  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }
  pass("health check");

  const adapters = await request("/api/adapters");
  const adapterByType = new Map((adapters || []).map((adapter) => [adapter.adapterType, adapter]));
  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: `Adapter Quality Matrix ${Date.now()}`, type: "GROUP" })
  });
  const conversationId = getIdValue(conversation.id);
  if (!conversationId) {
    throw new Error("conversationId missing");
  }
  pass(`conversation created: ${conversationId}`);

  const results = [];
  for (const adapterType of ADAPTERS) {
    const adapter = adapterByType.get(adapterType);
    if (!adapter) {
      const message = `${adapterType} adapter missing`;
      if (REQUIRE_AVAILABLE) {
        throw new Error(message);
      }
      warn(message);
      results.push({ adapterType, taskId: "-", outcome: OUTCOME.SKIPPED, reason: message });
      continue;
    }
    if (adapter.status !== "AVAILABLE") {
      const message = `${adapterType} not AVAILABLE: ${adapter.status} ${adapter.failureReason || adapter.description || ""}`.trim();
      if (REQUIRE_AVAILABLE) {
        throw new Error(message);
      }
      warn(message);
      results.push({ adapterType, taskId: "-", outcome: OUTCOME.SKIPPED, reason: message });
      continue;
    }
    if (REQUIRE_REAL && isFixtureAdapter(adapter)) {
      throw new Error(`${adapterType} is fixture-backed; REQUIRE_REAL forbids fixture mode`);
    }

    for (const task of TASKS) {
      let result;
      try {
        result = await executeAdapterTask(adapterType, conversationId, task);
      } catch (error) {
        result = {
          outcome: classifyDiagnostic(error.message),
          reason: error.message
        };
      }
      results.push({ adapterType, taskId: task.id, ...result });
      const line = `${adapterType}/${task.id}: ${result.outcome} - ${result.reason}`;
      if (result.outcome === OUTCOME.ACCEPTED) {
        pass(line);
      } else if (STRICT) {
        console.error(`[FAIL] ${line}`);
      } else {
        warn(line);
      }
    }
  }

  summarize(results);
  const attempted = results.filter((result) => result.outcome !== OUTCOME.SKIPPED);
  const failures = attempted.filter((result) => result.outcome !== OUTCOME.ACCEPTED);
  if (STRICT && failures.length > 0) {
    throw new Error(`Adapter quality matrix strict mode failed: ${failures.map((result) => `${result.adapterType}/${result.taskId}=${result.outcome}`).join(", ")}`);
  }
  if (REQUIRE_AVAILABLE && attempted.length === 0) {
    throw new Error("Adapter quality matrix required available adapters, but no task was attempted.");
  }
  console.log("Adapter quality matrix completed.");
}

runMatrix().catch((error) => {
  fail("Adapter quality matrix failed", error);
});
