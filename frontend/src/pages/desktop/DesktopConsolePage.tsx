import { Link } from "react-router-dom";
import { DesktopCapabilityPanel } from "../../features/desktop/DesktopCapabilityPanel";
import "../../styles/workspace.css";
import "../../styles/workspace/tokens.css";
import "../../styles/workspace/components.css";
import "../../styles/workspace/diagnostics.css";
import "../../styles/production-alignment.css";
import "../../styles/desktop.css";

export function DesktopConsolePage() {
  return (
    <section className="desktop-console-page" data-testid="desktop-console-page">
      <header className="desktop-console-page__header">
        <div>
          <span className="desktop-console-page__eyebrow">Desktop Console</span>
          <h1>本机能力控制台</h1>
          <p>集中处理 Tauri 本地文件预览、系统通知、本机 Agent CLI 探测和 backend managed process。</p>
        </div>
        <Link className="secondary-button" to="/workspace">
          返回 Workspace
        </Link>
      </header>
      <DesktopCapabilityPanel />
    </section>
  );
}
