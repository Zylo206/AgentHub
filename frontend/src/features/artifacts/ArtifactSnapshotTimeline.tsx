import type { ArtifactSnapshot } from "./artifactSnapshotTypes";
import { displayArtifactType, displayStatus } from "../../utils/displayLabels";

interface ArtifactSnapshotTimelineProps {
  snapshots: ArtifactSnapshot[];
  restoringSnapshot: boolean;
  onRestoreSnapshot: (snapshotId: string) => void;
}

export function ArtifactSnapshotTimeline({
  snapshots,
  restoringSnapshot,
  onRestoreSnapshot
}: ArtifactSnapshotTimelineProps) {
  return (
    <div className="artifact-snapshot-box" data-testid="artifact-snapshot-box">
      <div className="artifact-revision-box__header">
        <strong>安全快照</strong>
        <span>{snapshots.length} 条记录</span>
      </div>
      {snapshots.length === 0 ? (
        <div className="deploy-status-empty">
          暂无安全快照。Revision、Apply Diff、Deploy 和 Restore 会在操作前创建快照。
        </div>
      ) : (
        <div className="artifact-snapshot-timeline">
          {snapshots.map((snapshot) => (
            <div className="deploy-status-card artifact-snapshot-node" key={snapshot.snapshotId}>
              <span className="artifact-snapshot-node__marker" aria-hidden="true" />
              <div className="deploy-status-card__row">
                <div>
                  <strong>{snapshot.title} v{snapshot.version}</strong>
                  <p>Restore 会创建新版本，不会覆盖该检查点。</p>
                </div>
                <span className="tag-chip">{snapshot.operationType}</span>
              </div>
              <div className="deploy-status-card__meta">
                <span>ID: {snapshot.snapshotId}</span>
                <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
                <span>状态：可审批恢复</span>
                <span>{displayArtifactType(snapshot.type)} / {displayStatus(snapshot.status)}</span>
              </div>
              <button
                type="button"
                className="secondary-button deploy-status-card__button"
                disabled={restoringSnapshot}
                onClick={() => {
                  onRestoreSnapshot(snapshot.snapshotId);
                }}
              >
                {restoringSnapshot ? "恢复中..." : "恢复快照"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
