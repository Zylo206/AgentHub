## Commands

- Build: `npm run build`
- Dev server: `npm run dev`
- Browser E2E from repo root: `node scripts/e2e-browser.mjs`
- API smoke from repo root: `node scripts/smoke-test.mjs`
- SSE smoke from repo root: `node scripts/sse-smoke-test.mjs`

## What This Is

`frontend/` is the React / Vite Web client for AgentHub. It owns IM Workspace, Agent Builder, MessageStream, TaskRunPanel, Artifact Studio, ContextPanel, Approval / Audit, Deploy Preview, and Adapter observability UI.

## Architecture

- Entry: `src/main.tsx`.
- Routes: `src/router`.
- Workspace page: `src/pages/workspace/WorkspacePage.tsx`.
- Preview page: `src/pages/preview/PreviewPage.tsx`.
- API client: `src/api/agenthubApi.ts`; component-level raw fetch should be avoided.
- Artifact UI: `src/features/artifacts`.
- Deployment UI: `src/features/deployments`.
- Feature types should live near the corresponding feature.
- SSE uses `EventSource` as a refresh signal; REST reload remains authoritative.

## Things That Will Bite You

- Do not bypass `agenthubApi.ts`.
- Workspace is a three-column core experience; Conversation, MessageStream, and Artifact Studio must remain usable.
- MessageStream contains user messages, Agent protocol messages, Approval, Rejection, and Deploy status.
- `selectedAgent`, `targetAgentId`, `mentionedAgentIds`, quoted messages, and pinned context affect Orchestrator behavior.
- ArtifactPanel Apply / Deploy / Restore must use Approval Gate.
- Preview URLs are local static previews, not public deployments.
- Adapter quality, routing, and context explain panels are trust surfaces; do not remove them as UI simplification.
- ArtifactCard tags are simplified (quality status + build status only); do not re-add quality score to card.
- ArtifactTrustGrid supports collapsible mode; default is collapsed to reduce visual density.
- ArtifactHeroCard supports compact mode; use `compact={true}` in ArtifactPanel overview.

## Code Conventions

- Use React function components.
- Preserve the existing CSS and visual system; do not add UI libraries.
- Do not add axios, Redux, or Zustand unless explicitly requested.
- API errors must render readable states, not blank screens.
- Prefer feature-level components and types; avoid further bloating WorkspacePage.
- Buttons need clear disabled, loading, and error states.
- Browser API failures, such as copy or download, should be non-blocking and visible or logged.

## Don't

- Do not broadly rewrite Workspace layout.
- Do not claim real deployment, token streaming, or multi-endpoint support is complete.
- Do not commit `dist`, `.vite` smoke temp files, `*.tsbuildinfo`, or dev logs.
- Do not store real API keys in frontend state or files.
- Do not make UI depend on a real adapter being available.
- Do not delete Mock / fallback / static status visibility.
