import {
  TOOL_CAPABILITY_OPTIONS,
  type AdapterDescriptor,
  type ToolCapabilityKey
} from "../../features/agents/agentTypes";
import { displayStatus } from "../../utils/displayLabels";
import { getAdapterDepthProfile } from "./agentBuilderUtils";

interface AgentDirectorySectionProps {
  adapterOptions: AdapterDescriptor[];
  availableAdapterCount: number;
  selectedToolCapabilities: ToolCapabilityKey[];
}

export function AgentDirectorySection({
  adapterOptions,
  availableAdapterCount,
  selectedToolCapabilities
}: AgentDirectorySectionProps) {
  return (
    <aside className="agent-builder-left-rail" id="agent-directory" aria-label="Agent Directory">
      <button type="button" className="agent-builder-rail-new-button">+ 新建 Agent</button>
      <div className="agent-builder-rail-search">搜索 Agent / 能力 / Adapter</div>
      <div className="agent-builder-rail-tabs">
        <span className="is-active">全部</span>
        <span>可用</span>
        <span>置顶</span>
        <span>归档</span>
      </div>

      <div className="agent-builder-rail-card agent-builder-rail-card--primary">
        <div className="agent-builder-rail-card__header">
          <span>Agent 接入矩阵</span>
          <strong>{availableAdapterCount}/{adapterOptions.length}</strong>
        </div>
        <p>
          这里负责管理业务 Agent、能力标签和 Adapter 健康。真实 CLI 接入必须显示失败分类，不能把 MOCK fallback
          包装成真实成功。
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
          <span>Workspace 快速创建</span>
          <strong>@Agent</strong>
        </div>
        <p>Workspace 左侧只承担快速创建和联系人入口；完整管理、CLI 健康和 Adapter 测试都在本页完成。</p>
      </div>
    </aside>
  );
}
