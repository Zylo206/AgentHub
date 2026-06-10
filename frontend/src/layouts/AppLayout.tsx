import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AgentCreateDialog, type AgentCreateMode } from "../features/agents/AgentCreateDialog";
import type { Agent } from "../features/agents/agentTypes";

function getUserDisplayName(user?: {
  displayName?: string | null;
  username?: string | null;
} | null): string {
  return user?.displayName || user?.username || "当前用户";
}

function getUserInitial(user?: {
  displayName?: string | null;
  username?: string | null;
} | null): string {
  return getUserDisplayName(user).charAt(0).toUpperCase() || "U";
}

export function AppLayout() {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [agentDialogMode, setAgentDialogMode] = useState<AgentCreateMode>("custom");
  const [createdAgentName, setCreatedAgentName] = useState<string | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const createButtonRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userButtonRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isRailLayoutRoute =
    location.pathname.startsWith("/workspace") || location.pathname.startsWith("/agents");

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (createMenuOpen && !createMenuRef.current?.contains(target) && !createButtonRef.current?.contains(target)) {
        setCreateMenuOpen(false);
      }
      if (userMenuOpen && !userMenuRef.current?.contains(target) && !userButtonRef.current?.contains(target)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreateMenuOpen(false);
        setUserMenuOpen(false);
        setAgentDialogOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [createMenuOpen, userMenuOpen]);

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
    setUserMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  function handleOpenApiSettings() {
    setUserMenuOpen(false);
    if (location.pathname !== "/workspace") {
      navigate("/workspace");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("agenthub:open-api-settings"));
      }, 80);
      return;
    }
    window.dispatchEvent(new CustomEvent("agenthub:open-api-settings"));
  }

  function handleOpenConversationSettings() {
    setUserMenuOpen(false);
    if (location.pathname !== "/workspace") {
      navigate("/workspace");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("agenthub:open-conversation-settings"));
      }, 80);
      return;
    }
    window.dispatchEvent(new CustomEvent("agenthub:open-conversation-settings"));
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
            onClick={() => {
              setUserMenuOpen(false);
              setCreateMenuOpen((current) => !current);
            }}
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
          <NavLink
            to="/workspace"
            title="Workspace"
            aria-label="Workspace"
            data-rail-icon="workspace"
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
          >
            工作台
          </NavLink>
          <NavLink
            to="/agents"
            title="Agent 管理"
            aria-label="Agent 管理"
            data-rail-icon="agents"
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
          >
            Agent 管理
          </NavLink>
          <NavLink
            to="/desktop"
            title="Desktop Console"
            aria-label="Desktop Console"
            data-rail-icon="desktop"
            className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
          >
            Desktop
          </NavLink>
          {user?.role === "ADMIN" ? (
            <NavLink
              to="/admin/users"
              title="用户管理"
              aria-label="用户管理"
              data-rail-icon="admin"
              className={({ isActive }) => `app-nav-link ${isActive ? "app-nav-link--active" : ""}`}
            >
              用户管理
            </NavLink>
          ) : null}
        </nav>

        <div
          className={`app-header__user${isRailLayoutRoute ? " app-header__user--workspace-rail" : ""}`}
          ref={userMenuRef}
        >
          <button
            ref={userButtonRef}
            type="button"
            className={`app-header__user-trigger${isRailLayoutRoute ? " app-header__user-trigger--workspace-rail" : ""}`}
            data-testid="app-user-menu-button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setCreateMenuOpen(false);
              setUserMenuOpen((current) => !current);
            }}
          >
            <span className="app-header__user-avatar" aria-hidden="true">
              {getUserInitial(user)}
            </span>
            <span className="app-header__user-meta">
              <strong>{getUserDisplayName(user)}</strong>
              <span>{user?.role || "USER"}</span>
            </span>
          </button>

          {userMenuOpen ? (
            <div
              className={`app-header__user-menu${isRailLayoutRoute ? " app-header__user-menu--workspace-rail" : ""}`}
              role="menu"
              data-testid="app-user-menu"
            >
              <div className="app-header__user-menu-header">
                <strong>{getUserDisplayName(user)}</strong>
                <span>{user?.role || "USER"}</span>
              </div>
              {location.pathname.startsWith("/workspace") ? (
                <button
                  type="button"
                  className="app-header__user-menu-item"
                  role="menuitem"
                  onClick={handleOpenConversationSettings}
                >
                  会话设置
                </button>
              ) : null}
              <button
                type="button"
                className="app-header__user-menu-item"
                role="menuitem"
                onClick={handleOpenApiSettings}
              >
                API 设置
              </button>
              <button
                type="button"
                className="app-header__user-menu-item"
                data-testid="app-logout-button"
                role="menuitem"
                onClick={() => void handleLogout()}
              >
                退出登录
              </button>
            </div>
          ) : null}
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
