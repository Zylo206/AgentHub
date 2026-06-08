#!/usr/bin/env node

import {
  API_BASE,
  FRONTEND_BASE,
  authTokenValue,
  ensure,
  ensureBackendHealth,
  fail,
  getIdValue,
  listArtifacts,
  loadPlaywright,
  login,
  pass,
  seedArtifactConflictScenario,
  waitFor
} from "./_task-run-smoke-helpers.mjs";

const HEADLESS = process.env.AGENTHUB_E2E_HEADLESS !== "false";
const BROWSER_CHANNEL = process.env.AGENTHUB_E2E_BROWSER_CHANNEL || "msedge";

async function run() {
  console.log(`AgentHub conflict browser E2E target: ${FRONTEND_BASE}`);
  console.log(`AgentHub conflict browser E2E API: ${API_BASE}`);
  await ensureBackendHealth();
  await login();

  const scenario = await seedArtifactConflictScenario(`Conflict Browser ${Date.now()}`);
  const beforeArtifactIds = new Set((await listArtifacts(scenario.conversationId)).map((artifact) => getIdValue(artifact.id)));
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    headless: HEADLESS,
    ...(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {})
  });
  const page = await browser.newPage();

  try {
    await page.addInitScript((token) => {
      window.localStorage.setItem("agenthub.auth.token", token);
    }, authTokenValue());
    await page.goto(`${FRONTEND_BASE}/workspace`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='workspace-page']", { state: "visible", timeout: 20000 });

    await page.locator(`[data-conversation-id="${scenario.conversationId}"]`).click();
    await page.getByTestId("artifact-card").filter({ hasText: scenario.revisionTwoArtifactId }).first().click();
    await page.getByTestId("artifact-inspector-tab-diff").click();
    await page.waitForSelector("[data-testid='diff-summary']", { state: "visible", timeout: 15000 });
    await page.locator(".diff-summary-apply button").first().click();
    await page.waitForSelector("[data-testid='artifact-conflict-panel']", { state: "visible", timeout: 15000 });
    await page.getByTestId("artifact-manual-merge-content").fill(
      "// Browser conflict resolution\nexport const conflictResolved = true;\n"
    );
    await page.locator(".diff-conflict-merge-panel button").click();

    await waitFor(
      "manual merge revision artifact",
      () => listArtifacts(scenario.conversationId),
      (artifacts) => artifacts.find((artifact) => !beforeArtifactIds.has(getIdValue(artifact.id))),
      30000,
      750
    );
    pass(`browser conflict panel verified for conversation ${scenario.conversationId}`);
  } finally {
    await browser.close();
  }
}

run().catch((error) => fail("conflict browser E2E failed", error));
