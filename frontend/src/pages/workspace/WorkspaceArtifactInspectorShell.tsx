import type { ReactNode } from "react";

interface WorkspaceArtifactInspectorShellProps {
  collapsed: boolean;
  children: ReactNode;
  onToggleCollapsed: () => void;
}

export function WorkspaceArtifactInspectorShell({ collapsed, children, onToggleCollapsed }: WorkspaceArtifactInspectorShellProps) {
  return (
    <aside
      className={`workspace-artifacts ${collapsed ? "workspace-artifacts--collapsed" : ""}`}
      data-testid="workspace-artifacts"
    >
      <div className="workspace-artifacts__header" aria-label="Artifact inspector header">
        <div>
          <strong>产物工作台</strong>
          <span>Artifact Inspector</span>
        </div>
        <button
          type="button"
          className="workspace-artifacts__collapse-button"
          data-testid="artifact-inspector-collapse-toggle"
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          {collapsed ? "展开" : "收起"}
        </button>
      </div>
      <div className="workspace-artifacts__body">{children}</div>
    </aside>
  );
}
