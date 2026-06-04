import { useEffect, useMemo, useState } from "react";
import { createAgent, draftAgentFromNaturalLanguage, getAdapters } from "../../api/agenthubApi";
import type { Agent, AdapterDescriptor, ToolCapabilityKey } from "./agentTypes";

export type AgentCreateMode = "custom" | "local";

interface AgentCreateDialogProps {
  open: boolean;
  initialMode?: AgentCreateMode;
  onClose: () => void;
  onCreated?: (agent: Agent) => void;
}

interface ToolCapabilityChoice {
  key: ToolCapabilityKey;
  label: string;
  description: string;
}

const LOCAL_AGENT_BRIDGE_COMMAND =
  "npx -y --registry=https://registry.npmmirror.com agenthub-local-agent-bridge";

const TOOL_CHOICES: ToolCapabilityChoice[] = [
  { key: "code", label: "代码", description: "生成或修改代码 Artifact" },
  { key: "review", label: "评审", description: "质量门禁、安全审查、修改建议" },
  { key: "api", label: "API", description: "接口契约、后端能力、集成约定" },
  { key: "preview", label: "预览", description: "网页预览、产物展示、交付检查" },
  { key: "deploy", label: "部署", description: "本地预览发布、部署状态卡" }
];

const TOOL_KEYS = new Set<ToolCapabilityKey>(TOOL_CHOICES.map((choice) => choice.key));

const FALLBACK_ADAPTERS: AdapterDescriptor[] = [
  {
    adapterType: "OPENAI_COMPATIBLE",
    status: "UNKNOWN",
    enabled: true,
    placeholder: false,
    description: "OpenAI-compatible provider"
  },
  {
    adapterType: "CLAUDE_CODE",
    status: "UNKNOWN",
    enabled: true,
    placeholder: false,
    description: "Claude Code headless CLI"
  },
  {
    adapterType: "CODEX",
    status: "UNKNOWN",
    enabled: true,
    placeholder: false,
    description: "Codex headless CLI"
  },
  {
    adapterType: "MOCK",
    status: "AVAILABLE",
    enabled: true,
    placeholder: false,
    description: "Stable mock fallback"
  }
];

function parseTags(value: string): string[] {
  return value
    .split(/[,\n，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeToolTags(toolTags: string[] | undefined): ToolCapabilityKey[] {
  const normalized = (toolTags ?? []).filter((tag): tag is ToolCapabilityKey => TOOL_KEYS.has(tag as ToolCapabilityKey));
  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["code", "review"];
}

function getAdapterLabel(adapterType: string): string {
  switch (adapterType) {
    case "OPENAI_COMPATIBLE":
      return "OpenAI-compatible";
    case "CLAUDE_CODE":
      return "Claude Code";
    case "CODEX":
      return "Codex CLI";
    case "MOCK":
      return "MOCK fallback";
    default:
      return adapterType;
  }
}

function getAdapterOptions(adapters: AdapterDescriptor[]): AdapterDescriptor[] {
  const byType = new Map<string, AdapterDescriptor>();
  [...adapters, ...FALLBACK_ADAPTERS].forEach((adapter) => {
    if (!byType.has(adapter.adapterType)) {
      byType.set(adapter.adapterType, adapter);
    }
  });
  return ["OPENAI_COMPATIBLE", "CLAUDE_CODE", "CODEX", "MOCK"]
    .map((adapterType) => byType.get(adapterType))
    .filter((adapter): adapter is AdapterDescriptor => Boolean(adapter));
}

export function AgentCreateDialog({
  open,
  initialMode = "custom",
  onClose,
  onCreated
}: AgentCreateDialogProps) {
  const [mode, setMode] = useState<"choose" | AgentCreateMode>(initialMode);
  const [naturalPrompt, setNaturalPrompt] = useState(
    "创建一个安全评审 Agent，负责 review、安全、质量门禁，优先 Claude Code。"
  );
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilityTags, setCapabilityTags] = useState("");
  const [selectedTools, setSelectedTools] = useState<ToolCapabilityKey[]>(["code", "review"]);
  const [preferredAdapter, setPreferredAdapter] = useState("MOCK");
  const [draftReady, setDraftReady] = useState(false);
  const [adapters, setAdapters] = useState<AdapterDescriptor[]>([]);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const adapterOptions = useMemo(() => getAdapterOptions(adapters), [adapters]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
    setErrorMessage(null);
    setCommandCopied(false);
    void getAdapters()
      .then(setAdapters)
      .catch(() => setAdapters(FALLBACK_ADAPTERS));
  }, [open, initialMode]);

  if (!open) {
    return null;
  }

  async function handleGenerateDraft() {
    const trimmedPrompt = naturalPrompt.trim();
    if (!trimmedPrompt) {
      setErrorMessage("请先描述要创建的 Agent。");
      return;
    }

    setGeneratingDraft(true);
    setErrorMessage(null);
    try {
      const draft = await draftAgentFromNaturalLanguage(trimmedPrompt);
      setName(draft.name || "自定义 Agent");
      setSystemPrompt(draft.systemPrompt || "");
      setCapabilityTags((draft.capabilityTags ?? []).join(", "));
      setSelectedTools(normalizeToolTags(draft.toolTags));
      setPreferredAdapter(draft.preferredAdapterType || "MOCK");
      setDraftReady(true);
    } catch (error) {
      const fallbackName = trimmedPrompt.includes("安全") || trimmedPrompt.toLowerCase().includes("review")
        ? "安全评审 Agent"
        : "自定义协作 Agent";
      setName(fallbackName);
      setSystemPrompt(
        `你是 AgentHub 中的${fallbackName}。请基于聊天历史、上下文、Artifact 和质量门禁完成任务，输出清晰、可执行的结果。`
      );
      setCapabilityTags("自定义 Agent, 质量评审, 协作成员");
      setSelectedTools(["code", "review"]);
      setPreferredAdapter("MOCK");
      setDraftReady(true);
      setErrorMessage(error instanceof Error ? `已使用规则化草案：${error.message}` : "已使用规则化草案。");
    } finally {
      setGeneratingDraft(false);
    }
  }

  async function handleCreateAgent() {
    if (!name.trim() || !systemPrompt.trim()) {
      setErrorMessage("请确认 Agent 名称和 System Prompt。");
      return;
    }

    setCreatingAgent(true);
    setErrorMessage(null);
    try {
      const agent = await createAgent({
        name: name.trim(),
        avatarUrl: "",
        systemPrompt: systemPrompt.trim(),
        capabilityTags: parseTags(capabilityTags),
        toolTags: selectedTools,
        preferredAdapterType: preferredAdapter
      });
      onCreated?.(agent);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "创建 Agent 失败。");
    } finally {
      setCreatingAgent(false);
    }
  }

  function toggleTool(tool: ToolCapabilityKey) {
    setSelectedTools((current) =>
      current.includes(tool)
        ? current.filter((item) => item !== tool)
        : [...current, tool]
    );
  }

  async function handleCopyCommand() {
    try {
      await navigator.clipboard.writeText(LOCAL_AGENT_BRIDGE_COMMAND);
      setCommandCopied(true);
    } catch {
      setCommandCopied(false);
      setErrorMessage("复制失败，请手动复制命令。");
    }
  }

  return (
    <div className="app-create-modal-backdrop" role="presentation">
      <section
        className="app-create-modal agent-create-dialog"
        data-testid="agent-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-create-dialog-title"
      >
        <button
          type="button"
          className="app-create-modal__close"
          aria-label="关闭新建 Agent 弹窗"
          onClick={onClose}
        >
          ×
        </button>

        {mode === "choose" ? (
          <>
            <h2 id="agent-create-dialog-title">新建 Agent</h2>
            <div className="agent-create-choice">
              <button
                type="button"
                className="agent-create-choice__item"
                data-testid="agent-create-custom-option"
                onClick={() => setMode("custom")}
              >
                <span className="agent-create-choice__icon" aria-hidden="true">✦</span>
                <span>
                  <strong>创建自定义 Agent</strong>
                  <small>用自然语言描述职责，生成草案后确认创建。</small>
                </span>
                <em aria-hidden="true">+</em>
              </button>
              <button
                type="button"
                className="agent-create-choice__item"
                data-testid="agent-create-local-option"
                onClick={() => setMode("local")}
              >
                <span className="agent-create-choice__icon" aria-hidden="true">⌘</span>
                <span>
                  <strong>接入本地 Agent</strong>
                  <small>生成连接命令，接入本机正在运行的 Agent。</small>
                </span>
                <em aria-hidden="true">+</em>
              </button>
            </div>
          </>
        ) : null}

        {mode === "custom" ? (
          <>
            <div className="agent-create-dialog__header">
              <button type="button" onClick={() => setMode("choose")}>返回</button>
              <div>
                <h2 id="agent-create-dialog-title">创建自定义 Agent</h2>
                <p>描述职责，生成草案，确认能力和 Adapter 后即可在 Workspace 中 @ 使用。</p>
              </div>
            </div>

            <label className="agent-create-field">
              <span>描述你想创建的 Agent</span>
              <textarea
                data-testid="agent-create-prompt"
                value={naturalPrompt}
                onChange={(event) => setNaturalPrompt(event.target.value)}
                placeholder="例如：创建一个安全评审 Agent，负责 review、安全、质量门禁，优先 Claude Code。"
              />
            </label>
            <button
              type="button"
              className="agent-create-primary"
              data-testid="agent-create-generate-draft"
              disabled={generatingDraft}
              onClick={handleGenerateDraft}
            >
              {generatingDraft ? "生成中..." : "生成 Agent 草案"}
            </button>

            {draftReady ? (
              <div className="agent-create-draft" data-testid="agent-create-draft">
                <div className="agent-create-draft__grid">
                  <label className="agent-create-field">
                    <span>Agent 名称</span>
                    <input
                      data-testid="agent-create-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <label className="agent-create-field">
                    <span>Preferred Adapter</span>
                    <select
                      data-testid="agent-create-preferred-adapter"
                      value={preferredAdapter}
                      onChange={(event) => setPreferredAdapter(event.target.value)}
                    >
                      {adapterOptions.map((adapter) => (
                        <option key={adapter.adapterType} value={adapter.adapterType}>
                          {getAdapterLabel(adapter.adapterType)} · {adapter.status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="agent-create-field">
                  <span>System Prompt</span>
                  <textarea
                    data-testid="agent-create-system-prompt"
                    value={systemPrompt}
                    onChange={(event) => setSystemPrompt(event.target.value)}
                  />
                </label>

                <label className="agent-create-field">
                  <span>能力标签</span>
                  <input
                    data-testid="agent-create-capability-tags"
                    value={capabilityTags}
                    onChange={(event) => setCapabilityTags(event.target.value)}
                    placeholder="review, security, quality"
                  />
                </label>

                <fieldset className="agent-create-tools">
                  <legend>Tool Capability</legend>
                  {TOOL_CHOICES.map((tool) => (
                    <label
                      key={tool.key}
                      className={`agent-create-tool${selectedTools.includes(tool.key) ? " agent-create-tool--selected" : ""}`}
                      data-testid={`agent-create-tool-${tool.key}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.key)}
                        onChange={() => toggleTool(tool.key)}
                      />
                      <strong>{tool.label}</strong>
                      <small>{tool.description}</small>
                    </label>
                  ))}
                </fieldset>

                <button
                  type="button"
                  className="agent-create-primary"
                  data-testid="agent-create-confirm"
                  disabled={creatingAgent}
                  onClick={handleCreateAgent}
                >
                  {creatingAgent ? "创建中..." : "确认创建"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {mode === "local" ? (
          <>
            <div className="agent-create-dialog__header">
              <button type="button" onClick={() => setMode("choose")}>返回</button>
              <div>
                <h2 id="agent-create-dialog-title">接入本地 Agent</h2>
                <p>生成连接命令，在本地终端执行后，AgentHub 会自动识别连接状态。</p>
              </div>
            </div>

            <div className="app-create-modal__steps" aria-label="接入步骤">
              <span className="is-done">
                <strong>✓</strong>
                <em>生成连接命令</em>
                <small>命令已生成</small>
              </span>
              <span className="is-active">
                <strong>2</strong>
                <em>本地执行</em>
                <small>等待中</small>
              </span>
              <span>
                <strong>3</strong>
                <em>自动识别</em>
                <small>等待中</small>
              </span>
            </div>

            <div className="app-create-modal__command-head">
              <span>连接命令</span>
              <small>命令已生成，token 剩余 59:58 到期</small>
            </div>
            <pre className="app-create-modal__command">
              <code>{LOCAL_AGENT_BRIDGE_COMMAND}</code>
            </pre>
            <button type="button" className="app-create-modal__copy" onClick={handleCopyCommand}>
              {commandCopied ? "已复制" : "复制命令"}
            </button>

            <div className="app-create-modal__tips">
              <p>1. 在终端窗口粘贴命令。</p>
              <p>2. 按 Enter 执行。</p>
              <p>3. 保持终端开启，系统会自动检测连接。</p>
            </div>
          </>
        ) : null}

        {errorMessage ? <p className="agent-create-error">{errorMessage}</p> : null}
      </section>
    </div>
  );
}
