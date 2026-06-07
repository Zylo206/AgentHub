import { useState, type Dispatch, type SetStateAction } from "react";
import {
  applyArtifactDiff,
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  createDemoArtifactRevision,
  createDemoDeployment,
  getActionAuditsByConversation,
  getApprovalRequestsByConversation,
  getArtifactBundleDownloadUrl,
  getArtifactSnapshotsByConversation,
  getDeploymentsByConversation,
  getMessages,
  restoreArtifactSnapshotWithApproval,
  ApiError
} from "../../api/agenthubApi";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../../features/artifacts/artifactSnapshotTypes";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import type { ActionAuditLog } from "../../features/audit/auditTypes";
import type { DeployIntentDraft, Message } from "../../features/chat/chatTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import { getIdValue } from "../../utils/id";

interface CreateApprovalRequestInput {
  actionType: string;
  targetType: string;
  targetId: string;
  riskLevel: string;
  summary: string;
  affectedItems: string[];
}

interface UseWorkspaceArtifactOperationsParams {
  currentConversationId: string | null;
  artifacts: Artifact[];
  selectedArtifactId: string | null;
  loadConversationData: (conversationId: string) => Promise<void>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setDeployments: Dispatch<SetStateAction<DeploymentRecord[]>>;
  setArtifactSnapshots: Dispatch<SetStateAction<ArtifactSnapshot[]>>;
  setActionAudits: Dispatch<SetStateAction<ActionAuditLog[]>>;
  setApprovalRequests: Dispatch<SetStateAction<ApprovalRequest[]>>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setSelectedTaskStepId: Dispatch<SetStateAction<string | null>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
  setSelectedArtifactId: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function selectDefaultDeployArtifactId(artifacts: Artifact[], selectedArtifactId: string | null): string | null {
  const selectedArtifact = selectedArtifactId
    ? artifacts.find((artifact) => getIdValue(artifact.id) === selectedArtifactId)
    : null;
  if (selectedArtifact && selectedArtifact.status !== "REJECTED") {
    return getIdValue(selectedArtifact.id);
  }

  const deployableArtifacts = artifacts
    .filter((artifact) => artifact.status !== "REJECTED")
    .reverse();
  const preferredArtifact = deployableArtifacts.find((artifact) =>
    ["CODE", "WEB_PREVIEW", "MARKDOWN"].includes((artifact.type || "").toUpperCase())
  );
  return preferredArtifact
    ? getIdValue(preferredArtifact.id)
    : deployableArtifacts[0]
      ? getIdValue(deployableArtifacts[0].id)
      : null;
}

export function useWorkspaceArtifactOperations({
  currentConversationId,
  artifacts,
  selectedArtifactId,
  loadConversationData,
  setMessages,
  setDeployments,
  setArtifactSnapshots,
  setActionAudits,
  setApprovalRequests,
  setSelectedTaskRunId,
  setSelectedTaskStepId,
  setShowAllArtifacts,
  setSelectedArtifactId,
  setErrorMessage,
  setOperationMessage
}: UseWorkspaceArtifactOperationsParams) {
  const [deployIntentsByMessageId, setDeployIntentsByMessageId] = useState<Record<string, DeployIntentDraft | null>>({});
  const [deployingMessageId, setDeployingMessageId] = useState<string | null>(null);
  const [revisingArtifact, setRevisingArtifact] = useState(false);
  const [deployingArtifact, setDeployingArtifact] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState(false);

  async function handleCreateArtifactRevision(artifactId: string, revisionInstruction: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再修改产物。");
      return;
    }

    setRevisingArtifact(true);
    setErrorMessage(null);

    try {
      const revisionResult = await createDemoArtifactRevision(artifactId, currentConversationId, revisionInstruction);
      const createdTaskRunId = getIdValue(revisionResult.taskRun.id);
      const revisedArtifactId = getIdValue(revisionResult.revisedArtifact.id);

      await loadConversationData(currentConversationId);
      setSelectedTaskRunId(createdTaskRunId);
      setSelectedTaskStepId(null);
      setShowAllArtifacts(true);
      setSelectedArtifactId(revisedArtifactId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRevisingArtifact(false);
    }
  }

  async function handleApplyArtifactDiff(
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId, false, approvalId, baseVersion, baseContentHash);
      if (applyResult.conflict) {
        const lineStats = `Diff 仍包含新增 ${applyResult.addedLines} 行、删除 ${applyResult.removedLines} 行。`;
        setOperationMessage(`${applyResult.conflictReason || "检测到 Diff 应用冲突，请查看最新已应用产物。"} ${lineStats}`);
        return null;
      }
      if (!applyResult.appliedArtifact) {
        setOperationMessage("Diff 应用未生成新产物。");
        return null;
      }
      const appliedArtifactId = getIdValue(applyResult.appliedArtifact.id);

      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(appliedArtifactId);
      setOperationMessage(
        `Diff 已应用为 ${applyResult.appliedArtifact.title} v${applyResult.appliedArtifact.version}，新增 ${applyResult.addedLines} 行，删除 ${applyResult.removedLines} 行。`
      );
      return applyResult.appliedArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        throw error;
      }
      return null;
    }
  }

  async function handleForceApplyArtifactDiff(
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再强制应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId, true, approvalId, baseVersion, baseContentHash);
      if (!applyResult.appliedArtifact) {
        setOperationMessage("强制应用 Diff 未生成新产物。");
        return null;
      }

      const appliedArtifactId = getIdValue(applyResult.appliedArtifact.id);
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(appliedArtifactId);
      const bypassMessage = applyResult.conflictBypassed
        ? ` 已绕过冲突保护：${applyResult.conflictReason || "force apply bypassed the latest accepted artifact guard."}`
        : "";
      setOperationMessage(
        `已强制应用 Diff 为 ${applyResult.appliedArtifact.title} v${applyResult.appliedArtifact.version}，新增 ${applyResult.addedLines} 行，删除 ${applyResult.removedLines} 行。${bypassMessage}`
      );
      return applyResult.appliedArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        throw error;
      }
      return null;
    }
  }

  async function handleCreateDeployment(
    artifactId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再部署产物。");
      return;
    }

    setDeployingArtifact(true);
    setErrorMessage(null);

    try {
      const deployment = await createDemoDeployment(artifactId, approvalId, baseVersion, baseContentHash);
      const [refreshedMessages, refreshedDeployments, refreshedSnapshots, refreshedAudits] = await Promise.all([
        getMessages(currentConversationId),
        getDeploymentsByConversation(currentConversationId),
        getArtifactSnapshotsByConversation(currentConversationId),
        getActionAuditsByConversation(currentConversationId)
      ]);
      setMessages(refreshedMessages);
      setDeployments(refreshedDeployments);
      setArtifactSnapshots(refreshedSnapshots);
      setActionAudits(refreshedAudits);
      setSelectedArtifactId(getIdValue(deployment.artifactId) || artifactId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        throw error;
      }
    } finally {
      setDeployingArtifact(false);
    }
  }

  async function handleStartDeployIntent(message: Message, artifactId?: string | null) {
    if (!currentConversationId) {
      setErrorMessage("Please select a conversation before creating a deploy preview.");
      return;
    }

    const messageId = getIdValue(message.id);
    const resolvedArtifactId = artifactId || selectDefaultDeployArtifactId(artifacts, selectedArtifactId);
    const artifact = artifacts.find((item) => getIdValue(item.id) === resolvedArtifactId) ?? null;
    if (!resolvedArtifactId || !artifact) {
      setDeployIntentsByMessageId((current) => ({
        ...current,
        [messageId]: {
          messageId,
          status: "FAILED",
          artifactId: null,
          errorMessage: "没有找到可部署的 Artifact。请先完成一次 Agent 协作并生成产物。"
        }
      }));
      return;
    }

    setDeployingMessageId(messageId);
    setErrorMessage(null);
    try {
      const approval = await createApprovalRequest(currentConversationId, {
        actionType: "DEMO_DEPLOY",
        targetType: "ARTIFACT",
        targetId: resolvedArtifactId,
        riskLevel: "MEDIUM",
        summary: `确认将 ${artifact.title} v${artifact.version} 生成本地静态 Preview URL。`,
        affectedItems: [
          `Artifact: ${artifact.title} v${artifact.version}`,
          `Type: ${artifact.type} / Status: ${artifact.status}`,
          `Source: ${artifact.sourceKind || "UNKNOWN"} / Quality: ${artifact.realAdapterOutcome || artifact.qualityStatus || artifact.status}`,
          "Target: STATIC_PREVIEW",
          "Boundary: local static preview only; no Vercel / Netlify / Docker deployment."
        ]
      });
      const [refreshedApprovals, refreshedAudits] = await Promise.all([
        getApprovalRequestsByConversation(currentConversationId),
        getActionAuditsByConversation(currentConversationId)
      ]);
      setApprovalRequests(refreshedApprovals);
      setActionAudits(refreshedAudits);
      setDeployIntentsByMessageId((current) => ({
        ...current,
        [messageId]: {
          messageId,
          status: "APPROVAL_REQUIRED",
          artifactId: resolvedArtifactId,
          approvalId: approval.approvalId
        }
      }));
      setOperationMessage("Deploy approval created. Confirm it in the message card to generate the Preview URL.");
    } catch (error) {
      const messageText = getErrorMessage(error);
      setDeployIntentsByMessageId((current) => ({
        ...current,
        [messageId]: {
          messageId,
          status: "FAILED",
          artifactId: resolvedArtifactId,
          errorMessage: messageText
        }
      }));
      setErrorMessage(messageText);
    } finally {
      setDeployingMessageId(null);
    }
  }

  function handleQueueDeployIntent(message: Message, artifactId?: string | null) {
    const messageId = getIdValue(message.id);
    setDeployIntentsByMessageId((current) => ({
      ...current,
      [messageId]: {
        messageId,
        status: "PENDING",
        artifactId: artifactId || selectDefaultDeployArtifactId(artifacts, selectedArtifactId)
      }
    }));
  }

  async function handleApproveDeployIntent(messageId: string) {
    if (!currentConversationId) {
      return;
    }

    const deployIntent = deployIntentsByMessageId[messageId];
    if (!deployIntent?.artifactId || !deployIntent.approvalId) {
      return;
    }

    setDeployingMessageId(messageId);
    setDeployIntentsByMessageId((current) => ({
      ...current,
      [messageId]: { ...deployIntent, status: "DEPLOYING" }
    }));

    try {
      await handleApproveApprovalRequest(deployIntent.approvalId);
      const deployArtifact = artifacts.find((artifact) => getIdValue(artifact.id) === deployIntent.artifactId) ?? null;
      const deployment = await createDemoDeployment(
        deployIntent.artifactId,
        deployIntent.approvalId,
        deployArtifact?.version ?? null,
        null
      );
      const [refreshedMessages, refreshedDeployments, refreshedSnapshots, refreshedAudits] = await Promise.all([
        getMessages(currentConversationId),
        getDeploymentsByConversation(currentConversationId),
        getArtifactSnapshotsByConversation(currentConversationId),
        getActionAuditsByConversation(currentConversationId)
      ]);
      setMessages(refreshedMessages);
      setDeployments(refreshedDeployments);
      setArtifactSnapshots(refreshedSnapshots);
      setActionAudits(refreshedAudits);
      setSelectedArtifactId(getIdValue(deployment.artifactId) || deployIntent.artifactId);
      setDeployIntentsByMessageId((current) => ({
        ...current,
        [messageId]: { ...deployIntent, status: "COMPLETED" }
      }));
      setOperationMessage("已生成本地静态 Preview URL，并写入 Deploy Status 消息。");
    } catch (error) {
      const messageText = getErrorMessage(error);
      setDeployIntentsByMessageId((current) => ({
        ...current,
        [messageId]: { ...deployIntent, status: "FAILED", errorMessage: messageText }
      }));
      setErrorMessage(messageText);
    } finally {
      setDeployingMessageId(null);
    }
  }

  async function handleCancelDeployIntent(messageId: string) {
    const deployIntent = deployIntentsByMessageId[messageId];
    if (deployIntent?.approvalId) {
      await handleCancelApprovalRequest(deployIntent.approvalId);
    }
    setDeployIntentsByMessageId((current) => ({
      ...current,
      [messageId]: deployIntent
        ? { ...deployIntent, status: "CANCELLED" }
        : { messageId, status: "CANCELLED" }
    }));
  }

  function handleDownloadArtifactBundle(artifactIds: string[] = []) {
    if (!currentConversationId) {
      setErrorMessage("Please select a conversation before downloading an artifact bundle.");
      return;
    }

    const url = getArtifactBundleDownloadUrl(currentConversationId, artifactIds, true);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleRestoreArtifactSnapshot(
    snapshotId: string,
    approvalId: string,
    baseVersion?: number | null,
    baseContentHash?: string | null
  ): Promise<Artifact | null> {
    if (!currentConversationId) {
      setErrorMessage("Please select a conversation before restoring a snapshot.");
      return null;
    }

    setRestoringSnapshot(true);
    setErrorMessage(null);

    try {
      const restoredArtifact = await restoreArtifactSnapshotWithApproval(
        snapshotId,
        approvalId,
        baseVersion,
        baseContentHash
      );
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(getIdValue(restoredArtifact.id));
      setOperationMessage(`Restored snapshot as ${restoredArtifact.title} v${restoredArtifact.version}.`);
      return restoredArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      if (error instanceof ApiError && error.status === 409) {
        throw error;
      }
      return null;
    } finally {
      setRestoringSnapshot(false);
    }
  }

  async function handleCreateApprovalRequest(request: CreateApprovalRequestInput): Promise<string | null> {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再创建审批请求。");
      return null;
    }

    try {
      const approvalRequest = await createApprovalRequest(currentConversationId, request);
      const refreshedAudits = await getActionAuditsByConversation(currentConversationId);
      setActionAudits(refreshedAudits);
      return approvalRequest.approvalId;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }

  async function handleApproveApprovalRequest(approvalId: string) {
    if (!currentConversationId) {
      return;
    }

    await approveApprovalRequest(approvalId);
    const [refreshedAudits, refreshedApprovals] = await Promise.all([
      getActionAuditsByConversation(currentConversationId),
      getApprovalRequestsByConversation(currentConversationId)
    ]);
    setActionAudits(refreshedAudits);
    setApprovalRequests(refreshedApprovals);
  }

  async function handleCancelApprovalRequest(approvalId: string) {
    if (!currentConversationId) {
      return;
    }

    await cancelApprovalRequest(approvalId);
    const [refreshedAudits, refreshedApprovals] = await Promise.all([
      getActionAuditsByConversation(currentConversationId),
      getApprovalRequestsByConversation(currentConversationId)
    ]);
    setActionAudits(refreshedAudits);
    setApprovalRequests(refreshedApprovals);
  }

  return {
    deployIntentsByMessageId,
    deployingMessageId,
    revisingArtifact,
    deployingArtifact,
    restoringSnapshot,
    handleCreateArtifactRevision,
    handleApplyArtifactDiff,
    handleForceApplyArtifactDiff,
    handleCreateDeployment,
    handleQueueDeployIntent,
    handleStartDeployIntent,
    handleApproveDeployIntent,
    handleCancelDeployIntent,
    handleDownloadArtifactBundle,
    handleRestoreArtifactSnapshot,
    handleCreateApprovalRequest,
    handleApproveApprovalRequest,
    handleCancelApprovalRequest
  };
}
