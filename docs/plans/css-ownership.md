# AgentHub CSS Ownership Map

## Scope

This map records the Phase 229 CSS ownership audit for the current frontend. It is intentionally operational: each owner points to the stylesheet that should receive future rules, and legacy files are kept only as compatibility layers during migration.

## Owner Table

| Owner | Target stylesheet | Current legacy sources | Notes |
| --- | --- | --- | --- |
| `layout` | `frontend/src/styles/layout/workspace-shell.css` | `workspace.css`, `workspace/layout-guard.css`, `workspace/shell.css` | Workspace shell, column guards, resize safety, viewport bounds. |
| `message` | `frontend/src/styles/components/message.css` | `workspace.css`, `workspace/message.css`, `workspace/coze-light.css` | Message bubbles, action bar, evidence notes, deploy intent cards, attachment cards. |
| `artifact` | `frontend/src/styles/components/artifact.css` | `workspace.css`, `workspace/inspector.css`, `workspace/coze-light.css` | Artifact cards, inspector, preview dock, approval gate, diff, snapshots, audit. |
| `agents` | `frontend/src/styles/pages/agents.css` | `workspace.css`, `production-alignment.css` | `/agents` directory, create-agent, local CLI health, adapter test. |
| `preview` | `frontend/src/styles/pages/preview.css` | `workspace.css`, `production-alignment.css` | `/preview/:artifactId` local/static/fallback preview boundary. |
| `desktop` | `frontend/src/styles/desktop.css` | `workspace.css`, `production-alignment.css` | Optional Tauri Desktop Console surfaces. |
| `status` | `frontend/src/styles/components/status.css` | `workspace.css`, `workspace/components.css`, `workspace/coze-light.css` | Status pills, adapter health pills, artifact source badges, tags, chips. |
| `diagnostics` | `frontend/src/styles/workspace/diagnostics.css` | `workspace.css`, `production-alignment.css` | Advanced diagnostics drawer, context scoring, adapter evidence. |
| `buttons` | `frontend/src/styles/components/buttons.css` | `workspace.css`, `workspace/components.css` | Primary, secondary, message action, artifact link buttons. |
| `cards` | `frontend/src/styles/components/cards.css` | `workspace.css`, `workspace/components.css` | Shared cards, surface shells, scaffold cards. |
| `empty-state` | `frontend/src/styles/components/empty-state.css` | `workspace.css`, `workspace/components.css` | Panel empty states and lightweight placeholder shells. |
| `panel-shell` | `frontend/src/styles/components/panel-shell.css` | `workspace.css`, `workspace/shell.css`, `workspace/components.css` | Section headers, panel body shells, detail headers. |
| `tabs` | `frontend/src/styles/components/tabs.css` | `workspace.css`, `workspace/components.css` | Inspector tabs, filter tabs, agent builder section map. |

## Migration Rules

- New component rules must not be added to `frontend/src/styles/workspace.css`.
- `workspace.css` is now a compatibility entrypoint only; owner styles should live under `styles/components`, `styles/pages`, `styles/layout`, or existing workspace subfiles.
- `layout-guard.css` is now a compatibility entrypoint only; real layout guard rules live in `styles/layout/workspace-shell.css`.
- Each migration round must run `cd frontend && npm.cmd run build` and `node scripts/e2e-browser.mjs`.
