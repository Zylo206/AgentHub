# Scripts

This directory contains local bootstrap scripts, demo helpers, and repository automation.

## Smoke Test

`smoke-test.mjs` verifies the current AgentHub MVP API flow:

- backend health
- adapter list
- conversation creation
- message creation
- demo task run
- task run query
- artifact query
- artifact revision
- demo deployment
- deployment query
- message stream deployment status

Start the backend first, then run:

```powershell
node scripts/smoke-test.mjs
```

The default backend URL is `http://127.0.0.1:8080`.

Override the backend URL in PowerShell:

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"; node scripts/smoke-test.mjs
```

Override the backend URL in Bash:

```bash
AGENTHUB_API_BASE_URL=http://127.0.0.1:8080 node scripts/smoke-test.mjs
```

This is an API-level smoke test. It does not run browser E2E automation, real LLM calls, real external Agent calls, or real deployment.
