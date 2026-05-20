# Rules Template

## 1. Rule Set Purpose

This document defines how AgentHub routes tasks, enforces collaboration boundaries, and keeps multi-agent execution stable and explainable.

## 2. Global Rules

- Every non-trivial task must be converted into a task spec before execution
- Every task must have clear acceptance criteria
- Every agent response must include a short completion summary
- Every handoff must include context, artifacts, and pending work
- Reviewer output must be based on acceptance criteria, not on intuition alone

## 3. Routing Rules

Use these rules to decide which agent should receive a sub task.

| Condition | Route To | Reason |
|---|---|---|
| UI, interaction, layout, state management | Frontend Builder | Best fit for visible product work |
| API, service, persistence, orchestration logic | Backend Worker | Best fit for server-side work |
| Prompt, role definition, behavior rules | Prompt Designer | Best fit for agent behavior shaping |
| Validation, bug risk, acceptance check | Reviewer | Independent quality gate |
| Knowledge retrieval, file lookup, grounding | Knowledge Agent | Context enrichment |

## 4. Handoff Rules

- The current agent must summarize completed work before handoff
- The current agent must attach artifact references when available
- The next agent must receive only relevant context, not the full raw history by default
- Pinned messages override short-term chat noise
- If a task changes meaning after user clarification, regenerate the task spec

## 5. Context Rules

- Use pinned messages as long-lived task context
- Use recent chat turns as short-lived execution context
- Use artifact cards as source-of-truth for generated outputs
- Do not rely on memory when the current artifact conflicts with old context

## 6. Review Rules

- Reviewer checks against acceptance criteria first
- Reviewer must identify concrete gaps
- Reviewer should distinguish blocker issues from nice-to-have improvements
- Reviewer should recommend pass, revise, or reject

## 7. Failure and Fallback Rules

- If an assigned agent fails, retry once with the same context
- If the same failure repeats, route to fallback agent
- If the task is under-specified, return to orchestrator for clarification
- If an artifact cannot be rendered, provide a structured fallback summary

## 8. Artifact Rules

- Code output should reference files and modules
- UI output should include previewable states when possible
- File output should include type and source metadata
- Diff output must be traceable to a previous artifact version

## 9. Demo Rules

- Prefer workflows that are easy to explain in 3 minutes
- Favor visible structured collaboration over invisible backend complexity
- Show task spec, routing, handoff, and review in the demo flow

## 10. Rule Change Log

| Date | Rule Change | Reason |
|---|---|---|
| TBD | TBD | TBD |
