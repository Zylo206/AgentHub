# Realtime Plan

This plan tracks AgentHub realtime capability. The current implementation is SSE refresh + run-state snapshot + WebSocket control-plane MVP. Real token streaming and a multi-node event bus remain deferred.

## Current Status

- `Done`: Conversation-level SSE endpoint.
- `Done`: `RealtimeEvent`, `RealtimeEventPublisher`, and `RealtimeEventStore`.
- `Done`: `SseConnectionRegistry`.
- `Done`: Last-Event-ID replay and heartbeat.
- `Done`: `RealtimeRunState` and active realtime state APIs.
- `Done`: Event publishing for:
  - message created
  - task run created / updated
  - task step updated
  - artifact created / updated
  - context / handoff updated
  - approval / audit updated
  - deployment created
  - error
- `Done`: WebSocket control endpoint MVP.
- `Done`: REST fallback for cancel / stop run.
- `Done`: `RunCancellationRegistry` and execution-level control token foundation.
- `Done`: Workspace `EventSource` integration, refreshing panels after relevant events.
- `Done`: `CANCEL_RUN` and `STOP_RUN` now have distinct terminal states:
  - `CANCEL_RUN` -> `CANCELLED`
  - `STOP_RUN` -> `STOPPED`
- `Done`: Agent steps check the control token before delay, after delay, before adapter execution, and after adapter execution.
- `Done`: Non-streaming adapter results are discarded when the control token is observed after the adapter returns.
- `Done`: `scripts/sse-smoke-test.mjs` supports opt-in active cancel and active stop checks.
- `Done`: Local step-delay backend verification passed for both active `CANCEL_RUN` and active `STOP_RUN`.

## Active Follow-up

### P0: Keep Stop / Cancel Semantics Stable

- Continue observing `STOP_RUN` and `CANCEL_RUN` with slower real adapters or long-running tasks.
- `STOP_RUN`: stop later steps, keep already completed partial output, final state is `STOPPED`.
- `CANCEL_RUN`: cancel the run, discard later results, final state is `CANCELLED`.
- Keep ActionAuditLog, RealtimeRunState, TaskRunPanel, and SSE events synchronized.

### P1: Token Streaming Assessment

Only evaluate token streaming after real Adapter output quality is stable.

Future boundary:

- Start with OpenAI-compatible streaming only.
- Streaming chunks should drive progress / temporary messages, not replace the final Artifact contract.
- The final result must still aggregate into a complete JSON Artifact contract and pass validator plus quality gates.

## Deferred

- Multi-node event bus.
- Redis / Kafka / broker.
- Token-level persistence.
- Full bidirectional chat WebSocket.

## Boundary

- SSE events are refresh hints, not the only source of truth.
- REST APIs remain the authoritative data source.
- The current control token cannot forcibly kill a non-streaming HTTP call already executing in Java, but it can discard the returned result and prevent later steps.
