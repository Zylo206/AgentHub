---
name: chinese-first-repo-docs
description: Use when writing or rewriting repo README files, docs, release notes, or public project copy for this user and the output should reflect the implemented product while presenting Chinese first, with English only as a collapsed alternate version when needed.
---

# Chinese-first Repo Docs

## When to use

Use this for repository documentation and public-facing copy when the user asks for Chinese docs, bilingual docs, README refreshes, release/publishing cleanup, or short social copy.

Do not use this for code comments or small inline text edits unless the user is explicitly changing the documentation style.

## Core rules

1. Verify the current product before writing.
   - Read the repo entrypoints, package/build config, relevant docs, and visible app/API surface.
   - Do not describe an old architecture or assumed stack.
2. Make the visible document Chinese-first.
   - Put the full Chinese version in the main visible flow.
   - If English is needed, put it inside `<details><summary>English</summary>...</details>`.
   - Do not interleave Chinese and English headings or paragraphs in the visible page.
3. Keep public copy natural.
   - Prefer short, human wording over spec-like prose.
   - For social posts, make the GitHub/project link easy to see and avoid dense technical detail.
4. Treat explicit cleanup requests literally.
   - If the user names obsolete docs or release collateral to remove, remove those files and verify the final inventory.

## Procedure

1. Inventory the implemented surface.
   - Check app entrypoints, docs, package scripts, deployment config, API routes, screenshots/assets, and current README if present.
2. Decide the doc shape.
   - README: project positioning, current features, architecture, setup commands, verification commands, deployment/status, and safety boundaries.
   - Skill or tool docs: what it does, inputs/outputs, how to run, validation, and constraints.
   - Social copy: one concise paragraph plus link.
3. Draft Chinese first.
   - Keep commands and identifiers exact.
   - Keep English as collapsed alternate content only when requested or useful.
4. Validate.
   - Run whitespace/link/content checks that are available in the repo, such as `git diff --check`.
   - Use targeted search when PowerShell rendering makes Chinese text look garbled.

## Pitfalls

- If the README becomes the deployed homepage instead of the app, inspect the actual deployment source and workflow.
- If terminal output shows mojibake, verify with git diff or targeted content search before rewriting again.
- If the doc mentions commands, confirm those commands exist before listing them.
- If the user asks for "shorter" or "more natural", reduce structure and remove spec-like wording.

## Done means

- The doc reflects the current implemented repo, not stale plans.
- Chinese is the primary visible version.
- Any English version is collapsed or clearly secondary.
- Commands, paths, and deployment claims were checked against real files or live state where feasible.

