import type { TaskRun, TaskStep } from "../chat/chatTypes";
import type { AdapterDescriptor } from "./agentTypes";

interface AdapterQualityDashboardProps {
  adapterDescriptors: AdapterDescriptor[];
  taskRuns: TaskRun[];
}

interface AdapterQualityRow {
  adapterType: string;
  status: string;
  routeAttempts: number;
  successRate: number | null;
  fallbackRate: number | null;
  observedSteps: number;
  parseFailures: number;
  qualityFailures: number;
  buildFailures: number;
}

function getStepAdapterType(step: TaskStep): string {
  return step.actualAdapterType || step.preferredAdapterType || step.adapterType || "UNKNOWN";
}

function isParseFailure(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  return !["VALID_JSON_ARTIFACTS", "TEXT_FALLBACK", "NOT_ATTEMPTED", "SKIPPED"].includes(status);
}

function isQualityFailure(status?: string | null): boolean {
  return status === "REJECTED" || status === "FAILED";
}

function isBuildFailure(status?: string | null): boolean {
  return Boolean(status && status !== "PASSED" && status !== "NOT_EVALUATED" && status !== "SKIPPED");
}

function formatRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${Math.round(value * 100)}%`;
}

function buildRows(adapterDescriptors: AdapterDescriptor[], taskRuns: TaskRun[]): AdapterQualityRow[] {
  const byAdapter = new Map<string, AdapterQualityRow>();

  adapterDescriptors.forEach((descriptor) => {
    byAdapter.set(descriptor.adapterType, {
      adapterType: descriptor.adapterType,
      status: descriptor.status,
      routeAttempts: descriptor.routeAttempts ?? 0,
      successRate: typeof descriptor.successRate === "number" ? descriptor.successRate : null,
      fallbackRate: typeof descriptor.fallbackRate === "number" ? descriptor.fallbackRate : null,
      observedSteps: 0,
      parseFailures: 0,
      qualityFailures: 0,
      buildFailures: 0
    });
  });

  taskRuns.flatMap((taskRun) => taskRun.steps).forEach((step) => {
    const adapterType = getStepAdapterType(step);
    const row =
      byAdapter.get(adapterType) ??
      {
        adapterType,
        status: "OBSERVED",
        routeAttempts: 0,
        successRate: null,
        fallbackRate: null,
        observedSteps: 0,
        parseFailures: 0,
        qualityFailures: 0,
        buildFailures: 0
      };

    row.observedSteps += 1;
    row.parseFailures += isParseFailure(step.artifactParseStatus) ? 1 : 0;
    row.qualityFailures += isQualityFailure(step.artifactQualityStatus) ? 1 : 0;
    row.buildFailures += isBuildFailure(step.artifactBuildValidationStatus) ? 1 : 0;
    byAdapter.set(adapterType, row);
  });

  return Array.from(byAdapter.values()).sort((left, right) => {
    const failureDelta =
      right.parseFailures + right.qualityFailures + right.buildFailures -
      (left.parseFailures + left.qualityFailures + left.buildFailures);
    if (failureDelta !== 0) {
      return failureDelta;
    }

    return right.routeAttempts - left.routeAttempts;
  });
}

export function AdapterQualityDashboard({ adapterDescriptors, taskRuns }: AdapterQualityDashboardProps) {
  const rows = buildRows(adapterDescriptors, taskRuns);

  if (rows.length === 0) {
    return (
      <section className="adapter-quality-dashboard">
        <div className="adapter-quality-dashboard__header">
          <strong>Adapter Quality Dashboard</strong>
          <span>No adapter observations yet</span>
        </div>
      </section>
    );
  }

  return (
    <section className="adapter-quality-dashboard" aria-label="Adapter quality dashboard">
      <div className="adapter-quality-dashboard__header">
        <div>
          <strong>Adapter Quality Dashboard</strong>
          <p>Tracks route history and current TaskStep artifact quality signals.</p>
        </div>
        <span>{rows.length} adapters</span>
      </div>

      <div className="adapter-quality-table">
        <div className="adapter-quality-table__row adapter-quality-table__row--head">
          <span>Adapter</span>
          <span>Status</span>
          <span>Attempts</span>
          <span>Success</span>
          <span>Fallback</span>
          <span>Observed steps</span>
          <span>Parse failures</span>
          <span>Quality failures</span>
          <span>Build failures</span>
        </div>
        {rows.map((row) => (
          <div className="adapter-quality-table__row" key={row.adapterType}>
            <strong>{row.adapterType}</strong>
            <span>{row.status}</span>
            <span>{row.routeAttempts}</span>
            <span>{formatRate(row.successRate)}</span>
            <span>{formatRate(row.fallbackRate)}</span>
            <span>{row.observedSteps}</span>
            <span>{row.parseFailures}</span>
            <span>{row.qualityFailures}</span>
            <span>{row.buildFailures}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
