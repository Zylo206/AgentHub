---
name: agents-md-standard
description: Use when creating or rewriting project-level AGENTS.md files for this user. Apply the AgentHub-style default structure, list real commands only, include concrete architecture and pitfall notes, and use Codex-native root or nested AGENTS.md files rather than Claude-style rules.
---

# AGENTS.md Standard

## When to use

Use this when:

1. A repo needs a new `AGENTS.md`.
2. An existing `AGENTS.md` needs to be rewritten to the user's preferred standard.
3. A large repo needs nested `AGENTS.md` files with Codex-friendly scope.

Do not use this when the repo already has an accepted instruction format the user explicitly wants preserved, or when the task is only to edit one tiny section without changing structure.

## Context to gather

1. Real project commands from `package.json`, `pyproject.toml`, `Cargo.toml`, `Makefile`, CI files, or existing docs.
2. Actual app entrypoints, runtime flow, main modules/services, and files that are risky to change casually.
3. Project-specific pitfalls such as env/auth assumptions, generated files, migrations, fallback behavior, and cross-file sync constraints.
4. Whether the repo is large enough to justify nested files like `backend/AGENTS.md`, `frontend/AGENTS.md`, `scripts/AGENTS.md`, or `docs/AGENTS.md`.

## Required structure

Write the root `AGENTS.md` with these sections, in this order:

1. `## Commands`
2. `## What This Is`
3. `## Architecture`
4. `## Things That Will Bite You`
5. `## Code Conventions`
6. `## Don't`

## Section guidance

- `## Commands`: real build, test, single-test, lint/check, format, smoke, and e2e commands only. If a category is not configured, say it is not available.
- `## What This Is`: one concise sentence about the project and its stage.
- `## Architecture`: concrete entrypoints, runtime flow, registries/services, and files not to change casually.
- `## Things That Will Bite You`: hidden constraints, verification traps, security/API-key issues, fallback boundaries, and cross-file sync requirements.
- `## Code Conventions`: repo-specific implementation conventions that materially affect edits.
- `## Don't`: hard prohibitions such as no real keys, no fake claims, no removing fallback, no unnecessary dependencies, and no broad docs rewrites.

## Nested scope

For large repos, prefer nested `AGENTS.md` files over `.claude/rules/*.md` with path frontmatter.

Only create nested files when the scope split is useful. Good targets are `backend/AGENTS.md`, `frontend/AGENTS.md`, `scripts/AGENTS.md`, and `docs/AGENTS.md`.

## Verification checklist

- The six required sections are present in order.
- Every listed command exists or is explicitly marked unavailable.
- Architecture notes name concrete files/modules.
- Pitfalls and prohibitions are project-specific.
- Nested files avoid repeating the root guidance.

