import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__title">AgentHub</span>
          <span className="app-header__subtitle">
            IM-style multi-agent collaboration workspace
          </span>
        </div>
        <nav className="app-header__nav">
          <NavLink
            to="/workspace"
            className={({ isActive }) =>
              `app-nav-link ${isActive ? "app-nav-link--active" : ""}`
            }
          >
            Workspace
          </NavLink>
          <NavLink
            to="/agents"
            className={({ isActive }) =>
              `app-nav-link ${isActive ? "app-nav-link--active" : ""}`
            }
          >
            Agent Builder
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
