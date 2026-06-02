import type { ReactNode } from "react";

export interface WorkspaceDiagnosticPanel<T extends string> {
  key: T;
  label: string;
  summary: string;
}

interface WorkspaceDiagnosticsDrawerProps<T extends string> {
  panels: Array<WorkspaceDiagnosticPanel<T>>;
  activePanel: T | null;
  sections: Record<T, ReactNode>;
  onTogglePanel: (panel: T) => void;
}

export function WorkspaceDiagnosticsDrawer<T extends string>({
  panels,
  activePanel,
  sections,
  onTogglePanel
}: WorkspaceDiagnosticsDrawerProps<T>) {
  return (
    <section
      className={`workspace-diagnostics ${activePanel ? "workspace-diagnostics--expanded" : "workspace-diagnostics--collapsed"}`}
      data-testid="workspace-diagnostics"
      aria-label="Workspace diagnostics drawer"
    >
      <div className="workspace-diagnostics__tabs" aria-label="Diagnostic tabs">
        {panels.map((panel) => (
          <button
            key={panel.key}
            type="button"
            className={`workspace-diagnostics__tab ${activePanel === panel.key ? "workspace-diagnostics__tab--active" : ""}`}
            data-testid={`workspace-diagnostics-tab-${panel.key}`}
            aria-expanded={activePanel === panel.key}
            onClick={() => onTogglePanel(panel.key)}
          >
            <strong>{panel.label}</strong>
            <span>{panel.summary}</span>
          </button>
        ))}
      </div>
      <div className="workspace-diagnostics__sections">
        {panels.map((panel) => (
          <div
            key={panel.key}
            className={[
              "workspace-diagnostics__section",
              `workspace-diagnostics__section--${panel.key}`,
              activePanel === panel.key ? "workspace-diagnostics__section--active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {sections[panel.key]}
          </div>
        ))}
      </div>
    </section>
  );
}
