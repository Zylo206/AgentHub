import type { AuthUser, PresenceRecord } from "../../api/agenthubApi";
import { sanitizeProductionText } from "../../utils/productionLabels";

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
  return sanitizeProductionText(status);
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
  return `${Math.round(seconds / 60)}m 前`;
}

function formatDisplayName(value?: string | null): string {
  const label = sanitizeProductionText(value || "");
  return label || "当前用户";
}

function formatActiveArtifact(record: PresenceRecord): string | null {
  if (!record.activeArtifactId) {
    return null;
  }
  return `查看产物 ${record.activeArtifactId.slice(0, 8)}`;
}

export function WorkspacePresenceBar({ currentUser, deviceId, error, records }: WorkspacePresenceBarProps) {
  const activeRecords = records.slice(0, 6);
  const typingRecords = activeRecords.filter((record) => record.status.toUpperCase() === "TYPING");
  const artifactViewers = activeRecords.filter((record) => Boolean(record.activeArtifactId));
  const summaryParts = [
    `${activeRecords.length || 1} 在线`,
    typingRecords.length > 0 ? `${typingRecords.length} 输入中` : null,
    artifactViewers.length > 0 ? `${artifactViewers.length} 看产物` : null,
    formatDisplayName(currentUser?.displayName)
  ].filter(Boolean);

  return (
    <section className="workspace-presence-bar" data-testid="workspace-presence-bar">
      <div className="workspace-presence-bar__summary" title={`设备 ${deviceId.slice(0, 8)}`}>
        <span className="workspace-presence-bar__dot" />
        <strong>实时协作</strong>
        <span>{summaryParts.join(" · ")}</span>
      </div>
      <div className="workspace-presence-bar__records">
        {activeRecords.length > 0 ? (
          activeRecords.map((record) => {
            const activeArtifact = formatActiveArtifact(record);
            return (
              <span
                key={`${record.userId}-${record.deviceId}`}
                className={`workspace-presence-pill workspace-presence-pill--${record.status.toLowerCase()}`}
                title={activeArtifact || undefined}
              >
                {formatDisplayName(record.displayName || record.userId)}
                <small>
                  {formatPresenceStatus(record.status)} / {formatUpdatedAt(record.updatedAt)}
                  {activeArtifact ? ` / ${activeArtifact}` : ""}
                </small>
              </span>
            );
          })
        ) : (
          <span className="workspace-presence-pill workspace-presence-pill--active">等待协作者加入</span>
        )}
      </div>
      {error ? <span className="workspace-presence-bar__error">{sanitizeProductionText(error)}</span> : null}
    </section>
  );
}
