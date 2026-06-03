import type { ReactNode } from "react";

interface WorkspaceChatLaneProps {
  messageStream: ReactNode;
  composer: ReactNode;
  diagnostics: ReactNode;
}

export function WorkspaceChatLane({ messageStream, composer, diagnostics }: WorkspaceChatLaneProps) {
  return (
    <div className="workspace-main__content">
      <section className="workspace-chat-lane" aria-label="IM collaboration lane">
        {messageStream}
        {composer}
      </section>
      {diagnostics}
    </div>
  );
}
