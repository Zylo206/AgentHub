import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AgentCreateDialog, type AgentCreateMode } from "../features/agents/AgentCreateDialog";
import type { Agent } from "../features/agents/agentTypes";

export function AppLayout() {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [agentDialogMode, setAgentDialogMode] = useState<AgentCreateMode>("custom");
  const [createdAgentName, setCreatedAgentName] = useState<string | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        createMenuOpen &&
        !createMenuRef.current?.contains(target) &&
        !createButtonRef.current?.contains(target)
      ) {
        setCreateMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreateMenuOpen(false);
        setAgentDialogOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [createMenuOpen]);

  function openAgentDialog(mode: AgentCreateMode) {
    setAgentDialogMode(mode);
    setAgentDialogOpen(true);
    setCreateMenuOpen(false);
  }

  function handleCreateConversation() {
    setCreateMenuOpen(false);
    navigate("/workspace");
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("agenthub:create-conversation"));
    }, 0);
  }

  function handleOpenCliStatus() {
    setCreateMenuOpen(false);
    navigate("/agents#local-cli");
  }

  function handleAgentCreated(agent: Agent) {
    setCreatedAgentName(agent.name);
    window.dispatchEvent(new CustomEvent("agenthub:agent-created", { detail: { agent } }));
    window.setTimeout(() => setCreatedAgentName(null), 3200);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            AH
          </span>
          <span className="app-header__copy">
            <span className="app-header__title">AgentHub</span>
            <span className="app-header__subtitle">IM 式多 Agent 协作</span>
          </span>
        </div>

        <button
          ref={createButtonRef}
          type="button"
          className="app-rail-create-button"
          data-testid="app-create-button"
          aria-expanded={createMenuOpen}
          aria-haspopup="menu"
          onClick={() => setCreateMenuOpen((current) => !current)}
        >
          <span aria-hidden="true">+</span>
          <span className="app-rail-create-button__label">新建</span>
        </button>

        <div
          ref={createMenuRef}
          className={`app-create-menu${createMenuOpen ? " app-create-menu--open" : ""}`}
          data-testid="app-create-menu"
          role="menu"
          aria-hidden={!createMenuOpen}
        >
          <div className="app-create-menu__title">新建</div>
          <button
            type="button"
            className="app-create-menu__item app-create-menu__item--active"
            data-testid="app-create-conversation-option"
            role="menuitem"
            onClick={handleCreateConversation}
          >
            <span className="app-create-menu__icon" aria-hidden="true">
              +
            </span>
            <span>
              <strong>新建会话</strong>
              <small>回到 Workspace，创建一条 IM-first 协作会话。</small>
            </span>
            <em aria-hidden="true">↵</em>
          </button>
          <button
            type="button"
            className="app-create-menu__item"
            data-testid="app-create-agent-option"
            role="menuitem"
            onClick={() => openAgentDialog("custom")}
          >
            <span className="app-create-menu__icon" aria-hidden="true">
              ✦
            </span>
            <span>
              <strong>创建自定义 Agent</strong>
              <small>描述职责，生成草案后确认创建。</small>
            </span>
            <em aria-hidden="true">+</em>
          </button>
          <button
            type="button"
            className="app-create-menu__item"
            data-testid="app-connect-local-agent-option"
            role="menuitem"
            onClick={handleOpenCliStatus}
          >
            <span className="app-create-menu__icon" aria-hidden="true">
              ⌘
            </span>
            <span>
              <strong>检查本地 CLI</strong>
              <small>查看 Claude Code / Codex 的 path、version、auth 和 sandbox 状态。</small>
            </span>
            <em aria-hidden="true">→</em>
          </button>
        </div>

        <div className="app-header__mission" aria-label="当前协作空间">
          <span className="app-header__mission-title">多 Agent 协作：React 组件开发</span>
          <span className="app-header__live-dot">运行中</span>
          <span className="app-header__timer">00:06:24</span>
        </div>

        <div className="app-header__status" aria-label="AgentHub 当前能力">
          <span>O</span>
          <span>F</span>
          <span>B</span>
          <span>R</span>
          <span>CC</span>
          <span>+2</span>
        </div>

        <nav className="app-header__nav" aria-label="主导航">
          <NavLink
            to="/workspace"
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
          >
            工作台
          </NavLink>
          <NavLink
            to="/agents"
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
          >
            Agent 管理台
          </NavLink>
        </nav>

        <div className="app-header__window-controls" aria-label="窗口控制">
          <span aria-hidden="true">-</span>
          <span aria-hidden="true">□</span>
          <span aria-hidden="true">×</span>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {createdAgentName ? (
        <div className="app-agent-create-toast" role="status">
          已创建 {createdAgentName}，可在聊天中 @{createdAgentName} 使用
        </div>
      ) : null}

      <AgentCreateDialog
        open={agentDialogOpen}
        initialMode={agentDialogMode}
        onClose={() => setAgentDialogOpen(false)}
        onCreated={handleAgentCreated}
      />
    </div>
  );
}
