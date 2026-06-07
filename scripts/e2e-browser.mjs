#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const HEADLESS = process.env.AGENTHUB_E2E_HEADLESS !== "false";
const SLOW_MO = Number(process.env.AGENTHUB_E2E_SLOW_MO || 0);
const BROWSER_CHANNEL = process.env.AGENTHUB_E2E_BROWSER_CHANNEL || "msedge";
const E2E_ARTIFACT_DIR = process.env.AGENTHUB_E2E_ARTIFACT_DIR || path.resolve(".agenthub", "e2e-browser");
const EXPECT_AUTO_TRIGGER_APPROVAL = process.env.AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL === "true";
const REQUIRE_MESSAGE_TRIGGER = process.env.AGENTHUB_E2E_REQUIRE_MESSAGE_TRIGGER !== "false";
const EXPECT_REJECTION = process.env.AGENTHUB_E2E_EXPECT_REJECTION !== "false";
const TASK_RUN_START_TIMEOUT_MS = Number(process.env.AGENTHUB_E2E_TASKRUN_START_TIMEOUT_MS || 8000);
const TASK_RUN_COMPLETE_TIMEOUT_MS = Number(process.env.AGENTHUB_E2E_TASKRUN_COMPLETE_TIMEOUT_MS || 45000);
const CHAT_SEND_READY_TIMEOUT_MS = Number(process.env.AGENTHUB_E2E_CHAT_SEND_READY_TIMEOUT_MS || 30000);
const TEST_MARKER = `browser-e2e-main-${Date.now()}`;
const TEST_ATTACHMENT_FILE_NAME = "browser-e2e-ui-brief.md";
const TEST_PROMPT_BODY = [
  `${TEST_MARKER}: Browser E2E main path.`,
  "Build a React login preview with verification-code login, route through AgentHub collaboration,",
  "use the attached product brief, then produce artifacts that can be revised, applied, restored, and previewed."
].join(" ");
const REVISION_INSTRUCTION = [
  `${TEST_MARKER}: change the primary CTA copy to Continue securely,`,
  "add a visible loading-state note, and keep verification-code login."
].join(" ");
let authToken = "";

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function fail(message, error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}: ${detail}`);
  process.exitCode = 1;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function step(label, action) {
  try {
    const result = await action();
    pass(label);
    return result;
  } catch (error) {
    throw new Error(`${label} failed: ${getErrorMessage(error)}`);
  }
}

async function loadPlaywright() {
  const frontendRequire = createRequire(new URL("../frontend/package.json", import.meta.url));
  try {
    return frontendRequire("playwright");
  } catch (error) {
    try {
      return frontendRequire("@playwright/test");
    } catch {
      try {
        return frontendRequire("playwright-core");
      } catch {
        throw new Error(
          [
            "Playwright runtime is not installed in frontend/node_modules.",
            "Install a lightweight runtime when browser E2E is needed:",
            "  cd frontend",
            "  npm install --save-dev playwright-core",
            "The wrapper can also use playwright or @playwright/test if the project later standardizes on them.",
            "By default it launches the local Microsoft Edge channel; override with AGENTHUB_E2E_BROWSER_CHANNEL."
          ].join("\n")
        );
      }
    }
  }
}

async function request(pathname, init = {}) {
  if (!authToken && pathname !== "/api/auth/login") {
    await loginForE2e();
  }
  let response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE}${pathname}`, {
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
      throw new Error(`Invalid JSON response from ${pathname}: ${text.slice(0, 160)}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  if (!payload?.success) {
    throw new Error(payload?.message || payload?.errorCode || `API failure from ${pathname}`);
  }
  return payload.data;
}

async function loginForE2e() {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "demo", password: "demo" })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success !== true || !payload?.data?.token) {
    throw new Error(payload?.message || `Browser E2E auth login failed: HTTP ${response.status}`);
  }
  authToken = payload.data.token;
}

async function waitForApiState(label, producer, predicate, timeout = 30000, interval = 500) {
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

async function waitForVisible(page, selector, label, timeout = 20000) {
  await page.waitForSelector(selector, { state: "visible", timeout });
  pass(`${label} visible`);
}

async function captureFailureDiagnostics(page, consoleErrors, error) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await mkdir(E2E_ARTIFACT_DIR, { recursive: true });
  const screenshotPath = path.join(E2E_ARTIFACT_DIR, `failure-${timestamp}.png`);
  const consolePath = path.join(E2E_ARTIFACT_DIR, `failure-${timestamp}-console.txt`);
  const currentUrl = page.url();
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => null);
  await writeFile(
    consolePath,
    [
      `URL: ${currentUrl}`,
      `Error: ${getErrorMessage(error)}`,
      "",
      "Console errors:",
      ...(consoleErrors.length > 0 ? consoleErrors : ["<none>"])
    ].join("\n"),
    "utf8"
  ).catch(() => null);
  console.error(`[DIAG] current URL: ${currentUrl}`);
  console.error(`[DIAG] screenshot: ${screenshotPath}`);
  console.error(`[DIAG] console summary: ${consolePath}`);
}

async function saveWorkspaceLayoutGate(page, viewport) {
  const viewportLabel = `${viewport.width}x${viewport.height}`;
  await page.setViewportSize(viewport);
  await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page, "[data-testid='workspace-page']", "workspace visual QA page");
  await page.waitForTimeout(500);

  const metrics = await page.evaluate(() => {
    function rectFor(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom)
      };
    }

    function overlaps(a, b) {
      if (!a || !b) {
        return false;
      }
      return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
    }

    const pageRect = rectFor("[data-testid='workspace-page']");
    const sidebar = rectFor("[data-testid='workspace-sidebar']");
    const chatLane = rectFor(".workspace-chat-lane");
    const messageStream = rectFor("[data-testid='message-stream']");
    const chatInput = rectFor("[data-testid='chat-input']");
    const diagnostics = rectFor("[data-testid='workspace-diagnostics']");
    const artifactInspector = rectFor("[data-testid='workspace-artifacts']");
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const documentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

    return {
      capturedAt: new Date().toISOString(),
      viewport: { width: viewportWidth, height: viewportHeight },
      documentWidth,
      documentHeight,
      horizontalOverflow: documentWidth > viewportWidth + 2,
      pageRect,
      sidebar,
      chatLane,
      messageStream,
      chatInput,
      diagnostics,
      artifactInspector,
      overlaps: {
        messageStreamChatInput: overlaps(messageStream, chatInput),
        chatInputDiagnostics: overlaps(chatInput, diagnostics),
        chatLaneArtifactInspector: overlaps(chatLane, artifactInspector)
      },
      overflow: {
        sidebarRight: sidebar ? sidebar.right > viewportWidth + 1 : false,
        chatLaneRight: chatLane ? chatLane.right > viewportWidth + 1 : false,
        artifactInspectorRight: artifactInspector ? artifactInspector.right > viewportWidth + 1 : false
      }
    };
  });

  await mkdir(E2E_ARTIFACT_DIR, { recursive: true });
  const metricsPath = path.join(E2E_ARTIFACT_DIR, `workspace-layout-metrics-${viewportLabel}.json`);
  const screenshotPath = path.join(E2E_ARTIFACT_DIR, `workspace-layout-${viewportLabel}.png`);
  await writeFile(metricsPath, JSON.stringify(metrics, null, 2), "utf8");
  await page.screenshot({ path: screenshotPath, fullPage: false });

  if (viewport.width === 1366 && viewport.height === 768) {
    await writeFile(path.join(E2E_ARTIFACT_DIR, "workspace-layout-metrics-latest.json"), JSON.stringify(metrics, null, 2), "utf8");
    await page.screenshot({ path: path.join(E2E_ARTIFACT_DIR, "workspace-layout-1366-latest.png"), fullPage: false });
  }

  const failures = [];
  if (metrics.horizontalOverflow) {
    failures.push(`horizontal overflow: documentWidth=${metrics.documentWidth}, viewport=${metrics.viewport.width}`);
  }
  if (metrics.overlaps.messageStreamChatInput) {
    failures.push("message stream overlaps ChatInput");
  }
  if (metrics.overlaps.chatInputDiagnostics) {
    failures.push("ChatInput overlaps diagnostics drawer");
  }
  if (metrics.overflow.artifactInspectorRight) {
    failures.push("Artifact Inspector overflows viewport");
  }
  if (metrics.chatLane && metrics.chatLane.width < 520) {
    failures.push(`chat lane too narrow: ${metrics.chatLane.width}px`);
  }
  if (metrics.messageStream && metrics.messageStream.height < 360) {
    failures.push(`message stream too short: ${metrics.messageStream.height}px`);
  }
  if (metrics.chatInput && metrics.chatInput.height > 150) {
    failures.push(`ChatInput too tall: ${metrics.chatInput.height}px`);
  }

  if (failures.length > 0) {
    throw new Error(`workspace layout gate failed: ${failures.join("; ")}. Metrics: ${metricsPath}`);
  }

  pass(`workspace ${viewportLabel} layout gate passed; metrics: ${metricsPath}; screenshot: ${screenshotPath}`);
}

async function waitForLocatorEnabled(locator, label, timeout = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const visible = await locator.first().isVisible().catch(() => false);
    const enabled = visible ? await locator.first().isEnabled().catch(() => false) : false;
    if (visible && enabled) {
      return locator.first();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} was not visible and enabled after ${timeout}ms`);
}

async function createTempAttachmentFile() {
  const directory = await mkdtemp(path.join(tmpdir(), "agenthub-e2e-"));
  const filePath = path.join(directory, TEST_ATTACHMENT_FILE_NAME);
  await writeFile(
    filePath,
    [
      "# Browser E2E product brief",
      "",
      `Marker: ${TEST_MARKER}`,
      "Keep verification-code login visible.",
      "Primary CTA should be blue and easy to validate in preview."
    ].join("\n"),
    "utf8"
  );
  return { directory, filePath };
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

async function runOrchestratorFromMessage(conversationId, messageId, approvalId = null) {
  return request(`/api/conversations/${conversationId}/messages/${messageId}/orchestrator-run`, {
    method: "POST",
    body: JSON.stringify({ approvalId })
  });
}

async function runOrchestratorFromMessageWithOptionalApproval(conversationId, messageId) {
  try {
    return await runOrchestratorFromMessage(conversationId, messageId);
  } catch (error) {
    const message = getErrorMessage(error);
    if (!message.includes("approvalId is required")) {
      throw error;
    }
  }

  const approvalRequests = await request(`/api/conversations/${conversationId}/approval-requests`);
  const pendingApproval = approvalRequests.find((approval) =>
    approval.actionType === "ORCHESTRATOR_RUN" &&
    approval.targetType === "MESSAGE" &&
    approval.targetId === messageId &&
    approval.status === "PENDING"
  );
  const approvalId = pendingApproval?.approvalId || await createAndApproveApproval(conversationId, {
    actionType: "ORCHESTRATOR_RUN",
    targetType: "MESSAGE",
    targetId: messageId,
    riskLevel: "MEDIUM",
    summary: "Browser E2E approves message-level Orchestrator run.",
    affectedItems: [`Message: ${messageId}`]
  });
  if (pendingApproval) {
    await request(`/api/approval-requests/${approvalId}/approve`, { method: "POST" });
  }
  return runOrchestratorFromMessage(conversationId, messageId, approvalId);
}

async function createWorkspaceConversation(page) {
  const beforeConversations = await request("/api/conversations");
  const beforeIds = new Set(beforeConversations.map((conversation) => getIdValue(conversation.id)));
  const createButton = await waitForLocatorEnabled(
    page.getByTestId("create-conversation-button"),
    "Create Demo conversation button"
  );

  await createButton.click();
  return waitForApiState(
    "UI-created conversation",
    () => request("/api/conversations"),
    (conversations) => conversations.find((conversation) => !beforeIds.has(getIdValue(conversation.id))),
    20000
  );
}

async function createCustomAgentFromUi(page) {
  return createCustomAgentFromWorkspaceDialog(page);

  const agentName = `E2E Reviewer ${TEST_MARKER}`;
  await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page, "[data-testid='workspace-page']", "Workspace before Agent create menu");
  await page.getByTestId("app-create-button").click();
  await waitForVisible(page, "[data-testid='app-create-menu']", "Coze-style create menu");
  await page.getByTestId("app-create-agent-option").click();
  await waitForVisible(page, "[data-testid='agent-create-dialog']", "Workspace Agent create dialog");
  await page.getByRole("button", { name: "我已执行" }).click();
  return createCustomAgentFromWorkspaceDialog(page);
}

async function createCustomAgentFromWorkspaceDialog(page) {
  const agentName = `E2E Reviewer ${TEST_MARKER}`;
  await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
  await waitForVisible(page, "[data-testid='workspace-page']", "Workspace before Agent create dialog");
  await page.getByTestId("app-create-button").click();
  await waitForVisible(page, "[data-testid='app-create-menu']", "Coze-style create menu");
  await page.getByTestId("app-create-agent-option").click();
  await waitForVisible(page, "[data-testid='agent-create-dialog']", "Workspace Agent create dialog");
  await page.getByTestId("agent-create-prompt").fill(
    `Create a quality review Agent for ${TEST_MARKER}. It should review code, security, and quality gates.`
  );
  await page.getByTestId("agent-create-generate-draft").click();
  await waitForVisible(page, "[data-testid='agent-create-draft']", "Workspace Agent draft");
  await page.getByTestId("agent-create-name").fill(agentName);
  await page.getByTestId("agent-create-system-prompt").fill(
    "You are a custom Agent created by Browser E2E. Focus on review, quality gates, and actionable feedback."
  );
  await page.getByTestId("agent-create-capability-tags").fill("review, quality, browser-e2e");
  const reviewCapability = page.getByTestId("agent-create-tool-review");
  const reviewChecked = await reviewCapability.locator("input").isChecked();
  if (!reviewChecked) {
    await reviewCapability.click();
  }
  await page.getByTestId("agent-create-preferred-adapter").selectOption("MOCK");
  await page.getByTestId("agent-create-confirm").click();

  const createdAgent = await waitForApiState(
    "Workspace modal created custom Agent",
    () => request("/api/agents"),
    (agents) => agents.find((agent) =>
      agent.name === agentName &&
      (agent.toolTags || []).includes("review") &&
      (agent.preferredAdapterType || "") === "MOCK"
    ),
    20000
  );
  await page.getByTestId("workspace-sidebar").filter({ hasText: agentName }).waitFor({
    state: "visible",
    timeout: 10000
  });
  return createdAgent;
}

async function verifyConversationManagementUi(page, conversation) {
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing for conversation management");
  const conversationSelector = `[data-conversation-id="${conversationId}"]`;
  const searchTerm = String(conversation.title || "Demo").slice(0, 18);

  await page.getByTestId("conversation-search-input").fill(searchTerm);
  await waitForVisible(page, conversationSelector, "searched conversation");
  await page.getByTestId("conversation-search-clear").click();
  await waitForVisible(page, conversationSelector, "conversation after search clear");

  await page.locator(conversationSelector).getByTestId("conversation-pin-button").click();
  await page.getByTestId("conversation-filter-pinned").click();
  await waitForVisible(page, conversationSelector, "pinned conversation filter");

  await page.locator(conversationSelector).getByTestId("conversation-archive-button").click();
  await page.getByTestId("conversation-filter-archived").click();
  await waitForVisible(page, conversationSelector, "archived conversation filter");
  await page.locator(conversationSelector).getByTestId("conversation-restore-button").click();
  await page.getByTestId("conversation-filter-all").click();
  await waitForVisible(page, conversationSelector, "restored conversation in all filter");
  await page.locator(conversationSelector).click();
}

async function createCustomAgentFromChatMessage(page) {
  const beforeAgents = await request("/api/agents");
  const beforeIds = new Set(beforeAgents.map((agent) => getIdValue(agent.id)));
  const prompt = [
    `创建一个安全评审 Agent，标记 ${TEST_MARKER}。`,
    "它负责 review、安全、质量门禁，优先使用 Claude Code，并具备 review 与 code 能力。"
  ].join(" ");

  await page.getByTestId("chat-input-textarea").fill(prompt);
  await page.getByTestId("chat-send-button").click();
  await waitForVisible(page, "[data-testid='message-agent-creation-card']", "inline Agent creation card");
  await page.getByTestId("message-confirm-agent-creation").first().click();

  const createdAgent = await waitForApiState(
    "chat-created custom Agent",
    () => request("/api/agents"),
    (agents) => agents.find((agent) =>
      !beforeIds.has(getIdValue(agent.id)) &&
      (agent.toolTags || []).includes("review") &&
      (agent.systemPrompt || "").length > 20
    ),
    30000
  );

  await page.getByTestId("workspace-sidebar").filter({ hasText: createdAgent.name }).waitFor({
    state: "visible",
    timeout: 10000
  });
  return createdAgent;
}

function buildMentionPrompt(agents, preferredAgent = null) {
  const normalizedPreferredId = getIdValue(preferredAgent?.id);
  const baseAgents = [
    preferredAgent,
    ...agents.filter((agent) => getIdValue(agent.id) !== normalizedPreferredId)
  ].filter(Boolean);
  const namedAgents = baseAgents.filter((agent) => agent.name?.trim()).slice(0, 2);
  if (namedAgents.length < 2) {
    throw new Error(`Need at least 2 agents for multi-agent mention, got ${namedAgents.length}`);
  }
  const mentions = namedAgents.map((agent) => `@${agent.name.trim()}`).join(" ");
  return { prompt: `${mentions} ${TEST_PROMPT_BODY}`, mentionedAgents: namedAgents };
}

async function sendMessageWithAttachmentFromUi(page, conversationId, agents, attachmentPath, preferredAgent = null) {
  const { prompt, mentionedAgents } = buildMentionPrompt(agents, preferredAgent);
  await page.getByTestId("chat-input-textarea").fill(prompt);
  await page.getByTestId("chat-routing-preview").waitFor({ state: "visible", timeout: 10000 });
  if (preferredAgent?.name) {
    await page.getByTestId("chat-routing-preview").filter({ hasText: preferredAgent.name }).waitFor({
      state: "visible",
      timeout: 10000
    });
  }
  await page.getByTestId("chat-attachment-file-input").setInputFiles(attachmentPath);
  await page.getByText(TEST_ATTACHMENT_FILE_NAME).first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByTestId("chat-send-button").click();

  const message = await waitForApiState(
    "UI-sent multi-agent message with attachment",
    () => request(`/api/conversations/${conversationId}/messages`),
    (messages) => messages.find((item) =>
      item.senderType === "USER" &&
      String(item.content || "").includes(TEST_MARKER) &&
      (item.mentionedAgentIds || []).length >= 2 &&
      (item.attachments || []).some((attachment) => attachment.fileName === TEST_ATTACHMENT_FILE_NAME)
    ),
    30000
  );

  await page.getByText(new RegExp(escapeRegExp(TEST_MARKER))).first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByText(TEST_ATTACHMENT_FILE_NAME).first().waitFor({ state: "visible", timeout: 10000 });
  return { message, mentionedAgents };
}

async function verifyCustomAgentRouting(conversationId, customAgent) {
  const customAgentId = requireValue(getIdValue(customAgent.id), "customAgentId missing");
  await waitForApiState(
    "custom Agent routed into TaskRun",
    () => request(`/api/conversations/${conversationId}/task-runs`),
    (taskRuns) => {
      const matchingRun = taskRuns.find((taskRun) =>
        (taskRun.steps || []).some((step) => getIdValue(step.assignedAgentId) === customAgentId)
      );
      return matchingRun || null;
    },
    20000
  );
}

async function seedRetrievalContextFromMessage(conversationId, message) {
  const messageId = requireValue(getIdValue(message.id), "messageId missing for retrieval context seed");
  await request(`/api/conversations/${conversationId}/messages/${messageId}/pin`, { method: "POST" });
  const memory = await request(`/api/conversations/${conversationId}/messages/${messageId}/memory`, {
    method: "POST",
    body: JSON.stringify({ category: "PROJECT_FACT" })
  });
  if (memory.memoryId) {
    await request(`/api/memories/${memory.memoryId}`, {
      method: "PATCH",
      body: JSON.stringify({
        category: "DECISION",
        importance: 8,
        content: `${TEST_MARKER}: keep verification-code login visible and use the uploaded brief.`
      })
    });
  }
}

async function verifyMessageActionBar(page) {
  const messageRow = () => page.locator("[data-testid='message-row']").filter({ hasText: TEST_MARKER }).first();
  await messageRow().getByTestId("message-action-bar").waitFor({ state: "visible", timeout: 10000 });
  await messageRow().getByTestId("message-type-ribbon").waitFor({ state: "visible", timeout: 10000 });

  async function clickMessageAction(testId, label) {
    await messageRow().hover();
    const button = await waitForLocatorEnabled(messageRow().getByTestId(testId), label, 10000);
    await button.click();
  }

  await clickMessageAction("message-copy-button", "message copy action");
  await clickMessageAction("message-quote-button", "message quote action");
  await page.locator(".chat-quote-preview").waitFor({ state: "visible", timeout: 10000 });
  await page.getByTestId("chat-quote-clear").click();
  await clickMessageAction("message-reply-button", "message reply action");
  await page.locator(".chat-quote-preview").waitFor({ state: "visible", timeout: 10000 });
  await page.getByTestId("chat-quote-clear").click();
  await clickMessageAction("message-pin-button", "message pin action");
  await clickMessageAction("message-memory-button", "message memory action");
  await waitForVisible(page, "[data-testid='message-attachment-card']", "message attachment type card");
}

async function verifyAgentRegenerateAction(page, conversationId) {
  const beforeMessages = await request(`/api/conversations/${conversationId}/messages`);
  const agentRow = page.locator("[data-testid='message-row']").filter({ has: page.getByTestId("message-regenerate-button") }).first();
  const regenerateButton = await waitForLocatorEnabled(
    agentRow.getByTestId("message-regenerate-button").first(),
    "Agent reply regenerate button",
    10000
  );
  await regenerateButton.scrollIntoViewIfNeeded();
  await regenerateButton.hover();
  await regenerateButton.click();
  await waitForApiState(
    "regenerated Agent reply from browser action",
    () => request(`/api/conversations/${conversationId}/messages`),
    (messages) => messages.length > beforeMessages.length ? messages : null,
    20000
  );
}

async function openDiagnosticTab(page, tabKey) {
  const tab = page.getByTestId(`workspace-diagnostics-tab-${tabKey}`);
  await tab.waitFor({ state: "visible", timeout: 10000 });
  await tab.click();
  await page
    .locator(".workspace-diagnostics")
    .evaluate((element) => element.classList.contains("workspace-diagnostics--expanded"))
    .then((expanded) => {
      if (!expanded) {
        throw new Error(`diagnostic tab ${tabKey} did not expand drawer`);
      }
    });
}

async function collapseDiagnosticTab(page, tabKey) {
  const tab = page.getByTestId(`workspace-diagnostics-tab-${tabKey}`);
  await tab.waitFor({ state: "visible", timeout: 10000 });
  await tab.click();
  await page
    .locator(".workspace-diagnostics")
    .evaluate((element) => !element.classList.contains("workspace-diagnostics--expanded"))
    .then((collapsed) => {
      if (!collapsed) {
        throw new Error(`diagnostic tab ${tabKey} did not collapse drawer`);
      }
    });
}

async function expandTaskRunExplain(page) {
  const details = page.getByTestId("task-run-explain-details").first();
  await details.waitFor({ state: "visible", timeout: 10000 });
  const isOpen = await details.evaluate((element) => element.hasAttribute("open"));
  if (!isOpen) {
    await details.locator("summary").click();
  }
}

async function verifyContextPanel(page, conversationId) {
  await openDiagnosticTab(page, "context");
  await waitForVisible(page, "[data-testid='context-panel']", "context panel");
  await waitForApiState(
    "context snapshot",
    () => request(`/api/conversations/${conversationId}/context-snapshots`),
    (snapshots) => snapshots.length > 0 ? snapshots : null,
    20000
  );
  await waitForVisible(page, "[data-testid='context-snapshot-list']", "context snapshot list");

  const retrievedItem = page.getByTestId("retrieved-context-item").first();
  const hasRetrievedItem = await retrievedItem.isVisible().catch(() => false);
  if (hasRetrievedItem) {
    pass("retrieved context item visible");
    const contextPanel = page.getByTestId("context-panel");
    await contextPanel.getByText(/score/i).first().waitFor({ state: "visible", timeout: 10000 });
    await contextPanel.getByText(/injects into/i).first().waitFor({ state: "visible", timeout: 10000 });
  } else {
    pass("retrieved context item not emitted for this heuristic run; context snapshot fallback visible");
  }
  await collapseDiagnosticTab(page, "context");
}

function collectRetrievedSourceTypes(snapshots) {
  const sourceTypes = new Set();
  for (const snapshot of snapshots || []) {
    for (const item of snapshot.retrievedContextItems || []) {
      if (item?.sourceType) {
        sourceTypes.add(item.sourceType);
      }
    }
  }
  return sourceTypes;
}

async function verifyContextSourceDiversity(conversationId) {
  let snapshots = await request(`/api/conversations/${conversationId}/context-snapshots`);
  let sourceTypes = collectRetrievedSourceTypes(snapshots);

  if (sourceTypes.size < 2) {
    const followUp = await request(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: [
          `${TEST_MARKER}: context diversity follow-up.`,
          `Use ${TEST_ATTACHMENT_FILE_NAME}, previous TaskRun summary, saved memory, and generated Artifact context.`,
          "Keep verification-code login and review the current Artifact set."
        ].join(" ")
      })
    });
    const followUpMessageId = requireValue(getIdValue(followUp.id), "context diversity follow-up messageId missing");
    await runOrchestratorFromMessageWithOptionalApproval(conversationId, followUpMessageId);
    snapshots = await request(`/api/conversations/${conversationId}/context-snapshots`);
    sourceTypes = collectRetrievedSourceTypes(snapshots);
  }

  if (sourceTypes.size < 2) {
    throw new Error(
      `expected Context Search to retrieve at least 2 source types, got ${Array.from(sourceTypes).join(", ") || "none"}`
    );
  }
  pass(`Context Search source diversity covered: ${Array.from(sourceTypes).join(", ")}`);
}

async function verifyAdapterFallbackEdge() {
  const adapters = await request("/api/adapters");
  const fallbackCandidate = adapters.find((adapter) =>
    adapter.adapterType !== "MOCK" && adapter.status !== "AVAILABLE"
  );
  if (!fallbackCandidate) {
    pass("adapter fallback edge skipped because every non-MOCK adapter is currently AVAILABLE");
    return;
  }

  const agent = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      name: `E2E Fallback Agent ${TEST_MARKER}`,
      systemPrompt: "Force adapter fallback coverage for Browser E2E.",
      capabilityTags: ["fallback", "browser-e2e"],
      toolTags: ["code"],
      preferredAdapterType: fallbackCandidate.adapterType
    })
  });
  const agentId = requireValue(getIdValue(agent.id), "fallback agentId missing");
  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: `E2E Adapter Fallback ${Date.now()}`, type: "GROUP" })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "fallback conversationId missing");
  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `@${agent.name} ${TEST_MARKER}: trigger adapter fallback edge for REAL_ADAPTER diagnostics.`
    })
  });
  const messageId = requireValue(getIdValue(message.id), "fallback messageId missing");
  const taskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: "Trigger fallback edge for unavailable preferred adapter.",
      selectedAgentId: agentId
    })
  });
  const fallbackStep = (taskRun.steps || []).find((step) =>
    step.preferredAdapterType === fallbackCandidate.adapterType ||
    step.assignedAgentId === agentId ||
    getIdValue(step.assignedAgentId) === agentId
  );
  if (!fallbackStep) {
    throw new Error(`fallback TaskRun did not include preferred adapter ${fallbackCandidate.adapterType}`);
  }
  const actualAdapter = fallbackStep.actualAdapterType || fallbackStep.adapterType || "";
  const outcome = fallbackStep.realAdapterOutcome || "";
  const hasFallbackEvidence =
    actualAdapter === "MOCK" ||
    fallbackStep.adapterStatus === "FALLBACK" ||
    fallbackStep.adapterErrorMessage ||
    outcome === "FALLBACK";
  if (!hasFallbackEvidence) {
    throw new Error(`expected adapter fallback evidence, got actual=${actualAdapter}, outcome=${outcome}`);
  }

  const qualityMetrics = await request("/api/adapters/quality-metrics");
  const metric = qualityMetrics.find((item) => item.adapterType === fallbackCandidate.adapterType);
  if (metric && (metric.fallbackOutcomes ?? metric.fallbacks ?? 0) < 1) {
    throw new Error(`adapter fallback metric did not record fallback outcome for ${fallbackCandidate.adapterType}`);
  }
  pass(`adapter fallback edge covered: ${fallbackCandidate.adapterType} -> ${actualAdapter || outcome}`);
}

async function clickAutoTriggerIfAvailable(page) {
  const autoButton = page.getByTestId("message-start-collaboration").last();
  const visible = await autoButton.isVisible().catch(() => false);
  if (!visible) {
    return false;
  }
  const enabledButton = await waitForLocatorEnabled(autoButton, "auto-trigger collaboration button", 5000);
  await enabledButton.click();
  return true;
}

async function clickWorkspaceCollaborationCtaIfAvailable(page) {
  const primaryButton = page.getByTestId("start-collaboration-primary").first();
  const visible = await primaryButton.isVisible().catch(() => false);
  if (!visible) {
    return false;
  }
  try {
    const enabledButton = await waitForLocatorEnabled(primaryButton, "workspace collaboration primary action", 10000);
    await enabledButton.click();
    return true;
  } catch {
    return false;
  }
}

async function clickWorkspaceCollaborationCta(page) {
  const clicked = await clickWorkspaceCollaborationCtaIfAvailable(page);
  if (!clicked) {
    throw new Error("Workspace collaboration primary action is not visible and enabled");
  }
}

async function approveCollaborationGateIfVisible(page) {
  const gate = page.getByTestId("approval-gate").first();
  const visible = await gate.isVisible().catch(() => false);
  if (!visible) {
    return false;
  }
  await approveCurrentGate(page, "workspace collaboration");
  return true;
}

async function triggerTaskRunFromUi(page, conversationId) {
  const beforeRuns = await request(`/api/conversations/${conversationId}/task-runs`);
  const beforeRunIds = new Set(beforeRuns.map((taskRun) => getIdValue(taskRun.id)));

  let triggerPath = "message auto-trigger collaboration card";
  const clickedMessageTrigger = await clickAutoTriggerIfAvailable(page);
  if (!clickedMessageTrigger) {
    if (REQUIRE_MESSAGE_TRIGGER) {
      throw new Error("message auto-trigger collaboration card is not visible and enabled");
    }
    triggerPath = "workspace collaboration primary action";
    await clickWorkspaceCollaborationCta(page);
  }
  try {
    await waitForApiState(
      "primary-action TaskRun",
      () => request(`/api/conversations/${conversationId}/task-runs`),
      (taskRuns) => taskRuns.find((taskRun) => !beforeRunIds.has(getIdValue(taskRun.id))),
      TASK_RUN_START_TIMEOUT_MS,
      500
    );
  } catch (error) {
    if (!await approveCollaborationGateIfVisible(page)) {
      throw error;
    }
    triggerPath = "workspace collaboration approval confirmation";
  }

  const taskRun = await waitForApiState(
    "completed TaskRun",
    () => request(`/api/conversations/${conversationId}/task-runs`),
    (taskRuns) => {
      const created = taskRuns.find((item) => !beforeRunIds.has(getIdValue(item.id)));
      if (!created) {
        return null;
      }
      const status = String(created.status || "").toUpperCase();
      if (["COMPLETED", "BLOCKED", "FAILED", "CANCELLED", "STOPPED"].includes(status)) {
        return created;
      }
      return null;
    },
    TASK_RUN_COMPLETE_TIMEOUT_MS,
    750
  );

  if (String(taskRun.status).toUpperCase() !== "COMPLETED") {
    throw new Error(`${triggerPath} created TaskRun ${getIdValue(taskRun.id)} with status ${taskRun.status}`);
  }
  pass(`TaskRun triggered through ${triggerPath}`);
  return taskRun;
}

async function waitForArtifacts(conversationId, beforeIds = new Set(), label = "artifacts") {
  return waitForApiState(
    label,
    () => request(`/api/conversations/${conversationId}/artifacts`),
    (artifacts) => artifacts.filter((artifact) => !beforeIds.has(getIdValue(artifact.id))).length > 0 ? artifacts : null,
    30000
  );
}

async function approveCurrentGate(page, label) {
  await waitForVisible(page, "[data-testid='approval-gate']", `${label} approval gate`);
  await waitForVisible(page, "[data-testid='approval-affected-summary']", `${label} affected summary`);
  const approveButton = await waitForLocatorEnabled(
    page.locator(".approval-gate__actions .primary-button"),
    `${label} approval confirm button`
  );
  await approveButton.click();
}

async function selectArtifactCardById(page, artifactId, label) {
  const card = page.getByTestId("artifact-card").filter({ hasText: artifactId }).first();
  await waitForLocatorEnabled(card, `${label} artifact card`);
  await card.click();
  await waitForVisible(page, ".artifact-preview", `${label} artifact preview`);
}

async function openArtifactInspectorTab(page, tabKey) {
  const tab = page.getByTestId(`artifact-inspector-tab-${tabKey}`).first();
  await waitForLocatorEnabled(tab, `artifact inspector ${tabKey} tab`);
  await tab.click();
}

async function selectCodeArtifact(page, conversationId) {
  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const codeArtifact = artifacts.find((artifact) => artifact.type === "CODE" || artifact.artifactType === "CODE");
  const artifactId = requireValue(getIdValue(codeArtifact?.id), "CODE artifact missing after TaskRun");
  await selectArtifactCardById(page, artifactId, "CODE");
  return codeArtifact;
}

async function createRevisionAndApplyDiff(page, conversationId) {
  const beforeArtifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const beforeIds = new Set(beforeArtifacts.map((artifact) => getIdValue(artifact.id)));

  await openArtifactInspectorTab(page, "diff");
  const editToggle = await waitForLocatorEnabled(
    page.getByTestId("artifact-content-edit-toggle"),
    "artifact content edit toggle"
  );
  await editToggle.click();
  const editor = page.getByTestId("artifact-content-editor-textarea");
  await editor.waitFor({ state: "visible", timeout: 10000 });
  const originalContent = await editor.inputValue();
  const localEditLine = `// ${TEST_MARKER}: local draft revision from selected artifact content editor`;
  const editedContent = `${originalContent}\n${localEditLine}`;
  await editor.fill(editedContent);
  await editor.evaluate((element, marker) => {
    const textarea = element;
    const start = textarea.value.indexOf(marker);
    const end = start + marker.length;
    textarea.focus();
    textarea.setSelectionRange(start, end);
    textarea.dispatchEvent(new Event("select", { bubbles: true }));
  }, localEditLine);
  await page.getByTestId("artifact-local-revision-note").fill(REVISION_INSTRUCTION);
  await waitForVisible(page, "[data-testid='artifact-draft-diff-preview']", "artifact draft diff preview");
  const sendSelectionButton = await waitForLocatorEnabled(
    page.getByTestId("artifact-send-selection-to-chat"),
    "artifact selection to chat button"
  );
  await sendSelectionButton.click();
  await waitForVisible(page, "[data-testid='chat-artifact-selection-preview']", "artifact selection chat preview");
  await page.getByTestId("chat-input-textarea").fill(`${REVISION_INSTRUCTION} Keep this as a scoped chat-driven local revision.`);
  await waitForLocatorEnabled(
    page.getByTestId("chat-send-button"),
    "chat send button before local revision",
    CHAT_SEND_READY_TIMEOUT_MS
  );
  await page.getByTestId("chat-send-button").click();

  const artifactsAfterRevision = await waitForArtifacts(conversationId, beforeIds, "artifact revision output");
  const revisionArtifact = artifactsAfterRevision.find((artifact) =>
    !beforeIds.has(getIdValue(artifact.id)) &&
    (artifact.parentArtifactId || artifact.revisionInstruction)
  );
  if (!revisionArtifact) {
    throw new Error("revision completed but no revision artifact was found");
  }

  await selectArtifactCardById(page, getIdValue(revisionArtifact.id), "revision");
  await openArtifactInspectorTab(page, "diff");
  await waitForVisible(page, "[data-testid='diff-summary']", "diff summary");

  const beforeApplyIds = new Set(artifactsAfterRevision.map((artifact) => getIdValue(artifact.id)));
  const applyButton = await waitForLocatorEnabled(
    page.locator(".diff-summary .diff-summary-apply button").first(),
    "Apply Diff button"
  );
  await applyButton.click();
  await approveCurrentGate(page, "apply diff");

  const artifactsAfterApply = await waitForArtifacts(conversationId, beforeApplyIds, "applied diff artifact");
  const appliedArtifact = artifactsAfterApply.find((artifact) => !beforeApplyIds.has(getIdValue(artifact.id)));
  if (!appliedArtifact) {
    throw new Error("Apply Diff approval completed but no applied artifact was created");
  }
  return appliedArtifact;
}

async function deploySelectedArtifact(page) {
  await page.getByTestId("chat-input-textarea").fill("请部署当前产物并生成预览 URL。");
  await waitForLocatorEnabled(
    page.getByTestId("chat-send-button"),
    "chat send button before deploy intent",
    CHAT_SEND_READY_TIMEOUT_MS
  );
  await page.getByTestId("chat-send-button").click();
  await waitForVisible(page, "[data-testid='message-deploy-intent']", "message deploy confirmation card");
  const startDeployButton = await waitForLocatorEnabled(
    page.getByTestId("message-start-deploy").last(),
    "message deploy confirmation button"
  );
  await startDeployButton.click();
  const approveDeployButton = await waitForLocatorEnabled(
    page.getByTestId("message-approve-deploy").last(),
    "message deploy approval button"
  );
  await approveDeployButton.click();
  await openArtifactInspectorTab(page, "deploy");
  await waitForVisible(page, "[data-testid='deploy-status-card']", "deploy status card");

  const previewHref = await page.locator(".deploy-preview-link").last().getAttribute("href");
  return resolvePreviewUrl(previewHref);
}

async function restoreSelectedSnapshot(page, conversationId) {
  const beforeArtifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const beforeIds = new Set(beforeArtifacts.map((artifact) => getIdValue(artifact.id)));
  await openArtifactInspectorTab(page, "snapshots");
  const restoreButton = await waitForLocatorEnabled(
    page.locator(".artifact-snapshot-box .deploy-status-card__button").first(),
    "Restore Snapshot button"
  );
  await restoreButton.click();
  await approveCurrentGate(page, "restore");
  await waitForArtifacts(conversationId, beforeIds, "restored artifact");
  await openDiagnosticTab(page, "audit");
  await waitForVisible(page, "[data-testid='action-audit-panel']", "action audit panel");
  await page.getByTestId("action-audit-toggle").click();
  await waitForVisible(page, "[data-testid='action-audit-card']", "action audit card");
}

async function seedOptionalRejectionScenario() {
  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: `E2E Rejection Conversation ${Date.now()}`, type: "GROUP" })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "rejection conversationId missing");
  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: `${TEST_PROMPT_BODY}\nReviewer instruction: decision: reject because blocker risk must trigger retry/revise.`
    })
  });
  const messageId = requireValue(getIdValue(message.id), "rejection messageId missing");
  const taskRun = await runOrchestratorFromMessageWithOptionalApproval(conversationId, messageId);
  if (taskRun.status !== "BLOCKED") {
    throw new Error(`rejection task expected BLOCKED, got ${taskRun.status}`);
  }

  const messages = await request(`/api/conversations/${conversationId}/messages`);
  const rejectionMessages = messages.filter((item) => item.messageType === "REJECTION");
  if (rejectionMessages.length === 0) {
    throw new Error("rejection scenario did not emit REJECTION protocol messages");
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const revisionCandidate =
    artifacts.find((artifact) => artifact.type === "CODE" || artifact.artifactType === "CODE") ||
    artifacts.find((artifact) => artifact.status !== "REJECTED") ||
    artifacts[0];
  const revisionArtifactId = requireValue(
    getIdValue(revisionCandidate?.id),
    "rejection recovery revision candidate artifact missing"
  );
  const revision = await request(`/api/artifacts/${revisionArtifactId}/demo-revision`, {
    method: "POST",
    body: JSON.stringify({
      conversationId,
      revisionInstruction: [
        `${TEST_MARKER}: apply the reviewer fix request, clear the risk wording,`,
        "keep verification-code login, and rerun review for approval."
      ].join(" ")
    })
  });
  const revisionStatus = String(revision.taskRun?.status || "").toUpperCase();
  if (revisionStatus !== "COMPLETED") {
    throw new Error(`rejection recovery revision expected COMPLETED, got ${revisionStatus}`);
  }
  const reviewStatus = String(revision.reviewArtifact?.status || "").toUpperCase();
  if (reviewStatus !== "ACCEPTED") {
    throw new Error(`rejection recovery expected ACCEPTED review artifact, got ${reviewStatus}`);
  }

  pass(`optional rejection scenario covered and recovered: ${rejectionMessages.length} REJECTION messages`);
}

async function runBrowserE2e() {
  console.log(`AgentHub browser E2E target: ${FRONTEND_BASE}`);
  console.log(`AgentHub browser E2E API: ${API_BASE}`);
  console.log("Prerequisites: backend and frontend must already be running; this script does not start or stop services.");
  console.log("Browser plugin not available in this session; using the repository Playwright path.");

  const { chromium } = await loadPlaywright();
  await step("backend health is UP", async () => {
    const health = await request("/api/health");
    if (health?.status !== "UP") {
      throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
    }
  });
  const tempAttachment = await createTempAttachmentFile();
  const launchOptions = { headless: HEADLESS, slowMo: SLOW_MO };
  if (BROWSER_CHANNEL) {
    launchOptions.channel = BROWSER_CHANNEL;
  }

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  try {
    const customAgent = await step("Workspace modal creates a custom routable Agent", () =>
      createCustomAgentFromWorkspaceDialog(page)
    );
    let agents = await step("agents loaded for multi-agent mention", () => request("/api/agents"));

    await step("workspace route opens", async () => {
      await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
      await waitForVisible(page, "[data-testid='workspace-page']", "workspace page");
    });

    const conversation = await step("workspace creates and selects a conversation", () => createWorkspaceConversation(page));
    const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
    await step("conversation list supports search, pin, archive and restore", () =>
      verifyConversationManagementUi(page, conversation)
    );
    const chatCreatedAgent = await step("chat message creates a custom Agent through inline confirmation", () =>
      createCustomAgentFromChatMessage(page)
    );
    agents = await step("agents reloaded after chat-created custom Agent", () => request("/api/agents"));
    if (!agents.some((agent) => getIdValue(agent.id) === getIdValue(chatCreatedAgent.id))) {
      throw new Error("chat-created Agent was not present after reloading agents");
    }

    const sentMessage = await step("UI sends @CustomAgent multi-agent message with uploaded attachment", () =>
      sendMessageWithAttachmentFromUi(page, conversationId, agents, tempAttachment.filePath, customAgent)
    );
    await waitForVisible(page, "[data-testid='workspace-flow-guide']", "IM-first collaboration flow guide");
    await step("retrieval context seeded from UI message", () =>
      seedRetrievalContextFromMessage(conversationId, sentMessage.message)
    );
    await waitForVisible(page, "[data-testid='message-stream']", "message stream");
    await waitForVisible(page, "[data-testid='message-target-agent']", "multi-agent target label");
    await waitForVisible(page, "[data-testid='message-attachment-card']", "message attachment card");
    await step("Message Action Bar supports copy, quote, reply, pin and memory", () => verifyMessageActionBar(page));

    await step("UI triggers collaboration run", () => triggerTaskRunFromUi(page, conversationId));
    await step("custom Agent is routed into TaskRun", () => verifyCustomAgentRouting(conversationId, customAgent));
    await openDiagnosticTab(page, "taskrun");
    await waitForVisible(page, "[data-testid='task-run-panel']", "TaskRun panel");
    await waitForVisible(page, "[data-testid='task-run-summary-strip']", "TaskRun summary strip");
    await expandTaskRunExplain(page);
    await waitForVisible(page, "[data-testid='orchestrator-route-evidence']", "router evidence chips");
    await waitForVisible(page, ".message-bubble--agent-protocol", "agent protocol message");
    await collapseDiagnosticTab(page, "taskrun");
    await step("Agent reply can be regenerated from Message Action Bar", () => verifyAgentRegenerateAction(page, conversationId));
    await openDiagnosticTab(page, "adapter");
    await waitForVisible(page, ".adapter-quality-dashboard", "adapter quality dashboard");
    await openDiagnosticTab(page, "taskrun");
    await page.getByTestId("stop-run-button").first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByTestId("cancel-run-button").first().waitFor({ state: "visible", timeout: 10000 });
    if (EXPECT_AUTO_TRIGGER_APPROVAL) {
      await waitForVisible(page, "[data-testid='message-auto-trigger']", "message auto-trigger card");
    }
    await expandTaskRunExplain(page);
    await waitForVisible(page, "[data-testid='orchestrator-explain-panel']", "orchestrator explain panel");
    await step("Context panel shows TaskRun snapshot", () => verifyContextPanel(page, conversationId));
    await step("Context Search retrieves multiple source types", () => verifyContextSourceDiversity(conversationId));
    await step("real Adapter fallback edge is classified", () => verifyAdapterFallbackEdge());
    await waitForVisible(page, "[data-testid='artifact-card']", "artifact card");
    await step("CODE artifact selected for revision", () => selectCodeArtifact(page, conversationId));

    await step("UI creates revision and approves Apply Diff", () => createRevisionAndApplyDiff(page, conversationId));
    const previewUrl = await step("UI approves deploy and exposes preview URL", () => deploySelectedArtifact(page));
    await step("UI approves snapshot restore and shows audit trail", () => restoreSelectedSnapshot(page, conversationId));

    await step("preview page renders deployed artifact", async () => {
      await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
      await waitForVisible(page, ".preview-page__card", "preview page card");
      await waitForVisible(page, ".preview-page__content", "preview page content");
    });

    if (EXPECT_REJECTION) {
      await step("REJECTION retry/revise recovery path", () => seedOptionalRejectionScenario());
    }

    const workspaceVisualViewports = [
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1600, height: 900 }
    ];
    for (const viewport of workspaceVisualViewports) {
      await step(
        `workspace ${viewport.width}x${viewport.height} visual layout gate`,
        () => saveWorkspaceLayoutGate(page, viewport)
      );
    }

    if (consoleErrors.length > 0) {
      throw new Error(`browser console/page errors: ${consoleErrors.slice(0, 5).join(" | ")}`);
    }
  } catch (error) {
    await captureFailureDiagnostics(page, consoleErrors, error);
    throw error;
  } finally {
    await browser.close();
    await rm(tempAttachment.directory, { recursive: true, force: true });
  }

  pass("browser E2E completed");
}

runBrowserE2e().catch((error) => {
  fail("browser E2E failed", error);
});
