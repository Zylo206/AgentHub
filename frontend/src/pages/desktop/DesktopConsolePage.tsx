import { Link, useSearchParams } from "react-router-dom";
import {
  pinAttachmentAsContext,
  saveAttachmentAsMemory,
  uploadConversationAttachment
} from "../../api/agenthubApi";
import { DesktopCapabilityPanel } from "../../features/desktop/DesktopCapabilityPanel";
import type { LightweightAttachment } from "../../features/chat/chatTypes";
import "../../styles/workspace.css";
import "../../styles/workspace/tokens.css";
import "../../styles/workspace/components.css";
import "../../styles/workspace/diagnostics.css";
import "../../styles/production-alignment.css";
import "../../styles/desktop.css";

function toLightweightAttachment(record: {
  attachmentId: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes: number;
  contentPreview?: string | null;
}): LightweightAttachment {
  return {
    attachmentId: record.attachmentId,
    id: record.attachmentId,
    fileName: record.fileName,
    contentType: record.contentType || "application/octet-stream",
    mimeType: record.contentType || "application/octet-stream",
    size: record.sizeBytes,
    sizeBytes: record.sizeBytes,
    contentPreview: record.contentPreview || "",
    previewText: record.contentPreview || "",
    source: "DESKTOP_FILE"
  };
}

export function DesktopConsolePage() {
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get("conversationId");

  async function handleUseLocalFileAsAttachment(file: File): Promise<LightweightAttachment> {
    if (!conversationId) {
      throw new Error("当前 Desktop Console 没有关联会话，无法写入 Context 或 Memory。请从 Workspace 当前会话打开。");
    }
    const uploaded = await uploadConversationAttachment(conversationId, file);
    return toLightweightAttachment(uploaded);
  }

  async function handlePinAttachmentAsContext(attachmentId: string): Promise<void> {
    if (!conversationId) {
      throw new Error("当前 Desktop Console 没有关联会话，无法固定到 Context。");
    }
    await pinAttachmentAsContext(conversationId, attachmentId);
  }

  async function handleSaveAttachmentAsMemory(attachmentId: string): Promise<void> {
    if (!conversationId) {
      throw new Error("当前 Desktop Console 没有关联会话，无法保存为 Memory。");
    }
    await saveAttachmentAsMemory(conversationId, attachmentId);
  }

  function handleNavigateToNotificationTarget(targetType?: string, targetId?: string) {
    if (targetType === "CONVERSATION" && targetId) {
      window.location.href = `/workspace?conversationId=${encodeURIComponent(targetId)}`;
      return;
    }
    window.location.href = "/workspace";
  }

  return (
    <section className="desktop-console-page" data-testid="desktop-console-page">
      <header className="desktop-console-page__header">
        <div>
          <span className="desktop-console-page__eyebrow">Desktop Console</span>
          <h1>本机能力控制台</h1>
          <p>集中处理 Tauri 本地文件预览、系统通知、本机 Agent CLI 探测和 backend managed process。</p>
          <small>
            {conversationId
              ? `已连接当前会话：${conversationId.slice(0, 8)}，本地文件可加入 Context / Memory。`
              : "未关联会话：文件仍可预览，但不能写入 Workspace Context / Memory。"}
          </small>
        </div>
        <Link className="secondary-button" to="/workspace">
          返回 Workspace
        </Link>
      </header>
      <DesktopCapabilityPanel
        conversationId={conversationId}
        onUseLocalFileAsAttachment={handleUseLocalFileAsAttachment}
        onPinAttachmentAsContext={handlePinAttachmentAsContext}
        onSaveAttachmentAsMemory={handleSaveAttachmentAsMemory}
        onNavigateToDesktopNotificationTarget={handleNavigateToNotificationTarget}
      />
    </section>
  );
}
