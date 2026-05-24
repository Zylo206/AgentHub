import { useEffect, useMemo, useState } from "react";
import { createAgent, executeAdapter, getAdapters } from "../../api/agenthubApi";
import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type AdapterExecutionResponse,
  type Agent,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
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
    return Array.isArray(payload?.artifacts) ? payload.artifacts : [];
  } catch {
    return [];
  }
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
  const parsedAdapterArtifacts = useMemo(
    () => parseAdapterArtifacts(adapterTestResult?.content),
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

  function toggleToolCapability(key: ToolCapabilityKey) {
    setSelectedToolCapabilities((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
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

        <div className="agent-builder-layout">
          <form className="agent-builder-form" onSubmit={handleSubmit}>
            <label className="agent-builder-field">
              <span>Agent 名称</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="我的前端 Agent" />
            </label>

            <label className="agent-builder-field">
              <span>头像 URL</span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </label>

            <label className="agent-builder-field">
              <span>System Prompt</span>
              <textarea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                placeholder="你是一个前端专家，擅长 React、UI 和 CSS。"
              />
            </label>

            <div className="simple-page__grid agent-builder-tag-grid">
              <label className="agent-builder-field">
                <span>能力标签</span>
                <input
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
                value={toolTags}
                onChange={(event) => setToolTags(event.target.value)}
                placeholder="例如 schema, task_planner；会与上方选择合并写入 toolTags"
              />
            </label>

            <label className="agent-builder-field">
              <span>首选 Adapter</span>
              <select value={preferredAdapterType} onChange={(event) => setPreferredAdapterType(event.target.value)}>
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
              <button type="submit" className="primary-button" disabled={submitting || !name.trim()}>
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
