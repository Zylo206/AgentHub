#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const EXPECT_REAL_ADAPTER = process.env.AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER === "true";
const EXPECT_OPENAI_FIXTURE = process.env.AGENTHUB_SMOKE_EXPECT_OPENAI_FIXTURE === "true";
const EXPECT_REAL_FIRST = process.env.AGENTHUB_SMOKE_EXPECT_REAL_FIRST === "true";
const EXPECT_REVIEW_REJECTION = process.env.AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION === "true";
const EXPECT_REVIEW_QUALITY_REJECTION = process.env.AGENTHUB_SMOKE_EXPECT_REVIEW_QUALITY_REJECTION === "true";
const EXPECT_ANY_REVIEW_REJECTION = EXPECT_REVIEW_REJECTION || EXPECT_REVIEW_QUALITY_REJECTION;
const EXPECT_AUTO_TRIGGER_APPROVAL = process.env.AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL === "true";
const EXPECT_ADAPTER_STATS_PERSISTENCE = process.env.AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE === "true";
const EXPECT_JDBC_PROFILE = process.env.AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE === "true";
const EXPECT_REAL_BUILD_VALIDATION = process.env.AGENTHUB_SMOKE_EXPECT_REAL_BUILD_VALIDATION === "true";
const EXPECT_REAL_QUALITY_SCORE = process.env.AGENTHUB_SMOKE_EXPECT_REAL_QUALITY_SCORE === "true";
const EXPECT_REAL_QUALITY_REASON = process.env.AGENTHUB_SMOKE_EXPECT_REAL_QUALITY_REASON === "true";
const PERSISTENCE_MODE = process.env.AGENTHUB_PERSISTENCE_MODE || "";
const ADAPTER_STATS_PATH = process.env.AGENTHUB_ADAPTER_STATS_PERSISTENCE_PATH || "";
const REAL_ADAPTER_ARTIFACT_FIXTURE = {
  id: "fixture-real-adapter-artifact",
  title: "Real Adapter Output - Fixture",
  artifactType: "CODE",
  sourceKind: "REAL_ADAPTER",
  sourceAdapterType: "OPENAI_COMPATIBLE",
  sourceTaskStepId: "fixture-task-step",
  generationMode: "HYBRID_REAL",
  content: "export function FixtureLoginPage() { return <main>Fixture</main>; }"
};
const SMOKE_ATTACHMENTS = [
  {
    attachmentId: `smoke-brief-${Date.now()}`,
    fileName: "agenthub-smoke-brief.md",
    contentType: "text/markdown",
    size: 128,
    contentPreview: "Smoke attachment: preserve verification-code login, blue CTA, and review notes."
  }
];

const DEMO_PROMPT = "帮我生成一个 React 登录页面，支持邮箱登录和验证码登录，同时生成 README，并检查代码质量。";
const ACTIVE_DEMO_PROMPT = EXPECT_REVIEW_QUALITY_REJECTION
  ? `${DEMO_PROMPT}\nSmoke quality gate trigger: AGENTHUB_SMOKE_QUALITY_GATE=BUILD_FAILED.`
  : EXPECT_REVIEW_REJECTION
  ? `${DEMO_PROMPT}\nReviewer instruction: decision: reject because blocker risk must trigger retry/revise.`
  : DEMO_PROMPT;
const EXPECTED_DEMO_TASK_STATUS = EXPECT_ANY_REVIEW_REJECTION ? "BLOCKED" : "COMPLETED";
const REVISION_INSTRUCTION = "把按钮改成蓝色，并增加 loading 状态。";

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
  let response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: isFormData
        ? {
            ...(init.headers || {})
          }
        : {
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

async function requestBinary(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (error) {
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend first. ${error.message}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} from ${path}: ${text.slice(0, 160)}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { contentType, bytes, headers: response.headers };
}

async function uploadSmokeAttachment(conversationId) {
  const content = "Smoke attachment: preserve verification-code login, blue CTA, and review notes.";
  const formData = new FormData();
  formData.append("file", new Blob([content], { type: "text/markdown" }), "agenthub-smoke-brief.md");
  const attachment = await request(`/api/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData
  });
  if (!attachment.attachmentId || attachment.fileName !== "agenthub-smoke-brief.md") {
    throw new Error(`uploaded attachment response invalid: ${JSON.stringify(attachment)}`);
  }
  if (!String(attachment.contentPreview || "").includes("Smoke attachment")) {
    throw new Error("uploaded text attachment missing contentPreview");
  }
  return attachment;
}

async function expectRequestFailure(path, init = {}, expectedText = "") {
  try {
    await request(path, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (expectedText && !message.includes(expectedText)) {
      throw new Error(`Expected failure to include "${expectedText}", got "${message}"`);
    }
    return message;
  }

  throw new Error(`Expected request to fail: ${path}`);
}

async function runOrchestratorFromMessageWithApproval(conversationId, messageId, approvalId) {
  return request(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
    method: "POST",
    body: JSON.stringify({ approvalId })
  });
}

async function getOrchestratorTriggerSuggestion(conversationId, messageId) {
  try {
    return await request(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-trigger-suggestion`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("HTTP 404") || message.includes("HTTP 405")) {
      warn("orchestrator trigger suggestion endpoint is unavailable; skipping suggestion coverage.");
      return null;
    }
    throw error;
  }
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

function requireValue(value, message) {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

function getParticipantIds(conversation) {
  const participantAgentIds = Array.isArray(conversation?.participantAgentIds)
    ? conversation.participantAgentIds
    : [];

  return participantAgentIds.map(getIdValue).filter(Boolean);
}

function assertBuiltInParticipants(conversation, label) {
  const participantIds = getParticipantIds(conversation);
  const requiredParticipants = [
    "agent_orchestrator",
    "agent_frontend_builder",
    "agent_backend_worker",
    "agent_reviewer"
  ];
  const missingParticipants = requiredParticipants.filter((participantId) => !participantIds.includes(participantId));

  if (missingParticipants.length > 0) {
    throw new Error(
      `${label} missing required participants: ${missingParticipants.join(", ")}. actual=${participantIds.join(", ")}`
    );
  }

  return participantIds;
}

function resolvePreviewUrl(previewUrl) {
  const value = requireValue(previewUrl, "deployment previewUrl missing");
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.hostname === "localhost") {
      const frontendBaseUrl = new URL(FRONTEND_BASE);
      parsedUrl.protocol = frontendBaseUrl.protocol;
      parsedUrl.hostname = frontendBaseUrl.hostname;
      parsedUrl.port = frontendBaseUrl.port;
    }
    return parsedUrl.toString();
  } catch {
    if (!String(value).startsWith("/")) {
      throw new Error(`Invalid preview URL: ${value}`);
    }
    return `${FRONTEND_BASE}${value}`;
  }
}

async function verifyPreviewUrl(previewUrl) {
  const resolvedUrl = resolvePreviewUrl(previewUrl);
  let response;
  try {
    response = await fetch(resolvedUrl);
  } catch (error) {
    throw new Error(
      `Cannot reach frontend preview at ${resolvedUrl}. Start frontend first or set AGENTHUB_FRONTEND_BASE_URL. ${error.message}`
    );
  }
  if (response.status !== 200) {
    throw new Error(`Preview URL expected HTTP 200, got ${response.status}: ${resolvedUrl}`);
  }
  return resolvedUrl;
}

function pickCodeArtifact(artifacts) {
  const codeArtifacts = artifacts.filter((artifact) => artifact.artifactType === "CODE" || artifact.type === "CODE");
  if (EXPECT_REAL_FIRST) {
    const realCodeArtifact = codeArtifacts.find((artifact) => artifact.sourceKind === "REAL_ADAPTER");
    if (realCodeArtifact) {
      return realCodeArtifact;
    }
  }
  return (
    codeArtifacts.find((artifact) => String(artifact.title || "").includes("LoginPage")) ||
    codeArtifacts[0] ||
    null
  );
}

function splitContentLines(content) {
  const value = String(content || "");
  return value ? value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n") : [];
}

function estimateLineDiffStats(previousContent, nextContent) {
  const previousLines = splitContentLines(previousContent);
  const nextLines = splitContentLines(nextContent);
  const table = Array.from({ length: previousLines.length + 1 }, () =>
    Array.from({ length: nextLines.length + 1 }, () => 0)
  );

  for (let previousIndex = previousLines.length - 1; previousIndex >= 0; previousIndex -= 1) {
    for (let nextIndex = nextLines.length - 1; nextIndex >= 0; nextIndex -= 1) {
      table[previousIndex][nextIndex] = previousLines[previousIndex] === nextLines[nextIndex]
        ? table[previousIndex + 1][nextIndex + 1] + 1
        : Math.max(table[previousIndex + 1][nextIndex], table[previousIndex][nextIndex + 1]);
    }
  }

  let previousIndex = 0;
  let nextIndex = 0;
  let added = 0;
  let removed = 0;
  let context = 0;

  while (previousIndex < previousLines.length && nextIndex < nextLines.length) {
    if (previousLines[previousIndex] === nextLines[nextIndex]) {
      context += 1;
      previousIndex += 1;
      nextIndex += 1;
    } else if (table[previousIndex + 1][nextIndex] >= table[previousIndex][nextIndex + 1]) {
      removed += 1;
      previousIndex += 1;
    } else {
      added += 1;
      nextIndex += 1;
    }
  }

  removed += previousLines.length - previousIndex;
  added += nextLines.length - nextIndex;
  return { added, removed, context, changed: Math.min(added, removed) };
}

function buildSmokeDiffAffectedItems(revisionArtifact, baseArtifact) {
  const stats = estimateLineDiffStats(baseArtifact?.content, revisionArtifact?.content);
  return [
    `Artifact: ${revisionArtifact?.title || getIdValue(revisionArtifact?.id)} v${revisionArtifact?.version}`,
    `Base artifact: ${baseArtifact?.title || getIdValue(baseArtifact?.id)} v${baseArtifact?.version}`,
    `Diff summary: +${stats.added} added / -${stats.removed} removed / ${stats.context} context / ${stats.changed} changed blocks`,
    `Revision instruction: ${revisionArtifact?.revisionInstruction || "n/a"}`
  ];
}

function assertExplainableDiffStats(result, label) {
  for (const field of ["addedLines", "removedLines", "unchangedLines", "changedLines"]) {
    if (typeof result[field] !== "number") {
      throw new Error(`${label} missing numeric ${field}`);
    }
  }
  if (result.addedLines + result.removedLines <= 0) {
    throw new Error(`${label} expected at least one added or removed line`);
  }
}

function assertRealAdapterArtifactContract(artifact, label) {
  if (artifact.sourceKind !== "REAL_ADAPTER") {
    throw new Error(`${label} sourceKind expected REAL_ADAPTER, got ${artifact.sourceKind}`);
  }
  requireValue(artifact.sourceAdapterType, `${label} sourceAdapterType missing`);
  requireValue(artifact.sourceTaskStepId, `${label} sourceTaskStepId missing`);
  requireValue(artifact.generationMode, `${label} generationMode missing`);
  requireValue(artifact.title, `${label} title missing`);
  requireValue(artifact.content, `${label} content missing`);
  if (artifact.qualityStatus && artifact.qualityStatus !== "ACCEPTED") {
    throw new Error(`${label} qualityStatus expected ACCEPTED or empty legacy value, got ${artifact.qualityStatus}`);
  }
  if (artifact.qualityStatus === "ACCEPTED") {
    requireValue(artifact.qualityReason, `${label} qualityReason missing`);
  }
  if (artifact.artifactType === "CODE" || artifact.type === "CODE") {
    const content = String(artifact.content || "");
    if (content.includes("# Real Adapter Output") || content.includes("Persisted Because:")) {
      throw new Error(`${label} CODE content should be raw source, not wrapped adapter metadata`);
    }
  }
}

function isStepRetryReviseTriggered(step) {
  if (step.artifactQualityStatus !== "REJECTED") {
    return false;
  }
  const reason = String(step.artifactQualityReason || "").toLowerCase();
  return reason.includes("retry") || reason.includes("revise");
}

function normalizeQualityScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return String(score.toFixed(2));
}

function assertToolCapabilityRoutedStep(taskRun, expectedAgentId) {
  const routedStep = (Array.isArray(taskRun.steps) ? taskRun.steps : []).find(
    (step) => getIdValue(step.assignedAgentId) === expectedAgentId
  );
  if (!routedStep) {
    throw new Error(`custom capability-routed step not found for ${expectedAgentId}`);
  }
  if (!String(routedStep.routingReason || "").includes("Tool capability router selected Agent")) {
    throw new Error(`capability-routed step missing routingReason evidence: ${routedStep.routingReason || ""}`);
  }
  if (!String(routedStep.routingReason || "").includes("requiredSkill=QUALITY_REVIEW")) {
    throw new Error(`capability-routed step did not prove QUALITY_REVIEW route: ${routedStep.routingReason}`);
  }
  const weightedEvidence = [
    "score=",
    "capabilityScore=",
    "adapterHealthScore=",
    "historyScore=",
    "fallbackPenalty=",
    "preferredAdapter="
  ];
  const missingWeightedEvidence = weightedEvidence.filter(
    (token) => !String(routedStep.routingReason || "").includes(token)
  );
  if (missingWeightedEvidence.length > 0) {
    throw new Error(
      `capability-routed step missing weighted routing evidence (${missingWeightedEvidence.join(", ")}): ${routedStep.routingReason || ""}`
    );
  }
  return routedStep;
}

async function runSmokeTest() {
  console.log(`AgentHub smoke test target: ${API_BASE}`);
  console.log(`AgentHub frontend preview target: ${FRONTEND_BASE}`);
  console.log(`AgentHub real adapter artifact expectation: ${EXPECT_REAL_ADAPTER ? "enabled" : "disabled"}`);
  console.log(`AgentHub OpenAI fixture expectation: ${EXPECT_OPENAI_FIXTURE ? "enabled" : "disabled"}`);
  console.log(`AgentHub REAL_FIRST expectation: ${EXPECT_REAL_FIRST ? "enabled" : "disabled"}`);
  console.log(`AgentHub reviewer rejection expectation: ${EXPECT_REVIEW_REJECTION ? "enabled" : "disabled"}`);
  console.log(`AgentHub reviewer quality-gate rejection expectation: ${EXPECT_REVIEW_QUALITY_REJECTION ? "enabled" : "disabled"}`);
  console.log(`AgentHub auto-trigger approval expectation: ${EXPECT_AUTO_TRIGGER_APPROVAL ? "enabled" : "disabled"}`);
  console.log(`AgentHub adapter stats persistence expectation: ${EXPECT_ADAPTER_STATS_PERSISTENCE ? "enabled" : "disabled"}`);
  console.log(`AgentHub JDBC profile expectation: ${EXPECT_JDBC_PROFILE ? "enabled" : "disabled"}`);
  console.log(`AgentHub real build-validation assertion: ${EXPECT_REAL_BUILD_VALIDATION ? "enabled" : "disabled"}`);
  console.log(`AgentHub real quality score assertion: ${EXPECT_REAL_QUALITY_SCORE ? "enabled" : "disabled"}`);
  console.log(`AgentHub real quality reason assertion: ${EXPECT_REAL_QUALITY_REASON ? "enabled" : "disabled"}`);
  if (EXPECT_JDBC_PROFILE && PERSISTENCE_MODE.toLowerCase() !== "jdbc") {
    throw new Error("AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE=true requires AGENTHUB_PERSISTENCE_MODE=jdbc in the smoke test environment");
  }
  assertRealAdapterArtifactContract(REAL_ADAPTER_ARTIFACT_FIXTURE, "REAL_ADAPTER fixture");
  pass("REAL_ADAPTER fixture artifact contract validated");

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
  const adapterStatsMissing = adapters.filter((adapter) =>
    typeof adapter.routeAttempts !== "number" ||
    typeof adapter.successRate !== "number" ||
    typeof adapter.fallbackRate !== "number"
  );
  if (adapterStatsMissing.length > 0) {
    throw new Error(
      `adapter route stats fields missing: ${adapterStatsMissing.map((adapter) => adapter.adapterType).join(", ")}`
    );
  }
  if (EXPECT_OPENAI_FIXTURE) {
    const openaiAdapter = adapters.find((adapter) => adapter.adapterType === "OPENAI_COMPATIBLE");
    if (!openaiAdapter || openaiAdapter.status !== "AVAILABLE" || !String(openaiAdapter.description || "").includes("fixture")) {
      throw new Error(`OPENAI_COMPATIBLE fixture adapter not available. Loaded adapters: ${adapterSummary}`);
    }
  }
  pass(`adapters loaded: ${adapterSummary}`);
  pass("adapter route stats exposed");

  const agents = await request("/api/agents");
  const frontendAgent = agents.find((agent) => agent.name === "Frontend Builder");
  const reviewerAgent = agents.find((agent) => agent.name === "Reviewer");
  const agentDraft = await request("/api/agents/draft", {
    method: "POST",
    body: JSON.stringify({
      description: "创建一个安全评审 Agent，优先使用 Claude Code，负责 review、安全和质量门禁。"
    })
  });
  if (!agentDraft.name || !agentDraft.systemPrompt || !Array.isArray(agentDraft.toolTags) || !agentDraft.toolTags.includes("review")) {
    throw new Error(`natural-language agent draft invalid: ${JSON.stringify(agentDraft)}`);
  }
  if (!["LLM_OPENAI_COMPATIBLE", "RULE_BASED_FALLBACK"].includes(agentDraft.draftSource)) {
    throw new Error(`unexpected agent draft source: ${agentDraft.draftSource}`);
  }
  const draftedAgent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `${agentDraft.name} ${Date.now()}`,
      avatarUrl: agentDraft.avatarUrl,
      systemPrompt: agentDraft.systemPrompt,
      capabilityTags: agentDraft.capabilityTags,
      toolTags: agentDraft.toolTags,
      preferredAdapterType: agentDraft.preferredAdapterType
    })
  });
  const draftedAgentId = requireValue(getIdValue(draftedAgent.id), "drafted agent id missing");
  pass(`natural-language agent draft created and persisted: ${draftedAgentId} (${agentDraft.draftSource})`);
  let fixtureOpenAiCodeAgentId = null;
  let fixtureOpenAiReviewAgentId = null;
  if (EXPECT_OPENAI_FIXTURE) {
    const fixtureOpenAiCodeAgent = await request("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke OpenAI Fixture Code Agent ${Date.now()}`,
        systemPrompt: "Return AgentHub artifact JSON contract for smoke verification.",
        capabilityTags: ["smoke", "real-adapter"],
        toolTags: ["code", "preview"],
        preferredAdapterType: "OPENAI_COMPATIBLE"
      })
    });
    fixtureOpenAiCodeAgentId = requireValue(getIdValue(fixtureOpenAiCodeAgent.id), "fixtureOpenAiCodeAgentId missing");
    const fixtureOpenAiReviewAgent = await request("/api/agents", {
      method: "POST",
      body: JSON.stringify({
        name: `Smoke OpenAI Fixture Review Agent ${Date.now()}`,
        systemPrompt: "Review AgentHub artifacts and return approval or rejection in artifact JSON.",
        capabilityTags: ["smoke", "real-adapter", "review"],
        toolTags: ["review"],
        preferredAdapterType: "OPENAI_COMPATIBLE"
      })
    });
    fixtureOpenAiReviewAgentId = requireValue(
      getIdValue(fixtureOpenAiReviewAgent.id),
      "fixtureOpenAiReviewAgentId missing"
    );
    pass(`OPENAI fixture agents created: ${fixtureOpenAiCodeAgentId}, ${fixtureOpenAiReviewAgentId}`);
  }
  const mentionedAgentIds = [
    fixtureOpenAiCodeAgentId || getIdValue(frontendAgent?.id),
    fixtureOpenAiReviewAgentId || getIdValue(reviewerAgent?.id)
  ].filter(Boolean);
  if (mentionedAgentIds.length < 2) {
    throw new Error("expected built-in Frontend Builder and Reviewer agents for multi-mention smoke test");
  }
  pass(`agents loaded for multi-mention: ${mentionedAgentIds.join(", ")}`);

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke Test Conversation",
      type: "GROUP"
    })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  pass(`conversation created: ${conversationId}`);

  const initialParticipantIds = assertBuiltInParticipants(conversation, "created conversation");
  pass(`conversation participants initialized: ${initialParticipantIds.join(", ")}`);

  const managementConversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: `Smoke Management Conversation ${Date.now()}`,
      type: "GROUP"
    })
  });
  const managementConversationId = requireValue(
    getIdValue(managementConversation.id),
    "managementConversationId missing"
  );
  const pinnedConversation = await request(`/api/conversations/${managementConversationId}/pin`, { method: "POST" });
  if (pinnedConversation.pinned !== true) {
    throw new Error("pin conversation did not persist pinned=true");
  }
  await request(`/api/conversations/${managementConversationId}/unpin`, { method: "POST" });
  const managementMessage = await request(`/api/conversations/${managementConversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "conversation-server-search-token"
    })
  });
  requireValue(getIdValue(managementMessage.id), "management message id missing");
  const searchedConversations = await request(
    "/api/conversations?query=conversation-server-search-token&includeArchived=true"
  );
  if (!searchedConversations.some((item) => getIdValue(item.id) === managementConversationId)) {
    throw new Error("conversation server search did not match message content");
  }
  await request(`/api/conversations/${managementConversationId}/archive`, { method: "POST" });
  const defaultConversationsAfterArchive = await request("/api/conversations");
  if (defaultConversationsAfterArchive.some((item) => getIdValue(item.id) === managementConversationId)) {
    throw new Error("archived conversation should be hidden from default list");
  }
  const archivedConversations = await request("/api/conversations?includeArchived=true");
  if (!archivedConversations.some((item) => getIdValue(item.id) === managementConversationId && item.archived === true)) {
    throw new Error("archived conversation missing when includeArchived=true");
  }
  await request(`/api/conversations/${managementConversationId}/unarchive`, { method: "POST" });
  pass("conversation pin/search/archive/unarchive management validated");

  const uploadedAttachment = await uploadSmokeAttachment(conversationId);
  pass(`attachment uploaded: ${uploadedAttachment.attachmentId}`);

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: ACTIVE_DEMO_PROMPT,
      targetAgentId: mentionedAgentIds[0],
      mentionedAgentIds,
      attachments: [
        {
          attachmentId: uploadedAttachment.attachmentId,
          fileName: uploadedAttachment.fileName,
          contentType: uploadedAttachment.contentType,
          size: uploadedAttachment.sizeBytes,
          contentPreview: uploadedAttachment.contentPreview
        }
      ]
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");
  if (!Array.isArray(message.mentionedAgentIds) || message.mentionedAgentIds.length < 2) {
    throw new Error(`message did not persist mentionedAgentIds: ${JSON.stringify(message.mentionedAgentIds)}`);
  }
  if (
    !Array.isArray(message.attachments) ||
    message.attachments.length !== 1 ||
    message.attachments[0]?.attachmentId !== uploadedAttachment.attachmentId ||
    message.attachments[0]?.fileName !== uploadedAttachment.fileName ||
    !String(message.attachments[0]?.contentPreview || "").includes("Smoke attachment")
  ) {
    throw new Error(`message did not persist lightweight attachments: ${JSON.stringify(message.attachments)}`);
  }
  const downloadedAttachment = await fetch(`${API_BASE}/api/attachments/${uploadedAttachment.attachmentId}/download`);
  if (downloadedAttachment.status !== 200) {
    throw new Error(`attachment download expected HTTP 200, got ${downloadedAttachment.status}`);
  }
  const downloadedText = await downloadedAttachment.text();
  if (!downloadedText.includes("Smoke attachment")) {
    throw new Error("downloaded attachment content mismatch");
  }
  pass(`message sent: ${messageId}`);
  pass(`message attachments persisted and downloadable: ${message.attachments.length}`);

  const triggerSuggestion = await getOrchestratorTriggerSuggestion(conversationId, messageId);
  if (triggerSuggestion?.enabled) {
    if (!triggerSuggestion.matched) {
      throw new Error(`auto-trigger suggestion is enabled but did not match demo prompt: ${triggerSuggestion.reason}`);
    }
    if (EXPECT_AUTO_TRIGGER_APPROVAL && !triggerSuggestion.requireApproval) {
      throw new Error("expected auto-trigger to require approval, but suggestion.requireApproval=false");
    }
    pass(`auto-trigger suggestion matched: ${triggerSuggestion.decision}`);
  } else if (EXPECT_AUTO_TRIGGER_APPROVAL) {
    throw new Error("AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL=true but suggestion endpoint reported disabled");
  } else {
    pass("auto-trigger suggestion disabled by configuration");
  }

  let autoTriggeredTaskRun = null;
  if (EXPECT_AUTO_TRIGGER_APPROVAL) {
    await expectRequestFailure(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
      method: "POST",
      body: JSON.stringify({})
    }, "approvalId is required");
    pass("backend approval enforced for auto-triggered orchestrator run without approvalId");

    const approvalRequestsAfterMessage = await request(`/api/conversations/${conversationId}/approval-requests`);
    const pendingAutoTriggerApproval = approvalRequestsAfterMessage.find((approval) =>
      approval.actionType === "ORCHESTRATOR_RUN" &&
      approval.targetType === "MESSAGE" &&
      approval.targetId === messageId &&
      approval.status === "PENDING"
    );
    if (!pendingAutoTriggerApproval) {
      throw new Error("expected message send to create a pending ORCHESTRATOR_RUN approval request");
    }
    const approvalId = requireValue(pendingAutoTriggerApproval.approvalId, "auto-trigger approvalId missing");
    const approvedAutoTriggerApproval = await request(`/api/approval-requests/${approvalId}/approve`, { method: "POST" });
    if (approvedAutoTriggerApproval.status !== "APPROVED") {
      throw new Error(`auto-trigger approval expected APPROVED, got ${approvedAutoTriggerApproval.status}`);
    }
    pass(`auto-trigger approval confirmed: ${approvalId}`);
    autoTriggeredTaskRun = await runOrchestratorFromMessageWithApproval(conversationId, messageId, approvalId);
  } else if (triggerSuggestion?.enabled) {
    pass("message-level orchestrator auto-trigger run skipped; set AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL=true to exercise approval/run.");
  }
  if (autoTriggeredTaskRun) {
    const autoTriggeredTaskRunId = requireValue(getIdValue(autoTriggeredTaskRun.id), "autoTriggeredTaskRunId missing");
    if (autoTriggeredTaskRun.status !== EXPECTED_DEMO_TASK_STATUS) {
      throw new Error(`auto-triggered orchestrator run status expected ${EXPECTED_DEMO_TASK_STATUS}, got ${autoTriggeredTaskRun.status}`);
    }
    if (!autoTriggeredTaskRun.orchestratorDecisionLog?.routingDecision) {
      throw new Error("auto-triggered orchestrator run missing routing decision evidence");
    }
    pass(`message-level orchestrator auto-trigger completed: ${autoTriggeredTaskRunId}`);
  }

  const replyMessage = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "补充约束：移动端首屏也要保持清晰。",
      replyToMessageId: messageId,
      quotedMessageId: messageId
    })
  });
  if (getIdValue(replyMessage.replyToMessageId) !== messageId || getIdValue(replyMessage.quotedMessageId) !== messageId) {
    throw new Error("structured reply / quote fields were not persisted");
  }
  if (!String(replyMessage.quotedMessageContent || "").includes("React 登录页面")) {
    throw new Error("quotedMessageContent snapshot missing expected source message content");
  }
  pass(`structured message relation saved: replyTo=${replyMessage.replyToMessageId}, quoted=${replyMessage.quotedMessageId}`);

  const pinnedContext = await request(`/api/conversations/${conversationId}/messages/${messageId}/pin`, {
    method: "POST"
  });
  const pinnedContextId = requireValue(pinnedContext.id, "pinnedContextId missing");
  pass(`message pinned as context: ${pinnedContextId}`);

  const pinnedContexts = await request(`/api/conversations/${conversationId}/pinned-contexts`);
  if (!Array.isArray(pinnedContexts) || !pinnedContexts.some((item) => item.sourceId === messageId)) {
    throw new Error("pinned message context not found");
  }
  pass(`pinned contexts loaded: ${pinnedContexts.length}`);

  const memory = await request(`/api/conversations/${conversationId}/messages/${messageId}/memory`, {
    method: "POST",
    body: JSON.stringify({ category: "PROJECT_FACT" })
  });
  const memoryId = requireValue(memory.memoryId, "memoryId missing");
  pass(`message saved as memory: ${memoryId}`);

  const updatedMemory = await request(`/api/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify({
      category: "DECISION",
      scope: "CONVERSATION",
      importance: 9,
      content: "Smoke test memory: prefer blue login buttons and keep verification code login visible."
    })
  });
  if (updatedMemory.category !== "DECISION" || updatedMemory.importance !== 9) {
    throw new Error("memory update did not persist category and importance");
  }
  pass(`memory updated: ${updatedMemory.category}, importance=${updatedMemory.importance}`);

  const memories = await request(`/api/conversations/${conversationId}/memories`);
  if (!Array.isArray(memories) || !memories.some((item) => item.memoryId === memoryId)) {
    throw new Error("saved memory not found");
  }
  pass(`memories loaded: ${memories.length}`);

  const relevantMemories = await request(`/api/conversations/${conversationId}/memories/relevant?limit=3`);
  if (!Array.isArray(relevantMemories) || relevantMemories[0]?.memoryId !== memoryId) {
    throw new Error("relevant memory retrieval did not prioritize the updated memory");
  }
  pass(`relevant memories loaded: ${relevantMemories.length}, top=${relevantMemories[0].memoryId}`);

  const taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: ACTIVE_DEMO_PROMPT
    })
  });
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  if (taskRun.status !== EXPECTED_DEMO_TASK_STATUS) {
    throw new Error(`demo task status expected ${EXPECTED_DEMO_TASK_STATUS}, got ${taskRun.status}`);
  }
  if (steps.length < 3) {
    throw new Error(`demo task expected at least 3 steps, got ${steps.length}`);
  }
  const resultSummary = String(taskRun.resultSummary || "");
  if (!resultSummary.includes("规划模式：")) {
    throw new Error("demo task resultSummary did not expose planner mode");
  }
  const plannerModeMatch = resultSummary.match(/规划模式：([^，。]+)/);
  const plannerMode = plannerModeMatch?.[1] || "unknown";
  if (!["RULE_BASED_DEMO", "RULE_BASED_FALLBACK", "LLM_PLANNER"].includes(plannerMode)) {
    throw new Error(`unexpected planner mode in resultSummary: ${plannerMode}`);
  }
  if (!String(steps[0]?.inputContext || "").includes("Pinned context")) {
    throw new Error("first task step inputContext did not reference pinned context");
  }
  if (!String(steps[0]?.inputContext || "").includes("Long-term memory")) {
    throw new Error("first task step inputContext did not reference long-term memory");
  }
  if (!String(steps[0]?.inputContext || "").includes("Smoke test memory")) {
    throw new Error("first task step inputContext did not include retrieved memory content");
  }
  if (!String(steps[0]?.inputContext || "").includes("Retrieved context")) {
    throw new Error("first task step inputContext did not include Context Retrieval v3 results");
  }
  if (!String(steps[0]?.inputContext || "").includes("AgentHub-managed multi-turn session")) {
    throw new Error("first task step inputContext did not include AgentHub-managed multi-turn session context");
  }
  const decisionLog = taskRun.orchestratorDecisionLog;
  if (!decisionLog) {
    throw new Error("demo task did not return orchestratorDecisionLog");
  }
  const requiredDecisionFields = [
    "plannerDecision",
    "routingDecision",
    "executionDecision",
    "aggregationDecision",
    "fallbackDecision"
  ];
  const missingDecisionFields = requiredDecisionFields.filter(
    (field) => !String(decisionLog[field] || "").trim()
  );
  if (missingDecisionFields.length > 0) {
    throw new Error(`orchestratorDecisionLog missing fields: ${missingDecisionFields.join(", ")}`);
  }
  if (!String(decisionLog.plannerDecision).includes("Planner")) {
    throw new Error("orchestratorDecisionLog plannerDecision did not include Planner evidence");
  }
  if (!String(decisionLog.plannerDecision).includes("promptLayering=")) {
    throw new Error("orchestratorDecisionLog plannerDecision did not include prompt layering evidence");
  }
  if (!String(decisionLog.routingDecision).includes("Step")) {
    throw new Error("orchestratorDecisionLog routingDecision did not include step routing evidence");
  }
  const taskGraph = taskRun.taskGraph;
  if (!taskGraph || !Array.isArray(taskGraph.executionBatches) || taskGraph.executionBatches.length < 1) {
    throw new Error("demo task did not return taskGraph execution batches");
  }
  const runtimeBatch = taskGraph.executionBatches.find((batch) =>
    Array.isArray(batch.stepOrders) && batch.stepOrders.length >= 2
  );
  if (!runtimeBatch) {
    throw new Error("expected at least one runtime execution batch with multiple steps");
  }
  if (!runtimeBatch.startedAt || !runtimeBatch.completedAt || typeof runtimeBatch.durationMs !== "number") {
    throw new Error(`parallel execution batch missing runtime fields: ${JSON.stringify(runtimeBatch)}`);
  }
  if (runtimeBatch.failurePolicy !== "STEP_FALLBACK_TO_MOCK") {
    throw new Error(`unexpected batch failurePolicy: ${runtimeBatch.failurePolicy}`);
  }
  const parallelGroups = steps.reduce((groups, step) => {
    const groupKey = step.parallelGroupKey || `GROUP_${step.stepOrder}`;
    groups.set(groupKey, [...(groups.get(groupKey) || []), step.stepOrder]);
    return groups;
  }, new Map());
  const parallelGroupEntry = Array.from(parallelGroups.entries()).find(([, stepOrders]) => stepOrders.length >= 2);
  if (!parallelGroupEntry) {
    throw new Error(
      `expected at least one parallel execution group for multi-mention task, got ${JSON.stringify(Array.from(parallelGroups.entries()))}`
    );
  }
  if (!steps.some((step) => Array.isArray(step.dependsOnStepOrders) && step.dependsOnStepOrders.length > 0)) {
    throw new Error("expected at least one task step to declare dependsOnStepOrders");
  }
  pass(`demo task completed: ${taskRunId}, steps=${steps.length}`);
  pass(`orchestrator decision log loaded: ${decisionLog.decisionMode || "UNKNOWN"}`);
  pass(`planner mode visible: ${plannerMode}`);
  pass(`task graph loaded: ${taskGraph.executionBatches.length} batch(es)`);
  pass(`parallel batch runtime validated: ${runtimeBatch.batchKey}, durationMs=${runtimeBatch.durationMs}`);
  pass(`parallel execution group validated: ${parallelGroupEntry[0]} -> steps ${parallelGroupEntry[1].join(", ")}`);

  const rerunTaskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: ACTIVE_DEMO_PROMPT
    })
  });
  const rerunTaskRunId = requireValue(getIdValue(rerunTaskRun.id), "rerun taskRunId missing");
  const rerunSteps = Array.isArray(rerunTaskRun.steps) ? rerunTaskRun.steps : [];
  if (rerunTaskRun.status !== EXPECTED_DEMO_TASK_STATUS) {
    throw new Error(`message rerun task status expected ${EXPECTED_DEMO_TASK_STATUS}, got ${rerunTaskRun.status}`);
  }
  if (rerunSteps.length < 3) {
    throw new Error(`message rerun task expected at least 3 steps, got ${rerunSteps.length}`);
  }
  pass(`message rerun demo task completed: ${rerunTaskRunId}, steps=${rerunSteps.length}`);

  const refreshedConversation = await request(`/api/conversations/${conversationId}`);
  const refreshedParticipantIds = assertBuiltInParticipants(refreshedConversation, "refreshed conversation");
  if (typeof refreshedConversation.unreadCount !== "number" || refreshedConversation.unreadCount < 1) {
    throw new Error(`conversation unreadCount expected to increase after agent replies, got ${refreshedConversation.unreadCount}`);
  }
  const readConversation = await request(`/api/conversations/${conversationId}/read`, { method: "POST" });
  if (readConversation.unreadCount !== 0 || !readConversation.lastReadAt) {
    throw new Error(`conversation read marker did not reset unread state: ${JSON.stringify(readConversation)}`);
  }
  pass(`conversation participants loaded: ${refreshedParticipantIds.length}`);
  pass("conversation unread/read marker validated");

  const contextSnapshots = await request(`/api/task-runs/${taskRunId}/context-snapshots`);
  const rerunContextSnapshots = await request(`/api/task-runs/${rerunTaskRunId}/context-snapshots`);
  const explainContextSnapshots = [
    ...(Array.isArray(contextSnapshots) ? contextSnapshots : []),
    ...(Array.isArray(rerunContextSnapshots) ? rerunContextSnapshots : [])
  ];
  const hasPinnedSnapshotItem = Array.isArray(contextSnapshots) && contextSnapshots.some((snapshot) =>
    (Array.isArray(snapshot.pinnedContextItems) &&
      snapshot.pinnedContextItems.some((item) => String(item).includes(messageId))) ||
    (Array.isArray(snapshot.includedMessageIds) &&
      snapshot.includedMessageIds.some((item) => getIdValue(item) === messageId))
  );
  if (!hasPinnedSnapshotItem) {
    throw new Error("context snapshot did not include pinned message context");
  }
  const hasRetrievedContextItem = Array.isArray(contextSnapshots) && contextSnapshots.some((snapshot) =>
    Array.isArray(snapshot.retrievedContextItems) && snapshot.retrievedContextItems.length > 0
  );
  if (!hasRetrievedContextItem) {
    throw new Error("context snapshot did not include retrievedContextItems");
  }
  const retrievedContextItems = explainContextSnapshots.flatMap((snapshot) =>
    Array.isArray(snapshot.retrievedContextItems) ? snapshot.retrievedContextItems : []
  );
  const missingRetrievalExplanation = retrievedContextItems.find(
    (item) => typeof item.score !== "number" || typeof item.semanticScore !== "number" || !String(item.reason || "").trim()
  );
  if (missingRetrievalExplanation) {
    throw new Error(
      `retrieved context item missing score/semanticScore/reason explanation: ${JSON.stringify(missingRetrievalExplanation)}`
    );
  }
  const missingRetrievalScoreBreakdown = retrievedContextItems.find(
    (item) =>
      typeof item.baseScore !== "number" ||
      typeof item.keywordScore !== "number" ||
      typeof item.recencyScore !== "number" ||
      typeof item.importanceScore !== "number" ||
      typeof item.sourceRank !== "number" ||
      !Array.isArray(item.matchedTokens) ||
      !String(item.semanticBackend || "").trim() ||
      !["LIST_GREP_READ", "LIST_READ_FALLBACK"].includes(String(item.searchStage || "")) ||
      !String(item.windowPolicy || "").trim()
  );
  if (missingRetrievalScoreBreakdown) {
    throw new Error(
      `retrieved context item missing v4 score breakdown: ${JSON.stringify(missingRetrievalScoreBreakdown)}`
    );
  }
  const retrievedSourceTypes = new Set(retrievedContextItems.map((item) => item.sourceType));
  const requiredRetrievedSourceTypes = ["RECENT_MESSAGE", "ARTIFACT", "MEMORY", "ATTACHMENT", "TASK_RUN_SUMMARY"];
  const missingRetrievedSourceTypes = requiredRetrievedSourceTypes.filter((sourceType) => !retrievedSourceTypes.has(sourceType));
  if (missingRetrievedSourceTypes.length > 0) {
    throw new Error(
      `context retrieval source coverage missing ${missingRetrievedSourceTypes.join(", ")} from ${Array.from(retrievedSourceTypes).join(", ")}`
    );
  }
  const hasGrepReadStage = retrievedContextItems.some((item) => item.searchStage === "LIST_GREP_READ");
  if (!hasGrepReadStage) {
    throw new Error("context retrieval explain did not include a List/Grep/Read hit");
  }
  pass(`context snapshots include pinned context: ${contextSnapshots.length}`);
  pass("context snapshots include retrieved context items");
  pass(`context retrieval v4 explanations validated: ${retrievedContextItems.length}`);
  pass(`context retrieval source coverage validated: ${requiredRetrievedSourceTypes.join(", ")}`);

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
  const retryAdviceArtifact = artifacts.find((item) =>
    String(item.title || "").includes("retry / revise") &&
    String(item.content || "").includes("Retry / Revise Instruction")
  );
  if (EXPECT_ANY_REVIEW_REJECTION) {
    const rejectedReviewArtifact = artifacts.find((item) =>
      item.type === "REVIEW_REPORT" &&
      item.status === "REJECTED" &&
      String(item.content || "").includes("Decision: REJECTED")
    );
    if (!rejectedReviewArtifact) {
      throw new Error("review rejection expected a REJECTED Review Report artifact");
    }
    if (!retryAdviceArtifact) {
      throw new Error("review rejection expected retry / revise advice artifact");
    }
    if (!String(taskRun.orchestratorDecisionLog?.aggregationDecision || "").includes("reviewDecision=REJECTED")) {
      throw new Error("orchestratorDecisionLog did not record reviewDecision=REJECTED");
    }
    if (EXPECT_REVIEW_QUALITY_REJECTION) {
      const qualityRejectedArtifacts = artifacts.filter((item) =>
        item.buildValidationStatus === "FAILED" ||
        item.qualityStatus === "REJECTED" ||
        String(item.qualityReason || "").includes("Smoke quality gate trigger")
      );
      const qualityDecisionEvidence = [
        taskRun.orchestratorDecisionLog?.aggregationDecision,
        taskRun.orchestratorDecisionLog?.fallbackDecision,
        retryAdviceArtifact?.content,
        rejectedReviewArtifact.content
      ].map((item) => String(item || "")).join("\n");
      if (qualityRejectedArtifacts.length < 1) {
        throw new Error("quality-gate rejection expected at least one artifact with FAILED/REJECTED quality metadata");
      }
      if (!qualityDecisionEvidence.includes("quality-gate") && !qualityDecisionEvidence.includes("build/lint validation failed")) {
        throw new Error("quality-gate rejection expected decision evidence to name the quality gate");
      }
      pass(`review quality-gate rejection metadata validated: ${qualityRejectedArtifacts.map((item) => item.title || item.id).join(", ")}`);
    }
    pass(`review rejection artifacts validated: ${rejectedReviewArtifact.title}, ${retryAdviceArtifact.title}`);
  }

  const realAdapterSteps = steps.filter(
    (step) => step.actualAdapterType && step.actualAdapterType !== "MOCK" && step.adapterStatus === "COMPLETED"
  );
  const expectRealQualityMetadata = EXPECT_REAL_BUILD_VALIDATION || EXPECT_REAL_QUALITY_SCORE || EXPECT_REAL_QUALITY_REASON;
  const adapterOutputArtifacts = artifacts.filter((item) =>
    item.sourceKind === "REAL_ADAPTER" || String(item.title || "").startsWith("Real Adapter Output -")
  );
  const acceptedRealAdapterSteps = realAdapterSteps.filter(
    (step) => step.realOutputUsed === true || step.artifactQualityStatus === "ACCEPTED"
  );
  const rejectedRealAdapterSteps = realAdapterSteps.filter((step) => step.artifactQualityStatus === "REJECTED");
  if (expectRealQualityMetadata && realAdapterSteps.length === 0) {
    throw new Error(
      "expected TaskStep.quality metadata assertions but no non-MOCK completed real Adapter steps were found"
    );
  }
  if (acceptedRealAdapterSteps.length > 0 && adapterOutputArtifacts.length < acceptedRealAdapterSteps.length) {
    throw new Error(
      `expected adapter output artifacts for accepted real adapter steps. acceptedRealAdapterSteps=${acceptedRealAdapterSteps.length}, adapterOutputArtifacts=${adapterOutputArtifacts.length}`
    );
  }
  const rejectedStepsMissingReason = rejectedRealAdapterSteps.filter((step) => !step.artifactQualityReason);
  if (rejectedStepsMissingReason.length > 0) {
    throw new Error(
      `rejected real adapter steps missing artifactQualityReason: ${rejectedStepsMissingReason.map((step) => step.stepOrder).join(", ")}`
    );
  }
  if (EXPECT_REAL_BUILD_VALIDATION) {
    const missingBuildValidation = realAdapterSteps.filter((step) => !step.artifactBuildValidationStatus);
    if (missingBuildValidation.length > 0) {
      throw new Error(
        `real adapter steps missing artifactBuildValidationStatus: ${missingBuildValidation.map((step) => step.stepOrder).join(", ")}`
      );
    }
    pass("real adapter build validation status present on TaskSteps");
  }
  if (EXPECT_REAL_QUALITY_SCORE) {
    const missingQualityScore = realAdapterSteps.filter(
      (step) => typeof step.artifactQualityScore !== "number" || !Number.isFinite(step.artifactQualityScore)
    );
    if (missingQualityScore.length > 0) {
      throw new Error(
        `real adapter steps missing artifactQualityScore: ${missingQualityScore.map((step) => step.stepOrder).join(", ")}`
      );
    }
    pass(`real adapter quality score present on TaskSteps (scores: ${realAdapterSteps.map((step) =>
      `#${step.stepOrder}=${normalizeQualityScore(step.artifactQualityScore)}`
    ).join(", ")})`);
  }
  if (EXPECT_REAL_QUALITY_REASON) {
    const missingQualityReason = realAdapterSteps.filter((step) => !String(step.artifactQualityReason || "").trim());
    if (missingQualityReason.length > 0) {
      throw new Error(
        `real adapter steps missing artifactQualityReason: ${missingQualityReason.map((step) => step.stepOrder).join(", ")}`
      );
    }
    pass("real adapter quality reason present on TaskSteps");
  }
  if (EXPECT_ANY_REVIEW_REJECTION) {
    const rejectionDecisionText = [
      taskRun.orchestratorDecisionLog?.aggregationDecision,
      taskRun.orchestratorDecisionLog?.executionDecision,
      retryAdviceArtifact?.content
    ].map((item) => String(item || "").toLowerCase()).join("\n");
    const retryTriggered =
      rejectionDecisionText.includes("retry") ||
      rejectionDecisionText.includes("revise") ||
      rejectionDecisionText.includes("rerunreviewer") ||
      realAdapterSteps.some((step) => isStepRetryReviseTriggered(step));
    if (!retryTriggered) {
      const retryCandidates = realAdapterSteps.map((step) => `#${step.stepOrder}:${step.artifactQualityStatus}`).join(", ");
      throw new Error(`expected retry/revise signal during review rejection, got ${retryCandidates || "no real-adapter quality rejection"}`);
    }
    pass("review rejection loop exposed retry/revise intent");
  }
  if (expectRealQualityMetadata && adapterOutputArtifacts.length === 0) {
    throw new Error("expected real quality metadata assertions but no REAL_ADAPTER artifacts were produced");
  }
  if (EXPECT_REAL_ADAPTER && adapterOutputArtifacts.length < 1) {
    throw new Error("AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER=true but no REAL_ADAPTER artifact was produced");
  }
  if (adapterOutputArtifacts.length > 0) {
    adapterOutputArtifacts.forEach((item, index) =>
      assertRealAdapterArtifactContract(item, `REAL_ADAPTER artifact[${index}]`)
    );
    if (EXPECT_REAL_BUILD_VALIDATION) {
      const adapterArtifactsWithoutBuildValidation = adapterOutputArtifacts.filter((artifact) => !artifact.buildValidationStatus);
      if (adapterArtifactsWithoutBuildValidation.length > 0) {
        throw new Error(
          `REAL_ADAPTER artifacts missing buildValidationStatus: ${adapterArtifactsWithoutBuildValidation
            .map((item) => item.title || item.id)
            .join(", ")}`
        );
      }
      pass("real adapter artifacts include build validation status");
    }
    if (EXPECT_REAL_QUALITY_SCORE) {
      const adapterArtifactsWithoutQualityScore = adapterOutputArtifacts.filter(
        (artifact) => typeof artifact.qualityScore !== "number" || !Number.isFinite(artifact.qualityScore)
      );
      if (adapterArtifactsWithoutQualityScore.length > 0) {
        throw new Error(
          `REAL_ADAPTER artifacts missing qualityScore: ${adapterArtifactsWithoutQualityScore.map((item) => item.title || item.id).join(", ")}`
        );
      }
      pass(
        `real adapter artifacts quality score present: ${adapterOutputArtifacts
          .map((item) => `${item.title || item.id}=${typeof item.qualityScore === "number" ? item.qualityScore.toFixed(2) : "N/A"}`)
          .join(", ")}`
      );
    }
    if (EXPECT_REAL_QUALITY_REASON) {
      const adapterArtifactsWithoutQualityReason = adapterOutputArtifacts.filter(
        (artifact) => !String(artifact.qualityReason || "").trim()
      );
      if (adapterArtifactsWithoutQualityReason.length > 0) {
        throw new Error(
          `REAL_ADAPTER artifacts missing qualityReason: ${adapterArtifactsWithoutQualityReason.map((item) => item.title || item.id).join(", ")}`
        );
      }
      pass("real adapter artifacts include quality reason");
    }
    const missingStepQuality = realAdapterSteps.filter((step) =>
      !step.artifactParseStatus || !step.artifactQualityStatus || !step.artifactQualityReason
    );
    if (missingStepQuality.length > 0) {
      throw new Error(`real adapter steps missing artifact quality metadata: ${missingStepQuality.map((step) => step.stepOrder).join(", ")}`);
    }
    pass(`adapter output artifacts loaded: ${adapterOutputArtifacts.length}`);
  }
  if (EXPECT_OPENAI_FIXTURE) {
    const hasFixtureContractArtifact = adapterOutputArtifacts.some((item) =>
      item.sourceAdapterType === "OPENAI_COMPATIBLE" &&
      String(item.content || "").trim().length > 0 &&
      String(item.generationMode || "").includes("REAL")
    );
    if (!hasFixtureContractArtifact) {
      throw new Error("OPENAI_COMPATIBLE fixture did not produce a REAL_ADAPTER artifact contract");
    }
    pass("OPENAI_COMPATIBLE fixture REAL_ADAPTER contract validated");
  }
  if (EXPECT_REAL_FIRST) {
    if (artifact.sourceKind !== "REAL_ADAPTER") {
      throw new Error(`REAL_FIRST expected selected primary CODE artifact to be REAL_ADAPTER, got ${artifact.sourceKind}`);
    }
    if (artifact.qualityStatus !== "ACCEPTED") {
      throw new Error(`REAL_FIRST expected primary artifact qualityStatus=ACCEPTED, got ${artifact.qualityStatus}`);
    }
    const archivedFallbacks = artifacts.filter((item) =>
      item.status === "ARCHIVED" && String(item.generationMode || "").includes("REAL_FIRST_STATIC_FALLBACK")
    );
    if (archivedFallbacks.length < 1) {
      throw new Error("REAL_FIRST expected static fallback artifacts to be archived after real adapter success");
    }
    pass(`REAL_FIRST primary artifact validated: ${artifact.title}`);
  }

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
  if (!revision.taskRun?.orchestratorDecisionLog?.plannerDecision) {
    throw new Error("revision taskRun missing orchestratorDecisionLog");
  }
  const revisionSteps = Array.isArray(revision.taskRun?.steps) ? revision.taskRun.steps : [];
  if (!String(revisionSteps[0]?.inputContext || "").includes("AgentHub-managed multi-turn session")) {
    throw new Error("revision task step inputContext did not include AgentHub-managed multi-turn session context");
  }
  if (EXPECT_ANY_REVIEW_REJECTION) {
    if (revision.taskRun.status !== "COMPLETED") {
      throw new Error(`review rejection recovery expected revision taskRun status COMPLETED, got ${revision.taskRun.status}`);
    }
    if (revision.reviewArtifact?.type !== "REVIEW_REPORT" || revision.reviewArtifact?.status !== "ACCEPTED") {
      throw new Error(
        `review rejection recovery expected ACCEPTED Review Report after revision, got ${revision.reviewArtifact?.type}/${revision.reviewArtifact?.status}`
      );
    }
    if (String(revision.reviewArtifact?.content || "").includes("Decision: REJECTED")) {
      throw new Error("review rejection recovery expected revision review report to leave REJECTED state");
    }
    pass("review rejection recovery returned to approval after revision");
  }
  pass("revision completed");
  pass(`revision decision log loaded: ${revision.taskRun.orchestratorDecisionLog.decisionMode || "UNKNOWN"}`);

  const snapshotsAfterRevision = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!Array.isArray(snapshotsAfterRevision) || !snapshotsAfterRevision.some((snapshot) => snapshot.operationType === "DEMO_REVISION")) {
    throw new Error("expected DEMO_REVISION artifact snapshot after revision");
  }
  pass(`artifact snapshots loaded after revision: ${snapshotsAfterRevision.length}`);

  const revisedArtifactId = requireValue(getIdValue(revision.revisedArtifact?.id), "revisedArtifactId missing");
  const diffAffectedItems = buildSmokeDiffAffectedItems(revision.revisedArtifact, artifact);
  await expectRequestFailure(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST"
  }, "approvalId is required");
  pass("backend approval enforced for apply diff without approvalId");
  const applyApprovalId = await createAndApproveApproval(conversationId, {
    actionType: "APPLY_DIFF",
    targetType: "ARTIFACT",
    targetId: revisedArtifactId,
    riskLevel: "MEDIUM",
    summary: "Smoke test approves applying generated diff.",
    affectedItems: diffAffectedItems
  });
  const applyDiffResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({ approvalId: applyApprovalId })
  });
  assertExplainableDiffStats(applyDiffResult, "apply diff response");
  requireValue(applyDiffResult.snapshotId, "apply diff snapshotId missing");
  const appliedArtifactId = requireValue(getIdValue(applyDiffResult.appliedArtifact?.id), "appliedArtifactId missing");
  if (applyDiffResult.appliedArtifact.status !== "ACCEPTED") {
    throw new Error(`expected applied artifact status ACCEPTED, got ${applyDiffResult.appliedArtifact.status}`);
  }
  if (applyDiffResult.revisionArtifactId !== revisedArtifactId) {
    throw new Error("apply diff response did not reference the revised artifact");
  }
  pass(`diff applied: ${appliedArtifactId}, added=${applyDiffResult.addedLines}, removed=${applyDiffResult.removedLines}`);

  await expectRequestFailure(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({ approvalId: applyApprovalId })
  }, "APPROVED");
  pass("consumed approval cannot be reused");

  const snapshotsAfterApply = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!snapshotsAfterApply.some((snapshot) => snapshot.operationType === "APPLY_DIFF")) {
    throw new Error("expected APPLY_DIFF artifact snapshot after apply diff");
  }
  pass(`artifact snapshots loaded after apply diff: ${snapshotsAfterApply.length}`);

  const conflictResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: await createAndApproveApproval(conversationId, {
        actionType: "APPLY_DIFF",
        targetType: "ARTIFACT",
        targetId: revisedArtifactId,
        riskLevel: "MEDIUM",
        summary: "Smoke test approves conflict-path diff apply.",
        affectedItems: diffAffectedItems
      })
    })
  });
  assertExplainableDiffStats(conflictResult, "conflict diff response");
  if (conflictResult.conflict !== true || conflictResult.appliedArtifact) {
    throw new Error("expected repeated diff apply to return a conflict without creating another artifact");
  }
  if (!conflictResult.latestAppliedArtifactId) {
    throw new Error("diff conflict response missing latestAppliedArtifactId");
  }
  if (!String(conflictResult.conflictReason || "").includes(conflictResult.latestAppliedArtifactId)) {
    throw new Error("diff conflict response reason did not identify the latest applied artifact");
  }
  pass(`diff conflict detected: latest=${conflictResult.latestAppliedArtifactId}`);

  await expectRequestFailure(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({ force: true })
  }, "approvalId is required");
  pass("backend approval enforced for force apply diff without approvalId");
  const forceApplyResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({
      force: true,
      approvalId: await createAndApproveApproval(conversationId, {
        actionType: "FORCE_APPLY_DIFF",
        targetType: "ARTIFACT",
        targetId: revisedArtifactId,
        riskLevel: "HIGH",
        summary: "Smoke test approves force applying generated diff.",
        affectedItems: [
          ...diffAffectedItems,
          "Mode: force apply, bypass conflict guard after explicit approval"
        ]
      })
    })
  });
  assertExplainableDiffStats(forceApplyResult, "force apply diff response");
  requireValue(forceApplyResult.snapshotId, "force apply snapshotId missing");
  const forcedAppliedArtifactId = requireValue(
    getIdValue(forceApplyResult.appliedArtifact?.id),
    "forced appliedArtifactId missing"
  );
  if (forceApplyResult.appliedArtifact.status !== "ACCEPTED") {
    throw new Error(`expected forced applied artifact status ACCEPTED, got ${forceApplyResult.appliedArtifact.status}`);
  }
  if (forceApplyResult.conflictBypassed !== true) {
    throw new Error("force apply response did not report conflictBypassed=true");
  }
  if (!String(forceApplyResult.conflictReason || "").includes("Force apply bypassed conflict guard")) {
    throw new Error("force apply response missing conflict bypass reason");
  }
  pass(`diff force applied with conflict bypass: ${forcedAppliedArtifactId}`);

  await expectRequestFailure(`/api/artifacts/${appliedArtifactId}/demo-deploy`, {
    method: "POST"
  }, "approvalId is required");
  pass("backend approval enforced for demo deploy without approvalId");
  const deployment = await request(`/api/artifacts/${appliedArtifactId}/demo-deploy`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: await createAndApproveApproval(conversationId, {
        actionType: "DEMO_DEPLOY",
        targetType: "ARTIFACT",
        targetId: appliedArtifactId,
        riskLevel: "MEDIUM",
        summary: "Smoke test approves static demo deployment.",
        affectedItems: [`Artifact: ${appliedArtifactId}`]
      })
    })
  });
  const deploymentId = requireValue(deployment.deploymentId, "deploymentId missing");
  if (deployment.status !== "SUCCESS") {
    throw new Error(`deployment status expected SUCCESS, got ${deployment.status}`);
  }
  const deploymentPreviewUrl = requireValue(deployment.previewUrl, "deployment previewUrl missing");
  pass(`deployment created: ${deploymentId}`);

  const deployIntentMessage = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "请部署当前产物并生成预览 URL。"
    })
  });
  requireValue(getIdValue(deployIntentMessage.id), "deploy intent messageId missing");
  pass("deploy intent message persisted for chat-driven deploy path");

  const artifactBundle = await requestBinary(
    `/api/conversations/${conversationId}/artifact-bundle/download?artifactIds=${encodeURIComponent(appliedArtifactId)}&includeRelated=true`
  );
  if (!artifactBundle.contentType.includes("application/zip")) {
    throw new Error(`artifact bundle content-type expected application/zip, got ${artifactBundle.contentType}`);
  }
  if (artifactBundle.bytes.length < 32) {
    throw new Error(`artifact bundle expected non-empty zip, got ${artifactBundle.bytes.length} bytes`);
  }
  const artifactCount = Number(artifactBundle.headers.get("x-agenthub-artifact-count") || "0");
  if (!Number.isFinite(artifactCount) || artifactCount < 1) {
    throw new Error("artifact bundle response missing X-AgentHub-Artifact-Count header");
  }
  pass(`artifact bundle downloaded: ${artifactBundle.bytes.length} bytes / ${artifactCount} artifacts`);

  const snapshotsAfterDeploy = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!snapshotsAfterDeploy.some((snapshot) => snapshot.operationType === "DEMO_DEPLOY")) {
    throw new Error("expected DEMO_DEPLOY artifact snapshot after deploy");
  }
  pass(`artifact snapshots loaded after deploy: ${snapshotsAfterDeploy.length}`);

  const restoreCandidate = snapshotsAfterDeploy.find((snapshot) => snapshot.operationType === "APPLY_DIFF")
    || snapshotsAfterDeploy[0];
  await expectRequestFailure(`/api/artifact-snapshots/${restoreCandidate.snapshotId}/restore`, {
    method: "POST"
  }, "approvalId is required");
  pass("backend approval enforced for snapshot restore without approvalId");
  const restoredArtifact = await request(`/api/artifact-snapshots/${restoreCandidate.snapshotId}/restore`, {
    method: "POST",
    body: JSON.stringify({
      approvalId: await createAndApproveApproval(conversationId, {
        actionType: "RESTORE_SNAPSHOT",
        targetType: "ARTIFACT_SNAPSHOT",
        targetId: restoreCandidate.snapshotId,
        riskLevel: "HIGH",
        summary: "Smoke test approves restoring artifact snapshot.",
        affectedItems: [`Snapshot: ${restoreCandidate.snapshotId}`]
      })
    })
  });
  const restoredArtifactId = requireValue(getIdValue(restoredArtifact.id), "restoredArtifactId missing");
  if (restoredArtifact.status !== "ACCEPTED") {
    throw new Error(`restored artifact status expected ACCEPTED, got ${restoredArtifact.status}`);
  }
  const artifactsAfterRestore = await request(`/api/conversations/${conversationId}/artifacts`);
  if (!Array.isArray(artifactsAfterRestore) || !artifactsAfterRestore.some((item) => getIdValue(item.id) === restoredArtifactId)) {
    throw new Error("restored artifact was not visible in conversation artifacts list");
  }
  pass(`artifact snapshot restored: ${restoredArtifactId}`);

  const approvalAudit = await request(`/api/conversations/${conversationId}/action-audits`, {
    method: "POST",
    body: JSON.stringify({
      actionType: "SMOKE_APPROVAL_GATE",
      targetType: "ARTIFACT",
      targetId: restoredArtifactId,
      status: "APPROVED",
      summary: "Smoke test approval gate record."
    })
  });
  if (approvalAudit.actionType !== "SMOKE_APPROVAL_GATE" || approvalAudit.status !== "APPROVED") {
    throw new Error("approval gate audit record was not persisted");
  }
  pass(`approval audit recorded: ${approvalAudit.auditId}`);

  const actionAudits = await request(`/api/conversations/${conversationId}/action-audits`);
  if (!Array.isArray(actionAudits) || actionAudits.length < 6) {
    throw new Error("expected action audit records for revision/apply/deploy/restore");
  }
  const approvalRequests = await request(`/api/conversations/${conversationId}/approval-requests`);
  if (!Array.isArray(approvalRequests) || !approvalRequests.some((approval) => approval.status === "CONSUMED")) {
    throw new Error("expected consumed backend approval request records");
  }
  const diffApprovalWithSummary = approvalRequests.find((approval) =>
    ["APPLY_DIFF", "FORCE_APPLY_DIFF"].includes(approval.actionType) &&
    Array.isArray(approval.affectedItems) &&
    approval.affectedItems.some((item) => String(item).includes("Artifact:")) &&
    approval.affectedItems.some((item) => String(item).includes("Diff summary:"))
  );
  if (!diffApprovalWithSummary) {
    throw new Error("expected diff approval request affectedItems to include artifact and diff summary");
  }
  const requiredAuditActions = [
    "APPLY_DIFF",
    "DEMO_DEPLOY",
    "RESTORE_SNAPSHOT",
    "SMOKE_APPROVAL_GATE",
    "APPROVAL_REQUEST_CREATED",
    "APPROVAL_REQUEST_APPROVED",
    "APPROVAL_REQUEST_CONSUMED"
  ];
  const missingAuditActions = requiredAuditActions.filter((actionType) =>
    !actionAudits.some((auditLog) => auditLog.actionType === actionType)
  );
  if (missingAuditActions.length > 0) {
    throw new Error(`missing action audit records: ${missingAuditActions.join(", ")}`);
  }
  pass(`action audits loaded: ${actionAudits.length}`);
  pass(`approval requests loaded: ${approvalRequests.length}`);

  const resolvedPreviewUrl = await verifyPreviewUrl(deploymentPreviewUrl);
  pass(`preview page reachable: ${resolvedPreviewUrl}`);

  const deployments = await request(`/api/conversations/${conversationId}/deployments`);
  if (!Array.isArray(deployments) || deployments.length < 1) {
    throw new Error("expected at least 1 deployment");
  }
  pass(`deployments loaded: ${deployments.length}`);

  const messages = await request(`/api/conversations/${conversationId}/messages`);
  if (!Array.isArray(messages) || messages.length < 1) {
    throw new Error("expected messages to be returned");
  }
  const hasUserMessage = messages.some((item) => item.senderType === "USER" && item.content === ACTIVE_DEMO_PROMPT);
  const hasStructuredReplyMessage = messages.some(
    (item) => item.replyToMessageId === messageId && item.quotedMessageId === messageId
  );
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
  if (!hasStructuredReplyMessage) {
    throw new Error("structured reply / quote message not found in message list");
  }
  if (!hasDeployMessage) {
    throw new Error("deployment status message not found in message list");
  }
  if (adapterOutputArtifacts.length > 0) {
    const hasAdapterOutputMessage = messages.some((item) =>
      String(item.content || "").includes("真实 / 半真实 Adapter 输出产物") ||
      String(item.content || "").includes("Created real / semi-real Adapter output artifact") ||
      String(item.content || "").includes("Adapter output artifact")
    );
    if (!hasAdapterOutputMessage) {
      throw new Error("adapter output artifact message not found in message list");
    }
  }
  const agentMessages = messages.filter((item) => item.senderType === "AGENT");
  const requiredAgentSenders = [
    "agent_orchestrator",
    "agent_frontend_builder",
    "agent_backend_worker"
  ];
  const missingAgentSenders = requiredAgentSenders.filter(
    (senderId) => !agentMessages.some((item) => item.senderId === senderId)
  );
  const orchestratorMessages = agentMessages.filter((item) => item.senderId === "agent_orchestrator");
  const hasOrchestratorSummary = orchestratorMessages.some((item) =>
    String(item.content || "").includes("群聊协作汇总")
  );
  const taskStepAgentMessages = agentMessages.filter((item) => String(item.content || "").includes("TaskStep"));
  const protocolMessageTypes = new Set(agentMessages.map((item) => item.messageType));
  const requiredProtocolTypes = EXPECT_ANY_REVIEW_REJECTION
    ? ["TASK", "RESULT", "REVIEW", "REJECTION"]
    : ["TASK", "RESULT", "REVIEW", "APPROVAL"];
  const missingProtocolTypes = requiredProtocolTypes.filter((messageType) => !protocolMessageTypes.has(messageType));
  const rejectionMessages = agentMessages.filter((item) => item.messageType === "REJECTION");
  if (EXPECT_ANY_REVIEW_REJECTION) {
    const hasRetryReviseSuggestion = rejectionMessages.some((item) =>
      String(item.content || "").includes("retry/revise") || String(item.content || "").includes("revise")
    );
    if (rejectionMessages.length < 2 || !hasRetryReviseSuggestion) {
      throw new Error(`expected reviewer rejection loop messages, got ${rejectionMessages.length}`);
    }
  }
  if (
    agentMessages.length < 5 ||
    missingAgentSenders.length > 0 ||
    orchestratorMessages.length < 2 ||
    !hasOrchestratorSummary ||
    taskStepAgentMessages.length < 3 ||
    missingProtocolTypes.length > 0
  ) {
    throw new Error(
      `expected group chat agent messages from Orchestrator and protocol types, got agentMessages=${agentMessages.length}, taskStepMessages=${taskStepAgentMessages.length}, missing=${missingAgentSenders.join(",") || "none"}, orchestratorMessages=${orchestratorMessages.length}, hasSummary=${hasOrchestratorSummary}, missingProtocolTypes=${missingProtocolTypes.join(",") || "none"}`
    );
  }
  pass(`messages loaded: ${messages.length}`);
  pass(`group chat agent messages loaded: ${agentMessages.length}, orchestrator=${orchestratorMessages.length}, taskStep=${taskStepAgentMessages.length}`);
  pass(`agent collaboration protocol loaded: ${requiredProtocolTypes.join(", ")}`);
  if (rejectionMessages.length > 0) {
    const invalidRejectionMessage = rejectionMessages.find((item) => !item.senderId || !String(item.content || "").trim());
    if (invalidRejectionMessage) {
      throw new Error("REJECTION protocol message missing senderId or content");
    }
    pass(`REJECTION protocol messages validated: ${rejectionMessages.length}`);
  } else {
    warn("REJECTION protocol enum is available, but the current demo-task path did not emit a REJECTION message; retry/rejection closure remains a test coverage gap.");
  }

  const capabilityReviewAgent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `Smoke Capability Reviewer ${Date.now()}`,
      systemPrompt: "Review generated artifacts and reject unsafe output when needed.",
      capabilityTags: ["smoke"],
      toolTags: ["review"],
      preferredAdapterType: "MOCK"
    })
  });
  const capabilityReviewAgentId = requireValue(getIdValue(capabilityReviewAgent.id), "capabilityReviewAgentId missing");
  const capabilityConversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      title: "Smoke Capability Route Conversation",
      type: "GROUP"
    })
  });
  const capabilityConversationId = requireValue(getIdValue(capabilityConversation.id), "capabilityConversationId missing");
  const capabilityMessage = await request(`/api/conversations/${capabilityConversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: "Run the default demo task and route the review step by tool capability."
    })
  });
  const capabilityMessageId = requireValue(getIdValue(capabilityMessage.id), "capabilityMessageId missing");
  const capabilityTaskRun = await request(`/api/conversations/${capabilityConversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId: capabilityMessageId,
      userInput: "Run the default demo task and route the review step by tool capability."
    })
  });
  const capabilityRoutedStep = assertToolCapabilityRoutedStep(capabilityTaskRun, capabilityReviewAgentId);
  pass(`tool capability route validated: ${capabilityReviewAgentId}, step=${capabilityRoutedStep.stepOrder}`);

  const agentMessageToRegenerate = taskStepAgentMessages[0];
  const agentMessageToRegenerateId = requireValue(
    getIdValue(agentMessageToRegenerate?.id),
    "agentMessageToRegenerateId missing"
  );
  const regeneratedAgentMessage = await request(
    `/api/conversations/${conversationId}/messages/${agentMessageToRegenerateId}/regenerate-agent-reply`,
    { method: "POST" }
  );
  if (
    regeneratedAgentMessage.senderType !== "AGENT" ||
    regeneratedAgentMessage.senderId !== agentMessageToRegenerate.senderId ||
    regeneratedAgentMessage.replyToMessageId !== agentMessageToRegenerateId ||
    regeneratedAgentMessage.quotedMessageId !== agentMessageToRegenerateId
  ) {
    throw new Error("regenerated agent reply did not preserve sender or structured reply reference");
  }
  if (!String(regeneratedAgentMessage.content || "").includes("Regenerated agent reply")) {
    throw new Error("regenerated agent reply content missing regeneration marker");
  }
  pass(`single agent reply regenerated: ${getIdValue(regeneratedAgentMessage.id)}`);

  if (EXPECT_ADAPTER_STATS_PERSISTENCE) {
    if (!ADAPTER_STATS_PATH) {
      throw new Error("AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE=true requires AGENTHUB_ADAPTER_STATS_PERSISTENCE_PATH");
    }
    if (!existsSync(ADAPTER_STATS_PATH)) {
      throw new Error(`adapter stats snapshot was not written: ${ADAPTER_STATS_PATH}`);
    }
    const statsSnapshot = JSON.parse(readFileSync(ADAPTER_STATS_PATH, "utf8"));
    if (!statsSnapshot.adapters || !statsSnapshot.adapters.MOCK || statsSnapshot.adapters.MOCK.attempts < 1) {
      throw new Error(`adapter stats snapshot missing MOCK attempts: ${JSON.stringify(statsSnapshot)}`);
    }
    pass(`adapter stats persistence validated: ${ADAPTER_STATS_PATH}`);
  }
  if (EXPECT_JDBC_PROFILE) {
    pass("JDBC profile smoke flow completed through create/query/upload/download/task/artifact APIs");
  }

  console.log("Smoke test completed successfully.");
}

runSmokeTest().catch((error) => {
  fail("smoke test failed", error);
});
