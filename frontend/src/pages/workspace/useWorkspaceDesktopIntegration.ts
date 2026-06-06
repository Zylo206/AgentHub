import type { Dispatch, SetStateAction } from "react";
import {
  getMemoriesByConversation,
  getPinnedContextsByConversation,
  pinAttachmentAsContext,
  saveAttachmentAsMemory
} from "../../api/agenthubApi";
import type { ApprovalRequest } from "../../features/approval/approvalTypes";
import type { LightweightAttachment } from "../../features/chat/chatTypes";
import type { PinnedContext } from "../../features/context/contextTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import { getIdValue } from "../../utils/id";

type DiagnosticPanelKey = "taskrun" | "context" | "adapter" | "audit" | "local";

interface UseWorkspaceDesktopIntegrationParams {
  currentConversationId: string | null;
  approvalRequests: ApprovalRequest[];
  deployments: DeploymentRecord[];
  uploadAttachments: (files: File[]) => Promise<LightweightAttachment[]>;
  setDraftAttachments: Dispatch<SetStateAction<LightweightAttachment[]>>;
  setPinnedContexts: Dispatch<SetStateAction<PinnedContext[]>>;
  setMemories: Dispatch<SetStateAction<MemoryItem[]>>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setActiveDiagnosticPanel: Dispatch<SetStateAction<DiagnosticPanelKey | null>>;
  setSelectedArtifactId: Dispatch<SetStateAction<string | null>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
}

export function useWorkspaceDesktopIntegration({
  currentConversationId,
  approvalRequests,
  deployments,
  uploadAttachments,
  setDraftAttachments,
  setPinnedContexts,
  setMemories,
  setSelectedTaskRunId,
  setActiveDiagnosticPanel,
  setSelectedArtifactId,
  setShowAllArtifacts,
  setOperationMessage
}: UseWorkspaceDesktopIntegrationParams) {
  async function handleUseDesktopLocalFileAsAttachment(file: File, sourcePath: string): Promise<LightweightAttachment> {
    const [uploadedAttachment] = await uploadAttachments([file]);
    setDraftAttachments((current) => [
      ...current.filter((item) => (item.attachmentId ?? item.id) !== (uploadedAttachment.attachmentId ?? uploadedAttachment.id)),
      {
        ...uploadedAttachment,
        source: "DESKTOP_LOCAL_FILE",
        contentPreview: uploadedAttachment.contentPreview || `来自本地文件：${sourcePath}`,
        previewText: uploadedAttachment.previewText || `来自本地文件：${sourcePath}`
      }
    ]);
    setOperationMessage("本地文件已上传为当前消息附件。发送消息后可进入 Attachment / Context Retrieval。");
    return uploadedAttachment;
  }

  async function handlePinDesktopAttachmentAsContext(attachmentId: string): Promise<void> {
    if (!currentConversationId) {
      return;
    }
    await pinAttachmentAsContext(currentConversationId, attachmentId);
    const refreshedPinnedContexts = await getPinnedContextsByConversation(currentConversationId);
    setPinnedContexts(refreshedPinnedContexts);
    setOperationMessage("本地附件已直接固定到 Context。");
  }

  async function handleSaveDesktopAttachmentAsMemory(attachmentId: string): Promise<void> {
    if (!currentConversationId) {
      return;
    }
    await saveAttachmentAsMemory(currentConversationId, attachmentId);
    const refreshedMemories = await getMemoriesByConversation(currentConversationId);
    setMemories(refreshedMemories);
    setOperationMessage("本地附件已直接保存为 Memory。");
  }

  function handleNavigateToDesktopNotificationTarget(targetType?: string, targetId?: string) {
    if (!targetType || !targetId) {
      setOperationMessage("该桌面通知没有可定位的 AgentHub 资源。");
      return;
    }
    if (targetType === "TASK_RUN") {
      setSelectedTaskRunId(targetId);
      setActiveDiagnosticPanel("taskrun");
      setOperationMessage(`已定位到 TaskRun：${targetId}`);
      return;
    }
    if (targetType === "APPROVAL") {
      const approval = approvalRequests.find((item) => item.approvalId === targetId);
      setActiveDiagnosticPanel("audit");
      setOperationMessage(
        approval
          ? `已定位到 Approval：${approval.summary}`
          : `已打开审计面板，等待刷新 Approval：${targetId}`
      );
      return;
    }
    if (targetType === "DEPLOYMENT") {
      const deployment = deployments.find((item) => item.deploymentId === targetId);
      if (deployment) {
        setSelectedArtifactId(getIdValue(deployment.artifactId));
        setShowAllArtifacts(true);
      }
      setOperationMessage(
        deployment
          ? `已定位到部署预览：${deployment.artifactTitle}`
          : `已收到部署通知，等待刷新 Deployment：${targetId}`
      );
      return;
    }
    setOperationMessage(`桌面通知目标：${targetType} / ${targetId}`);
  }

  return {
    handleUseDesktopLocalFileAsAttachment,
    handlePinDesktopAttachmentAsContext,
    handleSaveDesktopAttachmentAsMemory,
    handleNavigateToDesktopNotificationTarget
  };
}
