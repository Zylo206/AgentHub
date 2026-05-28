import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import type { TaskRun, TaskStep } from "../chat/chatTypes";
import type { AdapterDescriptor } from "./agentTypes";

interface AdapterQualityDashboardProps {
  adapterDescriptors: AdapterDescriptor[];
  taskRuns: TaskRun[];
  qualityMetrics: AdapterQualityMetrics[];
}

interface AdapterQualityRow {
  adapterType: string;
  status: string;
  healthLabel?: string | null;
  routeAttempts: number;
  successRate: number | null;
  fallbackRate: number | null;
  realAcceptanceRate: number | null;
  totalFailureRate: number | null;
  observedSteps: number;
  parseFailures: number;
  qualityFailures: number;
  buildFailures: number;
  realOutputAccepted: number;
  lastQualityStatus?: string | null;
  lastQualityReason?: string | null;
}

function getStepAdapterType(step: TaskStep): string {
  return step.actualAdapterType || step.preferredAdapterType || step.adapterType || "UNKNOWN";
}

function isParseFailure(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  return !["VALID_JSON_ARTIFACTS", "TEXT_FALLBACK", "FALLBACK_TEXT", "NOT_ATTEMPTED", "SKIPPED", "EMPTY"].includes(status);
}

function isQualityFailure(status?: string | null): boolean {
  return status === "REJECTED" || status === "FAILED";
}

function isBuildFailure(status?: string | null): boolean {
  return status === "FAILED";
}

function formatRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }

  return `${Math.round(value * 100)}%`;
}

function buildRows(
  adapterDescriptors: AdapterDescriptor[],
  taskRuns: TaskRun[],
  qualityMetrics: AdapterQualityMetrics[]
): AdapterQualityRow[] {
  const byAdapter = new Map<string, AdapterQualityRow>();

  adapterDescriptors.forEach((descriptor) => {
    byAdapter.set(descriptor.adapterType, {
      adapterType: descriptor.adapterType,
      status: descriptor.status,
      healthLabel: null,
      routeAttempts: descriptor.routeAttempts ?? 0,
      successRate: typeof descriptor.successRate === "number" ? descriptor.successRate : null,
      fallbackRate: typeof descriptor.fallbackRate === "number" ? descriptor.fallbackRate : null,
      realAcceptanceRate: null,
      totalFailureRate: null,
      observedSteps: 0,
      parseFailures: 0,
      qualityFailures: 0,
      buildFailures: 0,
      realOutputAccepted: 0,
      lastQualityStatus: null,
      lastQualityReason: null
    });
  });

  qualityMetrics.forEach((metrics) => {
    const row =
      byAdapter.get(metrics.adapterType) ??
      {
        adapterType: metrics.adapterType,
        status: "OBSERVED",
        healthLabel: null,
        routeAttempts: 0,
        successRate: null,
        fallbackRate: null,
        realAcceptanceRate: null,
        totalFailureRate: null,
        observedSteps: 0,
        parseFailures: 0,
        qualityFailures: 0,
        buildFailures: 0,
        realOutputAccepted: 0,
        lastQualityStatus: null,
        lastQualityReason: null
      };

    row.observedSteps = Math.max(row.observedSteps, metrics.attempts);
    row.parseFailures = Math.max(row.parseFailures, metrics.parseFailures);
    row.qualityFailures = Math.max(row.qualityFailures, metrics.qualityFailures);
    row.buildFailures = Math.max(row.buildFailures, metrics.buildFailures);
    row.realOutputAccepted = metrics.realOutputAccepted;
    row.successRate = metrics.successRate;
    row.fallbackRate = metrics.fallbackRate;
    row.realAcceptanceRate = metrics.realAcceptanceRate ?? null;
    row.totalFailureRate = metrics.totalFailureRate ?? null;
    row.healthLabel = metrics.healthLabel ?? null;
    row.lastQualityStatus = metrics.lastQualityStatus;
    row.lastQualityReason = metrics.lastQualityReason;
    byAdapter.set(metrics.adapterType, row);
  });

  const metricAdapterTypes = new Set(qualityMetrics.map((metrics) => metrics.adapterType));
  taskRuns.flatMap((taskRun) => taskRun.steps).forEach((step) => {
    const adapterType = getStepAdapterType(step);
    if (metricAdapterTypes.has(adapterType)) {
      return;
    }
    const row =
      byAdapter.get(adapterType) ??
      {
        adapterType,
        status: "OBSERVED",
        healthLabel: null,
        routeAttempts: 0,
        successRate: null,
        fallbackRate: null,
        realAcceptanceRate: null,
        totalFailureRate: null,
        observedSteps: 0,
        parseFailures: 0,
        qualityFailures: 0,
        buildFailures: 0,
        realOutputAccepted: 0,
        lastQualityStatus: null,
        lastQualityReason: null
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

export function AdapterQualityDashboard({
  adapterDescriptors,
  taskRuns,
  qualityMetrics
}: AdapterQualityDashboardProps) {
  const rows = buildRows(adapterDescriptors, taskRuns, qualityMetrics);

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
          <p>Backend aggregate metrics plus route history. Values survive restart when metrics persistence is enabled.</p>
        </div>
        <span>{rows.length} adapters</span>
      </div>

      <div className="adapter-quality-table">
        <div className="adapter-quality-table__row adapter-quality-table__row--head">
          <span>Adapter</span>
          <span>Health</span>
          <span>Attempts</span>
          <span>Success</span>
          <span>Fallback</span>
          <span>Real accepted</span>
          <span>Failure rate</span>
          <span>Failures</span>
          <span>Last reason</span>
        </div>
        {rows.map((row) => (
          <div className="adapter-quality-table__row" key={row.adapterType}>
            <strong>{row.adapterType}</strong>
            <span title={`Adapter status: ${row.status}`}>{row.healthLabel || row.status}</span>
            <span title={`${row.routeAttempts} route attempts / ${row.observedSteps} observed quality attempts`}>
              {row.routeAttempts} / {row.observedSteps}
            </span>
            <span>{formatRate(row.successRate)}</span>
            <span>{formatRate(row.fallbackRate)}</span>
            <span title={`${row.realOutputAccepted} accepted real adapter outputs`}>
              {row.realOutputAccepted} ({formatRate(row.realAcceptanceRate)})
            </span>
            <span>{formatRate(row.totalFailureRate)}</span>
            <span title="parse / quality / build failures">
              {row.parseFailures} / {row.qualityFailures} / {row.buildFailures}
            </span>
            <span title={row.lastQualityReason || ""}>{row.lastQualityStatus || "N/A"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
