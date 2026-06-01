# AgentHub Desktop Shell

This folder contains the optional Tauri desktop shell for AgentHub.

## Scope

- Local file access for selecting and previewing workspace files.
- System notification bridge for task / approval / deploy reminders.
- Agent process management for probing Claude Code / Codex CLI and starting or stopping a local backend jar.

## Commands

```powershell
cd desktop
npm install
npm run dev
npm run build
```

If Cargo is installed but the current shell has not reloaded PATH, use:

```powershell
$env:PATH="$env:USERPROFILE\.cargo\bin;$env:PATH"
npm run dev
```

The normal Web demo does not depend on this folder. If Tauri or Rust is not installed, continue using `frontend/` and `backend/` directly.

## Current Verification

- `cargo check` passes for `desktop/src-tauri`.
- `npm run dev` launches the Tauri shell and loads the existing React app.
- `npm run build` compiles `agenthub-desktop.exe`; MSI bundling may still need WiX download access.

## Boundary

- This is not workspace-write mode for Claude Code or Codex.
- This is not an Electron app.
- The desktop shell loads the existing React app and exposes Tauri commands only when running inside Tauri.
- Backend process management is local-machine only and does not replace production process supervision.
