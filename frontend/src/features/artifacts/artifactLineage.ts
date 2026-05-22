import { getIdValue } from "../../utils/id";
import type { Artifact } from "./artifactTypes";

export interface VersionHistoryEntry {
  artifact: Artifact;
  artifactId: string;
  parentArtifact: Artifact | null;
  basedOnVersionLabel: string | null;
  isRevision: boolean;
}

export interface DiffSummary {
  instruction: string | null;
  basedOnLabel: string | null;
  summary: string;
  changedItems: string[];
  notChanged: string[];
  risk: string;
  isInitialVersion: boolean;
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

  if (!instruction) {
    return {
      instruction: null,
      basedOnLabel,
      summary: "这是初始版本，暂无 revision 摘要。",
      changedItems: [],
      notChanged: [],
      risk: "这是静态 Demo 产物，尚未执行真实 diff 分析。",
      isInitialVersion: true
    };
  }

  const normalizedInstruction = instruction.toLowerCase();
  const mentionsBlue = instruction.includes("蓝") || normalizedInstruction.includes("blue");
  const mentionsLoading =
    normalizedInstruction.includes("loading") || instruction.includes("加载") || instruction.includes("等待");

  const changedItems = [
    mentionsBlue ? "按钮样式已调整为蓝色。" : "主操作样式已更新。",
    mentionsLoading ? "增加 loading 状态，避免重复提交。" : "主操作交互状态已更新。",
    mentionsLoading ? "加载过程中按钮文案会变化。" : "产物文案已根据修改指令调整。"
  ];

  return {
    instruction,
    basedOnLabel,
    summary: "这是一次基于上一版产物和用户追问指令的静态 Artifact-centered iteration。",
    changedItems,
    notChanged: ["邮箱输入框保持不变。", "验证码输入框保持不变。", "组件结构保持轻量，便于预览。"],
    risk: "这是静态 Demo revision，不是由真实代码分析生成。",
    isInitialVersion: false
  };
}
