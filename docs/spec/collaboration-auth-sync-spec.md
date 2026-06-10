# Collaboration Auth Sync Spec

## Goal

Move AgentHub from a single-user MVP collaboration demo to a production-aligned multi-user collaboration model. The design covers login, RBAC, conversation-level resource permissions, realtime authorization, presence, reconnect recovery, and Artifact optimistic conflict handling.

## Scope

- Default auth mode is `demo`; `real` is opt-in for local verification and uses JDBC/MySQL-backed user/session storage.
- Default login is enabled.
- Built-in demo users are supported for local verification: `demo/demo`, `admin/admin`, and `reviewer/reviewer`.
- Resources are scoped by `ownerUserId`, `orgTag`, `visibility`, and conversation member roles.
- Realtime subscriptions must authorize the current user before opening SSE.
- Stop / Cancel and high-risk Artifact operations must authorize write permission before executing.
- Artifact Apply / Restore / Deploy accept optional `baseVersion` and `baseContentHash` optimistic concurrency inputs.

## Resource Visibility

- `PRIVATE`: owner, explicit members, and admins can read.
- `ORG`: users with a matching `orgTag`, explicit members, and admins can read.
- `PUBLIC`: logged-in users can read.

Write operations are stricter than read operations. `PUBLIC` only expands read access and never grants mutation rights.

## Roles

Conversation member roles:

- `OWNER`: manage conversation, members, messages, TaskRuns, approvals, Artifact mutations, restore, and deploy preview.
- `EDITOR`: send messages, start TaskRuns, revise Artifacts, apply approved changes, restore, and deploy preview.
- `REVIEWER`: read, comment, create review-oriented revisions, and approve reviewer-scoped gates where configured.
- `VIEWER`: read-only.
- `ADMIN`: platform-level override for local production-alignment verification.

## Realtime

- SSE remains the server-to-client event stream.
- WebSocket remains the Stop / Cancel control plane.
- SSE accepts `Authorization: Bearer <token>` when available and `access_token` query parameter for browser `EventSource`.
- `Last-Event-ID` remains the reconnect cursor.
- Presence is a weak consistency signal and not an audit source.
- Late chunks and late results continue to follow the existing Stop / Cancel discard rules.

## Presence

Presence records include:

- `conversationId`
- `userId`
- `displayName`
- `deviceId`
- `status`
- `activeArtifactId`
- `lastSeenEventId`
- `updatedAt`

Presence can drive UI hints such as online users, active device, typing, and current Artifact focus. It must not replace authorization or ActionAuditLog.

## Artifact Conflict Handling

AgentHub now has a separate Artifact realtime collaboration room for `CODE` and `MARKDOWN` drafts; see `docs/spec/artifact-realtime-collaboration-spec.md`. The existing formal Artifact mutation path still uses optimistic concurrency:

1. Client captures `baseVersion` and `baseContentHash` before editing or deploying.
2. Apply / Restore / Deploy may submit these values.
3. Backend compares them against the current Artifact before mutation.
4. Version or hash mismatch returns `409 CONFLICT`.
5. Force Apply still requires a separate high-risk approval.
6. Restore and Deploy also require approval and audit.

If clients omit optimistic fields, the backend keeps the existing compatibility path and still applies the current parent/revision conflict guard.

## Default Demo Boundary

- Login is enabled by default, but the frontend and smoke scripts use the demo account automatically for local verification.
- MOCK / STATIC / FALLBACK outputs remain explicitly labeled and must not be described as real provider success.
- Preview remains Local Preview / Static Snapshot / Not Cloud Deploy.
- Multi-user collaboration is production-aligned for auth, permission, realtime sync, conflict handling, and first-phase Artifact draft co-editing; it is not a multi-node event bus or full Yjs / Automerge CRDT editing yet.

## Phase Mapping

- Phase 236: default auth, `AuthPrincipal`, login API, frontend token propagation.
- Phase 237: conversation owner/org/visibility/member role metadata and service-layer access checks.
- Phase 238: realtime authorization, reconnect-safe SSE, and presence API.
- Phase 239: Artifact optimistic conflict handling for Apply / Restore / Deploy.
- Phase 240: smoke and E2E scripts updated to authenticate by default.
- Phase 281: Artifact-level realtime collaboration room for `CODE` / `MARKDOWN` drafts, WebSocket room sync, persisted room state, presence/cursor metadata, and approval-gated publish to Artifact Revision.

## Acceptance

- Unauthenticated API requests return `401`.
- Users only see conversations they can read.
- Write operations require owner/editor/reviewer/admin policy according to operation risk.
- SSE subscription to an unreadable conversation is rejected.
- Stop / Cancel require TaskRun conversation write permission.
- Missing `approvalId` is still rejected for Apply / Restore / Deploy.
- Stale Artifact `baseVersion` or `baseContentHash` returns conflict instead of silently overwriting.
