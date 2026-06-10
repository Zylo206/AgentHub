---
name: windows-powershell-exact-installs
description: Use when the user gives an exact install command on Windows PowerShell, especially npm/npx, Codex skills, desktop pets, vendor CLIs, or registry-style skill IDs. Preserve the requested command shape, use Windows-safe wrappers when needed, handle local permission or wrapper failures, and verify the real installed state on disk before reporting success.
---

# Windows PowerShell Exact Installs

## When to use

Use this for install/setup requests where the user provides a specific command, guide, package, skill, or registry-style ID and expects the installation to be performed directly.

Common triggers:

- `npx ...`, `npm ...`, or `skills add ...` in PowerShell.
- Codex skill installs from GitHub repos or sub-skills.
- Petdex or other desktop extension installs.
- Vendor CLI installs where the guide gives a Windows PowerShell command.

Do not broaden the request into a different package manager, manual setup, or authorization flow unless the user explicitly asks.

## Procedure

1. Preserve the user's command semantics.
   - If PowerShell blocks `npm.ps1` or `npx.ps1`, switch only the wrapper to `npm.cmd` or `npx.cmd`.
   - Keep package names, versions, sub-skill names, flags, and registry-style IDs intact.
2. Check for an existing install before changing anything when that is cheap.
   - Inspect likely destinations such as `.agents/skills`, `.codex/skills`, vendor install dirs, or the path named by the guide.
3. Run the documented or user-provided install command.
   - If registry/cache/network access fails with permission-like errors such as `EACCES`, treat it as an environment access problem before assuming the package name is wrong.
   - If escalation is needed, rerun the same command shape with the minimal required approval.
4. Verify the real state, not only the CLI success text.
   - For skills: confirm `SKILL.md` exists and inspect its name/description.
   - For CLIs: confirm binary path plus `--version`, `-h`, or an equivalent health check.
   - For desktop pets/extensions: confirm the installer output and the activation location if one is provided.
5. Stop at the requested boundary.
   - Separate "tool installed" from "account connected", "MCP configured", or "authorized" unless the user asked for the follow-on step.

## Windows-specific defaults

- Prefer `npm.cmd` and `npx.cmd` when PowerShell execution policy blocks `.ps1` wrappers.
- Split git or install follow-up commands into separate calls when PowerShell command chaining is unreliable.
- Treat local cache or registry access failures as environment issues first.
- When a command succeeds but the install location is unclear, search the likely install roots and report the verified path.

## Verification checklist

- The exact requested package/skill/tool was installed.
- Any wrapper substitution was limited to PowerShell compatibility.
- The installed file or binary exists at the reported path.
- A minimal command or file inspection confirms the installed artifact is usable.
- The final response clearly separates completed install work from optional setup still pending.

