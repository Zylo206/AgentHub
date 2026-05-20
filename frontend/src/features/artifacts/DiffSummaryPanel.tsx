import type { Artifact } from "./artifactTypes";
import { buildDiffSummary } from "./artifactLineage";

interface DiffSummaryPanelProps {
  artifacts: Artifact[];
  artifact: Artifact | null;
}

export function DiffSummaryPanel({ artifacts, artifact }: DiffSummaryPanelProps) {
  if (!artifact) {
    return null;
  }

  const summary = buildDiffSummary(artifacts, artifact);

  return (
    <section className="diff-summary">
      <div className="artifact-detail-section__header">
        <strong>Diff Summary</strong>
        <span>{summary.isInitialVersion ? "Initial Version" : "Static Revision Summary"}</span>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Revision Instruction</span>
        <p>{summary.instruction || "This artifact is the initial version."}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Based On</span>
        <p>{summary.basedOnLabel || "No parent artifact."}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Summary</span>
        <p>{summary.summary}</p>
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Changed Items</span>
        {summary.changedItems.length > 0 ? (
          <ul>
            {summary.changedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No revision summary available.</p>
        )}
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Not Changed</span>
        {summary.notChanged.length > 0 ? (
          <ul>
            {summary.notChanged.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No unchanged areas were recorded for this initial version.</p>
        )}
      </div>

      <div className="diff-summary-section">
        <span className="diff-summary-section__label">Risk</span>
        <p>{summary.risk}</p>
      </div>
    </section>
  );
}
