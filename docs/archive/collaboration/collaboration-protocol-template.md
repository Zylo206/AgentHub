# Collaboration Protocol Template

## 1. Objective

This protocol defines how humans and agents collaborate inside AgentHub so that execution is structured, traceable, and reusable.

## 2. Roles

### User

- Provides goal, constraints, and feedback
- Approves direction changes when needed
- Continues iteration based on artifacts

### Orchestrator

- Converts user requests into task specs
- Splits complex work into sub tasks
- Selects agents according to rules and skills
- Aggregates outputs and decides next step

### Specialist Agent

- Executes one scoped sub task
- Produces artifacts or structured updates
- Returns clear handoff information

### Reviewer

- Verifies outputs against acceptance criteria
- Flags defects, regressions, or missing work
- Returns pass or revise decision

## 3. Standard Workflow

1. User submits request
2. Orchestrator generates task spec
3. Orchestrator creates execution plan
4. Orchestrator routes sub tasks by skill and rules
5. Specialist agents execute and return outputs
6. Outputs are rendered as artifact cards in chat
7. Reviewer validates against acceptance criteria
8. Orchestrator aggregates results and reports to user
9. User requests revision or confirms completion

## 4. Required Objects

Each collaboration run should contain:

- One task spec
- One execution plan
- One or more skill selections
- One or more rule-based routing decisions
- One or more handoff summaries
- One review result

## 5. Handoff Protocol

Every handoff should include the following fields:

- From agent:
- To agent:
- Current sub task:
- Completed work:
- Pending work:
- Artifact references:
- Risks:
- Suggested next action:

## 6. Status Model

Use a small stable state machine.

- `draft`: task captured but not yet planned
- `planned`: task spec and execution plan created
- `running`: one or more agents executing
- `reviewing`: reviewer checking outputs
- `blocked`: missing context or execution failure
- `completed`: accepted by reviewer or user

## 7. Context Layers

AgentHub should treat context in layers:

- Layer 1: task spec
- Layer 2: pinned long-lived messages
- Layer 3: recent chat turns
- Layer 4: artifacts and generated outputs
- Layer 5: handoff summaries

## 8. Review Decision Model

Reviewer decisions:

- `pass`: meets acceptance criteria
- `revise`: partial completion, needs more work
- `reject`: wrong direction or major failure

Reviewer output format:

- Decision:
- Evidence:
- Blocking issues:
- Suggested fixes:

## 9. Collaboration Evidence for Competition

To prove AI collaboration capability, AgentHub should preserve:

- generated task specs
- selected skills
- matched rules
- agent routing logs
- handoff summaries
- review decisions
- final artifacts

## 10. Demo Recommendation

For the 3-minute competition demo, show this sequence:

1. User enters a complex request
2. System generates a task spec card
3. Orchestrator splits the work
4. Different agents receive different sub tasks
5. Artifact cards appear in the chat stream
6. Reviewer checks against acceptance criteria
7. User continues iteration on the produced artifact

## 11. Open Extension Points

- support more agent types
- support custom skill packages
- support rule editing in UI
- support artifact version history
- support deployment and publish actions
