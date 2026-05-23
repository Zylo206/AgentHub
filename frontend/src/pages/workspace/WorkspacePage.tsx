import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createConversation,
  createDemoArtifactRevision,
  createDemoDeployment,
  applyArtifactDiff,
  createDemoTask,
  getActionAuditsByConversation,
  getAdapters,
  getAgents,
  getArtifact,
  getArtifactSnapshotsByConversation,
  getArtifactsByConversation,
  getContextSnapshotsByTaskRun,
  getConversation,
  getConversations,
  getDeploymentsByConversation,
  getHandoffSummariesByTaskRun,
  getMemoriesByConversation,
  getMessages,
  getPinnedContextsByConversation,
  getTaskRunsByConversation,
  getTaskSpecsByConversation,
  pinMessageAsContext,
  recordActionAudit,
  regenerateAgentReply,
  restoreArtifactSnapshot,
  saveMessageAsMemory,
  sendMessage,
  unpinContext
} from "../../api/agenthubApi";
import { AgentList } from "../../features/agents/AgentList";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { ArtifactPanel } from "../../features/artifacts/ArtifactPanel";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import type { ArtifactSnapshot } from "../../features/artifacts/artifactSnapshotTypes";
import { ActionAuditTimelinePanel } from "../../features/audit/ActionAuditTimelinePanel";
import type { ActionAuditLog } from "../../features/audit/auditTypes";
import { ChatInput } from "../../features/chat/ChatInput";
import { parseLeadingAgentMention } from "../../features/chat/agentMention";
import { MessageStream } from "../../features/chat/MessageStream";
import { TaskRunPanel } from "../../features/chat/TaskRunPanel";
import type { Message, TaskRun, TaskSpec, TaskStep } from "../../features/chat/chatTypes";
import { ConversationList } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { ContextPanel } from "../../features/context/ContextPanel";
import type { ContextSnapshot, HandoffSummary, PinnedContext } from "../../features/context/contextTypes";
import type { DeploymentRecord } from "../../features/deployments/deploymentTypes";
import type { MemoryItem } from "../../features/memory/memoryTypes";
import { getIdValue } from "../../utils/id";
import { displayAgentRole, displayConversationType, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import "../../styles/workspace.css";

const PRODUCT_DEMO_PROMPT =
  "帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

function findTaskStep(taskRuns: TaskRun[], taskRunId: string | null, taskStepId: string | null): TaskStep | null {
  if (!taskRunId || !taskStepId) {
    return null;
  }

  const taskRun = taskRuns.find((item) => getIdValue(item.id) === taskRunId);
  return taskRun?.steps.find((step) => getIdValue(step.id) === taskStepId) ?? null;
}

export function WorkspacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [adapterDescriptors, setAdapterDescriptors] = useState<AdapterDescriptor[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [taskSpecs, setTaskSpecs] = useState<TaskSpec[]>([]);
  const [taskRuns, setTaskRuns] = useState<TaskRun[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [artifactSnapshots, setArtifactSnapshots] = useState<ArtifactSnapshot[]>([]);
  const [actionAudits, setActionAudits] = useState<ActionAuditLog[]>([]);
  const [pinnedContexts, setPinnedContexts] = useState<PinnedContext[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [contextSnapshots, setContextSnapshots] = useState<ContextSnapshot[]>([]);
  const [handoffSummaries, setHandoffSummaries] = useState<HandoffSummary[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedTaskRunId, setSelectedTaskRunId] = useState<string | null>(null);
  const [selectedTaskStepId, setSelectedTaskStepId] = useState<string | null>(null);
  const [showAllArtifacts, setShowAllArtifacts] = useState(true);
  const [draftMessage, setDraftMessage] = useState(PRODUCT_DEMO_PROMPT);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);
  const [quoteMode, setQuoteMode] = useState<"quote" | "reply">("quote");

  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingTaskRuns, setLoadingTaskRuns] = useState(false);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);
  const [loadingArtifactDetail, setLoadingArtifactDetail] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [runningDemoTask, setRunningDemoTask] = useState(false);
  const [rerunningMessageId, setRerunningMessageId] = useState<string | null>(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [revisingArtifact, setRevisingArtifact] = useState(false);
  const [deployingArtifact, setDeployingArtifact] = useState(false);
  const [restoringSnapshot, setRestoringSnapshot] = useState(false);

  const currentConversation =
    conversations.find((conversation) => getIdValue(conversation.id) === currentConversationId) ?? null;
  const latestUserMessage = [...messages].reverse().find((message) => message.senderType === "USER") ?? null;
  const currentParticipantAgents = useMemo(() => {
    if (!currentConversation) {
      return [];
    }

    return (currentConversation.participantAgentIds ?? []).map((participantAgentId) => {
      const participantId = getIdValue(participantAgentId);
      const agent = agents.find((item) => getIdValue(item.id) === participantId);
      return {
        id: participantId,
        name: agent?.name || participantId,
        role: agent?.role || "AGENT"
      };
    });
  }, [agents, currentConversation]);

  const selectedTaskRun =
    taskRuns.find((taskRun) => getIdValue(taskRun.id) === selectedTaskRunId) ?? taskRuns[taskRuns.length - 1] ?? null;
  const activeTaskSpec =
    taskSpecs.find((taskSpec) => getIdValue(taskSpec.id) === getIdValue(selectedTaskRun?.taskSpecId)) ??
    taskSpecs[taskSpecs.length - 1] ??
    null;
  const selectedTaskStep = findTaskStep(taskRuns, selectedTaskRunId, selectedTaskStepId);
  const selectedArtifactDeployments = useMemo(
    () => deployments.filter((deployment) => getIdValue(deployment.artifactId) === selectedArtifactId),
    [deployments, selectedArtifactId]
  );
  const selectedArtifactSnapshots = useMemo(
    () => artifactSnapshots.filter((snapshot) => getIdValue(snapshot.artifactId) === selectedArtifactId),
    [artifactSnapshots, selectedArtifactId]
  );

  const highlightedArtifactIds = useMemo(
    () => (selectedTaskStep ? selectedTaskStep.producedArtifactIds.map((artifactId) => getIdValue(artifactId)) : []),
    [selectedTaskStep]
  );

  const visibleArtifacts = useMemo(() => {
    if (!selectedTaskStep || showAllArtifacts) {
      return artifacts;
    }

    return artifacts.filter((artifact) => highlightedArtifactIds.includes(getIdValue(artifact.id)));
  }, [artifacts, highlightedArtifactIds, selectedTaskStep, showAllArtifacts]);

  const selectedAgentAdapterDescriptor = useMemo(() => {
    if (!selectedAgent) {
      return null;
    }

    const preferredAdapterType = selectedAgent.preferredAdapterType || "MOCK";
    return adapterDescriptors.find((descriptor) => descriptor.adapterType === preferredAdapterType) ?? null;
  }, [adapterDescriptors, selectedAgent]);

  const loadInitialData = useCallback(async () => {
    setErrorMessage(null);
    setLoadingAgents(true);
    setLoadingConversations(true);

    try {
      const [agentData, conversationData, adapterData] = await Promise.all([
        getAgents(),
        getConversations(),
        getAdapters().catch(() => [])
      ]);
      const firstConversationId = getIdValue(conversationData[0]?.id) || null;

      setAgents(agentData);
      setAdapterDescriptors(adapterData);
      setSelectedAgent((previous) => {
        if (!previous) {
          return null;
        }

        const previousId = getIdValue(previous.id);
        return agentData.find((agent) => getIdValue(agent.id) === previousId) ?? null;
      });
      setConversations(conversationData);
      setCurrentConversationId((previousId) => previousId ?? firstConversationId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingAgents(false);
      setLoadingConversations(false);
    }
  }, []);

  const loadConversationData = useCallback(async (conversationId: string) => {
    setErrorMessage(null);
    setLoadingMessages(true);
    setLoadingTaskRuns(true);
    setLoadingArtifacts(true);

    try {
      const [
        messageData,
        taskSpecData,
        taskRunData,
        artifactData,
        deploymentData,
        artifactSnapshotData,
        actionAuditData,
        pinnedContextData,
        memoryData
      ] = await Promise.all([
        getMessages(conversationId),
        getTaskSpecsByConversation(conversationId),
        getTaskRunsByConversation(conversationId),
        getArtifactsByConversation(conversationId),
        getDeploymentsByConversation(conversationId),
        getArtifactSnapshotsByConversation(conversationId),
        getActionAuditsByConversation(conversationId),
        getPinnedContextsByConversation(conversationId),
        getMemoriesByConversation(conversationId)
      ]);

      setMessages(messageData);
      setTaskSpecs(taskSpecData);
      setTaskRuns(taskRunData);
      setArtifacts(artifactData);
      setDeployments(deploymentData);
      setArtifactSnapshots(artifactSnapshotData);
      setActionAudits(actionAuditData);
      setPinnedContexts(pinnedContextData);
      setMemories(memoryData);
      setShowAllArtifacts(true);
      setSelectedTaskStepId(null);
      setSelectedTaskRunId((previousId) => {
        const previousExists = previousId ? taskRunData.some((taskRun) => getIdValue(taskRun.id) === previousId) : false;

        return previousExists ? previousId : getIdValue(taskRunData[taskRunData.length - 1]?.id) || null;
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingMessages(false);
      setLoadingTaskRuns(false);
      setLoadingArtifacts(false);
    }
  }, []);

  const loadContextData = useCallback(async (taskRunId: string) => {
    setErrorMessage(null);
    setLoadingContext(true);

    try {
      const [snapshotData, handoffData] = await Promise.all([
        getContextSnapshotsByTaskRun(taskRunId),
        getHandoffSummariesByTaskRun(taskRunId)
      ]);

      setContextSnapshots(snapshotData);
      setHandoffSummaries(handoffData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoadingContext(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!currentConversationId) {
      setMessages([]);
      setTaskSpecs([]);
      setTaskRuns([]);
      setArtifacts([]);
      setDeployments([]);
      setArtifactSnapshots([]);
      setActionAudits([]);
      setPinnedContexts([]);
      setMemories([]);
      setContextSnapshots([]);
      setHandoffSummaries([]);
      setSelectedArtifactId(null);
      setSelectedArtifact(null);
      setSelectedTaskRunId(null);
      setSelectedTaskStepId(null);
      return;
    }

    void loadConversationData(currentConversationId);
  }, [currentConversationId, loadConversationData]);

  useEffect(() => {
    if (!selectedTaskRunId) {
      setContextSnapshots([]);
      setHandoffSummaries([]);
      return;
    }

    void loadContextData(selectedTaskRunId);
  }, [selectedTaskRunId, loadContextData]);

  useEffect(() => {
    if (artifacts.length === 0) {
      setSelectedArtifactId(null);
      setSelectedArtifact(null);
      return;
    }

    const selectedExists = selectedArtifactId
      ? artifacts.some((artifact) => getIdValue(artifact.id) === selectedArtifactId)
      : false;

    if (!selectedArtifactId || !selectedExists) {
      setSelectedArtifactId(getIdValue(visibleArtifacts[0]?.id) || getIdValue(artifacts[0]?.id));
    }
  }, [artifacts, selectedArtifactId, visibleArtifacts]);

  useEffect(() => {
    if (!selectedArtifactId) {
      setSelectedArtifact(null);
      return;
    }

    let cancelled = false;
    setLoadingArtifactDetail(true);
    setErrorMessage(null);

    void getArtifact(selectedArtifactId)
      .then((artifact) => {
        if (!cancelled) {
          setSelectedArtifact(artifact);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingArtifactDetail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedArtifactId]);

  function handleSelectAgent(agent: Agent) {
    setSelectedAgent(agent);
  }

  function handleClearSelectedAgent() {
    setSelectedAgent(null);
  }

  async function handleCreateDemoConversation() {
    setCreatingConversation(true);
    setErrorMessage(null);

    try {
      const conversation = await createConversation("登录页 Demo", "GROUP");
      const createdId = getIdValue(conversation.id);

      setConversations((previous) => {
        const next = previous.filter((item) => getIdValue(item.id) !== createdId);
        return [conversation, ...next];
      });
      setCurrentConversationId(createdId);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCreatingConversation(false);
    }
  }

  async function handleSendMessage() {
    if (!currentConversationId || !draftMessage.trim()) {
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

    if (!contentToSend) {
      setErrorMessage(parsedMention.rawMention ? `请在 ${parsedMention.rawMention} 后补充消息内容。` : "请先输入消息内容。");
      return;
    }

    const referencedMessageId = quotedMessage ? getIdValue(quotedMessage.id) : null;

    setSendingMessage(true);
    setErrorMessage(null);
    setOperationMessage(null);

    try {
      await sendMessage(
        currentConversationId,
        contentToSend,
        targetAgent ? getIdValue(targetAgent.id) : null,
        mentionedAgents.map((agent) => getIdValue(agent.id)).filter(Boolean),
        quoteMode === "reply" ? referencedMessageId : null,
        referencedMessageId
      );
      if (parsedMention.matchedAgent) {
        setSelectedAgent(parsedMention.matchedAgent);
      }
      const refreshedMessages = await getMessages(currentConversationId);
      setMessages(refreshedMessages);
      setDraftMessage("");
      setQuotedMessage(null);
      setQuoteMode("quote");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleToggleMessagePin(messageId: string, pinnedContextId?: string | null) {
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
  }

  async function handleSaveMessageAsMemory(message: Message) {
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

  async function handleCopyMessage(message: Message) {
    setErrorMessage(null);

    try {
      await copyTextToClipboard(message.content);
      setOperationMessage("消息内容已复制。");
    } catch (error) {
      setErrorMessage(`复制失败：${getErrorMessage(error)}`);
    }
  }

  function handleQuoteMessage(message: Message) {
    setQuotedMessage(message);
    setQuoteMode("quote");
    setOperationMessage("已引用消息，发送时会带入引用内容。");
  }

  function handleReplyMessage(message: Message) {
    setQuotedMessage(message);
    setQuoteMode("reply");
    setOperationMessage("已选择回复消息，发送时会带入被回复内容。");
  }

  async function runDemoTaskFromMessage(message: Message) {
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
  }

  async function handleRunDemoTask() {
    if (!currentConversationId || !latestUserMessage) {
      setErrorMessage("请先发送一条用户消息，再运行 Demo Task。");
      return;
    }

    await runDemoTaskFromMessage(latestUserMessage);
  }

  async function handleRerunFromMessage(message: Message) {
    if (message.senderType !== "USER") {
      return;
    }

    await runDemoTaskFromMessage(message);
  }

  async function handleRegenerateAgentReply(message: Message) {
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
  }

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

  async function handleApplyArtifactDiff(artifactId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId);
      if (applyResult.conflict) {
        setOperationMessage(applyResult.conflictReason || "检测到 Diff 应用冲突，请查看最新已应用产物。");
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
      return null;
    }
  }

  async function handleForceApplyArtifactDiff(artifactId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再强制应用 Diff。");
      return null;
    }

    setErrorMessage(null);
    setOperationMessage(null);

    try {
      const applyResult = await applyArtifactDiff(artifactId, true);
      if (!applyResult.appliedArtifact) {
        setOperationMessage("强制应用 Diff 未生成新产物。");
        return null;
      }

      const appliedArtifactId = getIdValue(applyResult.appliedArtifact.id);
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(appliedArtifactId);
      setOperationMessage(
        `已强制应用 Diff 为 ${applyResult.appliedArtifact.title} v${applyResult.appliedArtifact.version}。`
      );
      return applyResult.appliedArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  }

  async function handleCreateDeployment(artifactId: string) {
    if (!currentConversationId) {
      setErrorMessage("请先创建或选择一个会话，再部署产物。");
      return;
    }

    setDeployingArtifact(true);
    setErrorMessage(null);

    try {
      const deployment = await createDemoDeployment(artifactId);
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
    } finally {
      setDeployingArtifact(false);
    }
  }

  async function handleRestoreArtifactSnapshot(snapshotId: string): Promise<Artifact | null> {
    if (!currentConversationId) {
      setErrorMessage("Please select a conversation before restoring a snapshot.");
      return null;
    }

    setRestoringSnapshot(true);
    setErrorMessage(null);

    try {
      const restoredArtifact = await restoreArtifactSnapshot(snapshotId);
      await loadConversationData(currentConversationId);
      setShowAllArtifacts(true);
      setSelectedArtifactId(getIdValue(restoredArtifact.id));
      setOperationMessage(`Restored snapshot as ${restoredArtifact.title} v${restoredArtifact.version}.`);
      return restoredArtifact;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    } finally {
      setRestoringSnapshot(false);
    }
  }

  async function handleRecordApprovalAudit(request: {
    actionType: string;
    targetType: string;
    targetId: string;
    status: string;
    summary: string;
  }) {
    if (!currentConversationId) {
      return;
    }

    const auditLog = await recordActionAudit(currentConversationId, request);
    setActionAudits((previous) => [auditLog, ...previous]);
  }

  function handleSelectTaskStep(taskRunId: string, step: TaskStep) {
    setSelectedTaskRunId(taskRunId);
    setSelectedTaskStepId(getIdValue(step.id));
    setShowAllArtifacts(false);

    const firstArtifactId = step.producedArtifactIds.length > 0 ? getIdValue(step.producedArtifactIds[0]) : null;

    if (firstArtifactId) {
      setSelectedArtifactId(firstArtifactId);
    }
  }

  function handleShowAllArtifacts() {
    setShowAllArtifacts(true);
  }

  return (
    <section className="workspace-page">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar__header">
          <div className="workspace-brand">
            <h1>AgentHub</h1>
            <p>面向 Orchestrator、TaskRun 和 Artifact 的 IM 式协作工作台。</p>
          </div>
          <button type="button" className="primary-button" disabled={creatingConversation} onClick={handleCreateDemoConversation}>
            {creatingConversation ? "创建中..." : "创建 Demo 会话"}
          </button>
        </div>

        <div className="workspace-sidebar__body">
          <section className="workspace-section">
            <div className="section-header">
              <h3>会话</h3>
              <span>{conversations.length}</span>
            </div>
            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              loading={loadingConversations}
              onSelect={setCurrentConversationId}
            />
          </section>

          <section className="workspace-section">
            <div className="section-header">
              <h3>Agent 联系人</h3>
              <span>{agents.length}</span>
            </div>
            <AgentList
              agents={agents}
              adapterDescriptors={adapterDescriptors}
              loading={loadingAgents}
              selectedAgentId={selectedAgent ? getIdValue(selectedAgent.id) : null}
              onSelectAgent={handleSelectAgent}
            />
          </section>
        </div>
      </aside>

      <main className="workspace-main">
        <div className="workspace-main__header">
          <h2>{currentConversation?.title || "暂无活跃会话"}</h2>
          <p>
            {currentConversation
              ? `${displayConversationType(currentConversation.type)} / ${currentConversation.participantAgentIds.length} 个 Agent`
              : "创建一个 Demo 会话后开始 AgentHub 流程。"}
          </p>
          {currentConversation ? (
            <div className="conversation-participants">
              <span className="conversation-participants__label">参与 Agent</span>
              <div className="conversation-participants__list">
                {currentParticipantAgents.map((participant) => (
                  <span key={participant.id} className="conversation-participant-pill" title={participant.id}>
                    {participant.name}
                    <small>{displayAgentRole(participant.role)}</small>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {currentConversation ? (
            <div className="conversation-participants">
              <span className="conversation-participants__label">Action Audit</span>
              <div className="conversation-participants__list">
                <span className="conversation-participant-pill">
                  {actionAudits.length} record(s)
                  <small>apply / deploy / restore</small>
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="workspace-error">
            <span>{errorMessage}</span>
            <button type="button" className="secondary-button" onClick={() => setErrorMessage(null)}>
              关闭
            </button>
          </div>
        ) : null}
        {operationMessage ? (
          <div className="workspace-notice">
            <span>{operationMessage}</span>
            <button type="button" className="secondary-button" onClick={() => setOperationMessage(null)}>
              关闭
            </button>
          </div>
        ) : null}

        <div className="workspace-main__toolbar">
          <div className="section-header">
            <h3>消息流</h3>
            <span>{messages.length} 条消息</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            disabled={!currentConversationId || !latestUserMessage || runningDemoTask}
            onClick={handleRunDemoTask}
          >
            {runningDemoTask ? "运行中..." : "运行 Demo Task"}
          </button>
        </div>

        <div className="selected-agent-banner">
          {selectedAgent ? (
            <>
              <div>
                <div className="selected-agent-name">当前 Agent：{selectedAgent.name}</div>
                <div className="selected-agent-adapter">
                  首选 Adapter：{selectedAgent.preferredAdapterType || "MOCK"} / 角色：{displayAgentRole(selectedAgent.role)}
                </div>
                {selectedAgentAdapterDescriptor ? (
                  <div className="selected-agent-health">
                    <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(selectedAgentAdapterDescriptor.status)}`}>
                      Adapter 状态：{displayStatus(selectedAgentAdapterDescriptor.status)}
                    </span>
                    {selectedAgentAdapterDescriptor.status !== "AVAILABLE" ? (
                      <span className="selected-agent-health__hint">不可用时会回退到 MOCK。</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button type="button" className="secondary-button clear-selected-agent-button" onClick={handleClearSelectedAgent}>
                清除选择
              </button>
            </>
          ) : (
            <div>
              <div className="selected-agent-name">未选择 Agent</div>
              <div className="selected-agent-adapter">未选择时，Demo 会使用内置 Agent 流程。</div>
            </div>
          )}
        </div>

        <div className="workspace-main__content">
          <MessageStream
            messages={messages}
            agents={agents}
            pinnedContexts={pinnedContexts}
            loading={loadingMessages}
            rerunningMessageId={rerunningMessageId}
            regeneratingMessageId={regeneratingMessageId}
            onSelectArtifact={setSelectedArtifactId}
            onToggleMessagePin={handleToggleMessagePin}
            onSaveMessageAsMemory={handleSaveMessageAsMemory}
            onCopyMessage={handleCopyMessage}
            onQuoteMessage={handleQuoteMessage}
            onReplyMessage={handleReplyMessage}
            onRerunFromMessage={handleRerunFromMessage}
            onRegenerateAgentReply={handleRegenerateAgentReply}
          />
          <TaskRunPanel
            agents={agents}
            artifacts={artifacts}
            taskSpecs={taskSpecs}
            taskRuns={taskRuns}
            loading={loadingTaskRuns}
            selectedTaskRunId={selectedTaskRunId}
            selectedTaskStepId={selectedTaskStepId}
            onSelectStep={handleSelectTaskStep}
          />
          <ContextPanel
            taskSpec={activeTaskSpec}
            pinnedContexts={pinnedContexts}
            memories={memories}
            contextSnapshots={contextSnapshots}
            handoffSummaries={handoffSummaries}
            loading={loadingContext}
          />
          <ActionAuditTimelinePanel audits={actionAudits} />
          <ChatInput
            value={draftMessage}
            disabled={!currentConversationId}
            sending={sendingMessage}
            selectedAgent={selectedAgent}
            quotedMessage={quotedMessage}
            quoteMode={quoteMode}
            onChange={setDraftMessage}
            onClearQuote={() => {
              setQuotedMessage(null);
              setQuoteMode("quote");
            }}
            onSend={handleSendMessage}
          />
        </div>
      </main>

      <aside className="workspace-artifacts">
        <ArtifactPanel
          artifacts={visibleArtifacts}
          allArtifacts={artifacts}
          totalArtifactCount={artifacts.length}
          selectedArtifact={selectedArtifact}
          selectedArtifactId={selectedArtifactId}
          loadingArtifacts={loadingArtifacts}
          loadingArtifactDetail={loadingArtifactDetail}
          highlightedArtifactIds={highlightedArtifactIds}
          filteredByTaskStep={Boolean(selectedTaskStep) && !showAllArtifacts}
          revisingArtifact={revisingArtifact}
          deployments={selectedArtifactDeployments}
          snapshots={selectedArtifactSnapshots}
          deployingArtifact={deployingArtifact}
          restoringSnapshot={restoringSnapshot}
          conversationId={currentConversationId}
          onSelectArtifact={setSelectedArtifactId}
          onShowAllArtifacts={handleShowAllArtifacts}
          onCreateRevision={handleCreateArtifactRevision}
          onCreateDeployment={handleCreateDeployment}
          onRestoreSnapshot={handleRestoreArtifactSnapshot}
          onApplyDiff={handleApplyArtifactDiff}
          onForceApplyDiff={handleForceApplyArtifactDiff}
          onRecordApprovalAudit={handleRecordApprovalAudit}
        />
      </aside>
    </section>
  );
}
