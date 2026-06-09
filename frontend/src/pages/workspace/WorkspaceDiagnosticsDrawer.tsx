import { useLayoutEffect, useRef, type ReactNode } from "react";

const DIAGNOSTIC_SCROLL_STORAGE_KEY = "agenthub:workspace-diagnostics-scroll";

function readDiagnosticScrollPositions(): Record<string, number> {
  try {
    return JSON.parse(window.sessionStorage.getItem(DIAGNOSTIC_SCROLL_STORAGE_KEY) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

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
  const scrollPositionsRef = useRef<Record<string, number>>(readDiagnosticScrollPositions());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useLayoutEffect(() => {
    if (!activePanel) {
      return;
    }

    const element = sectionRefs.current[activePanel];
    if (!element) {
      return;
    }

    const nextScrollTop = scrollPositionsRef.current[activePanel] ?? 0;
    if (Math.abs(element.scrollTop - nextScrollTop) <= 1) {
      return;
    }

    element.scrollTop = nextScrollTop;
  }, [activePanel, sections]);

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
            ref={(element) => {
              sectionRefs.current[panel.key] = element;
            }}
            className={[
              "workspace-diagnostics__section",
              `workspace-diagnostics__section--${panel.key}`,
              activePanel === panel.key ? "workspace-diagnostics__section--active" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onScroll={(event) => {
              scrollPositionsRef.current[panel.key] = event.currentTarget.scrollTop;
              try {
                window.sessionStorage.setItem(
                  DIAGNOSTIC_SCROLL_STORAGE_KEY,
                  JSON.stringify(scrollPositionsRef.current)
                );
              } catch {
                // Ignore sessionStorage failures in private mode or restricted environments.
              }
            }}
          >
            <div className="workspace-diagnostics__section-body">{sections[panel.key]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
