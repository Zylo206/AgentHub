import type { AdapterQualityMetrics } from "../../api/agenthubApi";
import type { TaskRun, TaskStep } from "../chat/chatTypes";
import type { AdapterDescriptor } from "./agentTypes";
import { displayStatus } from "../../utils/displayLabels";
import { displayAdapterName, sanitizeProductionText } from "../../utils/productionLabels";

interface AdapterQualityDashboardProps {
  adapterDescriptors: AdapterDescriptor[];
  taskRuns: TaskRun[];
  qualityMetrics: AdapterQualityMetrics[];
}

interface AdapterQualityRow {
  adapterType: string;
  status: string;
  routeAttempts: number;
  successRate: number | null;
  backupRate: number | null;
  acceptedOutputs: number;
  parseFailures: number;
  qualityFailures: number;
  buildFailures: number;
  lastOutcome?: string | null;
  lastQualityStatus?: string | null;
  lastQualityReason?: string | null;
}

function getStepAdapterType(step: TaskStep): string {
  return step.actualAdapterType || step.preferredAdapterType || step.adapterType || "UNKNOWN";
}

function formatRate(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "暂无";
  }

  return `${Math.round(value * 100)}%`;
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
      routeAttempts: descriptor.routeAttempts ?? 0,
      successRate: typeof descriptor.successRate === "number" ? descriptor.successRate : null,
      backupRate: typeof descriptor.fallbackRate === "number" ? descriptor.fallbackRate : null,
      acceptedOutputs: 0,
      parseFailures: 0,
      qualityFailures: 0,
      buildFailures: 0,
      lastOutcome: null,
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
        routeAttempts: 0,
        successRate: null,
        backupRate: null,
        acceptedOutputs: 0,
        parseFailures: 0,
        qualityFailures: 0,
        buildFailures: 0,
        lastOutcome: null,
        lastQualityStatus: null,
        lastQualityReason: null
      };

    row.routeAttempts = Math.max(row.routeAttempts, metrics.attempts);
    row.successRate = metrics.successRate;
    row.backupRate = metrics.fallbackRate;
    row.acceptedOutputs = metrics.realOutputAccepted;
    row.parseFailures = metrics.parseFailures;
    row.qualityFailures = metrics.qualityFailures;
    row.buildFailures = metrics.buildFailures;
    row.lastOutcome = metrics.lastOutcome ?? metrics.outcomeSummary ?? null;
    row.lastQualityStatus = metrics.lastQualityStatus ?? null;
    row.lastQualityReason = metrics.lastQualityReason ?? null;
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
        routeAttempts: 0,
        successRate: null,
        backupRate: null,
        acceptedOutputs: 0,
        parseFailures: 0,
        qualityFailures: 0,
        buildFailures: 0,
        lastOutcome: null,
        lastQualityStatus: null,
        lastQualityReason: null
      };

    row.routeAttempts += 1;
    row.parseFailures += isParseFailure(step.artifactParseStatus) ? 1 : 0;
    row.qualityFailures += isQualityFailure(step.artifactQualityStatus) ? 1 : 0;
    row.buildFailures += isBuildFailure(step.artifactBuildValidationStatus) ? 1 : 0;
    row.lastOutcome = step.realAdapterOutcome ?? row.lastOutcome;
    row.lastQualityStatus = step.artifactQualityStatus ?? row.lastQualityStatus;
    row.lastQualityReason = step.artifactQualityReason ?? row.lastQualityReason;
    byAdapter.set(adapterType, row);
  });

  return Array.from(byAdapter.values()).sort((left, right) => right.routeAttempts - left.routeAttempts);
}

export function AdapterQualityDashboard({
  adapterDescriptors,
  taskRuns,
  qualityMetrics
}: AdapterQualityDashboardProps) {
  const rows = buildRows(adapterDescriptors, taskRuns, qualityMetrics);
  const totalAttempts = rows.reduce((sum, row) => sum + row.routeAttempts, 0);
  const acceptedOutputs = rows.reduce((sum, row) => sum + row.acceptedOutputs, 0);
  const totalFailures = rows.reduce((sum, row) => sum + row.parseFailures + row.qualityFailures + row.buildFailures, 0);
  const averageSuccessRate = averageRate(rows, (row) => row.successRate);
  const averageBackupRate = averageRate(rows, (row) => row.backupRate);

  if (rows.length === 0) {
    return (
      <section className="adapter-quality-dashboard">
        <div className="adapter-quality-dashboard__header">
          <strong>Adapter 质量看板</strong>
          <span>暂无观测数据</span>
        </div>
      </section>
    );
  }

  return (
    <section className="adapter-quality-dashboard" aria-label="Adapter quality dashboard">
      <div className="adapter-quality-dashboard__header">
        <div>
          <strong>Adapter 质量看板</strong>
          <p>展示健康度、真实输出采纳、失败分类和备用路径比例。</p>
        </div>
        <span>{rows.length} 个 Adapter</span>
      </div>

      <div className="adapter-quality-kpis" aria-label="Adapter quality summary">
        <article className="adapter-quality-kpi adapter-quality-kpi--neutral">
          <span>观测范围</span>
          <strong>{totalAttempts}</strong>
          <small>累计路由尝试</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--good">
          <span>平均成功率</span>
          <strong>{formatRate(averageSuccessRate)}</strong>
          <small>来自后端聚合指标</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--warn">
          <span>备用路径比例</span>
          <strong>{formatRate(averageBackupRate)}</strong>
          <small>越低代表真实接入越稳定</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--good">
          <span>真实输出采纳</span>
          <strong>{acceptedOutputs}</strong>
          <small>通过合约、质量和构建门禁</small>
        </article>
        <article className="adapter-quality-kpi adapter-quality-kpi--danger">
          <span>失败分类</span>
          <strong>{totalFailures}</strong>
          <small>解析 / 质量 / 构建</small>
        </article>
      </div>

      <div className="adapter-quality-table">
        <div className="adapter-quality-table__row adapter-quality-table__row--head">
          <span>Adapter</span>
          <span>状态</span>
          <span>尝试</span>
          <span>成功</span>
          <span>备用</span>
          <span>真实输出</span>
          <span>失败分类</span>
          <span>最近结果</span>
        </div>
        {rows.map((row) => (
          <div className="adapter-quality-table__row" key={row.adapterType}>
            <strong>{displayAdapterName(row.adapterType)}</strong>
            <span>{displayStatus(row.status)}</span>
            <span>{row.routeAttempts}</span>
            <span>{formatRate(row.successRate)}</span>
            <span>{formatRate(row.backupRate)}</span>
            <span>{row.acceptedOutputs}</span>
            <span>
              {row.parseFailures} / {row.qualityFailures} / {row.buildFailures}
            </span>
            <span title={sanitizeProductionText(row.lastQualityReason || "")}>
              {sanitizeProductionText(row.lastOutcome || row.lastQualityStatus || "暂无")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
