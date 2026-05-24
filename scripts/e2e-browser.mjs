#!/usr/bin/env node

import { createRequire } from "node:module";
import process from "node:process";

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const HEADLESS = process.env.AGENTHUB_E2E_HEADLESS !== "false";
const SLOW_MO = Number(process.env.AGENTHUB_E2E_SLOW_MO || 0);
const BROWSER_CHANNEL = process.env.AGENTHUB_E2E_BROWSER_CHANNEL || "msedge";
const EXPECT_AUTO_TRIGGER_APPROVAL = process.env.AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL === "true";
const TEST_TITLE = `E2E Browser Conversation ${Date.now()}`;
const TEST_PROMPT = [
  "Browser E2E: generate a React login preview, include verification-code login,",
  "use the attached product brief, and route through Orchestrator."
].join(" ");

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
    } catch {
      throw new Error(`Invalid JSON response from ${path}: ${text.slice(0, 160)}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `HTTP ${response.status}`);
  }
  if (!payload?.success) {
    throw new Error(payload?.message || payload?.errorCode || `API failure from ${path}`);
  }
  return payload.data;
}

async function uploadE2eAttachment(conversationId) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob(["Browser E2E brief: preserve verification-code login and blue primary CTA."], {
      type: "text/markdown"
    }),
    "browser-e2e-brief.md"
  );
  const attachment = await request(`/api/conversations/${conversationId}/attachments`, {
    method: "POST",
    body: formData
  });
  if (!attachment.attachmentId) {
    throw new Error(`attachment upload response missing id: ${JSON.stringify(attachment)}`);
  }
  return attachment;
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
    const message = error instanceof Error ? error.message : String(error);
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

async function seedE2eData() {
  const health = await request("/api/health");
  if (health?.status !== "UP") {
    throw new Error(`Unexpected health status: ${JSON.stringify(health)}`);
  }

  const conversation = await request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ title: TEST_TITLE, type: "GROUP" })
  });
  const conversationId = requireValue(getIdValue(conversation.id), "conversationId missing");
  const uploadedAttachment = await uploadE2eAttachment(conversationId);
  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: TEST_PROMPT,
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
  const taskRun = await runOrchestratorFromMessageWithOptionalApproval(conversationId, messageId);
  if (taskRun.status !== "COMPLETED") {
    throw new Error(`orchestrator-run status expected COMPLETED, got ${taskRun.status}`);
  }

  const artifacts = await request(`/api/conversations/${conversationId}/artifacts`);
  const artifact = artifacts.find((item) => item.type === "CODE" || item.artifactType === "CODE") || artifacts[0];
  const artifactId = requireValue(getIdValue(artifact?.id), "artifactId missing after orchestrator-run");
  const approvalId = await createAndApproveApproval(conversationId, {
    actionType: "DEMO_DEPLOY",
    targetType: "ARTIFACT",
    targetId: artifactId,
    riskLevel: "MEDIUM",
    summary: "Browser E2E approves static preview deployment.",
    affectedItems: [`Artifact: ${artifact.title || artifactId}`]
  });
  const deployment = await request(`/api/artifacts/${artifactId}/demo-deploy`, {
    method: "POST",
    body: JSON.stringify({ approvalId })
  });

  return {
    conversationId,
    artifactId,
    previewUrl: resolvePreviewUrl(deployment.previewUrl)
  };
}

async function waitForVisible(page, selector, label, timeout = 20000) {
  await page.waitForSelector(selector, { state: "visible", timeout });
  pass(`${label} visible`);
}

async function runBrowserE2e() {
  console.log(`AgentHub browser E2E target: ${FRONTEND_BASE}`);
  console.log(`AgentHub browser E2E API: ${API_BASE}`);
  const { chromium } = await loadPlaywright();
  const seeded = await seedE2eData();
  pass(`seeded conversation=${seeded.conversationId}, artifact=${seeded.artifactId}`);

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
    await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
    await waitForVisible(page, ".workspace-page", "workspace page");
    await page.getByRole("button", { name: new RegExp(TEST_TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
    await waitForVisible(page, ".message-stream", "message stream");
    await waitForVisible(page, ".message-attachment-card", "message attachment card");
    await page.getByText("browser-e2e-brief.md").first().waitFor({ state: "visible", timeout: 10000 });
    if (EXPECT_AUTO_TRIGGER_APPROVAL) {
      await waitForVisible(page, ".message-auto-trigger", "message auto-trigger card");
    }
    await waitForVisible(page, ".orchestrator-explain-panel", "orchestrator explain panel");
    await waitForVisible(page, ".retrieved-context-item", "retrieved context item");
    await page.getByText(/score/i).first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByText(/injects into/i).first().waitFor({ state: "visible", timeout: 10000 });
    await waitForVisible(page, ".artifact-card", "artifact card");
    await page.locator(".artifact-card").first().click();
    await waitForVisible(page, ".artifact-preview", "artifact preview");

    await page.getByRole("button", { name: "Deploy Selected Artifact" }).click();
    await waitForVisible(page, ".approval-gate", "approval gate");
    await page.getByRole("button", { name: "Approve Deploy" }).click();
    await waitForVisible(page, ".deploy-status-card", "deploy status card");

    await page.goto(seeded.previewUrl, { waitUntil: "domcontentloaded" });
    await waitForVisible(page, ".preview-page__card", "preview page card");
    await waitForVisible(page, ".preview-page__content", "preview page content");

    if (consoleErrors.length > 0) {
      throw new Error(`browser console/page errors: ${consoleErrors.slice(0, 5).join(" | ")}`);
    }
  } finally {
    await browser.close();
  }

  pass("browser E2E completed");
}

runBrowserE2e().catch((error) => {
  fail("browser E2E failed", error);
});
