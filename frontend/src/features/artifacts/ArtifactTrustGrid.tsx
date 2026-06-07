import { ArtifactInspectorMetrics, type ArtifactInspectorMetric } from "./ArtifactInspectorMetrics";

interface ArtifactTrustGridProps {
  metrics: ArtifactInspectorMetric[];
}

export function ArtifactTrustGrid({ metrics }: ArtifactTrustGridProps) {
  return (
    <section className="artifact-trust-grid" data-testid="artifact-trust-grid">
      <ArtifactInspectorMetrics metrics={metrics} />
    </section>
  );
}
