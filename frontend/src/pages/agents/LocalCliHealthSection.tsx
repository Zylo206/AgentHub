import type { AdapterDescriptor } from "../../features/agents/agentTypes";
import { LocalCliStatusCards } from "../../features/agents/LocalCliStatusCards";

interface LocalCliHealthSectionProps {
  adapterOptions: AdapterDescriptor[];
  preferredAdapterType: string;
  onSelectAdapter: (adapterType: string) => void;
}

export function LocalCliHealthSection({
  adapterOptions,
  preferredAdapterType,
  onSelectAdapter
}: LocalCliHealthSectionProps) {
  return (
    <section className="agent-builder-local-cli-panel" id="local-cli" aria-label="Local CLI Health">
      <div className="agent-builder-local-cli-panel__header">
        <div>
          <p className="eyebrow">本地 CLI 状态</p>
          <h2>Claude Code / Codex 真实接入</h2>
          <p>
            这里展示后端 Adapter descriptor 的本机探测结果：path、version、auth/help、schema、stream、sandbox。
            真实执行失败必须分类并 fallback，不使用桥接命令伪装成功。
          </p>
        </div>
        <span className="agent-builder-depth-badge agent-builder-depth-badge--deep">Headless Artifact-only</span>
      </div>
      <LocalCliStatusCards
        adapters={adapterOptions}
        selectedAdapterType={preferredAdapterType}
        onSelectAdapter={onSelectAdapter}
      />
    </section>
  );
}
