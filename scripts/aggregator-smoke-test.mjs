#!/usr/bin/env node

import {
  API_BASE,
  createConversation,
  createAndWaitDemoTask,
  ensure,
  ensureBackendHealth,
  fail,
  getIdValue,
  pass
} from "./_task-run-smoke-helpers.mjs";

async function run() {
  console.log(`AgentHub aggregator smoke target: ${API_BASE}`);
  await ensureBackendHealth();

  const conversation = await createConversation(`Aggregator Smoke ${Date.now()}`);
  const conversationId = getIdValue(conversation.id);
  ensure(conversationId, "conversationId missing");
  const taskRun = await createAndWaitDemoTask(
    conversationId,
    "Aggregator smoke: generate code, documentation, and review notes for a React login page."
  );

  ensure(String(taskRun.status).toUpperCase() === "COMPLETED", `expected COMPLETED, got ${taskRun.status}`);
  const aggregationDecision = String(taskRun.orchestratorDecisionLog?.aggregationDecision || "");
  ensure(aggregationDecision.includes("code="), "aggregationDecision missing code count");
  ensure(aggregationDecision.includes("markdown/doc="), "aggregationDecision missing markdown/doc count");
  ensure(aggregationDecision.includes("review="), "aggregationDecision missing review count");
  ensure(aggregationDecision.includes("deploy="), "aggregationDecision missing deploy count");
  ensure(taskRun.steps.every((step) => step.finalDecision), "expected every step to expose finalDecision");

  pass(`aggregator summary verified for ${getIdValue(taskRun.id)}: ${aggregationDecision}`);
}

run().catch((error) => fail("aggregator smoke failed", error));
