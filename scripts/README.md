# Scripts

This directory contains local bootstrap scripts, demo helpers, and repository automation.

## Smoke Test

`smoke-test.mjs` verifies the current AgentHub MVP API flow:

- backend health
- adapter list
- conversation creation
- conversation participants
- message creation
- structured reply / quote message relation
- manual message pin as context
- demo task run
- task input context / ContextSnapshot pinned context and retrieved context
- TaskGraph execution batches
- message-based demo task rerun
- group chat Agent messages
- task run query
- artifact query
- conditional Adapter Output artifact check when a non-MOCK adapter succeeds
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

This is an API-level smoke test with an HTTP reachability check for the local preview page. It does not run browser E2E automation, parse DOM content, make real LLM calls, call real external Agents, or perform real deployment.
