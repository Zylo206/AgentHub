# Next Plan

This is the default handoff entry for AgentHub. Every Agent should read this file before starting substantial work. After a plan lands or priorities change, update this file.

## Current Stage

AgentHub is in late MVP enhancement. The next stage is to keep moving from half-real / static fallback toward real dynamic capability. Demo video, desktop/mobile, real deployment platforms, and multi-node event bus are not current priorities. Full multi-provider token streaming is not current priority; `OPENAI_COMPATIBLE` streaming HTTP v1 is now implemented as an opt-in execution-experience enhancement.

## Current Top Priorities

1. **Monitor real Adapter output quality convergence**
   - Focus on `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact`.
   - `Done`: contract validation, quality evaluator, build validation, fallback reasons, TaskStep metadata, Artifact metadata, and Adapter Quality Dashboard are wired through.
   - `Done`: OpenAI-compatible, Claude Code, and Codex opt-in smoke scripts classify `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK` outcomes instead of returning generic failures.
   - `Done`: TaskStep fallback/quality reason now records contract-class failures as `PARSE_FAILED` and non-real-output fallback as `FALLBACK`.
   - `Done`: `docs/spec/real-agent-output-stability-spec.md` now captures the stable contract, outcome taxonomy, acceptance criteria, and fallback boundaries for real Agent output.
   - `Done`: `docs/spec/real-agent-output-stability-spec.md` now separates Artifact outcome taxonomy from CLI / provider operational failures such as `NOT_INSTALLED`, `NOT_AUTHENTICATED`, `PERMISSION_DENIED`, `TIMEOUT`, and `CANCELLED`.
   - `Done`: REAL_FIRST invalid contract or fallback text promotion is explicitly treated as `PARSE_FAILED`, not a generic quality failure.
   - `Done`: TaskStep and Artifact expose a derived `realAdapterOutcome` field so UI and scripts can read a single `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK` result.
   - `Done`: TaskStep and Artifact now expose explicit build validation reason fields instead of forcing UI, smoke, and reviewer gates to parse build failure details from quality reason text.
   - `Done`: `scripts/adapter-quality-matrix-smoke.mjs` now monitors more task families across frontend code, API contract, review, docs, web preview, data model, deploy handoff, and revision prompts.
   - `Accepted Boundary`: real provider quality monitoring is an ongoing operational practice; the project now has a repeatable matrix smoke entry, but real model output quality will still vary by provider, prompt, and local CLI state.
   - `Done`: Adapter Quality Dashboard now reads backend aggregate rates for real acceptance, total failure, parse failure, quality failure, and build failure instead of only deriving signals from currently loaded TaskSteps.
   - `Done`: Adapter quality metrics now expose a unified `lastOutcome / outcomeSummary` taxonomy for `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`, shared by OpenAI-compatible, Claude Code, and Codex paths.
   - `Done`: direct adapter execute results now also feed Adapter Quality Metrics, so `/api/adapters/{type}/execute` parse / fallback / accepted outcomes are visible outside TaskStep-created runs.
   - `Done`: `scripts/adapter-quality-matrix-smoke.mjs` now probes direct adapter execute across multiple task types and summarizes `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK / SKIPPED` by adapter.
   - `Done`: Artifact Revision now promotes an accepted `REAL_ADAPTER` CODE output from the revision worker as the primary revised Artifact, while static revision output remains fallback.
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
   - `Done`: `docs/spec/claude-codex-headless-adapter-spec.md` captures the Claude Code / Codex headless Artifact-only v1 contract, smoke boundaries, and deeper integration prerequisites.
   - `Done`: `/api/adapters` now exposes Claude Code supported modes, safety policies, and non-invasive version/help capability details without triggering model execution.
   - `Done`: Claude Code capability details now expose help probe status, auth probe status, and explicit `supportsOutputSchema=false / schemaMode=prompt-contract-only`.
   - `Done`: Claude Code direct execute diagnostics now include `failureType`, command mode, timeout, and CLI path; smoke can require real CLI with `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true`.
   - `Done`: Claude Code real CLI smoke now requires help probe, print/json/tool-policy support, and stream-json support when streaming smoke is enabled.
   - `Done`: real Claude Code non-streaming CLI smoke passes when backend uses the direct npm command shim.
   - `Done`: real Claude Code streaming CLI smoke passes in non-sandbox mode, observes `ADAPTER_STREAM_CHUNK`, and produces `CLAUDE_CODE / REAL_ADAPTER` Artifact output.
   - `Done`: real Claude Code streaming cancel smoke passes in non-sandbox mode: first `ADAPTER_STREAM_CHUNK` observed, `CANCEL_RUN` accepted, TaskRun becomes `CANCELLED`, and no late `CLAUDE_CODE / REAL_ADAPTER` Artifact is persisted.
   - `Done`: real Claude Code streaming stop smoke passes in non-sandbox mode when backend uses the `.cmd` shim: first `ADAPTER_STREAM_CHUNK` observed, `STOP_RUN` accepted, TaskRun becomes `STOPPED`, and no late `CLAUDE_CODE / REAL_ADAPTER` Artifact is persisted.
   - `Done`: Claude Code `stream-json` stdout consumption is timeout-bound, so stream hangs now return a classified timeout instead of blocking the smoke indefinitely.
   - `Done`: Claude Code adapter tolerates a single outer JSON Markdown fence by stripping only that wrapper before strict Artifact contract validation; artifact content fences and plain text remain rejected.
   - `Done`: Claude Code prompt contract now requires a single raw JSON object, raw CODE source, no Markdown fences, no CLI wrapper/log content, and explicit Artifact type / summary fields.
   - `Done`: Claude Code contract failures are surfaced as `PARSE_FAILED`; quality/build failures remain visible through TaskStep and Artifact metadata.
   - `Done`: Claude Code streaming remains preview-only, publishes `ADAPTER_STREAM_CHUNK`, destroys the CLI process when cancellation is observed during stream-json reading, and discards final output after Stop / Cancel.
   - `Done`: Claude Code now receives AgentHub-managed multi-turn session context through the standard prompt contract: recent messages, recent Artifacts, Review Report results, and previous TaskRun summaries are injected without relying on external CLI native sessions.
   - `Done`: Claude Code now exposes an AgentHub external CLI session bridge: `externalCliSessionKey=agenthub:{conversationId}:{agentId}`, `agenthub-session-bridge` supported mode, and descriptor capability details for conversation+agent continuity.
   - `Done`: Claude Code real CLI smoke now asserts the external CLI session bridge descriptor and passed against the local `claude.cmd` path with fixture disabled.
   - `Done`: Claude Code real CLI smoke was rerun on an isolated backend with the local `claude.cmd`; direct execute and REAL_FIRST demo-task both produced accepted `CLAUDE_CODE / REAL_ADAPTER` artifacts.
   - `Boundary`: fixture mode is not real Claude Code provider output; real CLI mode still requires local `claude` install and authentication.
   - `Boundary`: v1 is Artifact-only and does not allow Claude Code to modify the AgentHub workspace.

5. **Productize Codex Adapter v1**
   - `Done`: the old generic CLI-probe path has been replaced with a dedicated Artifact-only Codex adapter implementation.
   - `Done`: local Codex CLI capability discovery confirmed `codex-cli 0.134.0` and `codex exec` support for stdin, `--cd`, `--sandbox read-only`, `--json`, `--output-schema`, and `--output-last-message`.
   - `Done`: `CodexAgentAdapter`, `CodexCommandRunner`, and `CodexArtifactPromptBuilder` use ProcessBuilder, isolated `.agenthub/codex-runs/{requestId}` workspaces, Artifact JSON schema prompting, contract validation, fixture mode, and optional SSE stream chunk publication.
   - `Done`: `scripts/codex-smoke-test.mjs` now defines the opt-in verification contract for `CODEX=AVAILABLE`, direct adapter execute, custom Codex Agent demo-task, `REAL_FIRST`, `REAL_ADAPTER`, `sourceAdapterType=CODEX`, and `qualityStatus=ACCEPTED`.
   - `Done`: `.env.example` and `scripts/README.md` document Codex opt-in configuration and smoke usage.
   - `Done`: fixture smoke passed on port `18095` with `AGENTHUB_CODEX_FIXTURE_ENABLED=true`.
   - `Done`: real local Codex CLI smoke passed on port `18096` with `AGENTHUB_CODEX_FIXTURE_ENABLED=false` and `AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST`.
   - `Done`: real Codex streaming smoke passed on port `18100` with `AGENTHUB_CODEX_STREAMING_ENABLED=true`, observed `ADAPTER_STREAM_CHUNK`, and created `CODEX / REAL_ADAPTER / REAL_FIRST` Artifact.
   - `Done`: `docs/spec/claude-codex-headless-adapter-spec.md` defines Codex v1 as headless / Artifact-only, not Codex Desktop GUI automation.
   - `Done`: `/api/adapters` now exposes Codex supported modes, safety policies, and non-invasive `--version` / `exec --help` capability details.
   - `Done`: Codex capability details now expose help probe status, auth probe status, output-last-message support, output schema support, JSON event support, and sandbox support.
   - `Done`: Codex direct execute diagnostics now include `failureType`, command mode, timeout, and CLI path; smoke can require real CLI with `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true`.
   - `Done`: Codex real CLI smoke now requires help probe, `exec`, `--output-schema`, `--output-last-message`, read-only sandbox, and JSON event support when streaming smoke is enabled.
   - `Done`: real Codex non-streaming CLI smoke passes in non-sandbox mode.
   - `Done`: real Codex streaming CLI smoke passes in non-sandbox mode and observes `ADAPTER_STREAM_CHUNK` before producing `CODEX / REAL_ADAPTER / REAL_FIRST` artifacts.
   - `Done`: real Codex streaming cancel smoke passes in non-sandbox mode: first `ADAPTER_STREAM_CHUNK` observed, `CANCEL_RUN` accepted, TaskRun becomes `CANCELLED`, and no late `CODEX / REAL_ADAPTER` Artifact is persisted.
   - `Done`: real Codex streaming stop smoke passes in non-sandbox mode with `AGENTHUB_CODEX_COMMAND=codex`: first `ADAPTER_STREAM_CHUNK` observed, `STOP_RUN` accepted, TaskRun becomes `STOPPED`, and no late `CODEX / REAL_ADAPTER` Artifact is persisted.
   - `Done`: Codex prompt contract now requires a single raw JSON object, raw CODE source, no Markdown fences, no CLI wrapper/log content, and explicit Artifact type / summary fields.
   - `Done`: Codex contract failures are surfaced as `PARSE_FAILED`; quality/build failures remain visible through TaskStep and Artifact metadata.
   - `Done`: Codex streaming remains preview-only, publishes `ADAPTER_STREAM_CHUNK`, supports fixture stream previews for contract smoke, and discards final output after Stop / Cancel.
   - `Done`: Codex now receives AgentHub-managed multi-turn session context through the standard prompt contract: recent messages, recent Artifacts, Review Report results, and previous TaskRun summaries are injected without relying on external CLI native sessions.
   - `Done`: Codex now exposes an AgentHub external CLI session bridge: `externalCliSessionKey=agenthub:{conversationId}:{agentId}`, `agenthub-session-bridge` supported mode, and descriptor capability details for conversation+agent continuity.
   - `Done`: Codex real CLI smoke now asserts the external CLI session bridge descriptor and passed against the local `codex.cmd` path with fixture disabled.
   - `Done`: Codex real CLI smoke was rerun on an isolated backend with the local `codex.cmd`; direct execute returned valid artifact JSON and demo-task produced an accepted `CODEX / REAL_ADAPTER` artifact even when Reviewer blocked the run.
   - `Boundary`: this is not Codex Desktop GUI automation; the intended integration is headless / Artifact-only execution with fallback.
   - `Boundary`: default smoke must not require Codex, and Codex output must not bypass Artifact contract validation or quality gates.

6. **Keep Reviewer REJECTION retry/revise loop verifiable**
   - `Done`: reviewer rejection can be triggered by explicit prompt keywords such as `force reject`, `blocker`, `reject`, and `不通过`.
   - `Done`: Reviewer quality gate now also rejects structured adapter/artifact failures such as parse failure, quality failure, build failure, fallback-blocking evidence, and invalid-code markers.
   - `Done`: rejected review marks the TaskRun as `BLOCKED`, marks the Review Report `REJECTED`, emits `REJECTION` protocol messages, and creates retry/revise guidance.
   - `Done`: opt-in smoke with `AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION=true` verifies the rejection path and then verifies Artifact Revision returns to a `COMPLETED` / accepted review path.
   - `Done`: opt-in smoke with `AGENTHUB_SMOKE_EXPECT_REVIEW_QUALITY_REJECTION=true` verifies quality-gate rejection and revision recovery.
   - `Done`: Artifact Revision now reuses the Reviewer gate after revision execution; build / quality / parse failures can block the revision TaskRun and emit retry / revise guidance.
   - `Boundary`: this is a rule-based review decision loop using available build/quality metadata; it is not a full static analysis engine or automatic code-fix system.

7. **Run a JDBC / MySQL real database verification sprint**
   - Do not switch MySQL on by default.
   - `Done`: `docs/spec/mysql-profile-spec.md` captures the MySQL/JDBC profile contract, initialization rules, repository coverage, restart verification, and production boundaries.
   - `Done`: `scripts/mysql-init-profile.mjs` provides an opt-in MySQL CLI initializer for creating the database and applying `schema-jdbc.sql`.
   - `Done`: local MySQL init + JDBC create / restart verify passed against `agenthub_jdbc_verify`.
   - `Done`: `jdbc-smoke-test.mjs` now verifies restart persistence for Conversation, Message, Attachment download, Artifact, TaskRun, PinnedContext, ContextSnapshot, and HandoffSummary.
   - `Done`: local MySQL-compatible create / restart verify passed with the JDBC profile on port `18087`.
   - `Done`: restart verification confirmed Conversation, Message, Attachment metadata + download, Artifact, TaskRun, PinnedContext, ContextSnapshot, and HandoffSummary persisted after backend restart.
   - `Done`: JDBC repositories and schema now cover Agent, ApprovalRequest, and ActionAuditLog; real MySQL restart verification covered agents, approval requests, action audits, memories, task steps, and attachments.
   - `Done`: JDBC repositories and schema now also cover Deployment and ArtifactSnapshot; `jdbc-smoke-test.mjs` restart verify checks deployment preview records and snapshot operation history.
   - `Done`: real MySQL create / restart verify passed again with Deployment and ArtifactSnapshot coverage on a temporary JDBC database.
   - `Boundary`: this validates schema and repository create/query/update/restart paths; it does not make MySQL the default runtime.
   - The memory profile must remain the default stable path.

8. **Converge Stop / Cancel execution semantics**
   - Build on the existing control plane and cancellation token.
   - `Done`: `CANCEL_RUN` ends as `CANCELLED`; `STOP_RUN` ends as `STOPPED`.
   - `Done`: Orchestrator steps check the control token before delay, before adapter execution, and after adapter execution; late adapter results are discarded.
   - `Done`: opt-in SSE smoke with artificial step delay verified active cancel and active stop behavior locally.
   - `Done`: opt-in SSE streaming cancel fixture smoke verifies `ADAPTER_STREAM_CHUNK -> CANCEL_RUN -> CANCELLED`, accepted audit record, and no late `REAL_ADAPTER` Artifact persistence.
   - `Done`: opt-in SSE real streaming cancel smoke now rejects fixture mode and verifies both Codex and Claude Code real CLI streaming cancellation.
   - `Done`: opt-in SSE streaming stop smoke now covers fixture mode and real Codex / Claude Code CLI paths, verifying `ADAPTER_STREAM_CHUNK -> STOP_RUN -> STOPPED` and no late `REAL_ADAPTER` persistence.
   - `Done`: TaskRunPanel explains Stop vs Cancel semantics in-product: Stop skips later steps, Cancel discards late adapter output, and terminal runs reject control commands.
   - `Boundary`: non-streaming Java HTTP calls already in flight are not forcibly interrupted; results are discarded when the control token is observed.
   - Keep ActionAuditLog, RealtimeRunState, and TaskRunPanel in sync.

9. **Keep plans and docs synchronized**
   - `Done`: `docs/product-design.md` and `docs/technical-design.md` have been rewritten as Chinese V1.0 documents with current product, architecture, verification, and boundary status.
   - `Done`: `docs/spec/index.md` now provides a stable entrypoint for multi-agent, message interaction, Artifact, Adapter, Context, Approval, and MySQL profile specs.
   - `Done`: `docs/README.md` now points to the V1.0 product design, technical design, spec index, next plan, dev-log, and demo checklist.
   - P0 specs for multi-agent chat, artifact lifecycle, adapter output, context/memory, and approval/audit are now captured under `docs/spec/`.
   - `Done`: `docs/spec/context-search-spec.md` captures the Context Search contract: DB-backed Agentic Search, ranking, read window, FULLTEXT opt-in, embedding boundary, and ContextPanel explain requirements.
   - `Done`: Context Retrieval now uses DB-backed Agentic Search as the default retrieval shape: List / Grep / Read, with heuristic semantic scoring and optional embedding boundary retained.
   - `Done`: JDBC search has a MySQL FULLTEXT opt-in switch while keeping LIKE as the default.
   - `Done`: ContextPanel displays List / Grep / Read retrieval stage chips.
   - `Done`: MemoryItem has an embedding provider/storage skeleton via `embeddingJson`; real embedding provider remains deferred.
   - `Done`: Context Search v2 keeps representative sources across recent messages, artifacts, memories, attachment previews, and task run summaries instead of letting one source type dominate ranking.
   - `Done`: ContextPanel now shows the List / Grep / Read pipeline per retrieved item, including matched tokens, read window, and semantic backend.
   - `Done`: ContextPanel now adds a snapshot-level List / Grep / Read overview with recalled context count, keyword hit count, fallback read count, matched token count, injected step count, and top source type.
   - `Done`: ContextPanel now adds a three-stage explain chain per retrieved item: List / Grep / Read -> Scoring -> Injected Step.
   - `Done`: Browser E2E now asserts Context Search retrieves multiple source types across message, memory, artifact, attachment, or TaskRun summary sources when seeded by the main collaboration path.
   - `Done`: Adapter Quality Dashboard now has metric cards for observed scope, average success rate, fallback rate, real output acceptance, failure taxonomy, and highest-risk adapter.
   - `Done`: Adapter Quality Dashboard now has a Quality Command strip and per-adapter success meter so it reads as an operational quality cockpit, not only a table.
   - `Done`: Orchestrator Explain now has a decision rail for Planner, Router, Executor, Aggregator, Fallback, and Approval / Audit.
   - `Done`: Reviewer gate now treats explicit lint/test/typecheck evidence such as `LINT_FAILED`, `TEST_FAILED`, `TYPECHECK_FAILED`, `ESLINT_FAILED`, `VITEST_FAILED`, and `TSC_FAILED` as blocking review evidence.
   - `Done`: Reviewer retry guidance now explicitly requires revise artifacts, rerun build validation, rerun lint, rerun tests, and rerun Reviewer before approval.
   - `Done`: TaskRunPanel now shows a dedicated TaskGraph DAG panel with execution batches, dependencies, runtime, failure policy, step status, and blocked-step markers.
   - `Done`: TaskRunPanel now shows a Reviewer Gate / Retry Strategy panel for blocked runs and quality-gate failures.
   - Keep future spec changes aligned with the focused plans and `docs/collaboration/dev-log.md`.
   - Do not describe Mock / fixture / static / half-real behavior as full production capability.

10. **Converge the default IM-first collaboration path**
   - `Done`: Workspace now promotes the latest task message's Orchestrator trigger confirmation as the primary action.
   - `Done`: message-level Orchestrator auto-trigger now defaults to enabled with approval required, so matched task messages create a confirmation request without auto-running.
   - `Done`: the previous `Run Demo Task` entry is visually weakened and labeled as a manual debug fallback.
   - `Done`: manual debug run is now folded behind `Debug / Advanced` instead of being shown as the default secondary CTA.
   - `Done`: message-level collaboration cards show task summary, expected agents, expected artifacts, context sources, start/edit/cancel actions.
   - `Done`: empty message, TaskRun, Artifact, and ChatInput hints now direct users toward message-triggered collaboration instead of Demo Task.
   - `Done`: user message rerun action no longer exposes `Demo Task` as the primary product language.
   - `Done`: Workspace now shows an in-product flow guide: send task message -> confirm collaboration -> Orchestrator run -> Artifact / Approval / Preview.
   - `Done`: Browser E2E now requires the message-level collaboration confirmation card by default and only allows toolbar fallback when `AGENTHUB_E2E_REQUIRE_MESSAGE_TRIGGER=false`.
   - `Done`: Browser E2E passed on an isolated backend/frontend dev server and covers the IM-first path, approval gates, restore, deploy preview, audit timeline, and optional rejection scenario.
   - `Done`: backend CORS origins are configurable through `AGENTHUB_CORS_ALLOWED_ORIGINS`, so local validation ports do not require code edits.
   - `Done`: Workspace P0 visual polish moved the UI toward a Chinese-first technical command center: unified design tokens, command-center shell, stronger protocol cards, streaming status, and quality gate trust surfaces.
   - `Done`: Workspace P1 main-path polish strengthens the IM-first flow with clearer protocol cards, Orchestrator vs Specialist visual lanes, streaming status bars, IM-style Agent contacts, and highlighted conversation participants.
   - `Done`: ArtifactPanel now has an Artifact Cockpit summary for source, quality gate, build validation, content size, snapshots, and deploy preview records.
   - `Done`: Artifact Studio now has a Delivery Workbench with explanatory source / quality / build badges, expandable diagnostics, Diff risk summary, snapshot timeline, and release panel boundary copy.
   - `Done`: `docs/ui-audit.md` now captures the independent UI audit for Workspace, MessageStream, Agent List, TaskRunPanel, ArtifactPanel, ContextPanel, Adapter Dashboard, and PreviewPage.
   - `Done`: WorkspacePage has started component decomposition with `WorkspaceHeader` and `WorkspaceCollaborationToolbar`; the IM-first main path remains covered by Browser E2E.
   - `Done`: PreviewPage now behaves more like an independent Preview Studio with trust status, source metadata, version-chain summary, content toolbar, and local-static preview boundary.
   - `Done`: PreviewPage now adds a metadata bar, release-style version switcher, and presentation modes for code, document, structured text, and HTML preview.
   - `Done`: Global frontend design tokens now include color, elevation, radius, spacing, status, and motion primitives for future command-center surfaces.
   - `Done`: lightweight motion and responsive polish now covers Artifact Cockpit, Preview Studio, KPI cards, and narrow-screen stacked layouts.
   - `Done`: Conversation management now has backend fields and APIs for pin, archive, unarchive, mark read, unread count, last message activity, and server-side query filtering.
   - `Done`: Workspace conversation list now exposes server search, show archived, pin/unpin, archive/restore, unread badge, and activity-first ordering.
   - `Done`: Workspace conversation list now uses IM-style filters for all, unread, pinned, and archived conversations; Browser E2E covers search, pin, archive, and restore.
   - `Done`: API smoke now validates conversation pin/search/archive/unarchive and unread/read marker behavior.
   - `Done`: MessageStream now has a unified Message Action Bar for copy, quote, reply, pin, memory, rerun, and Agent reply regeneration.
   - `Done`: Message cards now expose type ribbons and richer attachment / Artifact cards, including image and PPT weak-capability boundaries.
   - `Done`: Uploaded image attachments now render a clickable thumbnail in MessageStream when a backend download URL is available; PPT/PPTX attachments render a presentation preview shell with explicit download-only boundary copy.
   - `Done`: `docs/spec/message-interaction-spec.md` captures stable message type, action, thread, and weak media boundaries.
   - `Done`: ChatInput now shows a send-time routing preview for single Agent, multi-Agent mention, and Orchestrator auto-route paths.
   - `Done`: Workspace Agent contacts show readable capability, preferred Adapter, adapter health, success rate, and fallback rate.
   - `Done`: Agent contacts now show CLI Session Bridge for Claude Code / Codex style adapters that can receive AgentHub-managed conversation+agent continuity metadata.
   - `Done`: TaskRun / Orchestrator Explain now extracts routing evidence chips from `routingReason` instead of only exposing raw router text.
   - `Done`: Agent Builder now includes a visible creation flow for basic info, System Prompt, Tool Capability, preferred Adapter, and Workspace mention usage.
   - `Done`: Browser E2E now covers creating a custom Agent in Agent Builder, mentioning it in Workspace, seeing routing preview, and verifying it enters the TaskRun.
   - `Done`: Agent Builder now has a lightweight conversational creation lane: natural language description -> rule-based Agent draft -> apply to form or confirm create.
   - `Done`: Agent Builder now supports a lightweight refinement loop: natural-language draft -> follow-up instruction -> updated capability / adapter / prompt draft -> apply or create.
   - `Done`: Agent contacts and Agent Builder now mark `OPENAI_COMPATIBLE`, `CLAUDE_CODE`, and `CODEX` as deep-integration v1 surfaces, while `OPEN_CODE` remains explicitly labeled as probe-only.
   - `Done`: Workspace message flow now recognizes "create Agent" style user messages and renders an inline Agent creation confirmation card; confirming creates the Agent through the existing API and refreshes the IM contact list.
   - `Done`: Backend now owns natural-language Agent draft generation through `POST /api/agents/draft`: it tries `OPENAI_COMPATIBLE` for structured Agent creation and falls back to deterministic parsing when unavailable.
   - `Done`: Default API smoke now verifies natural-language Agent draft creation, persisted custom Agent creation, tool capability mapping, and draft source classification.
   - `Done`: Workspace right-side Artifact Inspector now has a clear workbench header, `Source / Quality / Build / Run` trust metrics, an embedded Preview dock, and command-center CSS tokens shared with protocol cards and PreviewPage polish.
   - `Done`: Workspace first-screen visual density is closer to the reference IM collaboration desktop: empty conversation list, empty MessageStream, compact Agent contacts, Artifact Inspector scaffold, and no-conversation header behavior now use productized scaffold examples instead of guide-style placeholders.
   - `Done`: MessageStream interaction polish now prioritizes IM reading order: message body first, compact type ribbon, inline attachment / Artifact cards, and a low-noise Message Action Bar for copy, quote, reply, pin, memory, rerun, and regenerate.
   - `Done`: Workspace now surfaces a production session summary for single-Agent priority, group collaboration, Orchestrator auto-route, participants, context continuity, latest TaskRun, and Adapter status.
   - `Done`: Conversation list now shows visible result count, server-search state, archive filter state, and activity-sort status in the IM sidebar.
   - `Done`: Taste-skill reference-image pass has been translated into a final Workspace visual polish layer: stable command-center tokens, tighter 292px / minmax(680px, 1fr) / 400-460px shell, compact protocol cards, unified Message Action Bar, streaming strip, Artifact Inspector metrics, Agent Builder shell, and Preview Studio token alignment.
   - `Done`: `cd frontend && npm.cmd run build` and `node scripts/e2e-browser.mjs` passed after the visual polish, covering Agent Builder, IM-first collaboration, message actions, attachment, context search, fallback, approval, restore, deploy preview, optional rejection recovery, and preview page.
   - `Boundary`: the backend still keeps the manual demo-task API for smoke tests, fallback verification, and local debugging.

11. **Normalize Browser E2E as the UI regression gate**
   - `Done`: `scripts/e2e-browser.mjs` is the required browser-level gate for major Workspace, MessageStream, ArtifactPanel, Approval, Restore, Deploy Preview, and PreviewPage changes.
   - `Done`: high-risk UI surfaces now expose stable `data-testid` hooks for the IM-first path, message confirmation, attachments, TaskRun / Orchestrator explain, context retrieval, approvals, diff, deploy, restore, audit, and artifacts.
   - `Done`: Browser E2E failure diagnostics now print the current URL and write screenshot plus console summary under `.agenthub/e2e-browser/`.
   - `Done`: `scripts/verify-local.mjs` provides a local gate that runs API smoke, SSE smoke, and Browser E2E in sequence.
   - `Done`: Browser E2E now covers edge states for REJECTION -> Revision -> accepted re-review, real Adapter fallback classification, and Context Search source diversity.
   - `Done`: Browser E2E now covers chat-message Agent creation: send create-Agent request, render inline confirmation card, confirm creation, refresh Agent contacts, and continue into @Agent routing.
   - `Boundary`: Browser E2E validates UI integration; it does not replace API smoke, SSE smoke, JDBC/MySQL smoke, or opt-in real Adapter smoke.

12. **Strengthen Artifact editing trust**
   - `Done`: Diff Summary now includes an apply-time trust check that explains approval, conflict, line impact, and snapshot/restore safety before users apply or force-apply a patch.
   - `Done`: ArtifactPanel now surfaces the same trust model in the main delivery workbench before users reach Apply Diff, Restore, or Deploy controls.
   - `Done`: ArtifactPanel has started component decomposition with `ArtifactDeliveryWorkbench`, `ArtifactDeployPanel`, and `ArtifactSnapshotTimeline`; approval and mutation handlers remain in the parent panel.
   - `Boundary`: line diff remains lightweight and conflict handling is explicit user approval, not automated semantic merge.

## Not Now

- No Demo video.
- No desktop or mobile client.
- No real Vercel / Netlify / Docker / Kubernetes deployment.
- No multi-node event bus.
- No full multi-provider token streaming or token-level persistence.
- No simultaneous deep OpenCode platform integration.
- No Claude Code workspace-write mode.
- No default MySQL switch.

## Definition of Done

A task is complete only when:

- The code or documentation change has landed.
- Relevant verification has run, or the reason for not running it is stated.
- `docs/plans/next.md` has been adjusted if priorities changed.
- Feature work appends `docs/collaboration/dev-log.md`.
