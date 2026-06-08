import { useEffect, useMemo, useState } from "react";
import {
  createAgent,
  getOpenAICompatibleRuntimeConfig,
  updateOpenAICompatibleRuntimeConfig,
  type OpenAICompatibleRuntimeConfig
} from "../../api/agenthubApi";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { displayStatus, normalizeStatusClass } from "../../utils/displayLabels";

interface WorkspaceApiProviderPanelProps {
  agents: Agent[];
  adapterDescriptors: AdapterDescriptor[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
  onAgentCreated: (agent: Agent) => void;
  onConfigured: () => Promise<void>;
}

const PROVIDER_PRESETS = [
  {
    key: "deepseek",
    label: "DeepSeek",
    providerName: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-chat"
  },
  {
    key: "openai",
    label: "OpenAI",
    providerName: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini"
  },
  {
    key: "custom",
    label: "自定义",
    providerName: "Custom OpenAI-compatible",
    baseUrl: "",
    model: ""
  }
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}

export function WorkspaceApiProviderPanel({
  agents,
  adapterDescriptors,
  selectedAgent,
  onSelectAgent,
  onAgentCreated,
  onConfigured
}: WorkspaceApiProviderPanelProps) {
  const [config, setConfig] = useState<OpenAICompatibleRuntimeConfig | null>(null);
  const [providerName, setProviderName] = useState("DeepSeek");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openAIAdapter = adapterDescriptors.find((adapter) => adapter.adapterType === "OPENAI_COMPATIBLE") ?? null;
  const apiAgents = useMemo(
    () => agents.filter((agent) => agent.preferredAdapterType === "OPENAI_COMPATIBLE"),
    [agents]
  );
  const selectedIsApiAgent = Boolean(
    selectedAgent && selectedAgent.preferredAdapterType === "OPENAI_COMPATIBLE"
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getOpenAICompatibleRuntimeConfig()
      .then((runtimeConfig) => {
        if (cancelled) return;
        setConfig(runtimeConfig);
        setEnabled(runtimeConfig.enabled);
        if (runtimeConfig.providerName) setProviderName(runtimeConfig.providerName);
        if (runtimeConfig.baseUrl) setBaseUrl(runtimeConfig.baseUrl);
        if (runtimeConfig.model) setModel(runtimeConfig.model);
      })
      .catch((caughtError) => {
        if (!cancelled) setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyPreset(key: string) {
    const preset = PROVIDER_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setProviderName(preset.providerName);
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateOpenAICompatibleRuntimeConfig({
        enabled,
        providerName,
        baseUrl,
        apiKey,
        model
      });
      setConfig(updated);
      setApiKey("");
      await onConfigured();
      setMessage("API 问答通道已更新。发送 IM 时选择 API Agent 即会走远程 OpenAI-compatible HTTP。");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  async function handlePrepareApiAgent() {
    const existing = apiAgents[0];
    if (existing) {
      onSelectAgent(existing);
      setMessage(`已选择 ${existing.name}，后续 IM 问答将优先使用 API 通道。`);
      return;
    }

    setCreatingAgent(true);
    setError(null);
    setMessage(null);
    try {
      const agent = await createAgent({
        name: "API 问答 Agent",
        avatarUrl: "",
        systemPrompt: "你是 AgentHub IM 问答 Agent。优先通过 OpenAI-compatible API 回答用户问题，并按任务需要生成 Artifact JSON。",
        capabilityTags: ["IM 问答", "API", providerName],
        toolTags: ["api", "schema", "task_planner"],
        preferredAdapterType: "OPENAI_COMPATIBLE"
      });
      onAgentCreated(agent);
      onSelectAgent(agent);
      setMessage("已创建并选择 API 问答 Agent。");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setCreatingAgent(false);
    }
  }

  return (
    <section className="workspace-api-provider-panel" data-testid="workspace-api-provider-panel">
      <div className="workspace-api-provider-panel__header">
        <div>
          <span>IM API 接入</span>
          <h3>远程问答供应商</h3>
        </div>
        <span className={`adapter-health-pill adapter-health-pill--${normalizeStatusClass(openAIAdapter?.status || "UNKNOWN")}`}>
          {displayStatus(openAIAdapter?.status || "UNKNOWN")}
        </span>
      </div>

      <p className="workspace-api-provider-panel__copy">
        这里配置的是 IM 端问答的 OpenAI-compatible HTTP 通道，不是 Claude Code / Codex 本地 CLI。
        API Key 只提交给后端运行时，不保存在浏览器。
      </p>

      <div className="workspace-api-provider-panel__presets" aria-label="API provider presets">
        {PROVIDER_PRESETS.map((preset) => (
          <button key={preset.key} type="button" className="secondary-button secondary-button--quiet" onClick={() => applyPreset(preset.key)}>
            {preset.label}
          </button>
        ))}
      </div>

      <div className="workspace-api-provider-panel__grid">
        <label>
          <span>供应商</span>
          <input value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="DeepSeek / OpenAI / 自定义" />
        </label>
        <label>
          <span>Base URL / API</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.deepseek.com" />
        </label>
        <label>
          <span>模型名称</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="deepseek-chat" />
        </label>
        <label>
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={config?.hasApiKey ? `已配置 ${config.maskedApiKey}` : "sk-..."}
          />
        </label>
      </div>

      <label className="workspace-api-provider-panel__toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span>启用该远程 API 作为 OPENAI_COMPATIBLE 通道</span>
      </label>

      <div className="workspace-api-provider-panel__actions">
        <button type="button" className="primary-button" disabled={loading || saving || !providerName.trim() || !baseUrl.trim() || !model.trim()} onClick={handleSave}>
          {saving ? "保存中..." : "保存 API 配置"}
        </button>
        <button type="button" className="secondary-button" disabled={creatingAgent} onClick={handlePrepareApiAgent}>
          {creatingAgent ? "准备中..." : selectedIsApiAgent ? "当前已选 API Agent" : "用于当前 IM 问答"}
        </button>
      </div>

      {message ? <p className="workspace-api-provider-panel__message">{message}</p> : null}
      {error ? <p className="workspace-api-provider-panel__error">{error}</p> : null}
    </section>
  );
}
