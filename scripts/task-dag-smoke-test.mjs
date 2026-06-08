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
  console.log(`AgentHub task DAG smoke target: ${API_BASE}`);
  await ensureBackendHealth();

  const conversation = await createConversation(`Task DAG Smoke ${Date.now()}`);
  const conversationId = getIdValue(conversation.id);
  ensure(conversationId, "conversationId missing");
  const taskRun = await createAndWaitDemoTask(
    conversationId,
    "Task DAG smoke: build a React login page, document it, and review the output."
  );

  ensure(String(taskRun.status).toUpperCase() === "COMPLETED", `expected COMPLETED, got ${taskRun.status}`);
  ensure(Array.isArray(taskRun.steps) && taskRun.steps.length > 0, "taskRun steps missing");
  ensure(taskRun.taskGraph?.nodes?.length === taskRun.steps.length, "task graph nodes do not align with steps");
  ensure((taskRun.taskGraph?.executionBatches?.length || 0) > 0, "execution batches missing");
  ensure((taskRun.timeline?.length || 0) > 0, "task run timeline missing");

  for (const step of taskRun.steps) {
    ensure(step.nodeId, `step ${getIdValue(step.id)} missing nodeId`);
    ensure(step.nodeType, `step ${getIdValue(step.id)} missing nodeType`);
    ensure(step.retryPolicy, `step ${getIdValue(step.id)} missing retryPolicy`);
    ensure(step.idempotencyKey, `step ${getIdValue(step.id)} missing idempotencyKey`);
    ensure(step.fallbackStrategy, `step ${getIdValue(step.id)} missing fallbackStrategy`);
    ensure(step.nodeStatus, `step ${getIdValue(step.id)} missing nodeStatus`);
    ensure(step.terminalStatus, `step ${getIdValue(step.id)} missing terminalStatus`);
  }

  pass(
    `task DAG verified for ${getIdValue(taskRun.id)} with ${taskRun.steps.length} nodes, ${taskRun.taskGraph.executionBatches.length} batches, and ${taskRun.timeline.length} timeline entries`
  );
}

run().catch((error) => fail("task DAG smoke failed", error));
