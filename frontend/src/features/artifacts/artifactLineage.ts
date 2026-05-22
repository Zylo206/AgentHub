import { getIdValue } from "../../utils/id";
import type { Artifact } from "./artifactTypes";

export interface VersionHistoryEntry {
  artifact: Artifact;
  artifactId: string;
  parentArtifact: Artifact | null;
  basedOnVersionLabel: string | null;
  isRevision: boolean;
}

export interface LineDiffStats {
  added: number;
  removed: number;
  unchanged: number;
  changed: number;
  total: number;
}

export interface LineDiffEntry {
  operation: "added" | "removed" | "context";
  oldLineNumber: number | null;
  newLineNumber: number | null;
  content: string;
}

export interface DiffSummary {
  instruction: string | null;
  basedOnLabel: string | null;
  summary: string;
  changedItems: string[];
  notChanged: string[];
  risk: string;
  isInitialVersion: boolean;
  hasRealLineDiff: boolean;
  lineDiffStats: LineDiffStats;
  lineDiffEntries: LineDiffEntry[];
}

function toTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function resolveParentArtifact(artifacts: Artifact[], artifact: Artifact): Artifact | null {
  if (!artifact.parentArtifactId) {
    return null;
  }

  return artifacts.find((candidate) => getIdValue(candidate.id) === artifact.parentArtifactId) ?? null;
}

function resolveRootArtifactId(artifacts: Artifact[], artifact: Artifact): string {
  let current = artifact;
  let guard = 0;

  while (current.parentArtifactId && guard < 20) {
    const parent = resolveParentArtifact(artifacts, current);

    if (!parent) {
      return current.parentArtifactId;
    }

    current = parent;
    guard += 1;
  }

  return getIdValue(current.id);
}

export function isRevisionArtifact(artifact: Artifact): boolean {
  return Boolean(artifact.parentArtifactId || artifact.revisionInstruction);
}

export function getVersionHistoryEntries(
  artifacts: Artifact[],
  selectedArtifact: Artifact | null
): VersionHistoryEntry[] {
  if (!selectedArtifact) {
    return [];
  }

  const selectedRootId = resolveRootArtifactId(artifacts, selectedArtifact);

  return artifacts
    .filter((artifact) => artifact.title === selectedArtifact.title)
    .filter((artifact) => {
      if (!isRevisionArtifact(artifact) && !isRevisionArtifact(selectedArtifact)) {
        return true;
      }

      const artifactRootId = resolveRootArtifactId(artifacts, artifact);
      return artifactRootId === selectedRootId || getIdValue(artifact.id) === selectedRootId;
    })
    .sort((left, right) => {
      if (left.version !== right.version) {
        return left.version - right.version;
      }

      return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
    })
    .map((artifact) => {
      const parentArtifact = resolveParentArtifact(artifacts, artifact);

      return {
        artifact,
        artifactId: getIdValue(artifact.id),
        parentArtifact,
        basedOnVersionLabel: parentArtifact ? `v${parentArtifact.version}` : null,
        isRevision: isRevisionArtifact(artifact)
      };
    });
}

export function findArtifactVersionGroup(currentArtifact: Artifact, artifacts: Artifact[]): Artifact[] {
  const currentArtifactId = getIdValue(currentArtifact.id);
  const currentRootId = resolveRootArtifactId(artifacts, currentArtifact);
  const relatedByLineage = artifacts.filter((artifact) => {
    const artifactId = getIdValue(artifact.id);
    const artifactRootId = resolveRootArtifactId(artifacts, artifact);

    return (
      artifactId === currentArtifactId ||
      artifactId === currentRootId ||
      artifactRootId === currentRootId ||
      artifactRootId === currentArtifactId
    );
  });

  const versionGroup = relatedByLineage.length > 1
    ? relatedByLineage
    : artifacts.filter((artifact) => artifact.title === currentArtifact.title);

  return versionGroup.sort((left, right) => {
    if (left.version !== right.version) {
      return left.version - right.version;
    }

    return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
  });
}

export function buildArtifactVersions(
  currentArtifact: Artifact,
  artifacts: Artifact[]
): VersionHistoryEntry[] {
  return findArtifactVersionGroup(currentArtifact, artifacts).map((artifact) => {
    const parentArtifact = resolveParentArtifact(artifacts, artifact);

    return {
      artifact,
      artifactId: getIdValue(artifact.id),
      parentArtifact,
      basedOnVersionLabel: parentArtifact ? `v${parentArtifact.version}` : null,
      isRevision: isRevisionArtifact(artifact)
    };
  });
}

export function buildDiffSummary(artifacts: Artifact[], artifact: Artifact): DiffSummary {
  const parentArtifact = resolveParentArtifact(artifacts, artifact);
  const instruction = artifact.revisionInstruction?.trim() || null;
  const basedOnLabel = parentArtifact ? `${parentArtifact.title} v${parentArtifact.version}` : null;
  const emptyLineDiffStats: LineDiffStats = {
    added: 0,
    removed: 0,
    unchanged: 0,
    changed: 0,
    total: 0
  };

  if (!instruction || !parentArtifact) {
    return {
      instruction,
      basedOnLabel,
      summary: instruction
        ? "该 revision 缺少可对比的父级 Artifact，暂时只能展示 revision 元数据。"
        : "这是初始版本，暂无可对比的父级 Artifact。",
      changedItems: [],
      notChanged: [],
      risk: "未找到父级 Artifact 时无法执行真实行级 diff。",
      isInitialVersion: !instruction,
      hasRealLineDiff: false,
      lineDiffStats: emptyLineDiffStats,
      lineDiffEntries: []
    };
  }

  const lineDiffEntries = buildLineDiffEntries(parentArtifact.content || "", artifact.content || "");
  const lineDiffStats = summarizeLineDiff(lineDiffEntries);
  const hasRealLineDiff = lineDiffStats.added > 0 || lineDiffStats.removed > 0;
  const changedItems = hasRealLineDiff
    ? [
        `新增 ${lineDiffStats.added} 行。`,
        `删除 ${lineDiffStats.removed} 行。`,
        `估算修改块 ${lineDiffStats.changed} 处。`
      ]
    : ["未检测到内容行变化。"];
  const notChanged = lineDiffStats.unchanged > 0
    ? [`保留 ${lineDiffStats.unchanged} 行未变化。`]
    : [];

  return {
    instruction,
    basedOnLabel,
    summary: hasRealLineDiff
      ? `已基于 ${basedOnLabel} 和当前 v${artifact.version} 内容执行轻量行级 diff。`
      : `已对比 ${basedOnLabel} 和当前 v${artifact.version}，未发现内容行变化。`,
    changedItems,
    notChanged,
    risk: "当前是前端轻量行级 diff，不做语义级代码理解、AST diff 或冲突合并。",
    isInitialVersion: false,
    hasRealLineDiff,
    lineDiffStats,
    lineDiffEntries
  };
}

function splitLines(content: string): string[] {
  if (!content) {
    return [];
  }

  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function buildLineDiffEntries(previousContent: string, nextContent: string): LineDiffEntry[] {
  const previousLines = splitLines(previousContent);
  const nextLines = splitLines(nextContent);
  const table = Array.from({ length: previousLines.length + 1 }, () =>
    Array.from({ length: nextLines.length + 1 }, () => 0)
  );

  for (let previousIndex = previousLines.length - 1; previousIndex >= 0; previousIndex -= 1) {
    for (let nextIndex = nextLines.length - 1; nextIndex >= 0; nextIndex -= 1) {
      table[previousIndex][nextIndex] = previousLines[previousIndex] === nextLines[nextIndex]
        ? table[previousIndex + 1][nextIndex + 1] + 1
        : Math.max(table[previousIndex + 1][nextIndex], table[previousIndex][nextIndex + 1]);
    }
  }

  const entries: LineDiffEntry[] = [];
  let previousIndex = 0;
  let nextIndex = 0;

  while (previousIndex < previousLines.length && nextIndex < nextLines.length) {
    if (previousLines[previousIndex] === nextLines[nextIndex]) {
      entries.push({
        operation: "context",
        oldLineNumber: previousIndex + 1,
        newLineNumber: nextIndex + 1,
        content: previousLines[previousIndex]
      });
      previousIndex += 1;
      nextIndex += 1;
    } else if (table[previousIndex + 1][nextIndex] >= table[previousIndex][nextIndex + 1]) {
      entries.push({
        operation: "removed",
        oldLineNumber: previousIndex + 1,
        newLineNumber: null,
        content: previousLines[previousIndex]
      });
      previousIndex += 1;
    } else {
      entries.push({
        operation: "added",
        oldLineNumber: null,
        newLineNumber: nextIndex + 1,
        content: nextLines[nextIndex]
      });
      nextIndex += 1;
    }
  }

  while (previousIndex < previousLines.length) {
    entries.push({
      operation: "removed",
      oldLineNumber: previousIndex + 1,
      newLineNumber: null,
      content: previousLines[previousIndex]
    });
    previousIndex += 1;
  }

  while (nextIndex < nextLines.length) {
    entries.push({
      operation: "added",
      oldLineNumber: null,
      newLineNumber: nextIndex + 1,
      content: nextLines[nextIndex]
    });
    nextIndex += 1;
  }

  return entries;
}

function summarizeLineDiff(entries: LineDiffEntry[]): LineDiffStats {
  const added = entries.filter((entry) => entry.operation === "added").length;
  const removed = entries.filter((entry) => entry.operation === "removed").length;
  const unchanged = entries.filter((entry) => entry.operation === "context").length;

  return {
    added,
    removed,
    unchanged,
    changed: Math.min(added, removed),
    total: entries.length
  };
}
