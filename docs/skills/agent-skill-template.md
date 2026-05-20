# Agent Skill Template

## 1. Basic Info

- Skill Name:
- Skill ID:
- Version:
- Owner:
- Status:

## 2. Purpose

Describe what this skill is designed to solve.

Example:
This skill helps an agent implement frontend UI tasks in the AgentHub chat workspace, including conversation layout, artifact cards, responsive interaction, and state updates.

## 3. Applicable Task Types

- Frontend page implementation
- Backend API implementation
- Prompt and rules refinement
- Review and validation
- Knowledge retrieval

## 4. Capability Tags

- react
- spring-boot
- orchestration
- artifact-preview
- review

## 5. Input Requirements

What the agent must receive before execution.

- Task spec
- Relevant files or modules
- Constraints
- Acceptance criteria
- Previous agent output if any

## 6. Output Requirements

How the agent should respond.

- Summary of work completed
- Files changed or artifacts generated
- Risks and open questions
- Suggested next handoff target

## 7. Tools

List the tools or system abilities this skill may use.

- code_editor
- file_search
- terminal
- preview
- knowledge_search

## 8. Execution Style

Define the working style.

- Keep changes scoped to assigned files
- Explain tradeoffs briefly
- Prefer structured outputs
- Do not modify unrelated modules

## 9. Quality Rules

- Follow repository conventions
- Keep implementation demo-friendly
- Prefer stable, easy-to-explain solutions
- Add minimal comments only where needed

## 10. Handoff Format

Use a stable handoff structure.

### Handoff Summary

- Completed:
- Pending:
- Risks:
- Suggested next agent:
- Required context for next step:

## 11. Failure Strategy

If the agent cannot complete the task:

- State the blocker clearly
- Return partial output if available
- Suggest the correct next agent or fallback path
- Do not invent unsupported results

## 12. Example Invocation

Task:
Implement a message card component for code and file preview in the chat page.

Expected behavior:
- Build UI component
- Connect message schema
- Return changed files and remaining issues
