#!/usr/bin/env node

import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const HEADLESS = process.env.AGENTHUB_E2E_HEADLESS !== "false";
const SLOW_MO = Number(process.env.AGENTHUB_E2E_SLOW_MO || 0);
const BROWSER_CHANNEL = process.env.AGENTHUB_E2E_BROWSER_CHANNEL || "msedge";
const EXPECT_AUTO_TRIGGER_APPROVAL = process.env.AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL === "true";
const EXPECT_REJECTION = process.env.AGENTHUB_E2E_EXPECT_REJECTION === "true";
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
  let response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  try {
    response = await fetch(`${API_BASE}${pathname}`, {
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
    page.locator(".workspace-sidebar__header .primary-button"),
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

function buildMentionPrompt(agents) {
  const namedAgents = agents.filter((agent) => agent.name?.trim()).slice(0, 2);
  if (namedAgents.length < 2) {
    throw new Error(`Need at least 2 agents for multi-agent mention, got ${namedAgents.length}`);
  }
  const mentions = namedAgents.map((agent) => `@${agent.name.trim()}`).join(" ");
  return { prompt: `${mentions} ${TEST_PROMPT_BODY}`, mentionedAgents: namedAgents };
}

async function sendMessageWithAttachmentFromUi(page, conversationId, agents, attachmentPath) {
  const { prompt, mentionedAgents } = buildMentionPrompt(agents);
  await page.locator(".chat-input__textarea").fill(prompt);
  await page.locator(".chat-attachment-composer__file").setInputFiles(attachmentPath);
  await page.getByText(TEST_ATTACHMENT_FILE_NAME).first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".chat-input").locator(".primary-button").click();

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

async function verifyContextPanel(page, conversationId) {
  await waitForVisible(page, ".context-panel", "context panel");
  await waitForApiState(
    "context snapshot",
    () => request(`/api/conversations/${conversationId}/context-snapshots`),
    (snapshots) => snapshots.length > 0 ? snapshots : null,
    20000
  );
  await waitForVisible(page, ".context-card-list", "context snapshot list");

  const retrievedItem = page.locator(".retrieved-context-item").first();
  const hasRetrievedItem = await retrievedItem.isVisible().catch(() => false);
  if (hasRetrievedItem) {
    pass("retrieved context item visible");
    await page.getByText(/score/i).first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByText(/injects into/i).first().waitFor({ state: "visible", timeout: 10000 });
  } else {
    pass("retrieved context item not emitted for this heuristic run; context snapshot fallback visible");
  }
}

async function clickAutoTriggerIfAvailable(page) {
  const autoButton = page.locator(".message-auto-trigger .message-action-button--primary").last();
  const visible = await autoButton.isVisible().catch(() => false);
  if (!visible) {
    return false;
  }
  const enabledButton = await waitForLocatorEnabled(autoButton, "auto-trigger collaboration button", 5000);
  await enabledButton.click();
  return true;
}

async function triggerTaskRunFromUi(page, conversationId) {
  const beforeRuns = await request(`/api/conversations/${conversationId}/task-runs`);
  const beforeRunIds = new Set(beforeRuns.map((taskRun) => getIdValue(taskRun.id)));

  let triggerPath = "manual Demo Task";
  if (await clickAutoTriggerIfAvailable(page)) {
    triggerPath = "auto-trigger collaboration";
    try {
      await waitForApiState(
        "auto-triggered TaskRun",
        () => request(`/api/conversations/${conversationId}/task-runs`),
        (taskRuns) => taskRuns.find((taskRun) => !beforeRunIds.has(getIdValue(taskRun.id))),
        8000,
        500
      );
    } catch {
      if (EXPECT_AUTO_TRIGGER_APPROVAL) {
        await clickAutoTriggerIfAvailable(page);
      } else {
        triggerPath = "auto-trigger approval confirmation";
        await clickAutoTriggerIfAvailable(page);
      }
    }
  } else {
    const runButton = await waitForLocatorEnabled(
      page.locator(".workspace-main__toolbar .secondary-button"),
      "Run Demo Task button"
    );
    await runButton.click();
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
    45000,
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
  await waitForVisible(page, ".approval-gate", `${label} approval gate`);
  await waitForVisible(page, ".approval-gate__affected", `${label} affected summary`);
  const approveButton = await waitForLocatorEnabled(
    page.locator(".approval-gate__actions .primary-button"),
    `${label} approval confirm button`
  );
  await approveButton.click();
}

async function selectArtifactCardById(page, artifactId, label) {
  const card = page.locator(".artifact-card").filter({ hasText: artifactId }).first();
  await waitForLocatorEnabled(card, `${label} artifact card`);
  await card.click();
  await waitForVisible(page, ".artifact-preview", `${label} artifact preview`);
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

  await page.locator(".artifact-revision-box__input").fill(REVISION_INSTRUCTION);
  const revisionButton = await waitForLocatorEnabled(
    page.locator(".artifact-revision-box .artifact-revision-box__button").first(),
    "artifact revision button"
  );
  await revisionButton.click();

  const artifactsAfterRevision = await waitForArtifacts(conversationId, beforeIds, "artifact revision output");
  const revisionArtifact = artifactsAfterRevision.find((artifact) =>
    !beforeIds.has(getIdValue(artifact.id)) &&
    (artifact.parentArtifactId || artifact.revisionInstruction)
  );
  if (!revisionArtifact) {
    throw new Error("revision completed but no revision artifact was found");
  }

  await selectArtifactCardById(page, getIdValue(revisionArtifact.id), "revision");
  await waitForVisible(page, ".diff-summary", "diff summary");

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
  const deployButton = await waitForLocatorEnabled(
    page.locator(".deploy-status-box .artifact-revision-box__button").first(),
    "Deploy Selected Artifact button"
  );
  await deployButton.click();
  await approveCurrentGate(page, "deploy");
  await waitForVisible(page, ".deploy-status-card", "deploy status card");

  const previewHref = await page.locator(".deploy-preview-link").last().getAttribute("href");
  return resolvePreviewUrl(previewHref);
}

async function restoreSelectedSnapshot(page, conversationId) {
  const beforeArtifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const beforeIds = new Set(beforeArtifacts.map((artifact) => getIdValue(artifact.id)));
  const restoreButton = await waitForLocatorEnabled(
    page.locator(".artifact-snapshot-box .deploy-status-card__button").first(),
    "Restore Snapshot button"
  );
  await restoreButton.click();
  await approveCurrentGate(page, "restore");
  await waitForArtifacts(conversationId, beforeIds, "restored artifact");
  await waitForVisible(page, ".action-audit-panel", "action audit panel");
  await page.locator(".action-audit-panel__toggle").click();
  await waitForVisible(page, ".action-audit-card", "action audit card");
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
  pass(`optional rejection scenario covered: ${rejectionMessages.length} REJECTION messages`);
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
  const agents = await step("agents loaded for multi-agent mention", () => request("/api/agents"));

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
    await step("workspace route opens", async () => {
      await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
      await waitForVisible(page, ".workspace-page", "workspace page");
    });

    const conversation = await step("workspace creates and selects a conversation", () => createWorkspaceConversation(page));
    const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");

    const sentMessage = await step("UI sends multi-agent message with uploaded attachment", () =>
      sendMessageWithAttachmentFromUi(page, conversationId, agents, tempAttachment.filePath)
    );
    await step("retrieval context seeded from UI message", () =>
      seedRetrievalContextFromMessage(conversationId, sentMessage.message)
    );
    await waitForVisible(page, ".message-stream", "message stream");
    await waitForVisible(page, ".message-target-agent-name", "multi-agent target label");
    await waitForVisible(page, ".message-attachment-card", "message attachment card");

    await step("UI triggers collaboration run", () => triggerTaskRunFromUi(page, conversationId));
    await waitForVisible(page, ".task-panel", "TaskRun panel");
    await waitForVisible(page, ".message-bubble--agent-protocol", "agent protocol message");
    await waitForVisible(page, ".adapter-quality-dashboard", "adapter quality dashboard");
    await page.getByRole("button", { name: "Stop Run" }).first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Cancel Run" }).first().waitFor({ state: "visible", timeout: 10000 });
    if (EXPECT_AUTO_TRIGGER_APPROVAL) {
      await waitForVisible(page, ".message-auto-trigger", "message auto-trigger card");
    }
    await waitForVisible(page, ".orchestrator-explain-panel", "orchestrator explain panel");
    await step("Context panel shows TaskRun snapshot", () => verifyContextPanel(page, conversationId));
    await waitForVisible(page, ".artifact-card", "artifact card");
    await step("CODE artifact selected for revision", () => selectCodeArtifact(page, conversationId));

    await step("UI creates revision and approves Apply Diff", () => createRevisionAndApplyDiff(page, conversationId));
    const previewUrl = await step("UI approves deploy and exposes preview URL", () => deploySelectedArtifact(page));
    await step("UI approves snapshot restore and shows audit trail", () => restoreSelectedSnapshot(page, conversationId));

    await step("preview page renders deployed artifact", async () => {
      await page.goto(previewUrl, { waitUntil: "domcontentloaded" });
      await waitForVisible(page, ".preview-page__card", "preview page card");
      await waitForVisible(page, ".preview-page__content", "preview page content");
    });

    if (consoleErrors.length > 0) {
      throw new Error(`browser console/page errors: ${consoleErrors.slice(0, 5).join(" | ")}`);
    }
  } finally {
    await browser.close();
    await rm(tempAttachment.directory, { recursive: true, force: true });
  }

  if (EXPECT_REJECTION) {
    await seedOptionalRejectionScenario();
  }

  pass("browser E2E completed");
}

runBrowserE2e().catch((error) => {
  fail("browser E2E failed", error);
});
