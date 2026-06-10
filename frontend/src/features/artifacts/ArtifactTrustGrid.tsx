import { useState } from "react";
import { ArtifactInspectorMetrics, type ArtifactInspectorMetric } from "./ArtifactInspectorMetrics";

interface ArtifactTrustGridProps {
  metrics: ArtifactInspectorMetric[];
  /** 是否默认折叠，默认为 true */
  defaultCollapsed?: boolean;
  /** 标题 */
  title?: string;
}

export function ArtifactTrustGrid({
  metrics,
  defaultCollapsed = true,
  title = "详细指标"
}: ArtifactTrustGridProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section
      className={`artifact-trust-grid ${collapsed ? "artifact-trust-grid--collapsed" : "artifact-trust-grid--expanded"}`}
      data-testid="artifact-trust-grid"
    >
      <button
        type="button"
        className="artifact-trust-grid__toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="artifact-trust-grid__title">{title}</span>
        <span className="artifact-trust-grid__icon">{collapsed ? "+" : "-"}</span>
      </button>
      {!collapsed && (
        <div className="artifact-trust-grid__content">
          <ArtifactInspectorMetrics metrics={metrics} />
        </div>
      )}
    </section>
  );
}
