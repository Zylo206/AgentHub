import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
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
  const { user, logout } = useAuth();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (createMenuOpen && !createMenuRef.current?.contains(target) && !createButtonRef.current?.contains(target)) {
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
    navigate("/agents?view=cli");
  }

  function handleAgentCreated(agent: Agent) {
    setCreatedAgentName(agent.name);
    window.dispatchEvent(new CustomEvent("agenthub:agent-created", { detail: { agent } }));
    window.setTimeout(() => setCreatedAgentName(null), 3200);
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header app-header--light">
        <div className="app-header__brand" aria-label="AgentHub">
          <span className="app-header__mark" aria-hidden="true">
            AH
          </span>
          <span className="app-header__copy">
            <span className="app-header__title">AgentHub</span>
          </span>
        </div>

        <div className="app-header__create" ref={createMenuRef}>
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
            className={`app-create-menu${createMenuOpen ? " app-create-menu--open" : ""}`}
            data-testid="app-create-menu"
            role="menu"
            aria-hidden={!createMenuOpen}
          >
            <div className="app-create-menu__title">快速开始</div>
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
                <small>回到 Workspace，发起新的 IM 协作会话。</small>
              </span>
              <em aria-hidden="true">→</em>
            </button>
            <button
              type="button"
              className="app-create-menu__item"
              data-testid="app-create-agent-option"
              role="menuitem"
              onClick={() => openAgentDialog("custom")}
            >
              <span className="app-create-menu__icon" aria-hidden="true">
                A
              </span>
              <span>
                <strong>创建业务 Agent</strong>
                <small>描述职责后生成草案，再确认创建。</small>
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
                CLI
              </span>
              <span>
                <strong>检查本地 CLI</strong>
                <small>查看 Claude Code / Codex 的本机能力探测结果。</small>
              </span>
              <em aria-hidden="true">→</em>
            </button>
          </div>
        </div>

        <nav className="app-header__nav" aria-label="主导航">
          <NavLink to="/workspace" className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}>
            工作台
          </NavLink>
          <NavLink to="/agents" className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}>
            Agent 管理
          </NavLink>
          <NavLink to="/desktop" className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}>
            Desktop
          </NavLink>
          {user?.role === "ADMIN" ? (
            <NavLink
              to="/admin/users"
              className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
            >
              用户管理
            </NavLink>
          ) : null}
        </nav>

        <div className="app-header__user">
          <div className="app-header__user-meta">
            <strong>{user?.displayName || user?.username || "当前用户"}</strong>
            <span>{user?.role || "USER"}</span>
          </div>
          <button
            type="button"
            className="secondary-button app-header__logout-button"
            data-testid="app-logout-button"
            onClick={() => void handleLogout()}
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      {createdAgentName ? (
        <div className="app-agent-create-toast" role="status">
          已创建 {createdAgentName}，现在可以在聊天里通过 @{createdAgentName} 使用它。
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
