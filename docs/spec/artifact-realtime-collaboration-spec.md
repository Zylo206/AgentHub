# Artifact Realtime Collaboration Spec

## Goal

Add production-oriented Artifact-level realtime collaborative editing for code text and Markdown documents without changing the existing chat, Orchestrator, Artifact Revision, Approval, Snapshot, Restore, Diff, Deploy Preview, or Audit contracts.

## Scope

- `CODE` and `MARKDOWN` Artifacts only.
- Artifact-level collaboration room only.
- No PPT, rich document, visual webpage editing, or whole-workspace collaboration in this phase.
- The collaboration room owns draft state. Formal delivery still happens through Artifact Revision and Apply Diff.

## Protocols

The Spring backend keeps `AGENTHUB_ARTIFACT_COLLAB_V1` as the compatibility and local fallback protocol:

- Server-authoritative room state.
- WebSocket channel at `/api/doc-collab`.
- REST fallback under `/api/artifacts/{artifactId}/collab-room`.
- Versioned document updates with `baseVersion`.
- Presence, cursor range, editing state, and participant list.
- Operation log retained to the latest 200 operations.
- Snapshot compaction through persisted latest room state.

The `doc-collab/` service implements `AGENTHUB_ARTIFACT_COLLAB_V2_YJS`:

- Independent Node / TypeScript service.
- WebSocket room at `/rooms/{artifactId}`.
- One Yjs `Y.Doc` per Artifact room.
- Text content stored as `Y.Text("content")`.
- Binary update frame: first byte `1`, remaining bytes are the Yjs update.
- JSON awareness messages for cursor / selection / editing state.
- File-backed snapshot and update log for local development.
- Optional object-storage-style snapshot mirror through `DOC_COLLAB_SNAPSHOT_STORAGE_TYPE=object-storage`.
- Optional Redis Streams + Pub/Sub when `REDIS_URL` is configured.
- Spring backend remains authoritative for Artifact metadata, permission, approval, revision, snapshot, restore, diff, deploy preview, and audit.

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
- Expose `/api/artifacts/{artifactId}/collab-room/authorize` for V2 service permission checks.
- Accept V2 materialized draft content in `/api/artifacts/{artifactId}/collab-room/publish`.

## Doc-Collab Responsibilities

- Validate every join against Spring `READ` authorization.
- Validate edits against Spring `WRITE` authorization.
- Apply Yjs updates to the room `Y.Doc`.
- Persist updates to local JSONL and, when enabled, Redis Streams.
- Broadcast local updates to connected clients.
- Publish local updates to Redis Pub/Sub for peer doc-collab nodes.
- Apply peer updates from Redis Pub/Sub and fan them out to local clients.
- Compact snapshots after `DOC_COLLAB_SNAPSHOT_EVERY_UPDATES`.
- Mirror compacted snapshots to the configured object-storage-style bucket when enabled.
- Enforce `DOC_COLLAB_MAX_UPDATE_BYTES` and `DOC_COLLAB_MAX_DOCUMENT_CHARS`.

## Frontend Responsibilities

- Show the collaboration room inside the Artifact Diff / Revision workspace.
- Load the V1 room through REST before opening V2.
- Connect to `VITE_DOC_COLLAB_WS_URL` or default `ws://<api-host>:8091`.
- Prefer V2 Yjs provider when available.
- Fall back to V1 server-authoritative sync if V2 is unavailable.
- Sync text edits through Yjs binary updates.
- Show participants and editing status.
- Publish collaborative draft through the existing approval flow.
- Select the newly created revision after publish.

## Acceptance

- Two browser sessions can open the same `CODE` or `MARKDOWN` Artifact room through V2.
- Text updates are Yjs binary updates and converge across clients.
- Cursor / editing presence appears in the room participant list.
- Disconnect and reconnect reloads the latest persisted room state.
- Doc-collab restart can recover the latest room snapshot from `DOC_COLLAB_STORAGE_DIR`.
- When object-storage snapshot mirroring is enabled, doc-collab restart can also recover from the mirrored snapshot copy.
- Publishing a collaborative draft without approval is rejected.
- Publishing creates an Artifact Revision instead of mutating the base Artifact directly.
- Existing Apply Diff approval remains required before the revision becomes a new accepted applied artifact.
- With `REDIS_URL`, multiple doc-collab nodes can fan out updates through Redis Pub/Sub and recover update history through Redis Streams.

## Boundaries

- Yjs is implemented. Automerge is intentionally not used.
- Redis Streams + Pub/Sub is the first multi-node fanout path. Kafka remains out of scope for low-latency room fanout.
- Without `REDIS_URL`, doc-collab runs in single-node mode.
- The current object-storage backend is filesystem-backed and validates the persistence boundary; real S3/MinIO SDK wiring is a later production step.
- Redis outage handling is conservative: production deployments should reject writes or enter read-only instead of accepting divergent updates.
- The room is a collaborative draft surface. It is not the audit source; Artifact Revision, ApprovalRequest, Snapshot, and ActionAuditLog remain authoritative.

## Next

- Add UI-level visual cursor ranges and user colors.
- Add a production Redis failure-mode gate before accepting writes when Redis is required.
- Add managed deployment templates for three doc-collab nodes behind a gateway.
