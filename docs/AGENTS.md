## Commands

- Read the current handoff entry: `Get-Content docs/plans/next.md`
- Read active roadmap: `Get-Content docs/plans/active-roadmap.md`
- Read recent dev log: `Get-Content docs/collaboration/dev-log.md -Tail 120`
- Docs-only changes usually do not require builds. If code changes too, follow the matching directory `AGENTS.md`.

## What This Is

`docs/` contains AgentHub product, technical, collaboration, plan, and verification documents. Its job is to keep implemented capabilities, competition requirements, development plans, and real capability boundaries aligned.

## Architecture

- `docs/plans/next.md`: default handoff entry for every Agent; keep only the current 3-5 highest-priority tasks.
- `docs/plans/active-roadmap.md`: active P0 / P1 roadmap.
- `docs/plans/completed-roadmap.md`: completed capability archive.
- `docs/plans/deferred-roadmap.md`: deferred capabilities and rationale.
- `docs/plans/*-plan.md`: focused plans, such as real adapter, persistence, realtime, orchestrator, and productionization.
- `docs/collaboration/dev-log.md`: append-only development log.
- `docs/collaboration/demo-checklist.md`: demo, smoke, and manual acceptance checklist.
- `docs/technical-design.md` and `docs/roadmap.md`: higher-level architecture and roadmap summaries.

## Things That Will Bite You

- Read `docs/plans/next.md` before starting a new task.
- After a Plan Mode plan lands, update `docs/plans/next.md`; otherwise the next Agent receives stale priorities.
- dev-log is a factual record, not marketing copy. Do not present Mock, fixture, or static demo behavior as production capability.
- `docs/plans` is the planning entrypoint, not a replacement for dev-log.
- When mentioning real provider, MySQL, WebSocket, token streaming, or real deployment, state the current boundary clearly.
- Never write real API keys, database passwords, or local sensitive paths into docs.

## Code Conventions

- Keep Markdown headings short.
- Roadmap docs should use `Done`, `Active`, `Deferred`, and `Boundary` status language.
- Keep `next.md` short; do not copy the full roadmap into it.
- Each dev-log phase should include goal, changes, verification, boundaries, remaining issues, and next steps.
- If verification was not run, say so explicitly.

## Don't

- Do not broadly rewrite existing docs unless requested.
- Do not delete old dev-log phases.
- Do not leave plans only in chat.
- Do not call fixture smoke a real external provider validation.
- Do not call static deploy preview a real Vercel / Netlify / Docker / Kubernetes deployment.
- Do not claim desktop, mobile, real token streaming, or multi-node event bus is complete.
