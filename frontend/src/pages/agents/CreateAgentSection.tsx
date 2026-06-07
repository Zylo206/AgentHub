import type { FormEvent } from "react";
import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type Agent,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
import type { AgentCreationDraft } from "../../features/agents/conversationalAgentDraft";
import { displayAgentRole, displayStatus, normalizeStatusClass } from "../../utils/displayLabels";
import { getAdapterDepthProfile, parseTags } from "./agentBuilderUtils";

interface CreateAgentSectionProps {
  adapterOptions: AdapterDescriptor[];
  name: string;
  avatarUrl: string;
  systemPrompt: string;
  capabilityTags: string;
  selectedToolCapabilities: ToolCapabilityKey[];
  toolTags: string;
  preferredAdapterType: string;
  submitting: boolean;
  createdAgent: Agent | null;
  naturalAgentPrompt: string;
  draftRefinementPrompt: string;
  conversationalDraft: AgentCreationDraft | null;
  creatingDraftAgent: boolean;
  generatingAgentDraft: boolean;
  effectiveToolTags: string[];
  resolvedCapabilityNames: string[];
  selectedAdapterDescriptor: AdapterDescriptor | null;
  onNameChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onSystemPromptChange: (value: string) => void;
  onCapabilityTagsChange: (value: string) => void;
  onToolTagsChange: (value: string) => void;
  onPreferredAdapterChange: (value: string) => void;
  onNaturalAgentPromptChange: (value: string) => void;
  onDraftRefinementPromptChange: (value: string) => void;
  onToggleToolCapability: (key: ToolCapabilityKey) => void;
  onGenerateConversationalDraft: () => void;
  onApplyConversationalDraft: () => void;
  onRefineConversationalDraft: () => void;
  onCreateConversationalDraftAgent: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CreateAgentSection({
  adapterOptions,
  name,
  avatarUrl,
  systemPrompt,
  capabilityTags,
  selectedToolCapabilities,
  toolTags,
  preferredAdapterType,
  submitting,
  createdAgent,
  naturalAgentPrompt,
  draftRefinementPrompt,
  conversationalDraft,
  creatingDraftAgent,
  generatingAgentDraft,
  effectiveToolTags,
  resolvedCapabilityNames,
  selectedAdapterDescriptor,
  onNameChange,
  onAvatarUrlChange,
  onSystemPromptChange,
  onCapabilityTagsChange,
  onToolTagsChange,
  onPreferredAdapterChange,
  onNaturalAgentPromptChange,
  onDraftRefinementPromptChange,
  onToggleToolCapability,
  onGenerateConversationalDraft,
  onApplyConversationalDraft,
  onRefineConversationalDraft,
  onCreateConversationalDraftAgent,
  onSubmit
}: CreateAgentSectionProps) {
  const selectedAdapterDepthProfile = getAdapterDepthProfile(preferredAdapterType);
  const previewName = name.trim() || "新的 Specialist Agent";

  return (
    <section className="agent-builder-create-section" id="create-agent" aria-label="Create Agent">
      <div className="conversational-agent-panel">
        <div className="conversational-agent-panel__header">
          <div>
            <p className="eyebrow">创建业务 Agent</p>
            <h2>用一句话生成协作成员草案</h2>
            <p>Workspace 适合快速创建；Agents 管理台用于确认关键字段、CLI 健康和 Adapter 测试。</p>
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
            onChange={(event) => onNaturalAgentPromptChange(event.target.value)}
            placeholder="例如：创建一个安全评审 Agent，优先使用 Claude Code，负责 review、安全和质量门禁。"
          />
        </label>
        <div className="conversational-agent-panel__actions">
          <button
            type="button"
            className="secondary-button"
            data-testid="conversational-agent-generate"
            disabled={generatingAgentDraft || !naturalAgentPrompt.trim()}
            onClick={onGenerateConversationalDraft}
          >
            {generatingAgentDraft ? "生成中..." : "生成 Agent 草案"}
          </button>
          {conversationalDraft ? (
            <>
              <button
                type="button"
                className="secondary-button"
                data-testid="conversational-agent-apply"
                onClick={onApplyConversationalDraft}
              >
                填入下方表单
              </button>
              <button
                type="button"
                className="primary-button"
                data-testid="conversational-agent-create"
                disabled={creatingDraftAgent}
                onClick={onCreateConversationalDraftAgent}
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
                <span>草案来源</span>
                <strong>{conversationalDraft.draftSource || "UNKNOWN"}</strong>
                {conversationalDraft.fallbackReason ? <em>{conversationalDraft.fallbackReason}</em> : null}
              </div>
              <div>
                <span>能力标签</span>
                <strong>{conversationalDraft.capabilityTags.join(" / ")}</strong>
              </div>
              <div>
                <span>工具能力</span>
                <strong>{conversationalDraft.toolTags.join(" / ")}</strong>
              </div>
            </div>
            <div className="conversational-agent-draft__reasons">
              {conversationalDraft.reasoning.map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
            <div className="conversational-agent-refine">
              <label className="agent-builder-field">
                <span>继续追问修改草案</span>
                <textarea
                  data-testid="conversational-agent-refinement"
                  value={draftRefinementPrompt}
                  onChange={(event) => onDraftRefinementPromptChange(event.target.value)}
                  placeholder="例如：再加 deploy 能力，改用 Codex，并补充安全审计职责。"
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                data-testid="conversational-agent-refine"
                disabled={!draftRefinementPrompt.trim()}
                onClick={onRefineConversationalDraft}
              >
                更新草案
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="agent-builder-layout">
        <form className="agent-builder-form" onSubmit={onSubmit}>
          <label className="agent-builder-field">
            <span>Agent 名称</span>
            <input
              data-testid="agent-builder-name-input"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="我的前端 Agent"
            />
          </label>

          <label className="agent-builder-field">
            <span>头像 URL</span>
            <input
              data-testid="agent-builder-avatar-url"
              value={avatarUrl}
              onChange={(event) => onAvatarUrlChange(event.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </label>

          <details className="agenthub-disclosure agent-builder-advanced-config" data-testid="agent-builder-advanced-config">
            <summary>
              <span>高级配置</span>
              <small>System Prompt / Tool Capability / Adapter policy</small>
            </summary>

            <label className="agent-builder-field">
              <span>System Prompt</span>
              <textarea
                data-testid="agent-builder-system-prompt"
                value={systemPrompt}
                onChange={(event) => onSystemPromptChange(event.target.value)}
                placeholder="你是一个前端专家，擅长 React、UI 和 CSS。"
              />
            </label>

            <label className="agent-builder-field">
              <span>能力标签</span>
              <input
                data-testid="agent-builder-capability-tags"
                value={capabilityTags}
                onChange={(event) => onCapabilityTagsChange(event.target.value)}
                placeholder="React, UI, CSS"
              />
            </label>

            <fieldset className="agent-builder-capability-fieldset">
              <legend>Tool Capability</legend>
              <p>这些标签会写入 toolTags，并参与后端 Router 的能力匹配。</p>
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
                        onChange={() => onToggleToolCapability(option.key)}
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
                onChange={(event) => onToolTagsChange(event.target.value)}
                placeholder="例如 schema, task_planner；会与上方选择合并写入 toolTags"
              />
            </label>

            <label className="agent-builder-field">
              <span>首选 Adapter</span>
              <select
                data-testid="agent-builder-preferred-adapter"
                value={preferredAdapterType}
                onChange={(event) => onPreferredAdapterChange(event.target.value)}
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
                  {displayStatus(selectedAdapterDescriptor?.status || "UNKNOWN")}
                </span>
              </div>
              <div className={`agent-builder-depth-badge ${selectedAdapterDepthProfile.className}`}>
                <strong>{selectedAdapterDepthProfile.label}</strong>
                <span>{selectedAdapterDepthProfile.description}</span>
              </div>
              {selectedAdapterDescriptor?.failureReason ? (
                <div className="agent-builder-adapter-note agent-builder-adapter-note--warning">
                  {selectedAdapterDescriptor.failureReason}
                </div>
              ) : null}
            </div>
          </details>

          <div className="agent-builder-actions">
            <button type="submit" className="primary-button" data-testid="agent-builder-submit" disabled={submitting || !name.trim()}>
              {submitting ? "创建中..." : "创建 Agent"}
            </button>
          </div>
        </form>

        <aside className="agent-builder-preview">
          <p className="eyebrow">联系人预览</p>
          <div className="agent-builder-preview__avatar">{previewName.charAt(0).toUpperCase() || "A"}</div>
          <h2>{previewName}</h2>
          <p>{systemPrompt.trim() || "填写 System Prompt 后，这里展示 Agent 的职责、行为边界和协作方式。"}</p>
          <div className="tag-row">
            {parseTags(capabilityTags).map((tag) => (
              <span className="agent-tag" key={`preview-cap-${tag}`}>{tag}</span>
            ))}
          </div>
          <div className="tag-row">
            {effectiveToolTags.map((tag) => (
              <span className="agent-tag agent-tag--tool" key={`preview-tool-${tag}`}>{tag}</span>
            ))}
          </div>
        </aside>
      </div>

      {createdAgent ? (
        <div className="builder-summary">
          <h2>已创建 Agent 摘要</h2>
          <p><strong>名称：</strong> {createdAgent.name}</p>
          <p><strong>角色：</strong> {displayAgentRole(createdAgent.role)}</p>
          <p><strong>首选 Adapter：</strong> {createdAgent.preferredAdapterType || "MOCK"}</p>
          <p><strong>能力标签：</strong> {createdAgent.capabilityTags.join(", ") || "无"}</p>
          <p><strong>工具标签：</strong> {createdAgent.toolTags.join(", ") || "无"}</p>
        </div>
      ) : null}
    </section>
  );
}
