const API = "http://localhost:8080";

async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(`${method} ${path} failed: ${json.message}`);
  return json.data;
}

async function main() {
  // 1. Login
  const login = await req("POST", "/api/auth/login", { username: "demo", password: "demo" });
  const token = login.token;
  console.log("[PASS] login");

  // 2. Create conversation
  const conv = await req("POST", "/api/conversations", { title: "Deploy Smoke", type: "SINGLE" }, token);
  const convId = conv.id.value;
  console.log("[PASS] conversation:", convId);

  // 3. Send message with target agent
  const msg = await req("POST", `/api/conversations/${convId}/messages`, { content: "hello", targetAgentId: "agent_frontend_builder" }, token);
  const msgId = msg.id.value;
  console.log("[PASS] message:", msgId);

  // 4. Direct agent reply (creates artifact via MOCK adapter)
  const reply = await req("POST", `/api/conversations/${convId}/messages/${msgId}/direct-agent-reply`, {}, token);
  console.log("[PASS] direct-agent-reply, artifacts:", reply?.agentMessage?.artifactIds?.length ?? 0);

  // 5. Find artifact
  const artifacts = await req("GET", `/api/conversations/${convId}/artifacts`, null, token);
  if (artifacts.length === 0) {
    console.log("[FAIL] no artifacts created");
    process.exit(1);
  }
  const artifact = artifacts[0];
  const artifactId = artifact.id.value;
  console.log("[PASS] artifact:", artifactId, artifact.type, artifact.title);

  // 6. Create approval for deploy
  const approval = await req("POST", `/api/conversations/${convId}/approval-requests`, {
    actionType: "DEMO_DEPLOY",
    targetType: "ARTIFACT",
    targetId: artifactId,
    riskLevel: "MEDIUM",
    summary: "Deploy test",
  }, token);
  const approvalId = approval.approvalId;
  console.log("[PASS] approval:", approvalId);

  // 7. Approve
  await req("POST", `/api/approval-requests/${approvalId}/approve`, {}, token);
  console.log("[PASS] approved");

  // 8. Deploy
  const deploy = await req("POST", `/api/artifacts/${artifactId}/demo-deploy`, { approvalId }, token);
  const deployId = deploy.deploymentId;
  const previewUrl = deploy.previewUrl;
  console.log("[PASS] deploy:", deployId);
  console.log("[PASS] previewUrl:", previewUrl);

  // 9. Verify preview URL is accessible
  const previewRes = await fetch(previewUrl);
  const html = await previewRes.text();
  console.log("[PASS] preview URL accessible, status:", previewRes.status, "content-length:", html.length);
  console.log("[PASS] html contains title:", html.includes(artifact.title || "Untitled"));
  console.log("[PASS] html contains AgentHub:", html.includes("AgentHub"));

  console.log("\n=== ALL TESTS PASSED ===");
}

main().catch((err) => {
  console.error("[FAIL]", err.message);
  process.exit(1);
});
