import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark" aria-hidden="true">
            ◆
          </span>
          <span className="app-header__copy">
            <span className="app-header__title">AgentHub</span>
            <span className="app-header__subtitle">
              IM 式多 Agent 协作工作台
            </span>
          </span>
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
        <div className="app-header__actions" aria-label="全局操作">
          <button type="button">邀请 Agent</button>
          <button type="button">更多</button>
        </div>
        <div className="app-header__window-controls" aria-label="窗口控制">
          <span aria-hidden="true">－</span>
          <span aria-hidden="true">□</span>
          <span aria-hidden="true">×</span>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
