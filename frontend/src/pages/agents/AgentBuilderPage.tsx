import { useEffect, useMemo, useState } from "react";
import { createAgent, getAdapters } from "../../api/agenthubApi";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

const ADAPTER_OPTIONS = ["MOCK", "CODEX", "CLAUDE_CODE", "OPEN_CODE", "OPENAI_COMPATIBLE"] as const;

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

export function AgentBuilderPage() {
  const [adapterDescriptors, setAdapterDescriptors] = useState<AdapterDescriptor[]>([]);
  const [loadingAdapters, setLoadingAdapters] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilityTags, setCapabilityTags] = useState("React, UI, CSS");
  const [toolTags, setToolTags] = useState("code, preview");
  const [preferredAdapterType, setPreferredAdapterType] = useState("CODEX");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdAgent, setCreatedAgent] = useState<Agent | null>(null);

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
        toolTags: parseTags(toolTags),
        preferredAdapterType
      });
      setCreatedAgent(agent);
      setSuccessMessage("Agent 创建成功。回到工作台后可以在 Agent 列表中看到它。");
      setName("");
      setAvatarUrl("");
      setSystemPrompt("");
      setCapabilityTags("React, UI, CSS");
      setToolTags("code, preview");
      setPreferredAdapterType("CODEX");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
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

              <label className="agent-builder-field">
                <span>工具标签</span>
                <input value={toolTags} onChange={(event) => setToolTags(event.target.value)} placeholder="code, preview" />
              </label>
            </div>

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
              {parseTags(toolTags).map((tag) => (
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
      </div>
    </section>
  );
}
