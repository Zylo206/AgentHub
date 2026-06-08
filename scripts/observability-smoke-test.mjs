#!/usr/bin/env node

import {
  API_BASE,
  applyDiff,
  compareDiff,
  createAndApproveApproval,
  ensure,
  ensureBackendHealth,
  fail,
  getTaskRunObservability,
  pass,
  seedArtifactConflictScenario
} from "./_task-run-smoke-helpers.mjs";

async function run() {
  console.log(`AgentHub observability smoke target: ${API_BASE}`);
  await ensureBackendHealth();

  const scenario = await seedArtifactConflictScenario(`Observability Smoke ${Date.now()}`);
  await compareDiff(scenario.revisionTwoArtifactId, scenario.baseArtifact.version);
  try {
    await applyDiff(scenario.revisionTwoArtifactId, {
      force: false,
      approvalId: null,
      baseVersion: scenario.baseArtifact.version
    });
  } catch {
    // expected approval bypass rejection
  }
  const forceApprovalId = await createAndApproveApproval(scenario.conversationId, {
    actionType: "FORCE_APPLY_DIFF",
    targetType: "ARTIFACT",
    targetId: scenario.revisionTwoArtifactId,
    riskLevel: "HIGH",
    summary: "Observability smoke force apply approval.",
    affectedItems: [`Artifact: ${scenario.revisionTwoArtifactId}`]
  });
  await applyDiff(scenario.revisionTwoArtifactId, {
    force: true,
    approvalId: forceApprovalId,
    baseVersion: scenario.baseArtifact.version
  });

  const summary = await getTaskRunObservability(scenario.conversationId);
  ensure(summary.taskRunCount >= 1, "taskRunCount missing");
  ensure(summary.timelineEntryCount >= 1, "timelineEntryCount missing");
  ensure(summary.retryCount >= 0, "retryCount missing");
  ensure(summary.approvalBypassAttempts >= 1, "approvalBypassAttempts should reflect missing approval");
  ensure(summary.conflictTypes.some((item) => item.label === "TEXT_CONFLICT"), "TEXT_CONFLICT summary missing");

  pass(
    `observability summary verified: timeline=${summary.timelineEntryCount}, retry=${summary.retryCount}, conflict=${summary.conflictTypes.map((item) => `${item.label}:${item.count}`).join(", ")}`
  );
}

run().catch((error) => fail("observability smoke failed", error));
