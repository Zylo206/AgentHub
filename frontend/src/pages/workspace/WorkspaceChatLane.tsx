import type { ReactNode } from "react";

interface WorkspaceChatLaneProps {
  messageStream: ReactNode;
  composer: ReactNode;
  diagnostics: ReactNode;
}

export function WorkspaceChatLane({ messageStream, composer, diagnostics }: WorkspaceChatLaneProps) {
  return (
    <div className="workspace-main__content">
      <section className="workspace-chat-lane workspace-chat-lane--product" aria-label="IM collaboration lane">
        <div className="workspace-chat-lane__feed" data-testid="workspace-chat-feed">
          {messageStream}
        </div>
        <div className="workspace-chat-lane__composer" data-testid="workspace-chat-composer">
          {composer}
        </div>
      </section>
      {diagnostics}
    </div>
  );
}
