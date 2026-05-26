## Commands

- Build: `mvn -q -DskipTests package`
- Tests: `mvn test`
- Single test: `mvn test -Dtest=XxxTest`
- Local backend: `mvn spring-boot:run`
- Default verification from repo root: `node scripts/smoke-test.mjs`

## What This Is

`backend/` is the Java / Spring Boot backend for AgentHub. It owns IM conversations, Agents, Orchestrator, Adapters, Artifacts, Context, Approval, Audit, Realtime, Attachments, and memory/JDBC repositories.

## Architecture

- API layer: `src/main/java/com/agenthub/api`; REST responses use `ApiResponse`.
- Application layer: `src/main/java/com/agenthub/application`; orchestration and workflow services live here.
- Domain layer: `src/main/java/com/agenthub/domain`; business models live here.
- Infrastructure layer: `src/main/java/com/agenthub/infrastructure`; adapters, repositories, file storage, and external integrations live here.
- Orchestrator chain: `TaskPlanner -> AgentRouter -> AgentStepExecutor -> ResultAggregator`.
- Adapter entry: `AgentAdapterRegistry`; all real, half-real, and mock calls must go through registry fallback.
- Realtime entry: publish events through `RealtimeEventPublisher`; REST remains the source of truth.
- JDBC and memory repositories must stay behavior-compatible.

## Things That Will Bite You

- Do not remove `MOCK` fallback.
- `OPENAI_COMPATIBLE` real output must pass contract validation, quality evaluation, and fallback checks.
- CLI adapters are probe-based integrations, not deep Codex / Claude Code / OpenCode platform integrations.
- High-risk operations must validate ApprovalRequest: apply diff, force apply, deploy, restore.
- TaskRun / TaskStep field changes require DTO, frontend type, smoke test, and JDBC schema updates.
- Context / Memory changes must keep ContextSnapshot, PinnedContext, retrieval explain, and JDBC profile consistent.
- Realtime / cancel / run-state changes require `scripts/sse-smoke-test.mjs`.
- Artifact generation changes must preserve Revision, Diff, Snapshot, Restore, and Deploy Preview.

## Code Conventions

- Use SLF4J, not `System.out`.
- Do not swallow exceptions; log and return explainable failures.
- Controllers should call application services.
- New adapters must implement `AgentAdapter` and be Spring-managed.
- New repositories must preserve the memory default path; JDBC is configurable.
- New high-risk operations must write ActionAuditLog.
- New configuration must be synced to `application.yml`, `.env.example`, and scripts docs when relevant.

## Don't

- Do not use raw `new Thread` in business code.
- Do not hardcode API keys, database passwords, or local sensitive paths.
- Do not make the default demo depend on real LLM, MySQL, WebSocket, token streaming, or real deployment.
- Do not bypass AdapterRegistry, ApprovalRequest, AttachmentAccessGuard, or ActionAuditLog.
- Do not present static preview as real deployment.
