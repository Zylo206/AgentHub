# Persistence Plan

This plan tracks AgentHub's path from the default in-memory repositories toward verified JDBC / MySQL persistence. The current principle is not to switch MySQL on by default; verify the JDBC profile first and keep the memory profile stable.

## Current Status

- `Done`: Default persistence mode remains `memory` for local development and demo stability.
- `Done`: JDBC profile exists behind `agenthub.persistence.mode=jdbc`.
- `Done`: `backend/src/main/resources/schema-jdbc.sql` covers the current lightweight JDBC repositories.
- `Done`: JDBC repository coverage includes:
  - Conversation
  - Message
  - AttachmentRecord
  - Artifact
  - TaskSpec
  - TaskRun
  - TaskStep
  - ContextSnapshot
  - PinnedContext
  - HandoffSummary
- `Done`: `JdbcContextRepository` is implemented, so JDBC profile no longer mixes context data with in-memory repositories.
- `Done`: `scripts/jdbc-smoke-test.mjs` supports create-mode smoke and restart verification mode.
- `Done`: Restart verification covers Attachment metadata / download, PinnedContext, ContextSnapshot, and HandoffSummary.
- `Done`: Local MySQL-compatible create / restart verification passed on port `18087` using the JDBC profile.

## Verified MySQL Sprint

The real database verification sprint confirmed that the JDBC schema and repositories work across backend restart for the core MVP objects.

Verified flow:

- Initialize schema in a local MySQL-compatible database.
- Start backend with `AGENTHUB_PERSISTENCE_MODE=jdbc`.
- Create Conversation.
- Upload Attachment.
- Send Message.
- Pin Context.
- Run Demo Task.
- Query TaskRun / TaskStep.
- Query Artifact.
- Query ContextSnapshot / PinnedContext / HandoffSummary.
- Restart backend with the same JDBC database and attachment storage directory.
- Re-query the persisted objects and download the persisted attachment.

Observed restart verify result:

- Conversation persisted after restart.
- Messages persisted after restart.
- Attachment metadata persisted and attachment download returned HTTP 200 after restart.
- PinnedContext persisted after restart.
- Artifacts persisted after restart.
- TaskRuns persisted after restart.
- Conversation and TaskRun ContextSnapshot persisted after restart.
- HandoffSummary persisted after restart.

## Active Follow-up

- Keep `memory` as the default mode.
- Do not treat the current schema as a production migration system.
- Keep JDBC verification opt-in and environment-driven.
- If new domain objects become part of the main flow, update both `schema-jdbc.sql` and `jdbc-smoke-test.mjs`.

## P1 Repository Consistency

- Keep memory and JDBC DTO shapes consistent.
- Keep ID serialization compatible across both profiles.
- Make failure messages distinguish missing schema, connection failure, SQL error, and missing data.

## P1 Migration Strategy

- Do not introduce Flyway / Liquibase / MyBatis migration in the current MVP phase.
- If AgentHub enters long-term maintenance, add a migration system before changing the schema repeatedly.
- Attachment binary storage can remain local filesystem for now; the database stores metadata and storage keys.

## Configuration Boundary

- Default: `agenthub.persistence.mode=memory`.
- Optional: `agenthub.persistence.mode=jdbc`.
- JDBC connection information must come from environment variables or local runtime configuration, not committed docs or source files.
- Missing JDBC configuration must not affect memory mode startup.

## Deferred

- Default MySQL switch.
- Production migration framework.
- Multi-tenant schemas.
- Object storage migration.
