import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  createDemoTask,
  draftAgentFromNaturalLanguage,
  getConversation,
  getMemoriesByConversation,
  getMessages,
  getPinnedContextsByConversation,
  pinMessageAsContext,
  regenerateAgentReply,
  saveMessageAsMemory,
  sendMessage,
  uploadConversationAttachment,
  unpinContext
} from "../../api/agenthubApi";
import type { Agent } from "../../features/agents/agentTypes";
import { inferAgentCreationDraft, type AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import type { ArtifactSelectionReference } from "../../features/artifacts/artifactTypes";
import { parseLeadingAgentMention } from "../../features/chat/agentMention";
import type { LightweightAttachment, Message } from "../../features/chat/chatTypes";
import type { ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import type { PinnedContext } from "../../features/context/contextTypes";
import { getIdValue } from "../../utils/id";

const DEPLOY_INTENT_PATTERN = /(部署|发布|生成预览|预览\s*url|preview\s*url|open\s*preview)/i;

interface UseWorkspaceMessageActionsParams {
  currentConversationId: string | null;
  productDemoPrompt: string;
  draftMessage: string;
  draftAttachments: LightweightAttachment[];
  agents: Agent[];
  selectedAgent: Agent | null;
  latestUserMessage: Message | null;
  quotedMessage: Message | null;
  quoteMode: "quote" | "reply";
  artifactSelectionReference: ArtifactSelectionReference | null;
  loadConversationData: (conversationId: string) => Promise<void>;
  loadConversationIndex: (query?: string, filter?: ConversationFilter) => Promise<Conversation[]>;
  onCreateArtifactRevision: (artifactId: string, revisionInstruction: string) => Promise<void>;
  onQueueDeployIntent: (message: Message) => void;
  setDraftMessage: Dispatch<SetStateAction<string>>;
  setDraftAttachments: Dispatch<SetStateAction<LightweightAttachment[]>>;
  setSendingMessage: Dispatch<SetStateAction<boolean>>;
  setRunningDemoTask: Dispatch<SetStateAction<boolean>>;
  setRerunningMessageId: Dispatch<SetStateAction<string | null>>;
  setRegeneratingMessageId: Dispatch<SetStateAction<string | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setOperationMessage: Dispatch<SetStateAction<string | null>>;
  setAgentCreationDraftsByMessageId: Dispatch<SetStateAction<Record<string, AgentCreationDraft | null>>>;
  setSelectedAgent: Dispatch<SetStateAction<Agent | null>>;
  setQuotedMessage: Dispatch<SetStateAction<Message | null>>;
  setQuoteMode: Dispatch<SetStateAction<"quote" | "reply">>;
  setArtifactSelectionReference: Dispatch<SetStateAction<ArtifactSelectionReference | null>>;
  setPinnedContexts: Dispatch<SetStateAction<PinnedContext[]>>;
  setMemories: Dispatch<SetStateAction<MemoryItem[]>>;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setSelectedTaskRunId: Dispatch<SetStateAction<string | null>>;
  setSelectedTaskStepId: Dispatch<SetStateAction<string | null>>;
  setShowAllArtifacts: Dispatch<SetStateAction<boolean>>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

function isDeployIntent(content: string): boolean {
  return DEPLOY_INTENT_PATTERN.test(content || "");
}

function buildArtifactSelectionRevisionInstruction(
  selection: ArtifactSelectionReference,
  userRequest: string,
  sourceMessageId: string | null
): string {
  return [
    `用户在聊天中请求对 Artifact "${selection.artifactTitle}" v${selection.artifactVersion} 做局部修改。`,
    `Artifact ID: ${selection.artifactId}`,
    `选区范围: 第 ${selection.startLine}-${selection.endLine} 行`,
    `语言: ${selection.language || selection.artifactType}`,
    sourceMessageId ? `来源聊天消息: ${sourceMessageId}` : null,
    "",
    "用户修改要求:",
    userRequest,
    "",
    "选中的代码片段:",
    selection.selectedText,
    "",
    "请只围绕选中片段生成新的 Draft Revision；不要直接覆盖当前 Artifact。生成后仍需通过 Diff Summary 与 Approval Gate 应用。"
  ].filter(Boolean).join("\n");
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function useWorkspaceMessageActions({
  currentConversationId,
  productDemoPrompt,
  draftMessage,
  draftAttachments,
  agents,
  selectedAgent,
  latestUserMessage,
  quotedMessage,
  quoteMode,
  artifactSelectionReference,
  loadConversationData,
  loadConversationIndex,
  onCreateArtifactRevision,
  onQueueDeployIntent,
  setDraftMessage,
  setDraftAttachments,
  setSendingMessage,
  setRunningDemoTask,
  setRerunningMessageId,
  setRegeneratingMessageId,
  setErrorMessage,
  setOperationMessage,
  setAgentCreationDraftsByMessageId,
  setSelectedAgent,
  setQuotedMessage,
  setQuoteMode,
  setArtifactSelectionReference,
  setPinnedContexts,
  setMemories,
  setMessages,
  setConversations,
  setSelectedTaskRunId,
  setSelectedTaskStepId,
  setShowAllArtifacts
}: UseWorkspaceMessageActionsParams) {
  const handleSendArtifactSelectionToChat = useCallback(
    (selection: ArtifactSelectionReference) => {
      setArtifactSelectionReference(selection);
      setDraftMessage((current) => {
        if (current.trim() && current !== productDemoPrompt) {
          return current;
        }
        return `请基于选中的 ${selection.artifactTitle} 第 ${selection.startLine}-${selection.endLine} 行做局部修改：`;
      });
      setOperationMessage("已引用选中的 Artifact 代码片段。请在聊天框描述修改需求并发送。");
    },
    [productDemoPrompt, setArtifactSelectionReference, setDraftMessage, setOperationMessage]
  );

  const runArtifactSelectionRevisionFromChat = useCallback(
    async (selection: ArtifactSelectionReference, userRequest: string, sourceMessageId: string) => {
      if (!currentConversationId) {
        return;
      }

      try {
        const revisionInstruction = buildArtifactSelectionRevisionInstruction(selection, userRequest, sourceMessageId);
        await onCreateArtifactRevision(selection.artifactId, revisionInstruction);
        setOperationMessage("已根据聊天中的局部修改请求生成 Draft Revision，请在右侧 Diff Preview 中审批应用。");
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [currentConversationId, onCreateArtifactRevision, setErrorMessage, setOperationMessage]
  );

  const handleSendMessage = useCallback(async () => {
    if (!currentConversationId || (!draftMessage.trim() && draftAttachments.length === 0)) {
      return;
    }

    const parsedMention = parseLeadingAgentMention(draftMessage, agents);
    if (parsedMention.error) {
      setErrorMessage(parsedMention.error);
      return;
    }

    const mentionedAgents = parsedMention.matchedAgents;
    const targetAgent = mentionedAgents[0] ?? selectedAgent;
    const contentToSend = mentionedAgents.length > 0 ? parsedMention.cleanedContent.trim() : draftMessage.trim();

    if (!contentToSend && draftAttachments.length === 0) {
      setErrorMessage(parsedMention.rawMention ? `请在 ${parsedMention.rawMention} 后补充消息内容。` : "请先输入消息内容。");
      return;
    }

    const referencedMessageId = quotedMessage ? getIdValue(quotedMessage.id) : null;
    const selectedArtifactSnippet = artifactSelectionReference;

    setSendingMessage(true);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const sentMessage = await sendMessage(
        currentConversationId,
        contentToSend,
        targetAgent ? getIdValue(targetAgent.id) : null,
        mentionedAgents.map((agent) => getIdValue(agent.id)).filter(Boolean),
        quoteMode === "reply" ? referencedMessageId : null,
        referencedMessageId,
        draftAttachments
      );
      const sentMessageId = getIdValue(sentMessage.id);
      if (selectedArtifactSnippet) {
        void runArtifactSelectionRevisionFromChat(selectedArtifactSnippet, contentToSend, sentMessageId);
        setOperationMessage("已发送局部修改请求，系统正在后台生成 Draft Revision。");
      }
      const localAgentCreationDraft = inferAgentCreationDraft(contentToSend);
      if (localAgentCreationDraft) {
        let agentCreationDraft = localAgentCreationDraft;
        try {
          agentCreationDraft = await draftAgentFromNaturalLanguage(contentToSend);
        } catch {
          agentCreationDraft = {
            ...localAgentCreationDraft,
            draftSource: "CLIENT_RULE_BASED_FALLBACK",
            fallbackReason: "Backend natural-language draft API was unavailable."
          };
        }
        setAgentCreationDraftsByMessageId((current) => ({
          ...current,
          [sentMessageId]: agentCreationDraft
        }));
        setOperationMessage("已识别为创建 Agent 请求，请在消息卡片中确认草案。");
      }
      if (parsedMention.matchedAgent) {
        setSelectedAgent(parsedMention.matchedAgent);
      }
      if (isDeployIntent(contentToSend)) {
        onQueueDeployIntent(sentMessage);
        setOperationMessage("已识别部署 / 发布意图，请在消息卡片中确认生成本地静态预览 URL。");
      }
      await loadConversationData(currentConversationId);
      await loadConversationIndex();
      setDraftMessage("");
      setDraftAttachments([]);
      setQuotedMessage(null);
      setQuoteMode("quote");
      setArtifactSelectionReference(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  }, [
    agents,
    artifactSelectionReference,
    currentConversationId,
    draftAttachments,
    draftMessage,
    loadConversationData,
    loadConversationIndex,
    onQueueDeployIntent,
    quoteMode,
    quotedMessage,
    runArtifactSelectionRevisionFromChat,
    selectedAgent,
    setAgentCreationDraftsByMessageId,
    setArtifactSelectionReference,
    setDraftAttachments,
    setDraftMessage,
    setErrorMessage,
    setOperationMessage,
    setQuoteMode,
    setQuotedMessage,
    setSelectedAgent,
    setSendingMessage
  ]);

  const handleUploadAttachments = useCallback(
    async (files: File[]): Promise<LightweightAttachment[]> => {
      if (!currentConversationId) {
        throw new Error("Please select a conversation before uploading attachments.");
      }

      return Promise.all(
        files.map(async (file) => {
          const attachment = await uploadConversationAttachment(currentConversationId, file);
          return {
            attachmentId: attachment.attachmentId,
            id: attachment.attachmentId,
            fileName: attachment.fileName,
            contentType: attachment.contentType || "application/octet-stream",
            mimeType: attachment.contentType || "application/octet-stream",
            size: attachment.sizeBytes,
            sizeBytes: attachment.sizeBytes,
            contentPreview: attachment.contentPreview || "",
            previewText: attachment.contentPreview || "",
            source: "UPLOADED_FILE"
          };
        })
      );
    },
    [currentConversationId]
  );

  const handleToggleMessagePin = useCallback(
    async (messageId: string, pinnedContextId?: string | null) => {
      if (!currentConversationId) {
        return;
      }

      setErrorMessage(null);

      try {
        if (pinnedContextId) {
          await unpinContext(pinnedContextId);
        } else {
          await pinMessageAsContext(currentConversationId, messageId);
        }

        const refreshedPinnedContexts = await getPinnedContextsByConversation(currentConversationId);
        setPinnedContexts(refreshedPinnedContexts);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [currentConversationId, setErrorMessage, setPinnedContexts]
  );

  const handleSaveMessageAsMemory = useCallback(
    async (message: Message) => {
      if (!currentConversationId) {
        return;
      }

      const messageId = getIdValue(message.id);
      if (!messageId) {
        setErrorMessage("无法识别消息 ID，不能保存为长期记忆。");
        return;
      }

      setErrorMessage(null);
      setOperationMessage(null);

      try {
        await saveMessageAsMemory(currentConversationId, messageId, "PROJECT_FACT");
        const refreshedMemories = await getMemoriesByConversation(currentConversationId);
        setMemories(refreshedMemories);
        setOperationMessage("消息已保存为长期记忆。");
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    },
    [currentConversationId, setErrorMessage, setMemories, setOperationMessage]
  );

  const handleCopyMessage = useCallback(
    async (message: Message) => {
      setErrorMessage(null);

      try {
        await copyTextToClipboard(message.content);
        setOperationMessage("消息内容已复制。");
      } catch (error) {
        setErrorMessage(`复制失败：${getErrorMessage(error)}`);
      }
    },
    [setErrorMessage, setOperationMessage]
  );

  const handleQuoteMessage = useCallback(
    (message: Message) => {
      setQuotedMessage(message);
      setQuoteMode("quote");
      setOperationMessage("已引用消息，发送时会带入引用内容。");
    },
    [setOperationMessage, setQuoteMode, setQuotedMessage]
  );

  const handleReplyMessage = useCallback(
    (message: Message) => {
      setQuotedMessage(message);
      setQuoteMode("reply");
      setOperationMessage("已选择回复消息，发送时会带入被回复内容。");
    },
    [setOperationMessage, setQuoteMode, setQuotedMessage]
  );

  const runDemoTaskFromMessage = useCallback(
    async (message: Message) => {
      const sourceConversationId = currentConversationId;
      if (!sourceConversationId) {
        return;
      }

      const sourceMessageId = getIdValue(message.id);
      if (!sourceMessageId) {
        setErrorMessage("无法识别消息 ID，不能重新运行 Demo Task。");
        return;
      }

      setRunningDemoTask(true);
      setRerunningMessageId(sourceMessageId);
      setErrorMessage(null);
      setOperationMessage(null);

      try {
        const createdTaskRun = await createDemoTask(
          sourceConversationId,
          sourceMessageId,
          message.content,
          selectedAgent ? getIdValue(selectedAgent.id) : null
        );
        const createdTaskRunId = getIdValue(createdTaskRun.id);
        const refreshedConversation = await getConversation(sourceConversationId);

        await loadConversationData(sourceConversationId);
        setConversations((previous) =>
          previous.map((conversation) =>
            getIdValue(conversation.id) === sourceConversationId ? refreshedConversation : conversation
          )
        );
        setSelectedTaskRunId(createdTaskRunId);
        setSelectedTaskStepId(null);
        setShowAllArtifacts(true);
        setOperationMessage("已基于选中消息重新运行 Demo Task。");
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setRunningDemoTask(false);
        setRerunningMessageId(null);
      }
    },
    [
      currentConversationId,
      loadConversationData,
      selectedAgent,
      setConversations,
      setErrorMessage,
      setOperationMessage,
      setRerunningMessageId,
      setRunningDemoTask,
      setSelectedTaskRunId,
      setSelectedTaskStepId,
      setShowAllArtifacts
    ]
  );

  const handleRunDemoTask = useCallback(async () => {
    if (!currentConversationId || !latestUserMessage) {
      setErrorMessage("请先发送一条用户消息，再运行 Demo Task。");
      return;
    }

    await runDemoTaskFromMessage(latestUserMessage);
  }, [currentConversationId, latestUserMessage, runDemoTaskFromMessage, setErrorMessage]);

  const handleRerunFromMessage = useCallback(
    async (message: Message) => {
      if (message.senderType !== "USER") {
        return;
      }

      await runDemoTaskFromMessage(message);
    },
    [runDemoTaskFromMessage]
  );

  const handleRegenerateAgentReply = useCallback(
    async (message: Message) => {
      if (!currentConversationId || message.senderType !== "AGENT") {
        return;
      }

      const messageId = getIdValue(message.id);
      setRegeneratingMessageId(messageId);
      setErrorMessage(null);
      setOperationMessage(null);

      try {
        const regeneratedMessage = await regenerateAgentReply(currentConversationId, messageId);
        const refreshedMessages = await getMessages(currentConversationId);
        setMessages(refreshedMessages);
        setOperationMessage(`已重新生成单条 Agent 回复：${getIdValue(regeneratedMessage.id)}`);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setRegeneratingMessageId(null);
      }
    },
    [currentConversationId, setErrorMessage, setMessages, setOperationMessage, setRegeneratingMessageId]
  );

  return {
    handleSendArtifactSelectionToChat,
    handleSendMessage,
    handleUploadAttachments,
    handleToggleMessagePin,
    handleSaveMessageAsMemory,
    handleCopyMessage,
    handleQuoteMessage,
    handleReplyMessage,
    handleRunDemoTask,
    handleRerunFromMessage,
    handleRegenerateAgentReply
  };
}
