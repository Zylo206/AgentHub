## Commands

- Backend build: `cd backend && mvn clean package -DskipTests`
- Frontend build: `cd frontend && npm run build`
- Backend tests: `cd backend && mvn test`
- Single backend test: `cd backend && mvn test -Dtest=XxxTest`
- Frontend lint: `cd frontend && npm run lint`
- API smoke: `node scripts/smoke-test.mjs`
- SSE smoke: `node scripts/sse-smoke-test.mjs`
- JDBC smoke: `node scripts/jdbc-smoke-test.mjs`
- Real adapter smoke: `node scripts/real-adapter-smoke-test.mjs`
- Browser E2E: `node scripts/e2e-browser.mjs`
- Backend SpotBugs and Spotless are not configured. Do not claim `mvn spotbugs:check` or `mvn spotless:apply` is available.

## What This Is

AgentHub is an IM-first multi-agent collaboration platform MVP. Users chat with built-in or custom Agents, mention one or more Agents, and let the Orchestrator plan, route, execute, aggregate, and produce Artifacts with revision, approval, deploy preview, realtime status, and fallback support.

## Architecture

- Backend entry: Spring Boot under `backend/src/main/java/com/agenthub`.
- API layer: `api/`, all REST responses use `ApiResponse`.
- Application layer: `application/`, including Orchestrator, Agent, Context, Approval, Realtime, Deployment, and Attachment workflows.
- Domain layer: `domain/`, including Conversation, Message, Agent, TaskRun, TaskStep, Artifact, Context, Memory, Approval, Audit, Attachment, and Deployment models.
- Infrastructure layer: `infrastructure/`, including Adapter implementations, CLI runner, memory/JDBC repositories, file storage, and external integration code.
- Frontend entry: `frontend/src/main.tsx`; routes live under `frontend/src/router`.
- Workspace page: `frontend/src/pages/workspace/WorkspacePage.tsx`.
- Frontend API client: `frontend/src/api/agenthubApi.ts`. Do not scatter raw `fetch` calls in components.
- Orchestrator chain: `OrchestratorService -> TaskPlanner -> AgentRouter -> AgentStepExecutor -> ResultAggregator`.
- Adapter entry: `AgentAdapterRegistry`, which owns fallback across MOCK, OPENAI_COMPATIBLE, and CLI-probed Codex / Claude Code / OpenCode adapters.
- Realtime: SSE events are published through `RealtimeEventPublisher`; WebSocket is only a control plane for stop/cancel.
- Artifact flow: generation, revision, diff, apply, snapshot, restore, deploy preview, approval, and audit must stay compatible.
- Plans entry: read `docs/plans/next.md` before choosing the next major task.
- Directory rules: also follow `backend/AGENTS.md`, `frontend/AGENTS.md`, `scripts/AGENTS.md`, or `docs/AGENTS.md` when working under those folders.

## Things That Will Bite You

- Default smoke is not a real LLM validation. Real OpenAI-compatible validation is opt-in via environment variables and `real-adapter-smoke-test.mjs`.
- `MOCK` fallback is the stable demo safety net. Do not remove it or present fallback as real success.
- Codex / Claude Code / OpenCode are currently CLI-probed adapters, not deep platform integrations.
- `REAL_FIRST` can promote `REAL_ADAPTER` to the primary Artifact only after contract validation, quality evaluation, and optional build validation.
- If you change the Orchestrator chain, run backend build and `node scripts/smoke-test.mjs`.
- If you change realtime, run-state, cancel, or stop behavior, run `node scripts/sse-smoke-test.mjs`.
- If you change apply diff, deploy, restore, or snapshots, verify missing `approvalId` is rejected by the backend.
- If you change JDBC schema or repository behavior, the default memory profile must still work.
- Context Retrieval is currently heuristic and explainable. Do not describe it as embedding or vector search unless that backend is actually enabled.
- Static deploy preview is not real Vercel / Netlify / Docker / Kubernetes deployment.
- Real provider keys, database passwords, local sensitive paths, and real user data must never be committed.

## Code Conventions

- Backend logging uses SLF4J, not `System.out`.
- Do not swallow exceptions. At minimum log a warning and return an explainable failure.
- REST controllers should delegate business logic to application services.
- Public REST APIs return `ApiResponse`.
- Frontend API calls go through `frontend/src/api/agenthubApi.ts`.
- Do not add axios, Redux, Zustand, or UI component libraries unless the task explicitly requires it.
- New adapters must implement `AgentAdapter` and be routed through `AgentAdapterRegistry`.
- New tool capability should go through `ToolCapabilityRegistry` before Router logic depends on it.
- New high-risk operations must integrate ApprovalRequest and ActionAuditLog.
- New Artifact mutation paths must consider Snapshot, Restore, Conflict, and Diff Summary behavior.
- New scripts should prefer Node built-ins and native `fetch`.
- Meaningful feature work must append `docs/collaboration/dev-log.md`.
- Finished plans must update `docs/plans/next.md` when priorities change.

## Don't

- Do not create raw business threads with `new Thread`; use existing executor or `CompletableFuture` semantics.
- Do not hardcode secrets.
- Do not make the default demo depend on real LLMs, MySQL, WebSocket, token streaming, multi-node event bus, or real deployment platforms.
- Do not bypass AdapterRegistry, ApprovalRequest, AttachmentAccessGuard, or ActionAuditLog.
- Do not mark unavailable adapters as AVAILABLE.
- Do not leave temporary logs, build caches, smoke output, dead files, or one-off debug scripts.
- Do not broadly rewrite README or docs unless explicitly requested.
