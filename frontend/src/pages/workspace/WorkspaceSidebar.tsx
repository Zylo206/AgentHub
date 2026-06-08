import { AgentList } from "../../features/agents/AgentList";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { ConversationList, type ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { getIdValue } from "../../utils/id";

export type WorkspaceConversationCreateMode = "SINGLE" | "GROUP";

interface WorkspaceSidebarProps {
  agents: Agent[];
  adapterDescriptors: AdapterDescriptor[];
  conversations: Conversation[];
  conversationCreateMode: WorkspaceConversationCreateMode;
  conversationFilter: ConversationFilter;
  conversationQuery: string;
  creatingConversation: boolean;
  currentConversationId: string | null;
  loadingAgents: boolean;
  loadingConversations: boolean;
  selectedAgent: Agent | null;
  onArchiveConversation: (conversation: Conversation) => void;
  onConversationCreateModeChange: (mode: WorkspaceConversationCreateMode) => void;
  onConversationFilterChange: (filter: ConversationFilter) => void;
  onConversationQueryChange: (query: string) => void;
  onCreateConversation: (mode: WorkspaceConversationCreateMode) => void;
  onRestoreConversation: (conversation: Conversation) => void;
  onSelectAgent: (agent: Agent) => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleConversationPinned: (conversation: Conversation) => void;
}

export function WorkspaceSidebar({
  agents,
  adapterDescriptors,
  conversations,
  conversationCreateMode,
  conversationFilter,
  conversationQuery,
  creatingConversation,
  currentConversationId,
  loadingAgents,
  loadingConversations,
  selectedAgent,
  onArchiveConversation,
  onConversationCreateModeChange,
  onConversationFilterChange,
  onConversationQueryChange,
  onCreateConversation,
  onRestoreConversation,
  onSelectAgent,
  onSelectConversation,
  onToggleConversationPinned
}: WorkspaceSidebarProps) {
  return (
    <aside className="workspace-sidebar" data-testid="workspace-sidebar">
      <div className="workspace-sidebar__header">
        <div className="workspace-brand">
          <h1>AgentHub</h1>
          <p>IM-first 多 Agent 协作工作台</p>
        </div>
        <div className="conversation-create-mode" data-testid="conversation-create-mode">
          <button
            type="button"
            className={conversationCreateMode === "SINGLE" ? "conversation-create-mode__button conversation-create-mode__button--active" : "conversation-create-mode__button"}
            onClick={() => onConversationCreateModeChange("SINGLE")}
          >
            单聊
          </button>
          <button
            type="button"
            className={conversationCreateMode === "GROUP" ? "conversation-create-mode__button conversation-create-mode__button--active" : "conversation-create-mode__button"}
            onClick={() => onConversationCreateModeChange("GROUP")}
          >
            群聊
          </button>
        </div>
        <button
          type="button"
          className="primary-button"
          data-testid="create-conversation-button"
          disabled={creatingConversation}
          onClick={() => onCreateConversation(conversationCreateMode)}
        >
          {creatingConversation ? "创建中..." : `+ 新建${conversationCreateMode === "SINGLE" ? "单聊" : "群聊"}`}
        </button>
      </div>

      <div className="workspace-sidebar__body">
        <section className="workspace-section">
          <div className="section-header">
            <h3>近期会话</h3>
            <span>{conversations.length}</span>
          </div>
          <ConversationList
            conversations={conversations}
            currentConversationId={currentConversationId}
            loading={loadingConversations}
            query={conversationQuery}
            filter={conversationFilter}
            onQueryChange={onConversationQueryChange}
            onFilterChange={onConversationFilterChange}
            onSelect={onSelectConversation}
            onTogglePinned={onToggleConversationPinned}
            onArchive={onArchiveConversation}
            onRestore={onRestoreConversation}
          />
        </section>

        <section className="workspace-section">
          <div className="section-header">
            <h3>我的 Agent</h3>
            <span>{agents.length}</span>
          </div>
          <AgentList
            agents={agents}
            adapterDescriptors={adapterDescriptors}
            loading={loadingAgents}
            selectedAgentId={selectedAgent ? getIdValue(selectedAgent.id) : null}
            onSelectAgent={onSelectAgent}
          />
        </section>
      </div>
    </aside>
  );
}
