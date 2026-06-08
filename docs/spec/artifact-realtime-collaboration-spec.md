# Artifact Realtime Collaboration Spec

## Goal

Add production-oriented Artifact-level realtime collaborative editing for code text and Markdown documents without changing the existing chat, Orchestrator, Artifact Revision, Approval, Snapshot, Restore, Diff, Deploy Preview, or Audit contracts.

## Scope

- `CODE` and `MARKDOWN` Artifacts only.
- Artifact-level collaboration room only.
- No PPT, rich document, visual webpage editing, or whole-workspace collaboration in this phase.
- The collaboration room owns draft state. Formal delivery still happens through Artifact Revision and Apply Diff.

## Protocol

Current implementation uses `AGENTHUB_ARTIFACT_COLLAB_V1`:

- Server-authoritative room state.
- WebSocket channel at `/api/doc-collab`.
- REST fallback under `/api/artifacts/{artifactId}/collab-room`.
- Versioned document updates with `baseVersion`.
- Presence, cursor range, editing state, and participant list.
- Operation log retained to the latest 200 operations.
- Snapshot compaction through persisted latest room state.

This is Yjs-ready at the boundary, but it is not a full Yjs binary update protocol yet. A future CRDT phase can replace the `REPLACE_DOCUMENT` payload with Yjs update frames while keeping the same room, permission, publish, audit, and Artifact lifecycle boundaries.

## Backend Responsibilities

- Authorize every room through the Artifact's conversation permission.
- Reject unsupported Artifact types.
- Persist collaboration room state under `AGENTHUB_COLLAB_STORAGE_DIR`.
- Enforce `AGENTHUB_COLLAB_MAX_DOCUMENT_CHARS`.
- Broadcast room updates through WebSocket.
- Emit `COLLAB_ROOM_UPDATED` realtime events for normal Workspace refresh signals.
- Publish collaborative drafts only after `PUBLISH_COLLAB_DRAFT` approval.
- Create a formal `USER_REVISION` Artifact from the collaborative draft.
- Keep Apply Diff, Force Apply, Restore, Deploy Preview, Snapshot, and Audit unchanged.

## Frontend Responsibilities

- Show the collaboration room inside the Artifact Diff / Revision workspace.
- Load the room through REST before opening WebSocket.
- Join the WebSocket room with the existing bearer token query parameter.
- Sync text edits with debounce.
- Show participants and editing status.
- Publish collaborative draft through the existing approval flow.
- Select the newly created revision after publish.

## Acceptance

- Two browser sessions can open the same `CODE` or `MARKDOWN` Artifact room.
- Text updates are server-versioned and broadcast to joined sessions.
- Cursor / editing presence appears in the room participant list.
- Disconnect and reconnect reloads the latest persisted room state.
- Backend restart can recover the latest room snapshot from `AGENTHUB_COLLAB_STORAGE_DIR`.
- Publishing a collaborative draft without approval is rejected.
- Publishing creates an Artifact Revision instead of mutating the base Artifact directly.
- Existing Apply Diff approval remains required before the revision becomes a new accepted applied artifact.

## Boundaries

- This phase does not implement Yjs or Automerge binary CRDT updates.
- This phase does not implement Redis / NATS / Kafka multi-node fanout.
- WebSocket fanout is single-node. REST persisted room state provides restart recovery, not cross-node session distribution.
- The room is a collaborative draft surface. It is not the audit source; Artifact Revision, ApprovalRequest, Snapshot, and ActionAuditLog remain authoritative.

## Next

- Add a Yjs provider adapter for `AGENTHUB_ARTIFACT_COLLAB_V2`.
- Add Redis or NATS room fanout for multi-node deployments.
- Add richer selection ranges and user colors.
- Add a dedicated browser smoke that opens two sessions and verifies convergence after reconnect.
