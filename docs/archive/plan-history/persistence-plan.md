# AgentHub Persistence Layer Technical Plan

## Purpose

This document defines the documentation-only persistence plan for the current sprint. It is a technical direction document, not an implementation checklist for this turn.

The goal is to move AgentHub from mostly in-memory and lightweight local persistence toward a repository-based persistence layer that can later support MySQL-backed state, durable attachments, auditability, and safer multi-agent workflow recovery.

## Priority Persistence Objects

The first persistence boundary should cover the objects that define the core AgentHub workflow:

| Object | Persistence reason |
|---|---|
| `Conversation` | Restores the workspace chat list, participants, and conversation-level state after restart. |
| `Message` | Preserves user messages, Agent messages, reply/quote/pin relationships, and collaboration protocol events. |
| `Agent` | Preserves built-in and user-created Agent configuration, role, prompt, capability tags, tool tags, and preferred adapter. |
| `Artifact` | Preserves generated code, documents, review reports, API contracts, adapter outputs, revisions, snapshots, and preview/deploy metadata. |
| `TaskRun` / `TaskStep` | Preserves Orchestrator execution state, decision logs, graph/batch structure, step inputs, assigned agents, adapter decisions, and final result. |
| `AttachmentRecord` | Preserves uploaded file metadata and links messages/tasks/artifacts to stored binary content. |
| `MemoryItem` | Preserves long-term memory records, pinned context, and retrieval candidates beyond process lifetime. |
| `ApprovalRequest` | Preserves pending/approved/cancelled approval gates for high-risk operations. |
| `ActionAuditLog` | Preserves the audit timeline for user actions, approval consumption, artifact changes, deployment simulations, and other safety-relevant events. |

## Phase A: Memory Repositories and Local Filesystem Attachment Storage

Phase A keeps the current MVP stable while introducing a clearer persistence boundary.

### Scope

- Keep repository implementations lightweight and local-first.
- Standardize memory repository contracts around the priority objects listed above.
- Store lightweight object state in memory repositories, with optional local JSON snapshots only where already aligned with the existing design.
- Add a local filesystem storage plan for attachment binary content.
- Keep `AttachmentRecord` as metadata that points to local file storage rather than embedding binary data in messages.

### Repository Direction

Each priority object should have a repository-facing boundary, even if the first implementation is still in-memory:

- `ConversationRepository`
- `MessageRepository`
- `AgentRepository`
- `ArtifactRepository`
- `TaskRunRepository`
- `TaskStepRepository`
- `AttachmentRecordRepository`
- `MemoryItemRepository`
- `ApprovalRequestRepository`
- `ActionAuditLogRepository`

The application layer should depend on repository interfaces, not concrete in-memory classes. Phase A can introduce or normalize these contracts incrementally without changing product behavior.

### Local Attachment Storage

Local filesystem attachment storage should use a deterministic root such as:

```text
data/attachments/
```

Recommended layout:

```text
data/attachments/
  {conversationId}/
    {messageId}/
      {attachmentId}-{safeOriginalName}
```

`AttachmentRecord` should store:

- `id`
- `conversationId`
- `messageId`
- optional `taskRunId`
- optional `artifactId`
- `originalFileName`
- `contentType`
- `sizeBytes`
- `storageProvider` such as `LOCAL_FILESYSTEM`
- `storageKey` or relative path under the attachment root
- checksum if available
- `createdAt`
- `createdBy`

### Acceptance Criteria

- Existing MVP flows keep working with in-memory repositories.
- Attachment metadata is represented separately from message text.
- Attachment binary storage is planned as filesystem-backed local persistence, not database blobs.
- No backend/frontend behavior change is required for this documentation-only turn.

## Phase B: Repository Interfaces with JDBC/MySQL Implementation

Phase B moves from local/in-memory persistence toward database-backed persistence through explicit repository interfaces.

### Scope

- Define stable repository interfaces for the priority objects.
- Add JDBC/MySQL-backed implementations behind those interfaces.
- Keep the application layer independent of whether the backing implementation is memory, local JSON, or JDBC/MySQL.
- Use Spring configuration to select repository implementations by environment/profile.
- Prefer simple SQL and explicit row mapping at this stage.

### JDBC/MySQL Direction

The JDBC/MySQL implementation should be optimized for clarity and debuggability:

- Use explicit tables per aggregate or high-value object.
- Store structured but fast-changing execution details as JSON columns only where that reduces premature schema churn.
- Keep relational fields for primary lookup paths such as conversation, message, task run, artifact, and approval IDs.
- Preserve created/updated timestamps consistently.
- Make audit records append-only.

Potential table groups:

- `conversations`
- `messages`
- `agents`
- `artifacts`
- `artifact_revisions`
- `task_runs`
- `task_steps`
- `attachment_records`
- `memory_items`
- `approval_requests`
- `action_audit_logs`

### Implementation Boundary

Phase B should introduce JDBC/MySQL repository implementations, but it should not require a full production-grade migration system during this sprint. Schema setup can initially be documented or manually applied while repository contracts settle.

### Acceptance Criteria

- Application services target repository interfaces.
- Memory and JDBC/MySQL implementations can coexist behind configuration.
- Core read/write paths are identifiable for each priority object.
- The plan remains compatible with a later full migration framework, but does not require one now.

## Phase C: Attachment Metadata in DB plus Object or Local Persistent Storage

Phase C makes attachments durable and queryable without coupling binary content to relational tables.

### Scope

- Store `AttachmentRecord` metadata in the database.
- Store attachment binary content in either local persistent storage or a future object storage provider.
- Keep storage access behind an `AttachmentStorage`-style abstraction.
- Support metadata lookup by message, conversation, task run, artifact, and uploader.

### Storage Model

The database should own attachment metadata:

- identity
- ownership and linkage
- content type
- size
- checksum
- storage provider
- storage key
- lifecycle state
- timestamps

The storage provider should own bytes:

- local persistent filesystem for the near-term implementation
- future object storage provider when the platform needs distributed deployment

The application should treat storage as replaceable:

```text
AttachmentRecordRepository -> metadata
AttachmentStorage -> binary content
```

### Local Persistent Storage

The near-term durable implementation should continue to support local filesystem storage with a configurable root path. This keeps development and demo deployments simple while preserving the abstraction needed for a later object store.

### Future Object Storage Compatibility

The model should not assume that storage keys are local paths. `storageProvider` and `storageKey` should be opaque to the application layer outside the storage abstraction.

### Acceptance Criteria

- Attachment metadata can be queried from the database.
- Attachment bytes are not stored in the relational database.
- Local persistent storage remains the default near-term backend.
- The design leaves room for object storage without requiring it in this sprint.

## Current Non-Goals

The current sprint explicitly does not include:

- No MyBatis Mapper implementation.
- No MinIO or S3 integration.
- No vector database.
- No full database migration in this sprint.
- No production-grade backup/restore workflow.
- No distributed file locking or multi-node attachment coordination.
- No replacement of existing backend/frontend flows as part of this documentation-only task.

## Suggested Delivery Order

1. Document repository boundaries and priority persistence objects.
2. Normalize memory repositories around those boundaries.
3. Introduce local filesystem attachment storage and `AttachmentRecord` metadata.
4. Add repository interfaces where application services currently depend on concrete implementations.
5. Add JDBC/MySQL implementations for the highest-value objects first: `Conversation`, `Message`, `Agent`, `Artifact`, `TaskRun` / `TaskStep`, and `AttachmentRecord`.
6. Extend JDBC/MySQL coverage to `MemoryItem`, `ApprovalRequest`, and `ActionAuditLog`.
7. Move attachment metadata into DB while keeping binary content in local persistent storage.
8. Revisit object storage, vector search, and full migrations after the sprint scope is complete.

