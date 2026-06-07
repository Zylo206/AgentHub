import type { AuthUser, PresenceRecord } from "../../api/agenthubApi";

interface WorkspacePresenceBarProps {
  currentUser: AuthUser | null;
  deviceId: string;
  error: string | null;
  records: PresenceRecord[];
}

function formatPresenceStatus(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "TYPING") {
    return "正在输入";
  }
  if (normalized === "ACTIVE") {
    return "在线";
  }
  if (normalized === "IDLE") {
    return "空闲";
  }
  return status;
}

function formatUpdatedAt(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "刚刚";
  }

  const seconds = Math.max(Math.round((Date.now() - timestamp) / 1000), 0);
  if (seconds < 60) {
    return `${seconds}s 前`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes}m 前`;
}

export function WorkspacePresenceBar({
  currentUser,
  deviceId,
  error,
  records
}: WorkspacePresenceBarProps) {
  const activeRecords = records.slice(0, 6);

  return (
    <section className="workspace-presence-bar" data-testid="workspace-presence-bar">
      <div className="workspace-presence-bar__summary">
        <span className="workspace-presence-bar__dot" />
        <strong>实时协作</strong>
        <span>{activeRecords.length || 1} 个在线端</span>
        {currentUser ? <span>当前：{currentUser.displayName}</span> : null}
        <span className="workspace-presence-bar__device">设备 {deviceId.slice(0, 8)}</span>
      </div>
      <div className="workspace-presence-bar__records">
        {activeRecords.length > 0 ? (
          activeRecords.map((record) => (
            <span
              key={`${record.userId}-${record.deviceId}`}
              className={`workspace-presence-pill workspace-presence-pill--${record.status.toLowerCase()}`}
              title={record.activeArtifactId ? `正在查看 Artifact ${record.activeArtifactId}` : undefined}
            >
              {record.displayName || record.userId}
              <small>{formatPresenceStatus(record.status)} · {formatUpdatedAt(record.updatedAt)}</small>
            </span>
          ))
        ) : (
          <span className="workspace-presence-pill workspace-presence-pill--active">等待其他协作者加入</span>
        )}
      </div>
      {error ? <span className="workspace-presence-bar__error">{error}</span> : null}
    </section>
  );
}
