import type { Artifact } from "../artifacts/artifactTypes";
import type { LineDiffEntry } from "../artifacts/artifactLineage";
import { InlineDiffViewer, parseDiffFromText } from "./InlineDiffViewer";
import { getIdValue } from "../../utils/id";

type ProtocolTone = "TASK" | "RESULT" | "REVIEW" | "APPROVAL" | "REJECTION" | "ERROR";

interface RichProtocolCardProps {
  protocolLabel: ProtocolTone;
  agentLane: string;
  content: string;
  artifacts: Artifact[];
  onSelectArtifact: (artifactId: string) => void;
  onRegenerateAgentReply?: () => void;
  regenerating?: boolean;
  onQuoteMessage?: () => void;
}

// ---------------------------------------------------------------------------
// Protocol metadata
// ---------------------------------------------------------------------------

const PROTOCOL_META: Record<ProtocolTone, { icon: string; title: string; description: string; cta: string }> = {
  TASK: {
    icon: "📋",
    title: "任务拆解",
    description: "Orchestrator 正在拆解任务、分配 Agent 和上下文。",
    cta: "查看计划",
  },
  RESULT: {
    icon: "✅",
    title: "执行结果",
    description: "Specialist Agent 返回了本步骤产出或执行结果。",
    cta: "查看产物",
  },
  REVIEW: {
    icon: "🔍",
    title: "质量评审",
    description: "Reviewer 正在检查质量、风险和可交付性。",
    cta: "查看评审",
  },
  APPROVAL: {
    icon: "✔️",
    title: "审批通过",
    description: "协作链路通过当前评审，可继续进入产物操作。",
    cta: "继续交付",
  },
  REJECTION: {
    icon: "🚫",
    title: "评审驳回",
    description: "评审发现阻塞问题，需要先修复后再继续。",
    cta: "查看阻塞",
  },
  ERROR: {
    icon: "⚠️",
    title: "执行错误",
    description: "协作链路遇到错误，请查看失败原因和备用路径状态。",
    cta: "查看错误",
  },
};

// ---------------------------------------------------------------------------
// Artifact type display
// ---------------------------------------------------------------------------

function getArtifactTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CODE: "代码",
    WEB_PREVIEW: "网页",
    MARKDOWN: "文档",
    FILE: "文件",
    REVIEW_REPORT: "评审报告",
    API_CONTRACT: "API 契约",
    DATA_MODEL: "数据模型",
  };
  return labels[type] ?? type;
}

function getStatusTone(status: string): string {
  const upper = status.toUpperCase();
  if (upper.includes("ACCEPT") || upper === "DONE") return "success";
  if (upper.includes("REJECT") || upper.includes("FAIL")) return "danger";
  if (upper.includes("PENDING") || upper === "RUNNING") return "warning";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RichProtocolCard({
  protocolLabel,
  agentLane,
  content,
  artifacts,
  onSelectArtifact,
  onRegenerateAgentReply,
  regenerating,
  onQuoteMessage,
}: RichProtocolCardProps) {
  const meta = PROTOCOL_META[protocolLabel] ?? PROTOCOL_META.TASK;
  const isOrchestrator = agentLane === "orchestrator";

  // Try to parse diff from message content
  const diffEntries: LineDiffEntry[] | null = protocolLabel === "RESULT" ? parseDiffFromText(content) : null;

  return (
    <div
      className={`rich-protocol-card rich-protocol-card--${protocolLabel.toLowerCase()}`}
      data-testid="rich-protocol-card"
    >
      {/* Header */}
      <div className="rich-protocol-card__header">
        <span className="rich-protocol-card__icon" aria-hidden="true">{meta.icon}</span>
        <div className="rich-protocol-card__title-group">
          <div className="rich-protocol-card__title-row">
            <span className="rich-protocol-card__label">{protocolLabel}</span>
            <strong>{meta.title}</strong>
            {isOrchestrator ? <span className="rich-protocol-card__lane">Orchestrator</span> : null}
          </div>
          <p className="rich-protocol-card__desc">{meta.description}</p>
        </div>
      </div>

      {/* Artifact list for RESULT messages */}
      {protocolLabel === "RESULT" && artifacts.length > 0 ? (
        <div className="rich-protocol-card__artifacts">
          {artifacts.map((artifact) => {
            const artifactId = getIdValue(artifact.id);
            return (
              <button
                key={artifactId}
                type="button"
                className="rich-protocol-card__artifact-chip"
                onClick={() => onSelectArtifact(artifactId)}
              >
                <span className="rich-protocol-card__artifact-type">{getArtifactTypeLabel(artifact.type)}</span>
                <span className="rich-protocol-card__artifact-title">{artifact.title}</span>
                <span className={`rich-protocol-card__artifact-status rich-protocol-card__artifact-status--${getStatusTone(artifact.status)}`}>
                  v{artifact.version}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Inline diff preview */}
      {diffEntries ? <InlineDiffViewer entries={diffEntries} maxLines={20} /> : null}

      {/* Actions */}
      <div className="rich-protocol-card__actions">
        {protocolLabel === "REJECTION" ? (
          <>
            {onQuoteMessage ? (
              <button type="button" className="rich-protocol-card__action" onClick={onQuoteMessage}>
                生成修复 Revision
              </button>
            ) : null}
            {onRegenerateAgentReply ? (
              <button type="button" className="rich-protocol-card__action" disabled={regenerating} onClick={onRegenerateAgentReply}>
                {regenerating ? "重新评审中..." : "重新评审"}
              </button>
            ) : null}
          </>
        ) : (
          <span className="rich-protocol-card__cta">{meta.cta}</span>
        )}
      </div>
    </div>
  );
}
