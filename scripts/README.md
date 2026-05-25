# Scripts

This directory contains local bootstrap scripts, demo helpers, and repository automation.

## Smoke Test

`smoke-test.mjs` verifies the current AgentHub MVP API flow:

- backend health
- adapter list
- conversation creation
- conversation participants
- message creation
- real uploaded message attachments
- optional message-level Orchestrator auto-trigger via `/messages/{messageId}/orchestrator-run`
- structured reply / quote message relation
- manual message pin as context
- demo task run
- task input context / ContextSnapshot pinned context and retrieved context
- retrieved context v3 score breakdown, matched tokens, source rank, and window policy
- TaskGraph execution batches
- message-based demo task rerun
- group chat Agent messages
- task run query
- artifact query
- source metadata check for static / real Adapter artifacts
- REAL_ADAPTER artifact fixture contract validation
- optional REAL_ADAPTER artifact assertion when explicitly enabled
- Tool Capability router smoke coverage for a custom review Agent
- weighted routing evidence in `routingReason`
- `/api/adapters` route stats fields: attempts, success rate, fallback rate
- Agent collaboration protocol checks, with optional Reviewer REJECTION / retry-revise assertion
- artifact revision
- artifact safety snapshots
- lightweight apply-diff generated artifact
- apply-diff conflict detection and force apply
- demo deployment
- preview URL reachability
- artifact snapshot restore
- action audit log records
- deployment query
- message stream deployment status
- single Agent reply regeneration

Run the API smoke test:

Start the backend and frontend first, then run:

```powershell
node scripts/smoke-test.mjs
```

The default backend URL is `http://127.0.0.1:8080`.
The default frontend URL for deployment preview checks is `http://127.0.0.1:5173`.

Override the backend URL in PowerShell:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; node scripts/smoke-test.mjs
```

Override the frontend URL in PowerShell:

```powershell
$env:AGENTHUB_FRONTEND_BASE_URL="http://127.0.0.1:5173"; node scripts/smoke-test.mjs
```

Override both URLs in PowerShell:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; $env:AGENTHUB_FRONTEND_BASE_URL="http://127.0.0.1:5173"; node scripts/smoke-test.mjs
```

Override the backend URL in Bash:

```bash
AGENTHUB_API_BASE_URL=http://127.0.0.1:8080 node scripts/smoke-test.mjs
```

Override both URLs in Bash:

```bash
AGENTHUB_API_BASE_URL=http://127.0.0.1:8080 AGENTHUB_FRONTEND_BASE_URL=http://127.0.0.1:5173 node scripts/smoke-test.mjs
```

If you explicitly configure a real Adapter and expect it to produce persisted artifacts, enable the stricter check:

```powershell
$env:AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER="true"; node scripts/smoke-test.mjs
```

Without this flag, the smoke test remains stable in the default Mock / fallback environment.

The smoke test always validates a local REAL_ADAPTER artifact fixture contract and validates persisted REAL_ADAPTER artifacts when the backend produces them. It also creates an isolated custom `review` Agent to verify that Tool Capability routing can select an Agent for `QUALITY_REVIEW`. `REJECTION` remains opt-in so the default demo path stays stable. To verify the Reviewer rejection loop, run:

```powershell
$env:AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION="true"
node scripts/smoke-test.mjs
```

This sends a rejection-triggering prompt and expects `TaskRun.status=BLOCKED`, `messageType=REJECTION`, a `REJECTED` Review Report, and a retry / revise advice artifact.

If backend is started with message-level auto trigger and Adapter stats persistence enabled, enable the stricter checks:

```powershell
$env:AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL="true"
$env:AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE="true"
$env:AGENTHUB_ADAPTER_STATS_PERSISTENCE_PATH="E:\CodeProject2\AgentHub\backend\target\adapter-route-stats-smoke.json"
node scripts/smoke-test.mjs
```

These flags validate that matched task messages require approval before `orchestrator-run` executes, that adapter route stats are written to the configured JSON snapshot, and that `/api/adapters` exposes route stats for Workspace / Agent Builder visualization.

This is an API-level smoke test with real local attachment upload/download and an HTTP reachability check for the local preview page. It does not run browser E2E automation, parse DOM content, make real LLM calls, call real external Agents, or perform real deployment.

## SSE Smoke Test

`sse-smoke-test.mjs` verifies the realtime MVP channel:

- opens `GET /api/conversations/{conversationId}/events`
- sends a message
- runs a demo task
- expects `MESSAGE_CREATED`, `TASK_RUN_CREATED`, `TASK_RUN_UPDATED`, and `ARTIFACT_CREATED`
- checks `/active-realtime-state` and `/task-runs/{taskRunId}/realtime-state`

Run it after starting the backend:

```powershell
node scripts/sse-smoke-test.mjs
```

Override the backend URL:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; node scripts/sse-smoke-test.mjs
```

This is an API-level SSE verification. It does not validate browser rendering, WebSocket control commands, real LLM token streaming, or multi-node event broadcasting.

## Browser E2E

`e2e-browser.mjs` is a lightweight Playwright wrapper that seeds a browser-test conversation through the API, uploads a small real text attachment, then verifies the rendered Workspace, message attachment card, retrieved context explanation, Orchestrator explain panel, artifact preview, approval gate, deploy status card, and static preview page.

The wrapper can use `playwright-core`, `playwright`, or `@playwright/test` from the frontend package. The lightest path is `playwright-core` plus the local Microsoft Edge browser channel:

```powershell
cd frontend
npm install --save-dev playwright-core
npm run e2e:browser
```

Or run the wrapper directly from the repository root:

```powershell
node scripts/e2e-browser.mjs
```

Environment overrides:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:AGENTHUB_FRONTEND_BASE_URL="http://127.0.0.1:5173"
$env:AGENTHUB_E2E_BROWSER_CHANNEL="msedge"
$env:AGENTHUB_E2E_HEADLESS="false"
$env:AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL="true"
node scripts/e2e-browser.mjs
```

The browser E2E requires backend and frontend to already be running. It does not start servers, does not call real LLM providers, and does not perform an external deployment.

## OpenAI-compatible / DeepSeek Adapter

AgentHub uses the same basic shape as KnowFlow's DeepSeek client: configure a base URL, send `Authorization: Bearer ...`, and call `/chat/completions`.

PowerShell example:

```powershell
$env:AGENTHUB_OPENAI_ENABLED="true"
$env:AGENTHUB_OPENAI_BASE_URL="https://api.deepseek.com"
$env:AGENTHUB_OPENAI_API_KEY="<your-api-key>"
$env:AGENTHUB_OPENAI_MODEL="deepseek-v4-flash"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="HYBRID_REAL"
cd backend
mvn spring-boot:run
```

Do not write real API keys into `.env.example`, README, or committed scripts. After startup, open `/agents` and use the Adapter Test panel to test `OPENAI_COMPATIBLE`.
