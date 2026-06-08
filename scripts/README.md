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
- chat deployment-intent message coverage
- artifact bundle zip download coverage
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

## Artifact Collaboration V2 Smoke Tests

`collab-smoke-test.mjs` verifies the Yjs V2 collaboration path. It requires the Spring backend and the independent `doc-collab` service to be running. It uses `doc-collab` dependencies from `doc-collab/node_modules`.

Setup:

```powershell
cd doc-collab
npm install
npm run build
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:DOC_COLLAB_PORT="8091"
npm run start
```

Then run from the repository root:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:DOC_COLLAB_WS_BASE_URL="ws://127.0.0.1:8091"
node scripts/collab-smoke-test.mjs
```

The smoke test logs in as `demo/demo`, creates a CODE or MARKDOWN Artifact when `AGENTHUB_COLLAB_SMOKE_ARTIFACT_ID` is not provided, opens two Yjs clients, verifies convergence, reconnect recovery, approval creation, approval execution, and publish to Artifact Revision.

`collab-cluster-smoke-test.mjs` is opt-in for Redis-backed multi-node validation:

```powershell
$env:DOC_COLLAB_CLUSTER_URLS="ws://127.0.0.1:8091,ws://127.0.0.1:8092,ws://127.0.0.1:8093"
$env:AGENTHUB_COLLAB_SMOKE_ARTIFACT_ID="<artifact-id>"
$env:AGENTHUB_COLLAB_SMOKE_TOKEN="<bearer-token>"
node scripts/collab-cluster-smoke-test.mjs
```

It opens 20 clients across the configured doc-collab nodes and verifies final Yjs convergence. Without those environment variables it exits with `[SKIP]`.

To validate the snapshot/object-storage boundary locally, you can enable the filesystem-backed object-storage layout for `doc-collab`:

```powershell
$env:DOC_COLLAB_SNAPSHOT_STORAGE_TYPE="object-storage"
$env:DOC_COLLAB_OBJECT_STORAGE_DIR="C:/Users/<your-user>/.agenthub/agenthub/object-storage"
$env:DOC_COLLAB_OBJECT_STORAGE_BUCKET="doc-collab"
```

This keeps the local file snapshot fallback and adds an object-storage-style snapshot copy for restart recovery drills without introducing a cloud SDK dependency.

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
$env:AGENTHUB_OPENAI_STREAMING_ENABLED="false"
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
$env:AGENTHUB_OPENAI_STREAMING_ENABLED="false"
$env:AGENTHUB_OPENAI_FIXTURE_ENABLED="false"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
node scripts/real-adapter-smoke-test.mjs
```

This script verifies `/api/adapters`, `POST /api/adapters/OPENAI_COMPATIBLE/execute`, and a `REAL_FIRST` demo-task run. It expects a non-MOCK `OPENAI_COMPATIBLE` response, valid raw artifact JSON, an accepted `REAL_ADAPTER` primary Artifact, and archived static fallback Artifacts. Do not commit API keys or local secrets.
Streaming is opt-in. Set `AGENTHUB_OPENAI_STREAMING_ENABLED=true` in backend and `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING="true"` when you need to verify stream chunks.

Optional stricter real-provider assertions:

```powershell
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_BUILD_VALIDATION="true"   # assert artifact build validation status
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_SCORE="true"     # assert artifact quality score
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_QUALITY_REASON="true"    # assert artifact quality reason
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD="true"        # compile accepted REAL_ADAPTER CODE with frontend TypeScript
$env:AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING="true"         # expect ADAPTER_STREAM_CHUNK from conversation SSE during demo-task
$env:AGENTHUB_REAL_ADAPTER_SMOKE_STRICT="true"                   # enforce fixture / missing-env fail-fast
```

The optional CODE build check writes the accepted `REAL_ADAPTER` code artifact to
`frontend/.vite/agenthub-real-adapter-smoke/`, runs the local frontend TypeScript compiler
with `--noEmit`, and removes the temporary directory afterwards. It is intentionally opt-in:
default smoke tests do not require a real provider, do not run TypeScript compilation against
generated artifacts, and do not treat fixture output as a real provider result.

## Claude Code Adapter Smoke Test

`claude-code-smoke-test.mjs` verifies the Artifact-only Claude Code headless adapter. It is opt-in and is not part of the default smoke path. The adapter uses Claude Code CLI `-p` mode and requires output to pass the same AgentHub Artifact JSON contract as other real adapters.

Fixture mode verifies the backend contract without requiring a local Claude login:

```powershell
$env:AGENTHUB_CLAUDE_CODE_ENABLED="true"
$env:AGENTHUB_CLAUDE_CODE_FIXTURE_ENABLED="true"
$env:AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED="false"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
cd backend
mvn spring-boot:run
```

Then run:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
node scripts/claude-code-smoke-test.mjs
```

Real Claude Code CLI mode requires `claude` to be installed and authenticated on the machine:

```powershell
claude --version
$env:AGENTHUB_CLAUDE_CODE_ENABLED="true"
$env:AGENTHUB_CLAUDE_CODE_FIXTURE_ENABLED="false"
$env:AGENTHUB_CLAUDE_CODE_COMMAND="claude"
$env:AGENTHUB_CLAUDE_CODE_MODEL="sonnet"
$env:AGENTHUB_CLAUDE_CODE_ARTIFACT_ONLY="true"
$env:AGENTHUB_CLAUDE_CODE_ALLOWED_TOOLS="Read,Grep,Glob"
$env:AGENTHUB_CLAUDE_CODE_DISALLOWED_TOOLS="Edit,MultiEdit,Write,NotebookEdit,Bash"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
$env:AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI="true"
node scripts/claude-code-smoke-test.mjs
```

On Windows npm installs, the backend may need the `.cmd` shim rather than the extensionless npm shim:

```powershell
$env:AGENTHUB_CLAUDE_CODE_COMMAND="C:\Users\<you>\AppData\Roaming\npm\claude.cmd"
```

Streaming is also opt-in:

```powershell
$env:AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED="true"
$env:AGENTHUB_CLAUDE_CODE_SMOKE_EXPECT_STREAMING="true"
node scripts/claude-code-smoke-test.mjs
```

This is not an interactive Claude Code terminal and does not allow Claude Code to directly edit the AgentHub workspace. Workspace-write mode remains out of scope for this v1 adapter.

The smoke script checks `/api/adapters` capability metadata before execution. With `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true`, fixture mode is rejected and the descriptor must expose a passing version probe, headless/artifact-only modes, and workspace-write-disabled policy. Failure diagnostics are classified as `NOT_INSTALLED`, `NOT_AUTHENTICATED`, `PERMISSION_DENIED`, `TIMEOUT`, `CONTRACT_INVALID`, `QUALITY_FAILED`, `BUILD_FAILED`, `CANCELLED`, or `FALLBACK` where possible.

Common Claude Code failures:

- `NOT_INSTALLED`: `claude --version` fails or `AGENTHUB_CLAUDE_CODE_COMMAND` points to a missing executable.
- `NOT_AUTHENTICATED`: CLI exists but the local Claude Code account/session is not usable for headless execution.
- `CONTRACT_INVALID` / `PARSE_FAILED`: CLI returned prose, Markdown fences, wrapper metadata, or invalid AgentHub Artifact JSON.
- `QUALITY_FAILED` / `BUILD_FAILED`: JSON was parseable, but content failed raw-source or lightweight build heuristics.
- `CANCELLED`: Stop/Cancel was requested before final output was accepted; chunks are preview-only and late results are discarded.

## Codex Adapter Smoke Test

`codex-smoke-test.mjs` verifies the production Codex Adapter v1 contract. It is opt-in and is not part of the default smoke path. The backend must expose `CODEX=AVAILABLE`, `POST /api/adapters/CODEX/execute` must return AgentHub Artifact JSON, and a `REAL_FIRST` demo-task run must produce at least one accepted `CODEX / REAL_ADAPTER` Artifact.

Backend setup:

```powershell
codex --version
$env:AGENTHUB_CODEX_ENABLED="true"
$env:AGENTHUB_CODEX_COMMAND="codex"
$env:AGENTHUB_CODEX_ARTIFACT_ONLY="true"
$env:AGENTHUB_CODEX_FIXTURE_ENABLED="false"
$env:AGENTHUB_CODEX_STREAMING_ENABLED="false"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
cd backend
mvn spring-boot:run
```

On Windows Store / App Execution Alias installs, prefer `AGENTHUB_CODEX_COMMAND="codex"`. Do not point Java directly at the internal `WindowsApps\...\codex.exe` path; that path can fail with `PERMISSION_DENIED`.

Then run:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI="true"
node scripts/codex-smoke-test.mjs
```

Streaming is also opt-in and only passes when the backend Codex Adapter publishes `ADAPTER_STREAM_CHUNK` events:

```powershell
$env:AGENTHUB_CODEX_STREAMING_ENABLED="true"
$env:AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING="true"
node scripts/codex-smoke-test.mjs
```

This is not Codex Desktop GUI automation. The intended production boundary is headless / Artifact-only execution: Codex output must pass the AgentHub Artifact JSON contract, quality evaluation, optional build validation, and REAL_FIRST selection before it can become a primary Artifact. Default smoke tests must not require Codex.

The Codex smoke script checks descriptor capability metadata before execution. With `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true`, fixture mode is rejected and the descriptor must expose a passing version probe plus `exec`, `--output-schema`, and read-only sandbox support. Failure diagnostics are classified as `NOT_INSTALLED`, `NOT_AUTHENTICATED`, `PERMISSION_DENIED`, `TIMEOUT`, `CONTRACT_INVALID`, `QUALITY_FAILED`, `BUILD_FAILED`, `CANCELLED`, or `FALLBACK` where possible.

Common Codex failures:

- `NOT_INSTALLED`: `codex --version` fails or `AGENTHUB_CODEX_COMMAND` points to a missing executable.
- `NOT_AUTHENTICATED`: CLI exists but cannot execute the configured model/session.
- `CONTRACT_INVALID` / `PARSE_FAILED`: CLI returned plain text, Markdown fences, logs, wrapper payloads, or invalid Artifact JSON.
- `QUALITY_FAILED` / `BUILD_FAILED`: JSON was accepted by the contract but rejected by content quality or build heuristics.
- `CANCELLED`: Stop/Cancel was requested; no late chunks are published after the token is observed and the final result is not persisted.

If you explicitly run the backend in `REAL_FIRST` mode and expect the primary generated Artifact to come from a real Adapter, enable the stricter REAL_FIRST check:

```powershell
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
$env:AGENTHUB_SMOKE_EXPECT_REAL_FIRST="true"
node scripts/smoke-test.mjs
```

This assertion expects the selected primary code Artifact to use `sourceKind=REAL_ADAPTER` and expects static template fallback Artifacts to be archived. Do not enable it unless `OPENAI_COMPATIBLE` or another non-MOCK Adapter is configured to return a valid Artifact JSON contract.

Adapter quality metrics are exposed through `GET /api/adapters/quality-metrics` and persisted by default to `.agenthub/adapter-quality-metrics.json`. The Workspace Adapter Quality Dashboard uses this backend aggregate instead of only deriving counts from the currently selected TaskRun.

If you run the backend with the JDBC persistence profile, reuse the same API smoke flow and enable the JDBC marker:

```powershell
$env:AGENTHUB_PERSISTENCE_MODE="jdbc"
$env:AGENTHUB_JDBC_URL="<jdbc-url>"
$env:AGENTHUB_JDBC_USERNAME="<username>"
$env:AGENTHUB_JDBC_PASSWORD="<password>"
$env:AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE="true"
node scripts/smoke-test.mjs
```

The default smoke checks `/api/health.persistenceMode` when `AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE=true`; if the backend is not running with the JDBC profile, the smoke exits with a clear failure instead of treating memory-mode success as JDBC coverage.

The explicit schema file is available at `backend/src/main/resources/schema-jdbc.sql`. Run it against the target MySQL-compatible database before starting the backend if you want deterministic local setup instead of relying only on repository auto-create behavior.

`schema-jdbc.sql` is a fresh-initialization schema, not a migration script. If you already have an older AgentHub JDBC database, recreate it for local validation or apply equivalent `ALTER TABLE` statements manually before running the JDBC smoke flow.

The JDBC profile now also persists per-user `OPENAI_COMPATIBLE` IM API runtime config in `agenthub_adapter_runtime_configs`. When you save API keys through `/api/adapters/openai-compatible/runtime-config` in JDBC mode, set `AGENTHUB_OPENAI_RUNTIME_CONFIG_ENCRYPTION_KEY` so the API key is encrypted before it is written to MySQL.

For a repeatable local MySQL initialization flow, use the opt-in helper script. It uses the local `mysql` CLI, creates the database if needed, and applies `schema-jdbc.sql`:

```powershell
$env:AGENTHUB_MYSQL_HOST="127.0.0.1"
$env:AGENTHUB_MYSQL_PORT="3306"
$env:AGENTHUB_MYSQL_DATABASE="agenthub"
$env:AGENTHUB_MYSQL_USERNAME="<username>"
$env:AGENTHUB_MYSQL_PASSWORD="<password>"
node scripts/mysql-init-profile.mjs
```

You can also derive host, port, and database from `AGENTHUB_JDBC_URL`:

```powershell
$env:AGENTHUB_JDBC_URL="jdbc:mysql://127.0.0.1:3306/agenthub?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC"
$env:AGENTHUB_JDBC_USERNAME="<username>"
$env:AGENTHUB_JDBC_PASSWORD="<password>"
node scripts/mysql-init-profile.mjs
```

The script prints the JDBC env values to use next, but never prints the password. It does not make MySQL the default runtime.

You can also use the JDBC wrapper script after starting the backend in JDBC mode:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
node scripts/jdbc-smoke-test.mjs
```

For restart verification, copy the conversation / taskRun / artifact ids from the first run output, restart the backend with the same JDBC database, then run:

```powershell
$env:AGENTHUB_JDBC_VERIFY_CONVERSATION_ID="<conv_id>"
$env:AGENTHUB_JDBC_VERIFY_TASK_RUN_ID="<run_id>"
$env:AGENTHUB_JDBC_VERIFY_ARTIFACT_ID="<artifact_id>"
$env:AGENTHUB_JDBC_VERIFY_ATTACHMENT_ID="<attachment_id>" # optional; first attachment is used if omitted
$env:AGENTHUB_JDBC_VERIFY_DEPLOYMENT_ID="<deployment_id>" # optional
$env:AGENTHUB_JDBC_VERIFY_SNAPSHOT_ID="<snapshot_id>" # optional
node scripts/jdbc-smoke-test.mjs
```

This query-only mode verifies Conversation, Message, Attachment metadata and download, TaskRun, Artifact, ArtifactSnapshot, Deployment, PinnedContext, ContextSnapshot, HandoffSummary, Memory, ApprovalRequest, and ActionAuditLog records after restart. It still does not make JDBC the default profile.

Context retrieval uses DB-backed Agentic Search by default: the backend lists scoped candidates, greps exact keywords across Message / Artifact / Memory / Attachment preview / TaskRun summary sources, then reads authoritative snippets before scoring them. The heuristic semantic backend remains the default. To exercise the optional embedding backend switch without requiring an external provider, start the backend with:

```powershell
$env:AGENTHUB_CONTEXT_SEMANTIC_BACKEND="embedding"
```

In this build the backend reports `EMBEDDING_DISABLED` and falls back to heuristic semantic overlap; no external embedding service is required.

Optional context search window controls:

```powershell
$env:AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED="false"
$env:AGENTHUB_CONTEXT_SEARCH_MESSAGE_WINDOW="50"
$env:AGENTHUB_CONTEXT_SEARCH_ARTIFACT_WINDOW="50"
$env:AGENTHUB_CONTEXT_SEARCH_ATTACHMENT_WINDOW="30"
$env:AGENTHUB_CONTEXT_SEARCH_TASK_RUN_WINDOW="20"
$env:AGENTHUB_CONTEXT_SEARCH_GREP_LIMIT="20"
$env:AGENTHUB_CONTEXT_SEARCH_READ_MAX_CHARS="4000"
$env:AGENTHUB_CONTEXT_EMBEDDING_PROVIDER="disabled"
```

`AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true` is only for JDBC/MySQL profiles with the optional FULLTEXT indexes from `schema-jdbc.sql`. The default remains scoped `LIKE + LIMIT`; FULLTEXT is not required for memory mode or default smoke tests.

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
- verifies the realtime control REST fallback rejects cancel on terminal TaskRuns

Run it after starting the backend:

```powershell
node scripts/sse-smoke-test.mjs
```

Override the backend URL:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; node scripts/sse-smoke-test.mjs
```

To verify active cancellation semantics, start the backend with an artificial step delay and run the opt-in cancel check:

```powershell
$env:AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS="3000"
# start backend in another terminal
$env:AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL="true"
node scripts/sse-smoke-test.mjs
```

The active cancel check waits for `TASK_RUN_CREATED`, sends `CANCEL_RUN` while the run is still executing, and expects the final TaskRun to become `CANCELLED`. Without the delay, a local demo task may complete before cancel is sent, so this assertion is disabled by default.

To verify active stop semantics, use the same artificial step delay and enable the stop check:

```powershell
$env:AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS="3000"
# start backend in another terminal
$env:AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP="true"
node scripts/sse-smoke-test.mjs
```

The active stop check sends `STOP_RUN` while the run is executing and expects the final TaskRun to become `STOPPED`. Both active checks assert that at least one step is skipped or has its adapter result discarded.

To verify streaming cancel or stop semantics with deterministic CLI fixture chunks, enable a fixture adapter, add a small chunk delay, and run the opt-in streaming control check:

```powershell
$env:AGENTHUB_CODEX_ENABLED="true"
$env:AGENTHUB_CODEX_FIXTURE_ENABLED="true"
$env:AGENTHUB_CODEX_STREAMING_ENABLED="true"
$env:AGENTHUB_CODEX_FIXTURE_STREAM_CHUNK_DELAY_MILLIS="150"
$env:AGENTHUB_ARTIFACT_GENERATION_MODE="REAL_FIRST"
# start backend in another terminal
$env:AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL="true"
# Or use stop instead of cancel:
# $env:AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_STOP="true"
$env:AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER="CODEX"
node scripts/sse-smoke-test.mjs
```

The streaming control check waits for the first `ADAPTER_STREAM_CHUNK`, sends `CANCEL_RUN` or `STOP_RUN`, and verifies the final TaskRun is `CANCELLED` or `STOPPED`, an accepted audit record exists, and no late `REAL_ADAPTER` Artifact from the streaming adapter is persisted. The same path can be run with `AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER="CLAUDE_CODE"` when the Claude Code fixture adapter is enabled.

For real CLI streaming cancel / stop verification, start backend with the target adapter's real CLI streaming mode enabled, then require non-fixture mode:

```powershell
$env:AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL="true"
# Or:
# $env:AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_STOP="true"
$env:AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CONTROL="true"
# Legacy equivalent for cancel-only runs:
$env:AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL="true"
$env:AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER="CLAUDE_CODE" # or CODEX
$env:AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_TIMEOUT_MS="180000"
node scripts/sse-smoke-test.mjs
```

`AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CONTROL=true` fails if `/api/adapters` reports fixture mode, unavailable adapter status, missing streaming capability, or missing `stream-json` / JSON event support. This check is opt-in because it requires a locally installed and authenticated CLI. The older `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL=true` flag is still accepted for compatibility.

## Adapter Quality Matrix Smoke

`adapter-quality-matrix-smoke.mjs` is an opt-in monitoring script for direct adapter output quality across several task types. It calls `POST /api/adapters/{type}/execute` for `OPENAI_COMPATIBLE`, `CLAUDE_CODE`, and `CODEX` by default, classifies each result as `ACCEPTED`, `PARSE_FAILED`, `QUALITY_FAILED`, `BUILD_FAILED`, `FALLBACK`, or `SKIPPED`, then prints a per-adapter summary.

Run it after starting the backend:

```powershell
node scripts/adapter-quality-matrix-smoke.mjs
```

Useful filters:

```powershell
$env:AGENTHUB_ADAPTER_QUALITY_MATRIX_ADAPTERS="CLAUDE_CODE,CODEX"
$env:AGENTHUB_ADAPTER_QUALITY_MATRIX_TASKS="frontend,api,review,markdown"
$env:AGENTHUB_ADAPTER_QUALITY_MATRIX_REQUIRE_AVAILABLE="true"
$env:AGENTHUB_ADAPTER_QUALITY_MATRIX_REQUIRE_REAL="true"
$env:AGENTHUB_ADAPTER_QUALITY_MATRIX_STRICT="true"
node scripts/adapter-quality-matrix-smoke.mjs
```

Keep `STRICT=false` for exploratory monitoring. Use `REQUIRE_REAL=true` only when the selected adapters are configured in real provider / real CLI mode; fixture mode must not be reported as real quality evidence.

## Realtime Control Plane

AgentHub exposes a minimal WebSocket control endpoint for future run-control flows:

- `ws://127.0.0.1:8080/api/realtime/control`
- Supported commands: `PING`, `CANCEL_RUN`, `STOP_RUN`
- Payload example:

```json
{
  "action": "CANCEL_RUN",
  "taskRunId": "run_xxx",
  "reason": "user requested stop"
}
```

REST fallback endpoints are also available for local verification:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/task-runs/run_xxx/cancel" -ContentType "application/json" -Body '{"reason":"manual stop"}'
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/task-runs/run_xxx/stop" -ContentType "application/json" -Body '{"reason":"manual stop"}'
```

This is a control-plane MVP. It does not implement token streaming, full bidirectional chat, multi-node event broadcasting, or true in-flight Java thread interruption.

The current control semantics are execution-aware for Orchestrator steps: `CANCEL_RUN` ends the run as `CANCELLED`, `STOP_RUN` ends it as `STOPPED`, new steps check a control token before adapter execution, and completed non-streaming adapter results are discarded if a control command was requested during the call. Java HTTP calls that are already in flight are not forcibly interrupted.

## Browser E2E

`e2e-browser.mjs` is a lightweight Playwright wrapper that drives the IM-first Workspace flow: create a conversation, send a multi-Agent task with a real text attachment, require the message-level collaboration confirmation card by default, then verify the rendered Workspace, message attachment card, Adapter quality dashboard, retrieved context explanation, Orchestrator explain panel, Stop / Cancel run controls, artifact preview, approval affected summary, diff apply, restore approval flow, Action Audit panel, deploy status card, static preview page, and the rejection protocol.

The current edge-state coverage includes:

- `REJECTION -> Revision -> accepted re-review`
- real Adapter fallback classification when a non-MOCK adapter is unavailable
- Context Search source diversity across pinned message, memory, attachment, recent message, Artifact, or TaskRun summary sources

Treat this script as the required UI regression gate after major changes to Workspace, MessageStream, ArtifactPanel, Approval, Restore, Deploy Preview, or PreviewPage. A change in those areas should not be marked complete until this script has either passed or the reason for not running it is recorded.

Required product path:

- open `/workspace`
- create or select a Conversation
- send a task message with a real local attachment
- confirm collaboration from the message-level collaboration card
- observe multi-Agent protocol messages
- inspect TaskRun / Orchestrator explain output
- inspect Artifact output
- approve Apply Diff
- approve Restore Snapshot
- approve Deploy Preview from a chat deployment-intent confirmation card
- open `/preview/:artifactId`

The script uses stable `data-testid` selectors for the main product path and writes failure diagnostics under `.agenthub/e2e-browser/` when the browser flow fails:

- current URL
- screenshot
- console / page error summary

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
$env:VITE_API_BASE_URL="http://127.0.0.1:8080" # set before starting frontend dev server
$env:AGENTHUB_E2E_BROWSER_CHANNEL="msedge"
$env:AGENTHUB_E2E_HEADLESS="false"
$env:AGENTHUB_E2E_REQUIRE_MESSAGE_TRIGGER="true" # default: true; set false only for legacy toolbar fallback debugging
$env:AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL="true"
$env:AGENTHUB_E2E_EXPECT_REJECTION="false" # optional: disable default API-seeded REJECTION protocol assertion
node scripts/e2e-browser.mjs
```

The browser E2E requires backend and frontend to already be running. If the frontend uses a non-default port, start the backend with `AGENTHUB_CORS_ALLOWED_ORIGINS` including that frontend origin. It does not start servers, does not call real LLM providers, does not use the manual demo/debug toolbar path, and does not perform an external deployment.
When the backend is not running on `http://localhost:8080`, start Vite with `VITE_API_BASE_URL` pointing at the same backend that `AGENTHUB_API_BASE_URL` uses; otherwise the browser UI and the E2E API polling will target different backends.

## Local Verification Gate

`verify-local.mjs` runs the local baseline checks in sequence:

- API smoke: `node scripts/smoke-test.mjs`
- SSE smoke: `node scripts/sse-smoke-test.mjs`
- Browser E2E: `node scripts/e2e-browser.mjs`

Start backend and frontend first, then run:

```powershell
node scripts/verify-local.mjs
```

This wrapper is intended for local release-style verification after broad UI or workflow changes. It does not replace opt-in checks for real providers, JDBC/MySQL, Claude Code, Codex, or streaming-specific validation.

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
