import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            AH
          </span>
          <span className="app-header__copy">
            <span className="app-header__title">AgentHub</span>
            <span className="app-header__subtitle">
              IM 式多 Agent 协作工作台
            </span>
          </span>
        </div>
        <div className="app-header__status" aria-label="AgentHub 当前能力">
          <span>多 Agent 群聊</span>
          <span>Artifact 交付</span>
          <span>实时状态</span>
        </div>
        <nav className="app-header__nav" aria-label="主导航">
          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              `app-nav-link ${isActive ? "app-nav-link--active" : ""}`
            }
          >
            工作台
          </NavLink>
          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `app-nav-link ${isActive ? "app-nav-link--active" : ""}`
            }
          >
            Agent 构建器
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
