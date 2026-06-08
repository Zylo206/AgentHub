#!/usr/bin/env node

import {
  API_BASE,
  applyDiff,
  compareDiff,
  createAndApproveApproval,
  ensure,
  ensureBackendHealth,
  fail,
  getActionAudits,
  getIdValue,
  pass,
  request,
  seedArtifactConflictScenario
} from "./_task-run-smoke-helpers.mjs";

async function run() {
  console.log(`AgentHub conflict smoke target: ${API_BASE}`);
  await ensureBackendHealth();

  const scenario = await seedArtifactConflictScenario(`Conflict Smoke ${Date.now()}`);
  const compare = await compareDiff(scenario.revisionTwoArtifactId, scenario.baseArtifact.version);

  ensure(compare.conflictType === "TEXT_CONFLICT", `expected TEXT_CONFLICT, got ${compare.conflictType}`);
  ensure(compare.canApplyDirectly === false, "compare should block direct apply");
  ensure(compare.requiresApproval === true, "compare should still require approval");

  let approvalBypassBlocked = false;
  try {
    await applyDiff(scenario.revisionTwoArtifactId, {
      force: false,
      approvalId: null,
      baseVersion: scenario.baseArtifact.version
    });
  } catch (error) {
    approvalBypassBlocked = String(error.message || "").includes("approvalId");
  }
  ensure(approvalBypassBlocked, "apply diff without approvalId should be rejected");

  const forceApprovalId = await createAndApproveApproval(scenario.conversationId, {
    actionType: "FORCE_APPLY_DIFF",
    targetType: "ARTIFACT",
    targetId: scenario.revisionTwoArtifactId,
    riskLevel: "HIGH",
    summary: "Conflict smoke force apply approval.",
    affectedItems: [`Artifact: ${scenario.revisionTwoArtifactId}`]
  });
  const forced = await applyDiff(scenario.revisionTwoArtifactId, {
    force: true,
    approvalId: forceApprovalId,
    baseVersion: scenario.baseArtifact.version
  });
  ensure(forced.conflictBypassed === true, "force apply should mark conflictBypassed");
  ensure(getIdValue(forced.appliedArtifact?.id), "force apply did not materialize an artifact");

  const audits = await getActionAudits(scenario.conversationId);
  ensure(
    audits.some((audit) => audit.actionType === "APPLY_DIFF" && audit.status === "CONFLICT"),
    "expected APPLY_DIFF conflict audit"
  );
  ensure(
    audits.some((audit) => audit.actionType === "APPROVAL_BYPASS_ATTEMPT"),
    "expected approval bypass attempt audit"
  );
  ensure(
    audits.some((audit) => audit.actionType === "FORCE_APPLY_DIFF" && audit.status === "COMPLETED"),
    "expected force apply completed audit"
  );

  pass(`conflict compare/apply/force-apply flow verified in conversation ${scenario.conversationId}`);
}

run().catch((error) => fail("conflict smoke failed", error));
