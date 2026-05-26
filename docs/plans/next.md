# Next Plan

This is the default handoff entry for AgentHub. Every Agent should read this file before starting substantial work. After a plan lands or priorities change, update this file.

## Current Stage

AgentHub is in late MVP enhancement. The next stage is to keep moving from half-real / static fallback toward real dynamic capability. Demo video, desktop/mobile, real deployment platforms, multi-node event bus, and token streaming are not current priorities.

## Current Top Priorities

1. **Monitor real Adapter output quality convergence**
   - Focus on `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact`.
   - `Done`: contract validation, quality evaluator, build validation, fallback reasons, TaskStep metadata, Artifact metadata, and Adapter Quality Dashboard are wired through.
   - `Active`: keep monitoring real provider parse failure, quality failure, build failure, and fallback patterns.
   - Real provider validation must be opt-in and must not commit keys.

2. **Maintain REAL_FIRST primary Artifact rules**
   - Valid real output should become the primary Artifact.
   - `Done`: static templates are archived fallback Artifacts when REAL_FIRST accepts a valid real output.
   - `Done`: TaskRunPanel, ArtifactPanel, and Adapter Quality Dashboard show source, generation mode, quality/build status, and fallback or rejection reasons.
   - `Boundary`: REAL_ADAPTER means the output passed the current contract and quality gates, not that it is production-grade code.

3. **Run a JDBC / MySQL real database verification sprint**
   - Do not switch MySQL on by default.
   - Verify only schema, repositories, create/query/update/restart paths.
   - The memory profile must remain the default stable path.

4. **Converge Stop / Cancel execution semantics**
   - Build on the existing control plane and cancellation token.
   - Clarify STOP versus CANCEL behavior.
   - Verify later steps do not run after cancel and non-streaming adapter results can be discarded.
   - Keep ActionAuditLog, RealtimeRunState, and TaskRunPanel in sync.

5. **Keep plans and docs synchronized**
   - P0 specs for multi-agent chat, artifact lifecycle, adapter output, context/memory, and approval/audit are now captured under `docs/spec/`.
   - Keep future spec changes aligned with the focused plans and `docs/collaboration/dev-log.md`.
   - Do not describe Mock / fixture / static / half-real behavior as full production capability.

## Not Now

- No Demo video.
- No desktop or mobile client.
- No real Vercel / Netlify / Docker / Kubernetes deployment.
- No multi-node event bus.
- No real token streaming.
- No simultaneous deep Claude / Codex / OpenCode platform integrations.
- No default MySQL switch.

## Definition of Done

A task is complete only when:

- The code or documentation change has landed.
- Relevant verification has run, or the reason for not running it is stated.
- `docs/plans/next.md` has been adjusted if priorities changed.
- Feature work appends `docs/collaboration/dev-log.md`.
