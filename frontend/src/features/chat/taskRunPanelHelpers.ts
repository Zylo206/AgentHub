import type { Artifact } from "../artifacts/artifactTypes";
import type { TaskRun, TaskSpec, TaskStep } from "./chatTypes";
import { getIdValue } from "../../utils/id";

export interface StepQualityGateAction {
  title: string;
  reason: string;
  nextStep: string;
}

export interface AdapterDisplay {
  preferred: string | null;
  actual: string | null;
  status: string | null;
  fallbackUsed: boolean;
}

export interface ParsedAdapterCandidateScore {
  adapterType: string;
  totalScore: number;
  healthScore: number;
  successRateScore: number;
  fallbackPenaltyScore: number;
  preferredBonusScore: number;
  status: string;
}

export function summarizeAdapterResponse(responseSummary?: string): string | null {
  if (!responseSummary) {
    return null;
  }

  const normalized = responseSummary.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

export function formatQualityScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "N/A";
  }

  return score.toFixed(2);
}

export function formatBuildValidationValue(status?: string | null): string {
  return status || "NOT_EVALUATED";
}

export function getReviewRetryReviseLabel(step: TaskStep): string {
  if (step.artifactQualityStatus !== "REJECTED") {
    return "NOT_TRIGGERED";
  }

  const reason = `${step.artifactQualityReason || ""}`.toLowerCase();
  if (reason.includes("retry") || reason.includes("revise")) {
    return "TRIGGERED";
  }

  return "REJECTED";
}

export function isBlockingValidationStatus(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.toUpperCase();
  return normalized.includes("REJECT") || normalized.includes("FAIL") || normalized.includes("ERROR");
}

export function getStepQualityGateAction(step: TaskStep): StepQualityGateAction | null {
  const qualityRejected = isBlockingValidationStatus(step.artifactQualityStatus);
  const buildFailed = isBlockingValidationStatus(step.artifactBuildValidationStatus);
  const parseFailed = isBlockingValidationStatus(step.artifactParseStatus);

  if (!qualityRejected && !buildFailed && !parseFailed) {
    return null;
  }

  const failedGates = [
    qualityRejected ? "Reviewer / 质量评审未通过" : null,
    buildFailed ? `构建校验返回 ${step.artifactBuildValidationStatus}` : null,
    parseFailed ? `Artifact 解析返回 ${step.artifactParseStatus}` : null
  ].filter(Boolean);

  return {
    title: failedGates.join(" / "),
    reason:
      (buildFailed ? step.artifactBuildValidationReason : null) ||
      step.artifactQualityReason ||
      step.adapterErrorMessage ||
      "后端未返回更详细的失败原因。",
    nextStep: "打开关联产物，将失败原因写入 Revision 指令，生成修复版本后再次评审。"
  };
}

export function getAdapterDisplay(step: TaskStep): AdapterDisplay {
  const preferred = step.preferredAdapterType || step.adapterType || null;
  const actual = step.actualAdapterType || step.adapterType || null;
  const status = step.adapterStatus || null;
  const fallbackUsed = Boolean(preferred && actual && preferred !== actual);

  return {
    preferred,
    actual,
    status,
    fallbackUsed
  };
}

export function getRevisionOrigin(artifacts: Artifact[], taskRun: TaskRun) {
  const producedArtifactIds = new Set(
    taskRun.steps.flatMap((step) => step.producedArtifactIds.map((artifactId) => getIdValue(artifactId)))
  );
  const producedArtifacts = artifacts.filter((artifact) => producedArtifactIds.has(getIdValue(artifact.id)));
  const revisionArtifact =
    producedArtifacts.find((artifact) => artifact.parentArtifactId || artifact.revisionInstruction) ?? null;

  if (!revisionArtifact) {
    return null;
  }

  const parentArtifact =
    artifacts.find((artifact) => getIdValue(artifact.id) === revisionArtifact.parentArtifactId) ?? null;

  return {
    artifact: revisionArtifact,
    parentArtifact
  };
}

export function getTaskSpecForRun(taskSpecs: TaskSpec[], taskRun: TaskRun): TaskSpec | null {
  const taskSpecId = getIdValue(taskRun.taskSpecId);
  return taskSpecs.find((taskSpec) => getIdValue(taskSpec.id) === taskSpecId) ?? null;
}

export function getProducedArtifactsForRun(artifacts: Artifact[], taskRun: TaskRun): Artifact[] {
  const producedArtifactIds = new Set(
    taskRun.steps.flatMap((step) => step.producedArtifactIds.map((artifactId) => getIdValue(artifactId)))
  );

  return artifacts.filter((artifact) => producedArtifactIds.has(getIdValue(artifact.id)));
}

export function countFallbackSteps(taskRun: TaskRun): number {
  return taskRun.steps.filter((step) => {
    const adapterDisplay = getAdapterDisplay(step);
    return adapterDisplay.fallbackUsed || adapterDisplay.status === "FALLBACK_USED";
  }).length;
}

export function getParallelExecutionGroups(taskRun: TaskRun): Array<[string, TaskStep[]]> {
  const groups = new Map<string, TaskStep[]>();
  taskRun.steps.forEach((step) => {
    const groupKey = step.parallelGroupKey || `GROUP_${step.stepOrder}`;
    groups.set(groupKey, [...(groups.get(groupKey) || []), step]);
  });

  return Array.from(groups.entries()).filter(([, steps]) => steps.length > 1);
}

export function getStepAgentName(step: TaskStep, agentNameMap: Map<string | null, string>): string {
  const assignedAgentId = getIdValue(step.assignedAgentId);
  return agentNameMap.get(assignedAgentId) || step.assignedAgentName || assignedAgentId || "Agent";
}

export function parseAdapterCandidateScores(routingReason?: string | null): ParsedAdapterCandidateScore[] {
  if (!routingReason) {
    return [];
  }

  const match = routingReason.match(/candidates=\[(.*?)]/);
  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(";")
    .map((rawCandidate) => rawCandidate.trim())
    .map((rawCandidate) => {
      const candidateMatch = rawCandidate.match(/^([A-Z_]+)\((.*)\)$/);
      if (!candidateMatch) {
        return null;
      }
      const values = Object.fromEntries(
        candidateMatch[2].split(",").map((pair) => {
          const [key, value] = pair.split("=");
          return [key?.trim(), value?.trim()];
        })
      );

      return {
        adapterType: candidateMatch[1],
        totalScore: Number(values.total ?? 0),
        healthScore: Number(values.health ?? 0),
        successRateScore: Number(values.successRate ?? 0),
        fallbackPenaltyScore: Number(values.fallbackPenalty ?? 0),
        preferredBonusScore: Number(values.preferredBonus ?? 0),
        status: values.status ?? "-"
      };
    })
    .filter((candidate): candidate is ParsedAdapterCandidateScore => Boolean(candidate));
}

export function parseRoutingEvidence(routingReason?: string | null): Array<[string, string]> {
  if (!routingReason) {
    return [];
  }

  const keys = ["requiredSkill", "selectedAgent", "matchedCapability", "capabilityScore", "preferredAdapter", "selectedAdapter"];
  return keys
    .map((key) => {
      const match = routingReason.match(new RegExp(`${key}=([^;|,\\]]+)`));
      return match?.[1] ? [key, match[1].trim()] as [string, string] : null;
    })
    .filter((item): item is [string, string] => Boolean(item));
}

export function displayRoutingKey(key: string): string {
  const labels: Record<string, string> = {
    requiredSkill: "所需能力",
    selectedAgent: "命中 Agent",
    matchedCapability: "命中能力",
    capabilityScore: "能力分",
    preferredAdapter: "首选 Adapter",
    selectedAdapter: "选中 Adapter"
  };

  return labels[key] || key;
}

function extractSummaryField(summary: string, label: string): string | null {
  const start = summary.indexOf(label);
  if (start < 0) {
    return null;
  }

  const valueStart = start + label.length;
  const rest = summary.slice(valueStart);
  const end = rest.search(/(?:Planner fallback 原因：|从|Selected Agent|Adapter fallback|Adapter 未发生|$)/);
  const value = (end >= 0 ? rest.slice(0, end) : rest).trim();
  return value || null;
}

export function getPlannerDisplay(taskRun: TaskRun, hasParallelExecution: boolean) {
  const summary = taskRun.resultSummary || "";
  const isLlmPlanner = summary.includes("LLM_PLANNER");
  const isRuleFallback = summary.includes("RULE_BASED_FALLBACK");
  const plannerReasoning = extractSummaryField(summary, "Planner 说明：");
  const fallbackReason = extractSummaryField(summary, "Planner fallback 原因：");

  return {
    label: isLlmPlanner
      ? hasParallelExecution
        ? "LLM Planner / 并发执行组"
        : "LLM Planner"
      : isRuleFallback
        ? hasParallelExecution
          ? "规则 fallback / 并发执行组"
          : "规则 fallback"
        : hasParallelExecution
          ? "规则 Planner / 并发执行组"
          : "规则 Planner",
    description: isLlmPlanner
      ? "OPENAI_COMPATIBLE 生成 OrchestratorPlan，并通过后端 JSON schema 校验。"
      : isRuleFallback
        ? "LLM Planner 不可用或输出未通过校验，已安全回退到规则化 Planner。"
        : "Planner / Router / Executor / Aggregator 的规则化执行说明。",
    plannerReasoning,
    fallbackReason
  };
}
