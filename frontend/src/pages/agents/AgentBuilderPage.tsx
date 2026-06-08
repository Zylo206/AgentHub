import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { createAgent, draftAgentFromNaturalLanguage, getAdapters } from "../../api/agenthubApi";
import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type Agent,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
import { refineAgentCreationDraft, type AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { CreateAgentSection } from "./CreateAgentSection";
import { LocalCliHealthSection } from "./LocalCliHealthSection";
import { getErrorMessage, getFallbackAdapterOptions, mergeTags, parseTags } from "./agentBuilderUtils";
import "../../styles/workspace.css";
import "../../styles/production-alignment.css";
import "../../styles/pages/agents.css";

type AgentBuilderView = "create" | "cli";

function getViewFromLocation(search: string, hash: string): AgentBuilderView {
  const params = new URLSearchParams(search);
  if (params.get("view") === "cli" || hash === "#local-cli") {
    return "cli";
  }
  return "create";
}

export function AgentBuilderPage() {
  const location = useLocation();
  const view = getViewFromLocation(location.search, location.hash);
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

  const adapterOptions = useMemo(() => {
    return adapterDescriptors.length > 0 ? adapterDescriptors : getFallbackAdapterOptions();
  }, [adapterDescriptors]);
  const selectedAdapterDescriptor =
    adapterOptions.find((descriptor) => descriptor.adapterType === preferredAdapterType) ?? null;
  const selectedCapabilityOptions = useMemo(() => {
    return TOOL_CAPABILITY_OPTIONS.filter((option) => selectedToolCapabilities.includes(option.key));
  }, [selectedToolCapabilities]);
  const effectiveToolTags = useMemo(() => {
    return mergeTags(selectedToolCapabilities, parseTags(toolTags));
  }, [selectedToolCapabilities, toolTags]);
  const resolvedCapabilityNames = useMemo(() => {
    return mergeTags(...selectedCapabilityOptions.map((option) => option.resolvedCapabilities));
  }, [selectedCapabilityOptions]);

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
    setSuccessMessage("已将 Agent 草案填入表单，你可以继续调整后创建。");
  }

  function handleRefineConversationalDraft() {
    if (!conversationalDraft || !draftRefinementPrompt.trim()) {
      return;
    }

    setConversationalDraft(refineAgentCreationDraft(conversationalDraft, draftRefinementPrompt));
    setDraftRefinementPrompt("");
    setSuccessMessage("已根据补充说明更新 Agent 草案。");
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
      setSuccessMessage("已创建 Agent。返回 Workspace 后可以直接 @ 它参与协作。");
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
      setSuccessMessage("Agent 创建成功。返回 Workspace 后可以在 Agent 列表中看到它。");
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

  return (
    <section className={`simple-page agent-builder-page agent-builder-page--${view}`}>
      <div className="simple-page__card agent-builder-shell">
        <header className="agent-builder-hero">
          <div>
            <p className="eyebrow">{view === "cli" ? "LOCAL CLI HEALTH" : "AGENT 管理台"}</p>
            <h1>{view === "cli" ? "本地 CLI 健康检查" : "创建业务 Agent"}</h1>
            <p>
              {view === "cli"
                ? "只检查 Claude Code 与 Codex 的本机路径、版本、授权、Schema、Stream 和沙箱能力。"
                : "用自然语言生成业务 Agent 草案，确认名称、能力标签、工具能力和首选 Adapter 后进入 Workspace 协作。"}
            </p>
          </div>
          <div className="agent-builder-hero__status">
            <span>{adapterOptions.length} 个 Adapter</span>
            <strong>{loadingAdapters ? "同步中" : "已就绪"}</strong>
          </div>
        </header>

        <div className="agent-builder-view-switch" aria-label="Agent builder view switch">
          <Link className={view === "create" ? "agent-builder-view-switch__item--active" : ""} to="/agents">
            创建业务 Agent
          </Link>
          <Link className={view === "cli" ? "agent-builder-view-switch__item--active" : ""} to="/agents?view=cli">
            检查本地 CLI
          </Link>
        </div>

        <main className="agent-builder-content agent-builder-content--single">
          <div className="agent-builder-main-stack">
            {view === "cli" ? (
              <LocalCliHealthSection
                adapterOptions={adapterOptions}
                preferredAdapterType={preferredAdapterType}
                onSelectAdapter={setPreferredAdapterType}
              />
            ) : (
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
            )}

            {errorMessage ? <div className="builder-feedback builder-feedback--error">{errorMessage}</div> : null}
            {successMessage ? <div className="builder-feedback builder-feedback--success">{successMessage}</div> : null}
          </div>
        </main>
      </div>
    </section>
  );
}
