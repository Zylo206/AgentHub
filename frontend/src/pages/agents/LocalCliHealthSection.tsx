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
    <section className="agent-builder-local-cli-panel" aria-label="Local CLI Health">
      <div className="agent-builder-local-cli-panel__header">
        <div>
          <p className="eyebrow">本地 CLI 状态</p>
          <h2>Claude Code / Codex</h2>
        </div>
      </div>
      <LocalCliStatusCards
        adapters={adapterOptions}
        selectedAdapterType={preferredAdapterType}
        onSelectAdapter={onSelectAdapter}
      />
    </section>
  );
}
