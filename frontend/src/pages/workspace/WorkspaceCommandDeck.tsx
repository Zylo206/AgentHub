import type { ReactNode } from "react";

interface WorkspaceCommandDeckProps {
  header: ReactNode;
  presence: ReactNode;
  notices?: ReactNode;
  toolbar: ReactNode;
  selectedAgentBanner?: ReactNode;
  advanced: ReactNode;
}

export function WorkspaceCommandDeck({
  header,
  presence,
  notices,
  toolbar,
  selectedAgentBanner,
  advanced
}: WorkspaceCommandDeckProps) {
  return (
    <section className="workspace-command-deck" data-testid="workspace-command-deck">
      <div className="workspace-command-deck__primary">
        {header}
        {presence}
        {notices}
        {toolbar}
        {selectedAgentBanner}
      </div>
      <details className="workspace-command-deck__advanced" data-testid="workspace-command-deck-advanced">
        <summary>高级工具</summary>
        <div className="workspace-command-deck__advanced-body">{advanced}</div>
      </details>
    </section>
  );
}
