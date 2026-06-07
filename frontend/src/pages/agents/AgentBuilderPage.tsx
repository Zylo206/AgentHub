import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createAgent, draftAgentFromNaturalLanguage, executeAdapter, getAdapters } from "../../api/agenthubApi";
import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type AdapterExecutionResponse,
  type Agent,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
import { refineAgentCreationDraft, type AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { AdapterTestSection } from "./AdapterTestSection";
import { AgentDirectorySection } from "./AgentDirectorySection";
import { CreateAgentSection } from "./CreateAgentSection";
import { LocalCliHealthSection } from "./LocalCliHealthSection";
import {
  MAINSTREAM_DEEP_ADAPTERS,
  evaluateAdapterTestQuality,
  getAdapterDepthProfile,
  getErrorMessage,
  getFallbackAdapterOptions,
  mergeTags,
  parseAdapterArtifacts,
  parseTags
} from "./agentBuilderUtils";
import "../../styles/workspace.css";
import "../../styles/production-alignment.css";
import "../../styles/pages/agents.css";

export function AgentBuilderPage() {
  const [adapterDescriptors, setAdapterDescriptors] = useState<AdapterDescriptor[]>([]);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilityTags, setCapabilityTags] = useState("React, UI, CSS");
  const [selectedToolCapabilities, setSelectedToolCapabilities] = useState<ToolCapabilityKey[]>(["code", "preview"]);
  const [toolTags, setToolTags] = useState("");
  const [preferredAdapterType, setPreferredAdapterType] = useState("CODEX");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);
  const [adapterTestType, setAdapterTestType] = useState("OPENAI_COMPATIBLE");
  const [adapterTestPrompt, setAdapterTestPrompt] = useState(
    "请生成一个 LoginPage.tsx Artifact，并按 AgentHub artifact JSON contract 返回。"
  );
  const [testingAdapter, setTestingAdapter] = useState(false);
  const [adapterTestError, setAdapterTestError] = useState<string | null>(null);
  const [adapterTestResult, setAdapterTestResult] = useState<AdapterExecutionResponse | null>(null);
  const [naturalAgentPrompt, setNaturalAgentPrompt] = useState("");
  const [draftRefinementPrompt, setDraftRefinementPrompt] = useState("");
  const [conversationalDraft, setConversationalDraft] = useState<AgentCreationDraft | null>(null);
  const [creatingDraftAgent, setCreatingDraftAgent] = useState(false);
  const [generatingAgentDraft, setGeneratingAgentDraft] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingAdapters(true);

    void getAdapters()
      .then((descriptors) => {
        if (!cancelled) {
          setAdapterDescriptors(descriptors);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdapterDescriptors([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAdapters(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function scrollToHashTarget() {
      const targetId = window.location.hash.replace("#", "");
      if (!targetId) {
        return;
      }

      window.setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 50);
    }

    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, []);

  const adapterOptions = useMemo(() => {
    return adapterDescriptors.length > 0 ? adapterDescriptors : getFallbackAdapterOptions();
  }, [adapterDescriptors]);
  const selectedAdapterDescriptor =
    adapterOptions.find((descriptor) => descriptor.adapterType === preferredAdapterType) ?? null;
  const selectedTestAdapterDescriptor =
    adapterOptions.find((descriptor) => descriptor.adapterType === adapterTestType) ?? null;
  const selectedTestAdapterDepthProfile = getAdapterDepthProfile(adapterTestType);
  const parsedAdapterArtifacts = useMemo(
    () => parseAdapterArtifacts(adapterTestResult?.content),
    [adapterTestResult]
  );
  const adapterTestQualityReport = useMemo(
    () => evaluateAdapterTestQuality(adapterTestResult?.content),
    [adapterTestResult]
  );
  const selectedCapabilityOptions = useMemo(() => {
    return TOOL_CAPABILITY_OPTIONS.filter((option) => selectedToolCapabilities.includes(option.key));
  }, [selectedToolCapabilities]);
  const effectiveToolTags = useMemo(() => {
    return mergeTags(selectedToolCapabilities, parseTags(toolTags));
  }, [selectedToolCapabilities, toolTags]);
  const resolvedCapabilityNames = useMemo(() => {
    return mergeTags(...selectedCapabilityOptions.map((option) => option.resolvedCapabilities));
  }, [selectedCapabilityOptions]);
  const deepAdapterCount = useMemo(() => {
    return adapterOptions.filter((adapter) => MAINSTREAM_DEEP_ADAPTERS.has(adapter.adapterType)).length;
  }, [adapterOptions]);
  const availableAdapterCount = useMemo(() => {
    return adapterOptions.filter((adapter) => adapter.status === "AVAILABLE").length;
  }, [adapterOptions]);

  function toggleToolCapability(key: ToolCapabilityKey) {
    setSelectedToolCapabilities((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  }

  async function handleGenerateConversationalDraft() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setGeneratingAgentDraft(true);
    try {
      setConversationalDraft(await draftAgentFromNaturalLanguage(naturalAgentPrompt));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setGeneratingAgentDraft(false);
    }
  }

  function handleApplyConversationalDraft() {
    if (!conversationalDraft) {
      return;
    }
    setName(conversationalDraft.name);
    setAvatarUrl(conversationalDraft.avatarUrl);
    setSystemPrompt(conversationalDraft.systemPrompt);
    setCapabilityTags(conversationalDraft.capabilityTags.join(", "));
    setSelectedToolCapabilities(conversationalDraft.toolTags as ToolCapabilityKey[]);
    setToolTags("");
    setPreferredAdapterType(conversationalDraft.preferredAdapterType);
    setSuccessMessage("已把对话式草案填入下方表单；你可以继续微调后创建。");
  }

  function handleRefineConversationalDraft() {
    if (!conversationalDraft || !draftRefinementPrompt.trim()) {
      return;
    }

    const refinedDraft = refineAgentCreationDraft(conversationalDraft, draftRefinementPrompt);
    setConversationalDraft(refinedDraft);
    setDraftRefinementPrompt("");
    setSuccessMessage("已根据追问更新 Agent 草案；你可以继续追问、填入表单或确认创建。");
  }

  async function handleCreateConversationalDraftAgent() {
    if (!conversationalDraft) {
      return;
    }

    setCreatingDraftAgent(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const agent = await createAgent({
        name: conversationalDraft.name,
        avatarUrl: conversationalDraft.avatarUrl,
        systemPrompt: conversationalDraft.systemPrompt,
        capabilityTags: conversationalDraft.capabilityTags,
        toolTags: conversationalDraft.toolTags,
        preferredAdapterType: conversationalDraft.preferredAdapterType
      });
      setCreatedAgent(agent);
      setSuccessMessage("已根据对话式草案创建 Agent。回到 Workspace 后可直接 @ 它参与协作。");
      setConversationalDraft(null);
      setNaturalAgentPrompt("");
      setDraftRefinementPrompt("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCreatingDraftAgent(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const agent = await createAgent({
        name,
        avatarUrl,
        systemPrompt,
        capabilityTags: parseTags(capabilityTags),
        toolTags: effectiveToolTags,
        preferredAdapterType
      });
      setCreatedAgent(agent);
      setSuccessMessage("Agent 创建成功。回到 Workspace 后可以在 Agent 列表中看到它。");
      setName("");
      setAvatarUrl("");
      setSystemPrompt("");
      setCapabilityTags("React, UI, CSS");
      setSelectedToolCapabilities(["code", "preview"]);
      setToolTags("");
      setPreferredAdapterType("CODEX");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdapterTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTestingAdapter(true);
    setAdapterTestError(null);
    setAdapterTestResult(null);

    try {
      const result = await executeAdapter(adapterTestType, {
        conversationId: "adapter-test-conversation",
        taskRunId: "adapter-test-run",
        taskStepId: "adapter-test-step",
        agentId: "adapter_test_agent",
        agentName: "Adapter Test Agent",
        userInput: adapterTestPrompt,
        systemPrompt: "You are an AgentHub adapter test agent. Return structured artifacts when possible.",
        taskDescription: "Validate adapter availability and artifact JSON output contract.",
        contextItems: [
          "This is a manual adapter test from Agent Builder.",
          "If the preferred adapter is unavailable, the registry should fallback to MOCK."
        ],
        artifactSummaries: ["Expected artifact contract: assistantMessage + artifacts[]"],
        metadata: {
          source: "AgentBuilderPage",
          manualAdapterTest: true
        }
      });
      setAdapterTestResult(result);
    } catch (error) {
      setAdapterTestError(getErrorMessage(error));
    } finally {
      setTestingAdapter(false);
    }
  }

  return (
    <section className="simple-page agent-builder-page">
      <div className="simple-page__card agent-builder-shell">
        <div className="agent-builder-hero">
          <div>
            <p className="eyebrow">Agent 管理台</p>
            <h1>Agent 构建器</h1>
            <p>创建业务 Agent、管理能力标签、检查本地 CLI，并验证 Adapter 输出边界。</p>
          </div>
          <div className="agent-builder-hero__status">
            <span>{adapterOptions.length} 个 Adapter</span>
            <strong>{loadingAdapters ? "同步中" : "已就绪"}</strong>
          </div>
        </div>

        <nav className="agent-builder-section-map" aria-label="Agent builder sections">
          <a href="#agent-directory">
            <strong>Agent Directory</strong>
            <span>管理联系人、能力标签和路由预览</span>
          </a>
          <a href="#create-agent">
            <strong>Create Agent</strong>
            <span>自然语言创建，表单只做确认和微调</span>
          </a>
          <a href="#local-cli">
            <strong>Local CLI Health</strong>
            <span>Claude Code / Codex path、version、auth、sandbox</span>
          </a>
          <a href="#adapter-test">
            <strong>Adapter Test</strong>
            <span>验证 contract、fallback 和失败分类</span>
          </a>
        </nav>

        <div className="agent-builder-content">
          <AgentDirectorySection
            adapterOptions={adapterOptions}
            availableAdapterCount={availableAdapterCount}
            selectedToolCapabilities={selectedToolCapabilities}
          />

          <div className="agent-builder-main-stack">
            <div className="agent-builder-flow" aria-label="Agent creation flow">
              <span>1. 自然语言草案</span>
              <span>2. 关键字段确认</span>
              <span>3. 高级配置折叠</span>
              <span>4. Preferred Adapter</span>
              <span>5. Workspace @Agent</span>
            </div>

            <CreateAgentSection
              adapterOptions={adapterOptions}
              name={name}
              avatarUrl={avatarUrl}
              systemPrompt={systemPrompt}
              capabilityTags={capabilityTags}
              selectedToolCapabilities={selectedToolCapabilities}
              toolTags={toolTags}
              preferredAdapterType={preferredAdapterType}
              submitting={submitting}
              createdAgent={createdAgent}
              naturalAgentPrompt={naturalAgentPrompt}
              draftRefinementPrompt={draftRefinementPrompt}
              conversationalDraft={conversationalDraft}
              creatingDraftAgent={creatingDraftAgent}
              generatingAgentDraft={generatingAgentDraft}
              effectiveToolTags={effectiveToolTags}
              resolvedCapabilityNames={resolvedCapabilityNames}
              selectedAdapterDescriptor={selectedAdapterDescriptor}
              onNameChange={setName}
              onAvatarUrlChange={setAvatarUrl}
              onSystemPromptChange={setSystemPrompt}
              onCapabilityTagsChange={setCapabilityTags}
              onToolTagsChange={setToolTags}
              onPreferredAdapterChange={setPreferredAdapterType}
              onNaturalAgentPromptChange={setNaturalAgentPrompt}
              onDraftRefinementPromptChange={setDraftRefinementPrompt}
              onToggleToolCapability={toggleToolCapability}
              onGenerateConversationalDraft={() => {
                void handleGenerateConversationalDraft();
              }}
              onApplyConversationalDraft={handleApplyConversationalDraft}
              onRefineConversationalDraft={handleRefineConversationalDraft}
              onCreateConversationalDraftAgent={() => {
                void handleCreateConversationalDraftAgent();
              }}
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            />

            <LocalCliHealthSection
              adapterOptions={adapterOptions}
              preferredAdapterType={preferredAdapterType}
              onSelectAdapter={setPreferredAdapterType}
            />

            <AdapterTestSection
              adapterOptions={adapterOptions}
              adapterTestType={adapterTestType}
              adapterTestPrompt={adapterTestPrompt}
              testingAdapter={testingAdapter}
              adapterTestError={adapterTestError}
              adapterTestResult={adapterTestResult}
              selectedTestAdapterDescriptor={selectedTestAdapterDescriptor}
              selectedTestAdapterDepthProfile={selectedTestAdapterDepthProfile}
              adapterTestQualityReport={adapterTestQualityReport}
              parsedAdapterArtifacts={parsedAdapterArtifacts}
              onAdapterTestTypeChange={setAdapterTestType}
              onAdapterTestPromptChange={setAdapterTestPrompt}
              onSubmit={(event) => {
                void handleAdapterTest(event);
              }}
            />

            {errorMessage ? <div className="builder-feedback builder-feedback--error">{errorMessage}</div> : null}
            {successMessage ? <div className="builder-feedback builder-feedback--success">{successMessage}</div> : null}
            <div className="agent-builder-muted">
              当前深接 Adapter：{deepAdapterCount}。STATIC / MOCK / FALLBACK 仅作为边界明确的兜底能力展示。
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
