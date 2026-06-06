import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { AgentBuilderPage } from "../pages/agents/AgentBuilderPage";
import { DesktopConsolePage } from "../pages/desktop/DesktopConsolePage";
import { PreviewPage } from "../pages/preview/PreviewPage";
import { WorkspacePage } from "../pages/workspace/WorkspacePage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/workspace" replace />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/agents" element={<AgentBuilderPage />} />
        <Route path="/desktop" element={<DesktopConsolePage />} />
        <Route path="/preview/:artifactId" element={<PreviewPage />} />
      </Route>
    </Routes>
  );
}
