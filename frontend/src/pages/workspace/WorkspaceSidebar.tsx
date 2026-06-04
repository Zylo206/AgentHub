import { AgentList } from "../../features/agents/AgentList";
import type { AdapterDescriptor, Agent } from "../../features/agents/agentTypes";
import { ConversationList, type ConversationFilter } from "../../features/conversations/ConversationList";
import type { Conversation } from "../../features/conversations/conversationTypes";
import { getIdValue } from "../../utils/id";

interface WorkspaceSidebarProps {
  agents: Agent[];
  adapterDescriptors: AdapterDescriptor[];
  conversations: Conversation[];
  conversationFilter: ConversationFilter;
  conversationQuery: string;
  creatingConversation: boolean;
  currentConversationId: string | null;
  loadingAgents: boolean;
  loadingConversations: boolean;
  selectedAgent: Agent | null;
  onArchiveConversation: (conversation: Conversation) => void;
  onConversationFilterChange: (filter: ConversationFilter) => void;
  onConversationQueryChange: (query: string) => void;
  onCreateConversation: () => void;
  onRestoreConversation: (conversation: Conversation) => void;
  onSelectAgent: (agent: Agent) => void;
  onSelectConversation: (conversationId: string) => void;
  onToggleConversationPinned: (conversation: Conversation) => void;
}

export function WorkspaceSidebar({
  agents,
  adapterDescriptors,
  conversations,
  conversationFilter,
  conversationQuery,
  creatingConversation,
  currentConversationId,
  loadingAgents,
  loadingConversations,
  selectedAgent,
  onArchiveConversation,
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
          <p>IM 式多 Agent 协作工作台</p>
        </div>
        <button
          type="button"
          className="primary-button"
          data-testid="create-conversation-button"
          disabled={creatingConversation}
          onClick={onCreateConversation}
        >
          {creatingConversation ? "创建中..." : "+ 新建对话"}
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
