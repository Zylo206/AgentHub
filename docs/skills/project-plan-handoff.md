# Project Plan Handoff Skill

## 1. Skill Goal

Project Plan Handoff Skill is used to keep AgentHub planning state explicit, current, and recoverable across Agent sessions.

It ensures every Agent starts from the same current priority file, updates the project plan after completing work, and records actual implementation in the development log when needed.

This is a project-level AgentHub skill specification, not a globally installed Codex skill.

## 2. When To Use

Use this skill when:

- Starting a substantial task in AgentHub.
- Turning a Plan Mode proposal into project files.
- Completing a feature that changes current priorities.
- Updating roadmap, plan, or handoff documentation.
- Checking whether Done / Active / Deferred / Boundary states are current.

Do not use it for trivial one-line edits that do not affect project direction.

## 3. Required Inputs

The Agent should inspect:

- `docs/plans/next.md`
- `docs/plans/active-roadmap.md`
- The relevant focused plan under `docs/plans/*-plan.md`
- `docs/collaboration/dev-log.md` when implementation has changed
- Directory-level `AGENTS.md` files for the files being edited

## 4. Execution Steps

1. Read `docs/plans/next.md` before deciding the next implementation step.
2. Identify which active priority the current task belongs to.
3. Check the matching focused plan if one exists.
4. Implement or document the work without broad unrelated rewrites.
5. Run the relevant verification command, or state clearly why it was not run.
6. Update `docs/plans/next.md` if priorities changed.
7. Update the focused plan if the task changed a roadmap or boundary.
8. Append `docs/collaboration/dev-log.md` for meaningful implementation work.
9. Keep all claims aligned with actual validation results.

## 5. Status Rules

Use these status meanings consistently:

- `Done`: implemented or documented and verified enough for current project standards.
- `Active`: should be worked on next or soon.
- `Deferred`: valuable but intentionally postponed.
- `Boundary`: a limitation that must not be overstated.

Do not mark a task as `Done` if validation was skipped without a clear reason.

## 6. Output Requirements

When handing off, include:

- What changed.
- Which files changed.
- Which verification commands ran.
- Whether `docs/plans/next.md` changed.
- Whether `dev-log.md` was updated.
- Remaining boundaries or next tasks.

## 7. Verification Rules

- Documentation-only changes usually do not require backend or frontend builds.
- Backend changes should run backend build and relevant smoke tests.
- Frontend changes should run frontend build and relevant browser or API checks.
- Realtime changes should run `node scripts/sse-smoke-test.mjs`.
- Real Adapter changes should run `node scripts/real-adapter-smoke-test.mjs` when a real provider is configured, or explicitly state that it was not configured.

## 8. Failure Handling

If the Agent cannot complete the plan update:

- Leave a clear note in the final response.
- Do not silently skip `docs/plans/next.md` if priorities changed.
- Do not claim dev-log was updated if it was not.
- Do not hide failed verification.

## 9. What This Adds To AgentHub

This skill makes planning state part of the repository instead of leaving it in conversation history.

It reduces handoff loss between Agents and keeps the project moving from half-real MVP features toward real dynamic capability without losing current priorities.
