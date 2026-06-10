import type { ReactNode } from "react";

interface WorkspaceCommandDeckProps {
  header: ReactNode;
  presence: ReactNode;
  notices?: ReactNode;
  toolbar: ReactNode;
  selectedAgentBanner?: ReactNode;
  apiProvider?: ReactNode;
  advanced?: ReactNode;
}

export function WorkspaceCommandDeck({
  header,
  presence,
  notices,
  toolbar,
  selectedAgentBanner,
  apiProvider,
  advanced
}: WorkspaceCommandDeckProps) {
  return (
    <section className="workspace-command-deck" data-testid="workspace-command-deck">
      <div className="workspace-command-deck__primary">
        {header}
        <div className="workspace-command-deck__presence-row">
          {presence}
          <div className="workspace-command-deck__tool-row">
            {apiProvider ? (
              <details
                className="workspace-command-deck__advanced workspace-command-deck__advanced--api"
                data-testid="workspace-command-deck-api"
              >
                <summary>API 接入</summary>
                <div className="workspace-command-deck__advanced-body">{apiProvider}</div>
              </details>
            ) : null}
            {advanced ? (
              <details className="workspace-command-deck__advanced" data-testid="workspace-command-deck-advanced">
                <summary>会话摘要</summary>
                <div className="workspace-command-deck__advanced-body">{advanced}</div>
              </details>
            ) : null}
          </div>
        </div>
        {notices}
        {toolbar}
        {selectedAgentBanner}
      </div>
    </section>
  );
}
