import { useEffect, useState } from "react";
import {
  getOpenAICompatibleRuntimeConfig,
  updateOpenAICompatibleRuntimeConfig,
  type OpenAICompatibleRuntimeConfig
} from "../../api/agenthubApi";
import type { AdapterDescriptor } from "../../features/agents/agentTypes";

interface WorkspaceApiProviderPanelProps {
  adapterDescriptors: AdapterDescriptor[];
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

export function WorkspaceApiProviderPanel({ onConfigured }: WorkspaceApiProviderPanelProps) {
  const [config, setConfig] = useState<OpenAICompatibleRuntimeConfig | null>(null);
  const [providerName, setProviderName] = useState("DeepSeek");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("deepseek-chat");
  const [enabled, setEnabled] = useState(true);
  const [selectedScopeType, setSelectedScopeType] = useState("USER");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyConfig(runtimeConfig: OpenAICompatibleRuntimeConfig) {
    setConfig(runtimeConfig);
    setEnabled(runtimeConfig.selectedScope.enabled);
    setProviderName(runtimeConfig.selectedScope.providerName || "Custom OpenAI-compatible");
    setBaseUrl(runtimeConfig.selectedScope.baseUrl || "");
    setModel(runtimeConfig.selectedScope.model || "");
    setApiKey("");
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void getOpenAICompatibleRuntimeConfig(selectedScopeType)
      .then((runtimeConfig) => {
        if (!cancelled) {
          applyConfig(runtimeConfig);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(getErrorMessage(caughtError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedScopeType]);

  function applyPreset(key: string) {
    const preset = PROVIDER_PRESETS.find((item) => item.key === key);
    if (!preset) {
      return;
    }
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
        scopeType: selectedScopeType,
        enabled,
        providerName,
        baseUrl,
        apiKey,
        model
      });
      applyConfig(updated);
      setApiKey("");
      await onConfigured();
      setMessage("IM 远程问答配置已更新，当前工作台会优先使用这条 OpenAI-compatible HTTP 通道。");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="workspace-api-provider-panel" data-testid="workspace-api-provider-panel">
      <p className="workspace-api-provider-panel__copy">
        这里配置的是 IM 端问答使用的 OpenAI-compatible HTTP 通道，不是 Claude Code 或 Codex 的本地 CLI。
        API Key 只提交给后端运行时，不会保存在浏览器里。
      </p>

      <div className="workspace-api-provider-panel__presets" aria-label="API provider presets">
        {PROVIDER_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className="secondary-button secondary-button--quiet"
            onClick={() => applyPreset(preset.key)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {config?.availableScopes?.length ? (
        <label>
          <span>Scope</span>
          <select value={selectedScopeType} onChange={(event) => setSelectedScopeType(event.target.value)}>
            {config.availableScopes.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="workspace-api-provider-panel__grid">
        <label>
          <span>供应商</span>
          <input
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            placeholder="DeepSeek / OpenAI / 自定义"
          />
        </label>
        <label>
          <span>Base URL / API</span>
          <input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.deepseek.com"
          />
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
            placeholder={config?.selectedScope.hasApiKey ? `已配置 ${config.selectedScope.maskedApiKey}` : "sk-..."}
          />
        </label>
      </div>

      <label className="workspace-api-provider-panel__toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span>启用该远程 API 作为 OPENAI_COMPATIBLE 通道</span>
      </label>

      <div className="workspace-api-provider-panel__actions">
        <button
          type="button"
          className="primary-button"
          disabled={
            loading ||
            saving ||
            !config?.selectedScope.canManage ||
            !providerName.trim() ||
            !baseUrl.trim() ||
            !model.trim()
          }
          onClick={handleSave}
        >
          {saving ? "保存中..." : "保存 API 配置"}
        </button>
      </div>

      {config ? (
        <p className="workspace-api-provider-panel__message">
          Effective: {config.effectiveScope.scopeType}/{config.effectiveScope.scopeId}
          {config.selectedScope.scopeType !== config.effectiveScope.scopeType ||
          config.selectedScope.scopeId !== config.effectiveScope.scopeId
            ? " (inherited)"
            : ""}
        </p>
      ) : null}
      {config && !config.selectedScope.canManage ? (
        <p className="workspace-api-provider-panel__error">
          当前用户没有权限修改 {config.selectedScope.scopeType}/{config.selectedScope.scopeId}。
        </p>
      ) : null}
      {message ? <p className="workspace-api-provider-panel__message">{message}</p> : null}
      {error ? <p className="workspace-api-provider-panel__error">{error}</p> : null}
    </section>
  );
}
