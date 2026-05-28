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
  supportedModes: string[];
  safetyPolicies: string[];
  capabilityDetails: Record<string, unknown>;
}

interface AdapterQualitySummary {
  adapterCount: number;
  totalAttempts: number;
  observedSteps: number;
  realOutputAccepted: number;
  parseFailures: number;
  qualityFailures: number;
  buildFailures: number;
  averageSuccessRate: number | null;
  averageFallbackRate: number | null;
  highestRiskAdapter: AdapterQualityRow | null;
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

function formatCount(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function averageRate(rows: AdapterQualityRow[], selector: (row: AdapterQualityRow) => number | null): number | null {
  const values = rows
    .map(selector)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSummary(rows: AdapterQualityRow[]): AdapterQualitySummary {
  const highestRiskAdapter =
    [...rows].sort((left, right) => {
      const leftFailures = left.parseFailures + left.qualityFailures + left.buildFailures;
      const rightFailures = right.parseFailures + right.qualityFailures + right.buildFailures;
      if (rightFailures !== leftFailures) {
        return rightFailures - leftFailures;
      }
      return (right.totalFailureRate ?? 0) - (left.totalFailureRate ?? 0);
    })[0] ?? null;

  return {
    adapterCount: rows.length,
    totalAttempts: rows.reduce((sum, row) => sum + row.routeAttempts, 0),
    observedSteps: rows.reduce((sum, row) => sum + row.observedSteps, 0),
    realOutputAccepted: rows.reduce((sum, row) => sum + row.realOutputAccepted, 0),
    parseFailures: rows.reduce((sum, row) => sum + row.parseFailures, 0),
    qualityFailures: rows.reduce((sum, row) => sum + row.qualityFailures, 0),
    buildFailures: rows.reduce((sum, row) => sum + row.buildFailures, 0),
    averageSuccessRate: averageRate(rows, (row) => row.successRate),
    averageFallbackRate: averageRate(rows, (row) => row.fallbackRate),
    highestRiskAdapter
  };
}

function getHealthTone(value: number | null, invert = false): "good" | "warn" | "danger" | "neutral" {
  if (value === null || !Number.isFinite(value)) {
    return "neutral";
  }

  if (invert) {
    if (value >= 0.45) {
      return "danger";
    }
    if (value >= 0.2) {
      return "warn";
    }
    return "good";
  }

  if (value >= 0.75) {
    return "good";
  }
  if (value >= 0.45) {
    return "warn";
  }
  return "danger";
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
      lastQualityReason: null,
      supportedModes: descriptor.supportedModes ?? [],
      safetyPolicies: descriptor.safetyPolicies ?? [],
      capabilityDetails: descriptor.capabilityDetails ?? {}
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
        lastQualityReason: null,
        supportedModes: [],
        safetyPolicies: [],
        capabilityDetails: {}
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
        lastQualityReason: null,
        supportedModes: [],
        safetyPolicies: [],
        capabilityDetails: {}
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
  const summary = buildSummary(rows);

  if (rows.length === 0) {
    return (
      <section className="adapter-quality-dashboard">
        <div className="adapter-quality-dashboard__header">
          <strong>Adapter 质量看板</strong>
          <span>暂无 Adapter 观测数据</span>
        </div>
      </section>
    );
  }

  return (
    <section className="adapter-quality-dashboard" aria-label="Adapter quality dashboard">
      <div className="adapter-quality-dashboard__header">
        <div>
          <strong>Adapter 质量看板</strong>
          <p>展示后端聚合指标与路由历史；启用指标持久化后可跨重启保留。</p>
        </div>
        <span>{rows.length} 个 Adapter</span>
      </div>

      <div className="adapter-quality-kpis" aria-label="Adapter quality summary">
        <article className="adapter-quality-kpi adapter-quality-kpi--neutral">
          <span>观测范围</span>
          <strong>{summary.adapterCount}</strong>
          <small>{formatCount(summary.totalAttempts)} 次路由 / {formatCount(summary.observedSteps)} 个 Step</small>
        </article>
        <article className={`adapter-quality-kpi adapter-quality-kpi--${getHealthTone(summary.averageSuccessRate)}`}>
          <span>平均成功率</span>
          <strong>{formatRate(summary.averageSuccessRate)}</strong>
          <small>来自后端聚合指标与当前 TaskStep</small>
        </article>
        <article className={`adapter-quality-kpi adapter-quality-kpi--${getHealthTone(summary.averageFallbackRate, true)}`}>
          <span>平均 fallback</span>
          <strong>{formatRate(summary.averageFallbackRate)}</strong>
          <small>越低越稳定；fallback 不等于真实成功</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--good">
          <span>真实产物采纳</span>
          <strong>{summary.realOutputAccepted}</strong>
          <small>通过 contract / quality / build gate</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--danger">
          <span>失败分类</span>
          <strong>{summary.parseFailures + summary.qualityFailures + summary.buildFailures}</strong>
          <small>解析 {summary.parseFailures} / 质量 {summary.qualityFailures} / 构建 {summary.buildFailures}</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--warn">
          <span>最高风险 Adapter</span>
          <strong>{summary.highestRiskAdapter?.adapterType || "N/A"}</strong>
          <small>{summary.highestRiskAdapter?.lastQualityStatus || "暂无质量失败"}</small>
        </article>
      </div>

      <div className="adapter-quality-table">
        <div className="adapter-quality-table__row adapter-quality-table__row--head">
          <span>Adapter</span>
          <span>健康</span>
          <span>尝试</span>
          <span>成功</span>
          <span>Fallback</span>
          <span>真实采纳</span>
          <span>失败率</span>
          <span>失败明细</span>
          <span>模式</span>
          <span>策略</span>
          <span>最近原因</span>
        </div>
        {rows.map((row) => (
          <div className="adapter-quality-table__row" key={row.adapterType}>
            <strong>{row.adapterType}</strong>
            <span title={`Adapter 状态：${row.status}`}>{row.healthLabel || row.status}</span>
            <span title={`${row.routeAttempts} 次路由尝试 / ${row.observedSteps} 次质量观测`}>
              {row.routeAttempts} / {row.observedSteps}
            </span>
            <span>{formatRate(row.successRate)}</span>
            <span>{formatRate(row.fallbackRate)}</span>
            <span title={`${row.realOutputAccepted} 个真实 Adapter 输出被采纳`}>
              {row.realOutputAccepted} ({formatRate(row.realAcceptanceRate)})
            </span>
            <span>{formatRate(row.totalFailureRate)}</span>
            <span title="解析 / 质量 / 构建失败">
              {row.parseFailures} / {row.qualityFailures} / {row.buildFailures}
            </span>
            <span title={row.supportedModes.join(", ") || "暂无能力模式元数据"}>
              {row.supportedModes.slice(0, 2).join(", ") || "N/A"}
            </span>
            <span title={row.safetyPolicies.join(" | ") || "暂无安全策略元数据"}>
              {row.safetyPolicies.some((policy) => policy.includes("workspace-write-disabled")) ? "禁止写工作区" : "N/A"}
            </span>
            <span title={row.lastQualityReason || ""}>{row.lastQualityStatus || "N/A"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
