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

Optional stronger checks are only enabled when set, so they do not block `DEFAULT_MOCK` or non-real runs:

```powershell
$env:AGENTHUB_SMOKE_EXPECT_REAL_BUILD_VALIDATION="true"      # assert TaskStep.artifactBuildValidationStatus
$env:AGENTHUB_SMOKE_EXPECT_REAL_QUALITY_SCORE="true"         # assert TaskStep.artifactQualityScore
$env:AGENTHUB_SMOKE_EXPECT_REAL_QUALITY_REASON="true"        # assert TaskStep.artifactQualityReason
```

## Real OpenAI-compatible Adapter Smoke Test

`real-adapter-smoke-test.mjs` is an opt-in verification for a real OpenAI-compatible provider. Without real-provider env vars (or when strict mode is disabled), it skips provider-specific assertions and exits with an explicit skip message, so default non-real environments are unaffected.

Start the backend with the same real-provider configuration first:

```powershell
$env:AGENTHUB_OPENAI_ENABLED="true"
$env:AGENTHUB_OPENAI_BASE_URL="<openai-compatible-base-url>"
$env:AGENTHUB_OPENAI_API_KEY="<your-api-key>"
$env:AGENTHUB_OPENAI_MODEL="<model>"
$env:AGENTHUB_OPENAI_FIXTURE_ENABLED="false"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
cd backend
mvn spring-boot:run
```

Then run the real-provider smoke test from the repository root with the same environment variables available to the script:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:AGENTHUB_OPENAI_ENABLED="true"
$env:AGENTHUB_OPENAI_BASE_URL="<openai-compatible-base-url>"
$env:AGENTHUB_OPENAI_API_KEY="<your-api-key>"
$env:AGENTHUB_OPENAI_MODEL="<model>"
$env:AGENTHUB_OPENAI_FIXTURE_ENABLED="false"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
node scripts/real-adapter-smoke-test.mjs
```

This script verifies `/api/adapters`, `POST /api/adapters/OPENAI_COMPATIBLE/execute`, and a `REAL_FIRST` demo-task run. It expects a non-MOCK `OPENAI_COMPATIBLE` response, valid raw artifact JSON, an accepted `REAL_ADAPTER` primary Artifact, and archived static fallback Artifacts. Do not commit API keys or local secrets.

Optional stricter real-provider assertions:

```powershell
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_BUILD_VALIDATION="true"   # assert artifact build validation status
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_SCORE="true"     # assert artifact quality score
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_REASON="true"    # assert artifact quality reason
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD="true"        # compile accepted REAL_ADAPTER CODE with frontend TypeScript
$env:AGENTHUB_REAL_ADAPTER_SMOKE_STRICT="true"                   # enforce fixture / missing-env fail-fast
```

The optional CODE build check writes the accepted `REAL_ADAPTER` code artifact to
`frontend/.vite/agenthub-real-adapter-smoke/`, runs the local frontend TypeScript compiler
with `--noEmit`, and removes the temporary directory afterwards. It is intentionally opt-in:
default smoke tests do not require a real provider, do not run TypeScript compilation against
generated artifacts, and do not treat fixture output as a real provider result.

If you explicitly run the backend in `REAL_FIRST` mode and expect the primary generated Artifact to come from a real Adapter, enable the stricter REAL_FIRST check:

```powershell
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
$env:AGENTHUB_SMOKE_EXPECT_REAL_FIRST="true"
node scripts/smoke-test.mjs
```

This assertion expects the selected primary code Artifact to use `sourceKind=REAL_ADAPTER` and expects static template fallback Artifacts to be archived. Do not enable it unless `OPENAI_COMPATIBLE` or another non-MOCK Adapter is configured to return a valid Artifact JSON contract.

If you run the backend with the JDBC persistence profile, reuse the same API smoke flow and enable the JDBC marker:

```powershell
$env:AGENTHUB_PERSISTENCE_MODE="jdbc"
$env:AGENTHUB_JDBC_URL="<jdbc-url>"
$env:AGENTHUB_JDBC_USERNAME="<username>"
$env:AGENTHUB_JDBC_PASSWORD="<password>"
$env:AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE="true"
node scripts/smoke-test.mjs
```

The script cannot introspect the backend process mode directly; this flag asserts that the same create / query / upload / download / task / artifact flow succeeds while the backend is launched with JDBC configuration.

The explicit schema file is available at `backend/src/main/resources/schema-jdbc.sql`. Run it against the target MySQL-compatible database before starting the backend if you want deterministic local setup instead of relying only on repository auto-create behavior.

`schema-jdbc.sql` is a fresh-initialization schema, not a migration script. If you already have an older AgentHub JDBC database, recreate it for local validation or apply equivalent `ALTER TABLE` statements manually before running the JDBC smoke flow.

You can also use the JDBC wrapper script after starting the backend in JDBC mode:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
node scripts/jdbc-smoke-test.mjs
```

Context retrieval uses the heuristic semantic backend by default. To exercise the optional embedding backend switch without requiring an external provider, start the backend with:

```powershell
$env:AGENTHUB_CONTEXT_SEMANTIC_BACKEND="embedding"
```

In this build the backend reports `EMBEDDING_DISABLED` and falls back to heuristic semantic overlap; no external embedding service is required.

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
- reconnects with `Last-Event-ID` to verify retained event replay
- checks that realtime state exposes `lastEventId` for recovery

Run it after starting the backend:

```powershell
node scripts/sse-smoke-test.mjs
```

Override the backend URL:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; node scripts/sse-smoke-test.mjs
```

This is an API-level SSE verification. It does not validate browser rendering, WebSocket control commands, real LLM token streaming, multi-node event broadcasting, or real deployment.

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

AgentHub uses the standard OpenAI-compatible chat completions shape: configure a base URL, send `Authorization: Bearer ...`, and call `/chat/completions`.

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
