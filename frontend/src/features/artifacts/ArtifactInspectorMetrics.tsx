interface ArtifactInspectorMetric {
  label: string;
  value: string;
  detail: string;
}

interface ArtifactInspectorMetricsProps {
  metrics: ArtifactInspectorMetric[];
}

export function ArtifactInspectorMetrics({ metrics }: ArtifactInspectorMetricsProps) {
  return (
    <div className="artifact-inspector-metrics" aria-label="Artifact trust metrics">
      {metrics.map((metric) => (
        <article key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <small>{metric.detail}</small>
        </article>
      ))}
    </div>
  );
}

export type { ArtifactInspectorMetric };
