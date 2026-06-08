import type { AdapterDescriptor } from "./agentTypes";
import { displayStatus } from "../../utils/displayLabels";
import { sanitizeProductionText } from "../../utils/productionLabels";

const CLI_ADAPTER_TYPES = ["CLAUDE_CODE", "CODEX"] as const;

export function getAdapterLabel(adapterType: string): string {
  switch (adapterType) {
    case "OPENAI_COMPATIBLE":
      return "OpenAI-compatible";
    case "CLAUDE_CODE":
      return "Claude Code CLI";
    case "CODEX":
      return "Codex CLI";
    case "OPEN_CODE":
      return "OpenCode CLI";
    case "MOCK":
      return "本地备用引擎";
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
        enabled: false,
        placeholder: false,
        description: `${getAdapterLabel(adapterType)} local CLI`
      }
  );
}

function displayProbeText(value: unknown, fallback = "待检测"): string {
  if (typeof value === "boolean") {
    return value ? "支持" : "不支持";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => sanitizeProductionText(String(item))).join(", ");
  }
  if (typeof value === "string" && value.trim()) {
    const normalized = sanitizeProductionText(value);
    if (normalized === "UNKNOWN" || normalized === "NOT_PROBED" || normalized === "N/A") {
      return fallback;
    }
    return normalized;
  }
  return fallback;
}

function getCapabilityText(details: Record<string, unknown> | undefined, key: string, fallback = "待检测"): string {
  return displayProbeText(details?.[key], fallback);
}

function getCliStatus(adapter: AdapterDescriptor): string {
  if (!adapter.enabled || adapter.status === "DISABLED") {
    return "未启用";
  }
  if (adapter.status === "AVAILABLE") {
    return "可用";
  }
  if (adapter.status === "MISCONFIGURED") {
    return "需配置";
  }
  return displayStatus(adapter.status);
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
            ? getCapabilityText(details, "supportsOutputSchema")
            : getCapabilityText(details, "schemaMode", "Prompt 合约");
        const streamText =
          adapter.adapterType === "CODEX"
            ? getCapabilityText(details, "supportsJsonEvents")
            : getCapabilityText(details, "supportsStreamJson");

        return (
          <article
            className={`local-cli-status-card${isSelected ? " local-cli-status-card--selected" : ""}`}
            key={adapter.adapterType}
          >
            <div className="local-cli-status-card__header">
              <div>
                <strong>{getAdapterLabel(adapter.adapterType)}</strong>
                <small>本地 headless Artifact-only 通道</small>
              </div>
              <span className={`adapter-health-pill adapter-health-pill--${adapter.status.toLowerCase()}`}>
                {getCliStatus(adapter)}
              </span>
            </div>

            <dl className="local-cli-status-card__facts">
              <div>
                <dt>Path</dt>
                <dd>{getCapabilityText(details, "cliPath", "未检测")}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{getCapabilityText(details, "version", "未检测")}</dd>
              </div>
              <div>
                <dt>Help</dt>
                <dd>{getCapabilityText(details, "helpProbeStatus")}</dd>
              </div>
              <div>
                <dt>Auth</dt>
                <dd>{getCapabilityText(details, "authProbeStatus")}</dd>
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
                <dd>{getCapabilityText(details, "supportsSandbox", "无工作区写入")}</dd>
              </div>
              <div>
                <dt>Session</dt>
                <dd>{getCapabilityText(details, "externalCliSessionMode", "Context Bridge")}</dd>
              </div>
            </dl>

            {adapter.failureReason ? (
              <p className="local-cli-status-card__warning">{sanitizeProductionText(adapter.failureReason)}</p>
            ) : null}

            <div className="local-cli-status-card__footer">
              <span>只作为本机 CLI 能力检查，不把未启用通道标记为真实成功。</span>
              {onSelectAdapter ? (
                <button type="button" className="secondary-button" onClick={() => onSelectAdapter(adapter.adapterType)}>
                  设为首选通道
                </button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
