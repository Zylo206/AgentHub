import { useEffect, useMemo, useState } from "react";
import { createAgent, draftAgentFromNaturalLanguage, executeAdapter, getAdapters } from "../../api/agenthubApi";
import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type AdapterExecutionResponse,
  type Agent,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
import type { AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

const ADAPTER_OPTIONS = ["MOCK", "CODEX", "CLAUDE_CODE", "OPEN_CODE", "OPENAI_COMPATIBLE"] as const;

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeTags(...tagGroups: string[][]): string[] {
  return Array.from(
    new Set(
      tagGroups
        .flat()
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "未知错误";
}

function getFallbackAdapterOptions(): AdapterDescriptor[] {
  return ADAPTER_OPTIONS.map((option) => ({
    adapterType: option,
    status: option === "MOCK" ? "AVAILABLE" : option === "OPENAI_COMPATIBLE" ? "DISABLED" : "PLACEHOLDER",
    enabled: option === "MOCK",
    placeholder: option !== "MOCK" && option !== "OPENAI_COMPATIBLE",
    description: "",
    failureReason: null
  }));
}

const MAINSTREAM_DEEP_ADAPTERS = new Set(["OPENAI_COMPATIBLE", "CLAUDE_CODE", "CODEX"]);

function getAdapterDepthProfile(adapterType?: string | null): { label: string; description: string; className: string } {
  if (adapterType && MAINSTREAM_DEEP_ADAPTERS.has(adapterType)) {
    return {
      label: "深接 v1",
      description: "Artifact-only、REAL_FIRST、Contract / Quality / Build gate、fallback reason 可观测。",
      className: "agent-builder-depth-badge--deep"
    };
  }

  if (adapterType === "OPEN_CODE") {
    return {
      label: "Probe",
      description: "当前只做 CLI 探测和 fallback，不作为本轮主流平台深接目标。",
      className: "agent-builder-depth-badge--probe"
    };
  }

  return {
    label: "Fallback",
    description: "稳定演示安全网，不能包装成真实主流 Agent 平台。",
    className: "agent-builder-depth-badge--fallback"
  };
}

function stripJsonFence(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("```json")) {
    return trimmed.slice("```json".length).replace(/```$/, "").trim();
  }
  if (trimmed.startsWith("```")) {
    return trimmed.slice("```".length).replace(/```$/, "").trim();
  }
  return trimmed;
}

function parseAdapterArtifacts(content?: string | null): Array<{
  title?: string;
  type?: string;
  language?: string;
  summary?: string;
  content?: string;
}> {
  if (!content?.trim()) {
    return [];
  }

  try {
    const payload = JSON.parse(stripJsonFence(content));
    const artifacts: Record<string, unknown>[] = Array.isArray(payload?.artifacts)
      ? payload.artifacts.filter((artifact: unknown): artifact is Record<string, unknown> => looksLikeAdapterArtifact(artifact))
      : payload?.artifact
        ? [payload.artifact]
        : looksLikeAdapterArtifact(payload)
          ? [payload]
          : [];
    return artifacts
      .map((artifact: Record<string, unknown>) => normalizeAdapterArtifact(artifact))
      .filter((artifact) => Boolean(artifact.content));
  } catch {
    return [];
  }
}

function looksLikeAdapterArtifact(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const candidate = payload as Record<string, unknown>;
  return ["content", "body", "text", "markdown", "code"].some((key) => typeof candidate[key] === "string");
}

function firstStringValue(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeAdapterArtifact(artifact: Record<string, unknown>) {
  return {
    title: firstStringValue(artifact, ["title", "fileName", "filename", "name", "path"]),
    type: firstStringValue(artifact, ["type", "artifactType", "kind"]),
    language: firstStringValue(artifact, ["language", "lang", "extension"]),
    summary: firstStringValue(artifact, ["summary", "description", "reason"]),
    content: firstStringValue(artifact, ["content", "body", "text", "markdown", "code"])
  };
}

function evaluateAdapterTestQuality(content?: string | null) {
  if (!content?.trim()) {
    return {
      parseStatus: "EMPTY",
      qualityStatus: "REJECTED",
      qualityReason: "Adapter response is empty.",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  try {
    JSON.parse(stripJsonFence(content));
  } catch {
    return {
      parseStatus: "FALLBACK_TEXT",
      qualityStatus: "NOT_EVALUATED",
      qualityReason: "Response is not artifact JSON. Backend may downgrade plain text, but REAL_FIRST will not promote it.",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  const artifacts = parseAdapterArtifacts(content);
  if (artifacts.length === 0) {
    return {
      parseStatus: "INVALID_ARTIFACT_SCHEMA",
      qualityStatus: "REJECTED",
      qualityReason: "JSON parsed, but no artifacts[] with usable content were found.",
      acceptedCount: 0,
      rejectedCount: 0
    };
  }

  const acceptedCount = artifacts.filter((artifact) => {
    const contentLength = (artifact.content || "").trim().length;
    const hasContractFields = Boolean(
      artifact.title && artifact.type && artifact.language && artifact.summary && contentLength > 20
    );
    const isCodeFenceWrapped =
      String(artifact.type || "").toUpperCase() === "CODE" &&
      (artifact.content || "").trim().startsWith("```");
    return hasContractFields && !isCodeFenceWrapped;
  }).length;
  const rejectedCount = artifacts.length - acceptedCount;

  return {
    parseStatus: "VALID_JSON_ARTIFACTS",
    qualityStatus: acceptedCount > 0 ? "ACCEPTED" : "REJECTED",
    qualityReason:
      acceptedCount > 0
        ? `Accepted ${acceptedCount} artifact(s); rejected ${rejectedCount}.`
        : "Parsed artifacts failed contract checks: title/type/language/summary/content are required; CODE content must be raw source.",
    acceptedCount,
    rejectedCount
  };
}

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
  const selectedTestAdapterDescriptor =
    adapterOptions.find((descriptor) => descriptor.adapterType === adapterTestType) ?? null;
  const selectedAdapterDepthProfile = getAdapterDepthProfile(preferredAdapterType);
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
  const previewAgentName = name.trim() || "新的 Specialist Agent";
  const previewInitial = previewAgentName.charAt(0).toUpperCase();

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
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setCreatingDraftAgent(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setSuccessMessage("Agent 创建成功。回到工作台后可以在 Agent 列表中看到它。");
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

  async function handleAdapterTest(event: React.FormEvent<HTMLFormElement>) {
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
            <p className="eyebrow">Agent 配置</p>
            <h1>Agent 构建器</h1>
            <p>创建一个专用 Agent，配置首选 Adapter，并让它出现在 IM 工作台中。</p>
          </div>
          <div className="agent-builder-hero__status">
            <span>{adapterOptions.length} 个 Adapter</span>
            <strong>{loadingAdapters ? "同步中" : "已就绪"}</strong>
          </div>
        </div>

        <aside className="agent-builder-left-rail" aria-label="Agent integration rail">
          <button type="button" className="agent-builder-rail-new-button">+ 新建对话</button>
          <div className="agent-builder-rail-search">搜索会话 / Agent</div>
          <div className="agent-builder-rail-tabs">
            <span className="is-active">全部</span>
            <span>未读</span>
            <span>置顶</span>
            <span>归档</span>
          </div>
          <div className="agent-builder-rail-card agent-builder-rail-card--primary">
            <div className="agent-builder-rail-card__header">
              <span>Agent 接入矩阵</span>
              <strong>{availableAdapterCount}/{adapterOptions.length}</strong>
            </div>
            <p>
              统一 AdapterRegistry 管理 OpenAI-compatible、Claude Code、Codex 与 MOCK fallback。
              深接平台必须通过 Artifact contract、质量门禁和 fallback 诊断。
            </p>
          </div>

          <div className="agent-builder-rail-section">
            <span className="agent-builder-rail-title">主流平台</span>
            {adapterOptions.map((adapter) => {
              const profile = getAdapterDepthProfile(adapter.adapterType);
              return (
                <div className="agent-builder-adapter-row" key={`rail-${adapter.adapterType}`}>
                  <span className="agent-builder-adapter-row__mark">{adapter.adapterType.slice(0, 2)}</span>
                  <div>
                    <strong>{adapter.adapterType}</strong>
                    <small>{displayStatus(adapter.status)}</small>
                  </div>
                  <em className={`agent-builder-depth-badge ${profile.className}`}>{profile.label}</em>
                </div>
              );
            })}
          </div>

          <div className="agent-builder-rail-section">
            <span className="agent-builder-rail-title">工具能力</span>
            <div className="agent-builder-capability-cloud">
              {TOOL_CAPABILITY_OPTIONS.map((option) => (
                <span
                  className={selectedToolCapabilities.includes(option.key) ? "is-selected" : ""}
                  key={`rail-capability-${option.key}`}
                >
                  {option.label}
                </span>
              ))}
            </div>
          </div>

          <div className="agent-builder-rail-card">
            <div className="agent-builder-rail-card__header">
              <span>路由预览</span>
              <strong>@Agent</strong>
            </div>
            <p>保存后会进入左侧联系人列表，并参与 mentionedAgentIds、Tool Capability 与 preferredAdapter 路由。</p>
          </div>

          <div className="agent-builder-rail-section agent-builder-contact-list">
            <span className="agent-builder-rail-title">我的 Agent</span>
            {[
              ["O", "Orchestrator", "任务规划", "在线"],
              ["F", "Frontend Specialist", "React / UI", "在线"],
              ["R", "Reviewer", "质量门禁", "空闲"],
              ["CC", "Claude Code", "代码生成", "可用"],
              ["CX", "Codex", "补全 / 重构", "可用"]
            ].map(([initial, agentName, capability, status]) => (
              <div className="agent-builder-contact-row" key={agentName}>
                <span>{initial}</span>
                <div>
                  <strong>{agentName}</strong>
                  <small>{capability}</small>
                </div>
                <em>{status}</em>
              </div>
            ))}
          </div>
        </aside>

        <div className="agent-builder-flow" aria-label="Agent creation flow">
          <span>1. 基本信息</span>
          <span>2. System Prompt</span>
          <span>3. Tool Capability</span>
          <span>4. Preferred Adapter</span>
          <span>5. 在 Workspace @Agent</span>
        </div>

        <section className="agent-builder-suggestion-card" aria-label="Agent creation suggestion">
          <div className="agent-builder-suggestion-card__icon">✦</div>
          <div className="agent-builder-suggestion-card__body">
            <div className="agent-builder-suggestion-card__header">
              <div>
                <strong>建议创建自定义 Agent</strong>
                <p>基于你的描述，为你生成 Agent 草案，请确认或继续编辑。</p>
              </div>
              <span>10:50</span>
            </div>
            <div className="agent-builder-suggestion-grid">
              <div>
                <span>任务摘要</span>
                <strong>创建安全评审协作成员</strong>
              </div>
              <div>
                <span>角色定位</span>
                <strong>{previewAgentName}</strong>
              </div>
              <div>
                <span>工具能力</span>
                <strong>{effectiveToolTags.join(" / ") || "code / review / api"}</strong>
              </div>
              <div>
                <span>首选 Adapter</span>
                <strong>{preferredAdapterType}</strong>
              </div>
            </div>
            <div className="agent-builder-suggestion-actions">
              <button type="button" className="secondary-button">编辑草案</button>
              <button type="button" className="primary-button">确认创建</button>
            </div>
          </div>
        </section>

        <section className="agent-builder-message-stack" aria-label="Agent builder collaboration messages">
          <article className="agent-builder-protocol-message agent-builder-protocol-message--task">
            <div className="agent-builder-protocol-avatar">O</div>
            <div className="agent-builder-protocol-body">
              <div className="agent-builder-protocol-head">
                <strong>Orchestrator</strong>
                <span>TASK · 任务规划</span>
                <time>10:51</time>
              </div>
              <p>我将根据你的需求创建一个安全评审专用 Agent，并为你规划职责与能力。</p>
              <div className="agent-builder-step-strip">
                <span>1 需求理解</span>
                <span>2 能力规划</span>
                <span>3 System Prompt 生成</span>
                <span>4 工具映射</span>
                <span>5 路由预览</span>
              </div>
            </div>
          </article>
          <article className="agent-builder-protocol-message agent-builder-protocol-message--result">
            <div className="agent-builder-protocol-avatar">AB</div>
            <div className="agent-builder-protocol-body">
              <div className="agent-builder-protocol-head">
                <strong>Agent Builder</strong>
                <span>RESULT · 生成草案</span>
                <time>10:51</time>
              </div>
              <p>已为你生成 Agent 草案，请确认或继续优化。</p>
            </div>
          </article>
          <article className="agent-builder-protocol-message agent-builder-protocol-message--review">
            <div className="agent-builder-protocol-avatar">R</div>
            <div className="agent-builder-protocol-body">
              <div className="agent-builder-protocol-head">
                <strong>Reviewer</strong>
                <span>REVIEW · 评审结果</span>
                <time>10:52</time>
              </div>
              <div className="agent-builder-review-grid">
                <span>System Prompt 通过</span>
                <span>Tool Capability 通过</span>
                <span>Adapter 选择通过</span>
                <span>路由预览通过</span>
              </div>
            </div>
          </article>
        </section>

        <section className="conversational-agent-panel" aria-label="Conversational Agent creation">
          <div className="conversational-agent-panel__header">
            <div>
              <p className="eyebrow">对话式创建 Agent</p>
              <h2>用一句话生成协作成员草案</h2>
              <p>先用规则解析生成可检查草案，再确认创建；不调用外部模型，也不把 OpenCode 包装成深接平台。</p>
            </div>
            <span className="agent-builder-depth-badge agent-builder-depth-badge--deep">
              Claude / Codex / OpenAI-compatible 深接 v1
            </span>
          </div>
          <label className="agent-builder-field">
            <span>描述你想创建的 Agent</span>
            <textarea
              data-testid="conversational-agent-prompt"
              value={naturalAgentPrompt}
              onChange={(event) => setNaturalAgentPrompt(event.target.value)}
              placeholder="例如：创建一个安全评审 Agent，优先使用 Claude Code，负责 review、安全和质量门禁。"
            />
          </label>
          <div className="conversational-agent-panel__actions">
            <button
              type="button"
              className="secondary-button"
              data-testid="conversational-agent-generate"
              disabled={generatingAgentDraft || !naturalAgentPrompt.trim()}
              onClick={handleGenerateConversationalDraft}
            >
              {generatingAgentDraft ? "生成中..." : "生成 Agent 草案"}
            </button>
            {conversationalDraft ? (
              <>
                <button type="button" className="secondary-button" onClick={handleApplyConversationalDraft}>
                  填入下方表单
                </button>
                <button
                  type="button"
                  className="primary-button"
                  data-testid="conversational-agent-create"
                  disabled={creatingDraftAgent}
                  onClick={handleCreateConversationalDraftAgent}
                >
                  {creatingDraftAgent ? "创建中..." : "确认创建 Agent"}
                </button>
              </>
            ) : null}
          </div>
          {conversationalDraft ? (
            <div className="conversational-agent-draft" data-testid="conversational-agent-draft">
              <div className="conversational-agent-draft__identity">
                <span>{conversationalDraft.name.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{conversationalDraft.name}</strong>
                  <p>{conversationalDraft.systemPrompt}</p>
                </div>
              </div>
              <div className="conversational-agent-draft__grid">
                <div>
                  <span>Preferred Adapter</span>
                  <strong>{conversationalDraft.preferredAdapterType}</strong>
                  <em>{getAdapterDepthProfile(conversationalDraft.preferredAdapterType).label}</em>
                </div>
                <div>
                  <span>Draft Source</span>
                  <strong>{conversationalDraft.draftSource || "UNKNOWN"}</strong>
                  {conversationalDraft.fallbackReason ? <em>{conversationalDraft.fallbackReason}</em> : null}
                </div>
                <div>
                  <span>Capability</span>
                  <strong>{conversationalDraft.capabilityTags.join(" / ")}</strong>
                </div>
                <div>
                  <span>Tool Capability</span>
                  <strong>{conversationalDraft.toolTags.join(" / ")}</strong>
                </div>
              </div>
              <div className="conversational-agent-draft__reasons">
                {conversationalDraft.reasoning.map((reason) => (
                  <span key={reason}>{reason}</span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="agent-builder-layout">
          <form className="agent-builder-form" onSubmit={handleSubmit}>
            <label className="agent-builder-field">
              <span>Agent 名称</span>
              <input
                data-testid="agent-builder-name-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="我的前端 Agent"
              />
            </label>

            <label className="agent-builder-field">
              <span>头像 URL</span>
              <input
                data-testid="agent-builder-avatar-url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </label>

            <label className="agent-builder-field">
              <span>System Prompt</span>
              <textarea
                data-testid="agent-builder-system-prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="你是一个前端专家，擅长 React、UI 和 CSS。"
              />
            </label>

            <div className="simple-page__grid agent-builder-tag-grid">
              <label className="agent-builder-field">
                <span>能力标签</span>
                <input
                  data-testid="agent-builder-capability-tags"
                  value={capabilityTags}
                  onChange={(event) => setCapabilityTags(event.target.value)}
                  placeholder="React, UI, CSS"
                />
              </label>
            </div>

            <fieldset className="agent-builder-capability-fieldset">
              <legend>Tool Capability</legend>
              <p>选择这个 Agent 能实际调用或承担的工具能力。保存时会继续写入现有 toolTags 字段，兼容后端路由。</p>
              <div className="tool-capability-grid">
                {TOOL_CAPABILITY_OPTIONS.map((option) => {
                  const checked = selectedToolCapabilities.includes(option.key);
                  return (
                    <label
                      className={`tool-capability-card${checked ? " tool-capability-card--selected" : ""}`}
                      data-testid={`tool-capability-${option.key}`}
                      key={option.key}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleToolCapability(option.key)}
                      />
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.key}</small>
                      </span>
                      <em>{option.description}</em>
                    </label>
                  );
                })}
              </div>
              <div className="tool-capability-resolved">
                <span>路由能力映射</span>
                <div className="tag-row">
                  {resolvedCapabilityNames.length > 0 ? (
                    resolvedCapabilityNames.map((capability) => (
                      <span className="agent-tag agent-tag--tool" key={`resolved-${capability}`}>
                        {capability}
                      </span>
                    ))
                  ) : (
                    <span className="agent-builder-muted">未选择时，后端会按通用 Agent 处理。</span>
                  )}
                </div>
              </div>
            </fieldset>

            <label className="agent-builder-field">
              <span>兼容工具标签（可选）</span>
              <input
                data-testid="agent-builder-tool-tags"
                value={toolTags}
                onChange={(event) => setToolTags(event.target.value)}
                placeholder="例如 schema, task_planner；会与上方选择合并写入 toolTags"
              />
            </label>

            <label className="agent-builder-field">
              <span>首选 Adapter</span>
              <select
                data-testid="agent-builder-preferred-adapter"
                value={preferredAdapterType}
                onChange={(event) => setPreferredAdapterType(event.target.value)}
              >
                {adapterOptions.map((option) => (
                  <option key={option.adapterType} value={option.adapterType}>
                    {option.adapterType} - {displayStatus(option.status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="agent-builder-adapter-card">
              <div className="agent-builder-adapter-status">
                <strong>{selectedAdapterDescriptor?.adapterType || preferredAdapterType}</strong>
                <span
                  className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(
                    selectedAdapterDescriptor?.status || "unknown"
                  )}`}
                >
                  {loadingAdapters && adapterDescriptors.length === 0
                    ? "加载中"
                    : displayStatus(selectedAdapterDescriptor?.status || "UNKNOWN")}
                </span>
              </div>
              <div className={`agent-builder-depth-badge ${selectedAdapterDepthProfile.className}`}>
                <strong>{selectedAdapterDepthProfile.label}</strong>
                <span>{selectedAdapterDepthProfile.description}</span>
              </div>
              {selectedAdapterDescriptor?.description ? (
                <div className="agent-builder-adapter-note">{selectedAdapterDescriptor.description}</div>
              ) : null}
              {selectedAdapterDescriptor?.failureReason ? (
                <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
                  {selectedAdapterDescriptor.failureReason}
                </div>
              ) : null}
              {preferredAdapterType === "OPENAI_COMPATIBLE" && selectedAdapterDescriptor?.status !== "AVAILABLE" ? (
                <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
                  该 Adapter 尚未完整配置，Demo 执行时会回退到 MOCK。
                </div>
              ) : null}
            </div>

            <div className="agent-builder-actions">
              <button type="submit" className="primary-button" data-testid="agent-builder-submit" disabled={submitting || !name.trim()}>
                {submitting ? "创建中..." : "创建 Agent"}
              </button>
            </div>
          </form>

          <aside className="agent-builder-preview">
            <p className="eyebrow">预览</p>
            <div className="agent-builder-preview__avatar">{name.trim().charAt(0).toUpperCase() || "A"}</div>
            <h2>{name.trim() || "新的 Specialist Agent"}</h2>
            <p>{systemPrompt.trim() || "填写 System Prompt 后，这里会展示 Agent 的行为设定。"}</p>
            <div className="tag-row">
              {parseTags(capabilityTags).map((tag) => (
                <span className="agent-tag" key={`preview-cap-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="tag-row">
              {effectiveToolTags.map((tag) => (
                <span className="agent-tag agent-tag--tool" key={`preview-tool-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          </aside>
        </div>

        <section className="agent-builder-composer" aria-label="Agent builder composer">
          <textarea
            aria-label="Agent builder message draft"
            readOnly
            value="发送消息，@Agent 或描述你的需求..."
          />
          <div className="agent-builder-composer__bar">
            <div>
              <span>📎</span>
              <span>@</span>
              <span>☺</span>
              <span>⌗</span>
              <span>&lt;/&gt;</span>
            </div>
            <button type="button" aria-label="Send Agent builder preview message">➤</button>
          </div>
        </section>

        <aside className="agent-builder-inspector" aria-label="Agent inspector">
          <div className="agent-builder-inspector__header">
            <div>
              <span>Agent 接入工作台</span>
              <strong>{previewAgentName}</strong>
            </div>
            <em>{deepAdapterCount} deep</em>
          </div>

          <div className="agent-builder-inspector-tabs" aria-label="Agent inspector tabs">
            <span className="is-active">概览</span>
            <span>能力</span>
            <span>Adapter</span>
            <span>路由</span>
            <span>测试</span>
          </div>

          <div className="agent-builder-inspector-overview">
            <div>
              <span>来源</span>
              <strong>REAL_ADAPTER</strong>
            </div>
            <div>
              <span>质量</span>
              <strong>ACCEPTED</strong>
            </div>
            <div>
              <span>健康度</span>
              <strong>良好</strong>
            </div>
            <div>
              <span>可用性</span>
              <strong>稳定</strong>
            </div>
          </div>

          <div className="agent-builder-preview agent-builder-preview--inspector">
            <p className="eyebrow">联系人预览</p>
            <div className="agent-builder-preview__avatar">{previewInitial}</div>
            <h2>{previewAgentName}</h2>
            <p>{systemPrompt.trim() || "填写 System Prompt 后，这里会展示 Agent 的职责、行为边界和协作方式。"}</p>
            <div className="tag-row">
              {parseTags(capabilityTags).map((tag) => (
                <span className="agent-tag" key={`inspector-cap-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="tag-row">
              {effectiveToolTags.map((tag) => (
                <span className="agent-tag agent-tag--tool" key={`inspector-tool-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="agent-builder-inspector-card agent-builder-inspector-card--adapter-list">
            <span>接入 Adapter 状态</span>
            {adapterOptions.map((adapter) => (
              <div className="agent-builder-inspector-adapter" key={`inspector-${adapter.adapterType}`}>
                <strong>{adapter.adapterType}</strong>
                <em>{displayStatus(adapter.status)}</em>
                <small>{getAdapterDepthProfile(adapter.adapterType).label}</small>
              </div>
            ))}
          </div>

          <div className="agent-builder-inspector-card">
            <span>Adapter 诊断</span>
            <div className="agent-builder-inspector-metric">
              <strong>{selectedAdapterDescriptor?.adapterType || preferredAdapterType}</strong>
              <em>{displayStatus(selectedAdapterDescriptor?.status || "UNKNOWN")}</em>
            </div>
            <p>{selectedAdapterDepthProfile.description}</p>
          </div>

          <div className="agent-builder-inspector-card">
            <span>路由证据</span>
            <ul>
              <li>Tool Capability: {effectiveToolTags.join(" / ") || "未设置"}</li>
              <li>Resolved: {resolvedCapabilityNames.join(" / ") || "通用 Agent"}</li>
              <li>Preferred Adapter: {preferredAdapterType}</li>
            </ul>
          </div>

          <div className="agent-builder-inspector-card">
            <span>质量边界</span>
            <ul>
              <li>REAL_ADAPTER 必须通过 contract / quality gate。</li>
              <li>CLI 不可用时保留 MOCK fallback。</li>
              <li>OpenCode 当前保持 probe-only，不包装成深接平台。</li>
            </ul>
          </div>
        </aside>

        {errorMessage ? <div className="builder-feedback builder-feedback--error">{errorMessage}</div> : null}
        {successMessage ? <div className="builder-feedback builder-feedback--success">{successMessage}</div> : null}

        {createdAgent ? (
          <div className="builder-summary">
            <h2>已创建 Agent 摘要</h2>
            <p>
              <strong>名称：</strong> {createdAgent.name}
            </p>
            <p>
              <strong>角色：</strong> {displayAgentRole(createdAgent.role)}
            </p>
            <p>
              <strong>首选 Adapter：</strong> {createdAgent.preferredAdapterType || "MOCK"}
            </p>
            <p>
              <strong>能力标签：</strong> {createdAgent.capabilityTags.join(", ") || "无"}
            </p>
            <p>
              <strong>工具标签：</strong> {createdAgent.toolTags.join(", ") || "无"}
            </p>
          </div>
        ) : null}

        <section className="adapter-test-panel">
          <div className="adapter-test-panel__header">
            <div>
              <p className="eyebrow">Adapter Test</p>
              <h2>Adapter 手动测试面板</h2>
              <p>用于验证 OPENAI_COMPATIBLE / CLI Adapter 的可用性、fallback 原因和 artifact JSON 输出。</p>
            </div>
            <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(selectedTestAdapterDescriptor?.status || "unknown")}`}>
              {displayStatus(selectedTestAdapterDescriptor?.status || "UNKNOWN")}
            </span>
            <span className={`agent-builder-depth-badge ${selectedTestAdapterDepthProfile.className}`}>
              {selectedTestAdapterDepthProfile.label}
            </span>
          </div>

          <form className="adapter-test-form" onSubmit={handleAdapterTest}>
            <label className="agent-builder-field">
              <span>测试 Adapter</span>
              <select value={adapterTestType} onChange={(event) => setAdapterTestType(event.target.value)}>
                {adapterOptions.map((option) => (
                  <option key={`test-${option.adapterType}`} value={option.adapterType}>
                    {option.adapterType} - {displayStatus(option.status)}
                  </option>
                ))}
              </select>
            </label>
            <label className="agent-builder-field">
              <span>测试 Prompt</span>
              <textarea
                value={adapterTestPrompt}
                onChange={(event) => setAdapterTestPrompt(event.target.value)}
                placeholder="输入用于测试 Adapter 的任务描述"
              />
            </label>
            <button type="submit" className="primary-button" disabled={testingAdapter || !adapterTestPrompt.trim()}>
              {testingAdapter ? "测试中..." : "执行 Adapter 测试"}
            </button>
          </form>

          {selectedTestAdapterDescriptor?.failureReason ? (
            <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
              当前状态说明：{selectedTestAdapterDescriptor.failureReason}
            </div>
          ) : null}
          {adapterTestError ? <div className="builder-feedback builder-feedback--error">{adapterTestError}</div> : null}

          {adapterTestResult ? (
            <div className="adapter-test-result">
              <div className="adapter-test-result__grid">
                <div>
                  <span>Preferred</span>
                  <strong>{adapterTestResult.preferredAdapterType}</strong>
                </div>
                <div>
                  <span>Actual</span>
                  <strong>{adapterTestResult.actualAdapterType}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{displayStatus(adapterTestResult.status)}</strong>
                </div>
                <div>
                  <span>Fallback</span>
                  <strong>{adapterTestResult.fallbackUsed ? "已 fallback" : "未 fallback"}</strong>
                </div>
              </div>
              <div className="adapter-test-result__grid">
                <div>
                  <span>Parse Status</span>
                  <strong>{adapterTestQualityReport.parseStatus}</strong>
                </div>
                <div>
                  <span>Quality Status</span>
                  <strong>{adapterTestQualityReport.qualityStatus}</strong>
                </div>
                <div>
                  <span>Accepted</span>
                  <strong>{adapterTestQualityReport.acceptedCount}</strong>
                </div>
                <div>
                  <span>Rejected</span>
                  <strong>{adapterTestQualityReport.rejectedCount}</strong>
                </div>
              </div>
              <div className="agent-builder-adapter-note">
                Artifact contract check: {adapterTestQualityReport.qualityReason}
              </div>
              {adapterTestResult.errorMessage ? (
                <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
                  fallback / error：{adapterTestResult.errorMessage}
                </div>
              ) : null}
              <div className="adapter-test-result__section">
                <strong>解析结果</strong>
                {parsedAdapterArtifacts.length > 0 ? (
                  <div className="adapter-test-artifact-list">
                    {parsedAdapterArtifacts.map((artifact, index) => (
                      <div className="adapter-test-artifact" key={`${artifact.title || "artifact"}-${index}`}>
                        <strong>{artifact.title || `Artifact ${index + 1}`}</strong>
                        <span>{artifact.type || "UNKNOWN"} / {artifact.language || "plain"}</span>
                        {artifact.summary ? <p>{artifact.summary}</p> : null}
                        <small>{(artifact.content || "").length} chars</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>未解析到 artifacts[]。如果 Adapter 返回普通文本，后端会按文本 Artifact 降级处理。</p>
                )}
              </div>
              <div className="adapter-test-result__section">
                <strong>原始响应</strong>
                <pre>{adapterTestResult.content || "(empty response)"}</pre>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
