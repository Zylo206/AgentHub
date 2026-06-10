import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AppLayout } from "../layouts/AppLayout";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AgentBuilderPage } from "../pages/agents/AgentBuilderPage";
import { DesktopConsolePage } from "../pages/desktop/DesktopConsolePage";
import { PreviewPage } from "../pages/preview/PreviewPage";
import { WorkspacePage } from "../pages/workspace/WorkspacePage";

function RequireAuth() {
  const location = useLocation();
  const { authenticated, loading } = useAuth();

  if (loading) {
    return <div className="auth-page"><div className="auth-card"><p>加载登录态...</p></div></div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

function RequireAdmin() {
  const { user } = useAuth();
  if (!user?.role || user.role !== "ADMIN") {
    return <Navigate to="/workspace" replace />;
  }
  return <Outlet />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/agents" element={<AgentBuilderPage />} />
          <Route path="/desktop" element={<DesktopConsolePage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
        {/* PreviewPage 独立于 AppLayout，作为全屏独立页面 */}
        <Route path="/preview/:artifactId" element={<PreviewPage />} />
      </Route>
    </Routes>
  );
}
