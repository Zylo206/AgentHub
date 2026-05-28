## Commands

- API smoke: `node scripts/smoke-test.mjs`
- SSE smoke: `node scripts/sse-smoke-test.mjs`
- Real Adapter smoke: `node scripts/real-adapter-smoke-test.mjs`
- JDBC smoke: `node scripts/jdbc-smoke-test.mjs`
- MySQL profile init: `node scripts/mysql-init-profile.mjs`
- Browser E2E: `node scripts/e2e-browser.mjs`
- Local verification gate: `node scripts/verify-local.mjs`
- Syntax check: `node --check scripts/<script-name>.mjs`

## What This Is

`scripts/` contains local verification scripts for AgentHub API flows, SSE refresh, real adapter validation, JDBC profile checks, and browser-level UI flows.

## Architecture

- `smoke-test.mjs`: default API main path; no real LLM, MySQL, or real deployment dependency.
- `sse-smoke-test.mjs`: SSE, run state, control fallback, and cancel checks.
- `real-adapter-smoke-test.mjs`: opt-in real OpenAI-compatible provider validation.
- `jdbc-smoke-test.mjs`: JDBC profile and restart verify entry.
- `mysql-init-profile.mjs`: opt-in MySQL database/schema initializer for JDBC profile verification.
- `e2e-browser.mjs`: browser UI verification; requires frontend and backend to be running.
- `verify-local.mjs`: sequential local verification gate for API smoke, SSE smoke, and Browser E2E.
- `README.md`: must stay aligned with script behavior and environment variables.

## Things That Will Bite You

- Default smoke must not require real API keys, real external LLMs, MySQL, WebSocket, token streaming, or real deployment.
- Real adapter validation is opt-in and must not treat fixture mode as a real provider.
- Script failures must print `[FAIL]` with a clear reason and exit non-zero.
- API responses use `ApiResponse`; check `success` and `data`, not only HTTP 200.
- Backend IDs may be strings or `{ value }`; keep compatible ID parsing.
- On Windows, prefer invoking local JS CLIs through Node when `.cmd` diagnostics are incomplete.
- Temporary files must go under ignored directories and be cleaned up.

## Code Conventions

- Use Node.js built-ins and native `fetch`.
- Do not add axios, Cypress, or a new test framework.
- Browser E2E may use the existing Playwright path; API smoke must remain API-level.
- Browser E2E is a UI regression gate for major Workspace / Approval / Artifact / Preview changes, not a replacement for API, SSE, JDBC, or real Adapter smoke.
- New environment variables must be documented in `scripts/README.md` and `.env.example` when relevant.
- Keep output readable: `[PASS] ...`, `[FAIL] ...`.
- Optional checks must require explicit environment variables.

## Don't

- Do not write real API keys into scripts or docs.
- Do not auto-start or kill user services unless explicitly requested.
- Do not skip important assertions to make smoke pass.
- Do not describe fixture smoke as real provider validation.
- Do not leave temporary logs, build folders, or downloaded files.
