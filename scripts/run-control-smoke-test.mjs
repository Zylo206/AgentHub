#!/usr/bin/env node

import {
  API_BASE,
  createConversation,
  createAndWaitDemoTask,
  ensure,
  ensureBackendHealth,
  fail,
  getActionAudits,
  getIdValue,
  pass,
  request
} from "./_task-run-smoke-helpers.mjs";

const EXPECT_ACTIVE_CANCEL = process.env.AGENTHUB_RUN_CONTROL_EXPECT_ACTIVE_CANCEL === "true";

async function run() {
  console.log(`AgentHub run-control smoke target: ${API_BASE}`);
  await ensureBackendHealth();

  const conversation = await createConversation(`Run Control Smoke ${Date.now()}`);
  const conversationId = getIdValue(conversation.id);
  ensure(conversationId, "conversationId missing");
  const taskRun = await createAndWaitDemoTask(
    conversationId,
    "Run control smoke: build a code artifact and complete normally."
  );
  const taskRunId = getIdValue(taskRun.id);
  ensure(taskRunId, "taskRunId missing");

  const idempotencyKeys = new Set();
  for (const step of taskRun.steps) {
    ensure(step.executionToken, `step ${getIdValue(step.id)} missing executionToken`);
    ensure(typeof step.leaseVersion === "number", `step ${getIdValue(step.id)} missing leaseVersion`);
    ensure(step.idempotencyKey, `step ${getIdValue(step.id)} missing idempotencyKey`);
    ensure(!idempotencyKeys.has(step.idempotencyKey), `duplicate idempotency key detected: ${step.idempotencyKey}`);
    idempotencyKeys.add(step.idempotencyKey);
  }

  const cancelResult = await request(`/api/task-runs/${taskRunId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason: "run-control terminal rejection check" })
  });
  ensure(cancelResult.accepted === false, "terminal cancel should be rejected");
  ensure(String(cancelResult.status).toUpperCase() === String(taskRun.status).toUpperCase(), "terminal cancel changed run status");

  const audits = await getActionAudits(conversationId);
  ensure(
    audits.some((audit) => audit.actionType === "CANCEL_RUN" && audit.status === "REJECTED"),
    "expected rejected CANCEL_RUN audit"
  );

  if (EXPECT_ACTIVE_CANCEL) {
    pass("active cancel mode is enabled, but this script expects the backend to be started with artificial step delay.");
  }

  pass(`run control fields verified for ${taskRunId}; terminal cancel rejection is deterministic`);
}

run().catch((error) => fail("run-control smoke failed", error));
