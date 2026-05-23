#!/usr/bin/env node

const API_BASE = (process.env.AGENTHUB_API_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const FRONTEND_BASE = (process.env.AGENTHUB_FRONTEND_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");

const DEMO_PROMPT = "帮我生成一个 React 登录页面，支持邮箱登录和验证码登录，同时生成 README，并检查代码质量。";
const REVISION_INSTRUCTION = "把按钮改成蓝色，并增加 loading 状态。";

function pass(message) {
  console.log(`[PASS] ${message}`);
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
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
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
    return new URL(value).toString();
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
  return (
    codeArtifacts.find((artifact) => String(artifact.title || "").includes("LoginPage")) ||
    codeArtifacts[0] ||
    null
  );
}

async function runSmokeTest() {
  console.log(`AgentHub smoke test target: ${API_BASE}`);
  console.log(`AgentHub frontend preview target: ${FRONTEND_BASE}`);

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
  pass(`adapters loaded: ${adapterSummary}`);

  const agents = await request("/api/agents");
  const frontendAgent = agents.find((agent) => agent.name === "Frontend Builder");
  const reviewerAgent = agents.find((agent) => agent.name === "Reviewer");
  const mentionedAgentIds = [getIdValue(frontendAgent?.id), getIdValue(reviewerAgent?.id)].filter(Boolean);
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

  const message = await request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      content: DEMO_PROMPT,
      targetAgentId: mentionedAgentIds[0],
      mentionedAgentIds
    })
  });
  const messageId = requireValue(getIdValue(message.id), "messageId missing");
  if (!Array.isArray(message.mentionedAgentIds) || message.mentionedAgentIds.length < 2) {
    throw new Error(`message did not persist mentionedAgentIds: ${JSON.stringify(message.mentionedAgentIds)}`);
  }
  pass(`message sent: ${messageId}`);

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
      userInput: DEMO_PROMPT
    })
  });
  const taskRunId = requireValue(getIdValue(taskRun.id), "taskRunId missing");
  const steps = Array.isArray(taskRun.steps) ? taskRun.steps : [];
  if (taskRun.status !== "COMPLETED") {
    throw new Error(`demo task status expected COMPLETED, got ${taskRun.status}`);
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
    throw new Error("first task step inputContext did not include Context Retrieval v2 results");
  }
  const taskGraph = taskRun.taskGraph;
  if (!taskGraph || !Array.isArray(taskGraph.executionBatches) || taskGraph.executionBatches.length < 1) {
    throw new Error("demo task did not return taskGraph execution batches");
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
  pass(`planner mode visible: ${plannerMode}`);
  pass(`task graph loaded: ${taskGraph.executionBatches.length} batch(es)`);
  pass(`parallel execution group validated: ${parallelGroupEntry[0]} -> steps ${parallelGroupEntry[1].join(", ")}`);

  const rerunTaskRun = await request(`/api/conversations/${conversationId}/demo-task`, {
    method: "POST",
    body: JSON.stringify({
      messageId,
      userInput: DEMO_PROMPT
    })
  });
  const rerunTaskRunId = requireValue(getIdValue(rerunTaskRun.id), "rerun taskRunId missing");
  const rerunSteps = Array.isArray(rerunTaskRun.steps) ? rerunTaskRun.steps : [];
  if (rerunTaskRun.status !== "COMPLETED") {
    throw new Error(`message rerun task status expected COMPLETED, got ${rerunTaskRun.status}`);
  }
  if (rerunSteps.length < 3) {
    throw new Error(`message rerun task expected at least 3 steps, got ${rerunSteps.length}`);
  }
  pass(`message rerun demo task completed: ${rerunTaskRunId}, steps=${rerunSteps.length}`);

  const refreshedConversation = await request(`/api/conversations/${conversationId}`);
  const refreshedParticipantIds = assertBuiltInParticipants(refreshedConversation, "refreshed conversation");
  pass(`conversation participants loaded: ${refreshedParticipantIds.length}`);

  const contextSnapshots = await request(`/api/task-runs/${taskRunId}/context-snapshots`);
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
  pass(`context snapshots include pinned context: ${contextSnapshots.length}`);
  pass("context snapshots include retrieved context items");

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

  const realAdapterSteps = steps.filter(
    (step) => step.actualAdapterType && step.actualAdapterType !== "MOCK" && step.adapterStatus === "COMPLETED"
  );
  const adapterOutputArtifacts = artifacts.filter((item) => String(item.title || "").startsWith("Adapter Output -"));
  if (realAdapterSteps.length > 0 && adapterOutputArtifacts.length < realAdapterSteps.length) {
    throw new Error(
      `expected adapter output artifacts for real adapter steps. realAdapterSteps=${realAdapterSteps.length}, adapterOutputArtifacts=${adapterOutputArtifacts.length}`
    );
  }
  if (adapterOutputArtifacts.length > 0) {
    const invalidAdapterOutputArtifact = adapterOutputArtifacts.find((item) =>
      !String(item.content || "").includes("Persisted Because: actual adapter completed without MOCK fallback")
    );
    if (invalidAdapterOutputArtifact) {
      throw new Error(`adapter output artifact missing persistence explanation: ${invalidAdapterOutputArtifact.title}`);
    }
    pass(`adapter output artifacts loaded: ${adapterOutputArtifacts.length}`);
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
  pass("revision completed");

  const snapshotsAfterRevision = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!Array.isArray(snapshotsAfterRevision) || !snapshotsAfterRevision.some((snapshot) => snapshot.operationType === "DEMO_REVISION")) {
    throw new Error("expected DEMO_REVISION artifact snapshot after revision");
  }
  pass(`artifact snapshots loaded after revision: ${snapshotsAfterRevision.length}`);

  const revisedArtifactId = requireValue(getIdValue(revision.revisedArtifact?.id), "revisedArtifactId missing");
  const applyDiffResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST"
  });
  const appliedArtifactId = requireValue(getIdValue(applyDiffResult.appliedArtifact?.id), "appliedArtifactId missing");
  if (applyDiffResult.appliedArtifact.status !== "ACCEPTED") {
    throw new Error(`expected applied artifact status ACCEPTED, got ${applyDiffResult.appliedArtifact.status}`);
  }
  if (applyDiffResult.revisionArtifactId !== revisedArtifactId) {
    throw new Error("apply diff response did not reference the revised artifact");
  }
  pass(`diff applied: ${appliedArtifactId}, added=${applyDiffResult.addedLines}, removed=${applyDiffResult.removedLines}`);

  const snapshotsAfterApply = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!snapshotsAfterApply.some((snapshot) => snapshot.operationType === "APPLY_DIFF")) {
    throw new Error("expected APPLY_DIFF artifact snapshot after apply diff");
  }
  pass(`artifact snapshots loaded after apply diff: ${snapshotsAfterApply.length}`);

  const conflictResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST"
  });
  if (conflictResult.conflict !== true || conflictResult.appliedArtifact) {
    throw new Error("expected repeated diff apply to return a conflict without creating another artifact");
  }
  if (!conflictResult.latestAppliedArtifactId) {
    throw new Error("diff conflict response missing latestAppliedArtifactId");
  }
  pass(`diff conflict detected: latest=${conflictResult.latestAppliedArtifactId}`);

  const forceApplyResult = await request(`/api/artifacts/${revisedArtifactId}/apply-diff`, {
    method: "POST",
    body: JSON.stringify({ force: true })
  });
  const forcedAppliedArtifactId = requireValue(
    getIdValue(forceApplyResult.appliedArtifact?.id),
    "forced appliedArtifactId missing"
  );
  if (forceApplyResult.appliedArtifact.status !== "ACCEPTED") {
    throw new Error(`expected forced applied artifact status ACCEPTED, got ${forceApplyResult.appliedArtifact.status}`);
  }
  pass(`diff force applied: ${forcedAppliedArtifactId}`);

  const deployment = await request(`/api/artifacts/${appliedArtifactId}/demo-deploy`, {
    method: "POST"
  });
  const deploymentId = requireValue(deployment.deploymentId, "deploymentId missing");
  if (deployment.status !== "SUCCESS") {
    throw new Error(`deployment status expected SUCCESS, got ${deployment.status}`);
  }
  const deploymentPreviewUrl = requireValue(deployment.previewUrl, "deployment previewUrl missing");
  pass(`deployment created: ${deploymentId}`);

  const snapshotsAfterDeploy = await request(`/api/conversations/${conversationId}/artifact-snapshots`);
  if (!snapshotsAfterDeploy.some((snapshot) => snapshot.operationType === "DEMO_DEPLOY")) {
    throw new Error("expected DEMO_DEPLOY artifact snapshot after deploy");
  }
  pass(`artifact snapshots loaded after deploy: ${snapshotsAfterDeploy.length}`);

  const restoreCandidate = snapshotsAfterDeploy.find((snapshot) => snapshot.operationType === "APPLY_DIFF")
    || snapshotsAfterDeploy[0];
  const restoredArtifact = await request(`/api/artifact-snapshots/${restoreCandidate.snapshotId}/restore`, {
    method: "POST"
  });
  const restoredArtifactId = requireValue(getIdValue(restoredArtifact.id), "restoredArtifactId missing");
  if (restoredArtifact.status !== "ACCEPTED") {
    throw new Error(`restored artifact status expected ACCEPTED, got ${restoredArtifact.status}`);
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
  if (!Array.isArray(actionAudits) || actionAudits.length < 3) {
    throw new Error("expected action audit records for revision/apply/deploy/restore");
  }
  const requiredAuditActions = ["APPLY_DIFF", "DEMO_DEPLOY", "RESTORE_SNAPSHOT", "SMOKE_APPROVAL_GATE"];
  const missingAuditActions = requiredAuditActions.filter((actionType) =>
    !actionAudits.some((auditLog) => auditLog.actionType === actionType)
  );
  if (missingAuditActions.length > 0) {
    throw new Error(`missing action audit records: ${missingAuditActions.join(", ")}`);
  }
  pass(`action audits loaded: ${actionAudits.length}`);

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
  const hasUserMessage = messages.some((item) => item.senderType === "USER" && item.content === DEMO_PROMPT);
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
      String(item.content || "").includes("真实 / 半真实 Adapter 输出产物")
    );
    if (!hasAdapterOutputMessage) {
      throw new Error("adapter output artifact message not found in message list");
    }
  }
  const agentMessages = messages.filter((item) => item.senderType === "AGENT");
  const requiredAgentSenders = [
    "agent_orchestrator",
    "agent_frontend_builder",
    "agent_backend_worker",
    "agent_reviewer"
  ];
  const missingAgentSenders = requiredAgentSenders.filter(
    (senderId) => !agentMessages.some((item) => item.senderId === senderId)
  );
  const orchestratorMessages = agentMessages.filter((item) => item.senderId === "agent_orchestrator");
  const hasOrchestratorSummary = orchestratorMessages.some((item) =>
    String(item.content || "").includes("群聊协作汇总")
  );
  const taskStepAgentMessages = agentMessages.filter((item) => String(item.content || "").includes("TaskStep"));
  if (
    agentMessages.length < 5 ||
    missingAgentSenders.length > 0 ||
    orchestratorMessages.length < 2 ||
    !hasOrchestratorSummary ||
    taskStepAgentMessages.length < 3
  ) {
    throw new Error(
      `expected group chat agent messages from Orchestrator and 3 TaskSteps, got agentMessages=${agentMessages.length}, taskStepMessages=${taskStepAgentMessages.length}, missing=${missingAgentSenders.join(",") || "none"}, orchestratorMessages=${orchestratorMessages.length}, hasSummary=${hasOrchestratorSummary}`
    );
  }
  pass(`messages loaded: ${messages.length}`);
  pass(`group chat agent messages loaded: ${agentMessages.length}, orchestrator=${orchestratorMessages.length}, taskStep=${taskStepAgentMessages.length}`);

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

  console.log("Smoke test completed successfully.");
}

runSmokeTest().catch((error) => {
  fail("smoke test failed", error);
});
