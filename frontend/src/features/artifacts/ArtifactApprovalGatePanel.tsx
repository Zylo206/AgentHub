type ApprovalRisk = "LOW" | "MEDIUM" | "HIGH";

interface ArtifactApprovalGate {
  approvalId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  title: string;
  summary: string;
  affectedItems: string[];
  riskLevel: ApprovalRisk;
  confirmLabel: string;
}

interface ArtifactApprovalGatePanelProps {
  approval: ArtifactApprovalGate;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArtifactApprovalGatePanel({
  approval,
  onConfirm,
  onCancel
}: ArtifactApprovalGatePanelProps) {
  return (
    <div
      className={`approval-gate approval-gate--${approval.riskLevel.toLowerCase()}`}
      data-testid="approval-gate"
    >
      <div className="approval-gate__header">
        <div>
          <strong>{approval.title}</strong>
          <p>{approval.summary}</p>
        </div>
        <span className={`approval-gate__risk approval-gate__risk--${approval.riskLevel.toLowerCase()}`}>
          风险：{approval.riskLevel}
        </span>
      </div>
      <div className="approval-gate__meta">
        <span>目标：{approval.targetType}</span>
        <span>ID：{approval.targetId}</span>
        <span>审批结果会写入 Action Audit。</span>
      </div>
      {approval.affectedItems.length > 0 ? (
        <div className="approval-gate__affected" data-testid="approval-affected-summary">
          <span className="approval-gate__affected-label">影响范围摘要</span>
          <ul>
            {approval.affectedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="approval-gate__actions">
        <button type="button" className="primary-button" onClick={onConfirm}>
          {approval.confirmLabel}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
