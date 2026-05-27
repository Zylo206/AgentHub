# Next Plan

This is the default handoff entry for AgentHub. Every Agent should read this file before starting substantial work. After a plan lands or priorities change, update this file.

## Current Stage

AgentHub is in late MVP enhancement. The next stage is to keep moving from half-real / static fallback toward real dynamic capability. Demo video, desktop/mobile, real deployment platforms, and multi-node event bus are not current priorities. Full multi-provider token streaming is not current priority; `OPENAI_COMPATIBLE` streaming HTTP v1 is now implemented as an opt-in execution-experience enhancement.

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

3. **Validate OpenAI-compatible streaming HTTP v1**
   - `Done`: `OPENAI_COMPATIBLE` supports opt-in `AGENTHUB_OPENAI_STREAMING_ENABLED=true`.
   - `Done`: streaming chunks publish `ADAPTER_STREAM_CHUNK` over the existing Realtime SSE channel.
   - `Done`: Workspace MessageStream and TaskRunPanel can show streaming preview / generating text.
   - `Done`: final aggregated output still goes through JSON contract validation, quality evaluation, build validation, REAL_FIRST, and fallback.
   - `Done`: fixture streaming verification on port `18091` observed 7 stream chunks and 2 `REAL_ADAPTER / REAL_FIRST` Artifacts.
   - `Done`: Workspace MessageStream and TaskRunPanel now show streaming status as `STREAMING / PARTIAL / DISCARDED` without persisting token-level chunks.
   - `Done`: Stop / Cancel marks in-memory partial streaming output as discarded; final messages and Artifacts remain REST-backed authoritative state.
   - `Boundary`: this is not full multi-provider token streaming, not token-level persistence, and not a multi-node event bus.

4. **Validate Claude Code Artifact-only headless Adapter v1**
   - `Done`: `CLAUDE_CODE` has a dedicated Artifact-only headless adapter instead of only generic CLI args-template execution.
   - `Done`: supports Claude Code CLI `json` and `stream-json` output modes behind `AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED`.
   - `Done`: final output must pass AgentHub Artifact JSON contract before becoming `REAL_ADAPTER`.
   - `Done`: fixture smoke on port `18092` observed `ADAPTER_STREAM_CHUNK` and `CLAUDE_CODE / REAL_ADAPTER / REAL_FIRST` artifacts.
   - `Done`: real local Claude Code CLI 2.1.143 smoke on port `18094` passed with streaming chunk events and `CLAUDE_CODE / REAL_ADAPTER` Artifact output.
   - `Done`: Windows npm shim resolution prefers `.cmd/.exe/.bat` over extensionless shims, and `stream-json` uses Claude Code's required `--verbose` flag.
   - `Boundary`: fixture mode is not real Claude Code provider output; real CLI mode still requires local `claude` install and authentication.
   - `Boundary`: v1 is Artifact-only and does not allow Claude Code to modify the AgentHub workspace.

5. **Run a JDBC / MySQL real database verification sprint**
   - Do not switch MySQL on by default.
   - `Done`: `jdbc-smoke-test.mjs` now verifies restart persistence for Conversation, Message, Attachment download, Artifact, TaskRun, PinnedContext, ContextSnapshot, and HandoffSummary.
   - `Done`: local MySQL-compatible create / restart verify passed with the JDBC profile on port `18087`.
   - `Done`: restart verification confirmed Conversation, Message, Attachment metadata + download, Artifact, TaskRun, PinnedContext, ContextSnapshot, and HandoffSummary persisted after backend restart.
   - `Boundary`: this validates schema and repository create/query/update/restart paths; it does not make MySQL the default runtime.
   - The memory profile must remain the default stable path.

6. **Converge Stop / Cancel execution semantics**
   - Build on the existing control plane and cancellation token.
   - `Done`: `CANCEL_RUN` ends as `CANCELLED`; `STOP_RUN` ends as `STOPPED`.
   - `Done`: Orchestrator steps check the control token before delay, before adapter execution, and after adapter execution; late adapter results are discarded.
   - `Done`: opt-in SSE smoke with artificial step delay verified active cancel and active stop behavior locally.
   - `Boundary`: non-streaming Java HTTP calls already in flight are not forcibly interrupted; results are discarded when the control token is observed.
   - Keep ActionAuditLog, RealtimeRunState, and TaskRunPanel in sync.

7. **Keep plans and docs synchronized**
   - P0 specs for multi-agent chat, artifact lifecycle, adapter output, context/memory, and approval/audit are now captured under `docs/spec/`.
   - `Done`: Context Retrieval now uses DB-backed Agentic Search as the default retrieval shape: List / Grep / Read, with heuristic semantic scoring and optional embedding boundary retained.
   - `Done`: JDBC search has a MySQL FULLTEXT opt-in switch while keeping LIKE as the default.
   - `Done`: ContextPanel displays List / Grep / Read retrieval stage chips.
   - `Done`: MemoryItem has an embedding provider/storage skeleton via `embeddingJson`; real embedding provider remains deferred.
   - Keep future spec changes aligned with the focused plans and `docs/collaboration/dev-log.md`.
   - Do not describe Mock / fixture / static / half-real behavior as full production capability.

## Not Now

- No Demo video.
- No desktop or mobile client.
- No real Vercel / Netlify / Docker / Kubernetes deployment.
- No multi-node event bus.
- No full multi-provider token streaming or token-level persistence.
- No simultaneous deep Codex / OpenCode platform integrations.
- No Claude Code workspace-write mode.
- No default MySQL switch.

## Definition of Done

A task is complete only when:

- The code or documentation change has landed.
- Relevant verification has run, or the reason for not running it is stated.
- `docs/plans/next.md` has been adjusted if priorities changed.
- Feature work appends `docs/collaboration/dev-log.md`.
