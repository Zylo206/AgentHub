import type { AdapterDescriptor } from "./agentTypes";

const CLI_ADAPTER_TYPES = ["CLAUDE_CODE", "CODEX"] as const;

export function getAdapterLabel(adapterType: string): string {
  switch (adapterType) {
    case "OPENAI_COMPATIBLE":
      return "OpenAI-compatible";
    case "CLAUDE_CODE":
      return "Claude Code CLI";
    case "CODEX":
      return "Codex CLI";
    case "MOCK":
      return "MOCK fallback";
    default:
      return adapterType;
  }
}

export function getCliAdapters(adapters: AdapterDescriptor[]): AdapterDescriptor[] {
  const byType = new Map(adapters.map((adapter) => [adapter.adapterType, adapter]));
  return CLI_ADAPTER_TYPES.map(
    (adapterType) =>
      byType.get(adapterType) ?? {
        adapterType,
        status: "UNKNOWN",
        enabled: true,
        placeholder: false,
        description: `${getAdapterLabel(adapterType)} local CLI`
      }
  );
}

function getCapabilityText(details: Record<string, unknown> | undefined, key: string, fallback = "-"): string {
  const value = details?.[key];
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "支持" : "不支持";
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.join(", ");
  }
  if (typeof value === "number") {
    return String(value);
  }
  return fallback;
}

function hasCapability(details: Record<string, unknown> | undefined, key: string): boolean {
  return details?.[key] === true;
}

interface LocalCliStatusCardsProps {
  adapters: AdapterDescriptor[];
  selectedAdapterType?: string | null;
  onSelectAdapter?: (adapterType: string) => void;
}

export function LocalCliStatusCards({
  adapters,
  selectedAdapterType,
  onSelectAdapter
}: LocalCliStatusCardsProps) {
  const cliAdapters = getCliAdapters(adapters);

  return (
    <div className="local-cli-status-grid" data-testid="local-cli-status-grid">
      {cliAdapters.map((adapter) => {
        const details = adapter.capabilityDetails ?? {};
        const isSelected = selectedAdapterType === adapter.adapterType;
        const schemaText =
          adapter.adapterType === "CODEX"
            ? getCapabilityText(details, "supportsOutputSchema", "等待探测")
            : getCapabilityText(details, "schemaMode", "prompt-contract-only");
        const streamText =
          adapter.adapterType === "CODEX"
            ? getCapabilityText(details, "supportsJsonEvents", "等待探测")
            : getCapabilityText(details, "supportsStreamJson", "等待探测");

        return (
          <article
            className={`local-cli-status-card${isSelected ? " local-cli-status-card--selected" : ""}`}
            key={adapter.adapterType}
          >
            <div className="local-cli-status-card__header">
              <div>
                <strong>{getAdapterLabel(adapter.adapterType)}</strong>
                <small>{adapter.description || "Headless Artifact-only local CLI adapter"}</small>
              </div>
              <span className={`adapter-health-pill adapter-health-pill--${adapter.status.toLowerCase()}`}>
                {adapter.status}
              </span>
            </div>

            <dl className="local-cli-status-card__facts">
              <div>
                <dt>Path</dt>
                <dd>{getCapabilityText(details, "cliPath", "未探测")}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{getCapabilityText(details, "version", "UNKNOWN")}</dd>
              </div>
              <div>
                <dt>Help</dt>
                <dd>{getCapabilityText(details, "helpProbeStatus", "NOT_PROBED")}</dd>
              </div>
              <div>
                <dt>Auth</dt>
                <dd>{getCapabilityText(details, "authProbeStatus", "执行 smoke 时验证")}</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>{schemaText}</dd>
              </div>
              <div>
                <dt>Stream</dt>
                <dd>{streamText}</dd>
              </div>
              <div>
                <dt>Sandbox</dt>
                <dd>
                  {hasCapability(details, "supportsSandbox")
                    ? "read-only sandbox"
                    : getCapabilityText(details, "workspaceWriteAllowed", "无工作区写入")}
                </dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd>{getCapabilityText(details, "externalCliSessionMode", "AgentHub Context Bridge")}</dd>
              </div>
            </dl>

            {adapter.failureReason ? (
              <p className="local-cli-status-card__warning">{adapter.failureReason}</p>
            ) : null}

            <div className="local-cli-status-card__footer">
              <span>真实执行失败必须分类，不把 MOCK fallback 标为真实成功。</span>
              {onSelectAdapter ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onSelectAdapter(adapter.adapterType)}
                >
                  设为 preferredAdapter
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
