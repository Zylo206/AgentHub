import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createConversation,
  createDemoArtifactRevision,
  createDemoTask,
  getAdapters,
  getAgents,
  getArtifact,
  getArtifactsByConversation,
  getContextSnapshotsByTaskRun,
  getConversations,
  getHandoffSummariesByTaskRun,
  getMessages,
  getTaskRunsByConversation,
  getTaskSpecsByConversation,
  sendMessage
} from "../../api/agenthubApi";
import { AgentList } from "../../features/agents/AgentList";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { ArtifactPanel } from "../../features/artifacts/ArtifactPanel";
import type { Artifact } from "../../features/artifacts/artifactTypes";
import { ChatInput } from "../../features/chat/ChatInput";
import { parseLeadingAgentMention } from "../../features/chat/agentMention";
import { MessageStream } from "../../features/chat/MessageStream";
import { TaskRunPanel } from "../../features/chat/TaskRunPanel";
import type { Message, TaskRun, TaskSpec, TaskStep } from "../../features/chat/chatTypes";
import { ConversationList } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { ContextPanel } from "../../features/context/ContextPanel";
import type { ContextSnapshot, HandoffSummary } from "../../features/context/contextTypes";
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
  const [revisingArtifact, setRevisingArtifact] = useState(false);

  const currentConversation =
    conversations.find((conversation) => getIdValue(conversation.id) === currentConversationId) ?? null;
  const latestUserMessage = [...messages].reverse().find((message) => message.senderType === "USER") ?? null;

  const selectedTaskRun =
    taskRuns.find((taskRun) => getIdValue(taskRun.id) === selectedTaskRunId) ?? taskRuns[taskRuns.length - 1] ?? null;
  const activeTaskSpec =
    taskSpecs.find((taskSpec) => getIdValue(taskSpec.id) === getIdValue(selectedTaskRun?.taskSpecId)) ??
    taskSpecs[taskSpecs.length - 1] ??
    null;
  const selectedTaskStep = findTaskStep(taskRuns, selectedTaskRunId, selectedTaskStepId);

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
      const [messageData, taskSpecData, taskRunData, artifactData] = await Promise.all([
        getMessages(conversationId),
        getTaskSpecsByConversation(conversationId),
        getTaskRunsByConversation(conversationId),
        getArtifactsByConversation(conversationId)
      ]);

      setMessages(messageData);
      setTaskSpecs(taskSpecData);
      setTaskRuns(taskRunData);
      setArtifacts(artifactData);
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

    const targetAgent = parsedMention.matchedAgent ?? selectedAgent;
    const contentToSend = parsedMention.matchedAgent ? parsedMention.cleanedContent.trim() : draftMessage.trim();

    if (!contentToSend) {
      setErrorMessage(parsedMention.rawMention ? `请在 ${parsedMention.rawMention} 后补充消息内容。` : "请先输入消息内容。");
      return;
    }

    setSendingMessage(true);
    setErrorMessage(null);

    try {
      await sendMessage(currentConversationId, contentToSend, targetAgent ? getIdValue(targetAgent.id) : null);
      if (parsedMention.matchedAgent) {
        setSelectedAgent(parsedMention.matchedAgent);
      }
      const refreshedMessages = await getMessages(currentConversationId);
      setMessages(refreshedMessages);
      setDraftMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleRunDemoTask() {
    if (!currentConversationId || !latestUserMessage) {
      setErrorMessage("请先发送一条用户消息，再运行 Demo Task。");
      return;
    }

    setRunningDemoTask(true);
    setErrorMessage(null);

    try {
      const createdTaskRun = await createDemoTask(
        currentConversationId,
        getIdValue(latestUserMessage.id),
        latestUserMessage.content,
        selectedAgent ? getIdValue(selectedAgent.id) : null
      );
      const createdTaskRunId = getIdValue(createdTaskRun.id);

      await loadConversationData(currentConversationId);
      setSelectedTaskRunId(createdTaskRunId);
      setSelectedTaskStepId(null);
      setShowAllArtifacts(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setRunningDemoTask(false);
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
        </div>

        {errorMessage ? (
          <div className="workspace-error">
            <span>{errorMessage}</span>
            <button type="button" className="secondary-button" onClick={() => setErrorMessage(null)}>
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
          <MessageStream messages={messages} agents={agents} loading={loadingMessages} onSelectArtifact={setSelectedArtifactId} />
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
            contextSnapshots={contextSnapshots}
            handoffSummaries={handoffSummaries}
            loading={loadingContext}
          />
          <ChatInput
            value={draftMessage}
            disabled={!currentConversationId}
            sending={sendingMessage}
            selectedAgent={selectedAgent}
            onChange={setDraftMessage}
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
          onSelectArtifact={setSelectedArtifactId}
          onShowAllArtifacts={handleShowAllArtifacts}
          onCreateRevision={handleCreateArtifactRevision}
        />
      </aside>
    </section>
  );
}
