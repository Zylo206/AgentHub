# AgentHub Doc Collab Service

`doc-collab` is the AgentHub V2 realtime collaboration service. It keeps the existing Spring backend as the source of truth for Artifact metadata, permissions, approval, revision, snapshot, restore, diff, deploy preview, and audit.

## Protocol

- `AGENTHUB_ARTIFACT_COLLAB_V2_YJS`
- WebSocket room: `ws://127.0.0.1:8091/rooms/{artifactId}?access_token=<token>`
- CRDT model: one Yjs `Y.Doc` per Artifact room, with `Y.Text("content")`
- Presence / cursor: room awareness state over JSON messages
- Update frame: binary message where byte `0` is `1`, and bytes `1..n` are a Yjs update

## Runtime

```powershell
cd doc-collab
npm install
npm run build
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:DOC_COLLAB_PORT="8091"
npm run start
```

Optional Redis fanout:

```powershell
$env:REDIS_URL="redis://127.0.0.1:6379"
npm run start
```

Without `REDIS_URL`, the service runs in single-node mode with file-backed snapshots and op log under `DOC_COLLAB_STORAGE_DIR`.

## Boundaries

- Supports only `CODE` and `MARKDOWN` Artifact rooms.
- Does not publish directly to Artifact storage. Frontend materializes the Yjs document and calls Spring `PUBLISH_COLLAB_DRAFT`.
- Redis is required for production multi-node fanout.
