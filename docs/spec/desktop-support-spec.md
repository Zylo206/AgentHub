# Desktop Support Spec

## 目标

用可选 Tauri 桌面壳补齐课题中的桌面端方向：本地文件访问、系统通知、Agent 进程管理。桌面端不替代 Web 主力端，默认演示仍可以只运行浏览器版 `/workspace`。

## 范围

- 桌面壳通过 Tauri 包裹现有 Web 前端。
- Web 环境下显示桌面能力不可用，不影响主流程。
- Tauri 环境下提供：
  - 本地目录列出。
  - 文本文件预览。
  - Claude Code / Codex / OpenCode CLI 探测。
  - 系统通知测试。
  - 启动和停止本地 backend Java 进程。
- 所有能力先集中在 Workspace 的桌面能力面板中展示，作为产品化骨架。

## 非目标

- 不做完整 Electron/Tauri 分发包。
- 不做 workspace-write 或外部 Agent 直接修改 AgentHub 仓库。
- 不做桌面端独立状态管理。
- 不做系统托盘、自动更新、后台守护进程。
- 不把桌面端作为默认 smoke / E2E 前置条件。

## 核心模型

### Desktop Bridge

前端通过 `desktopBridge.ts` 检测 Tauri invoke 能力：

- 浏览器运行时：返回不可用状态和边界说明。
- Tauri 运行时：调用后端 Rust command。

### Desktop Capability Panel

Workspace 内展示桌面能力：

- 环境状态。
- 本地目录 / 文件预览。
- Agent CLI 探测。
- 系统通知。
- backend 进程管理。

### Tauri Commands

Rust 侧提供命令：

- `desktop_environment`
- `list_directory`
- `read_text_preview`
- `probe_agent_cli`
- `send_system_notification`
- `start_agenthub_backend`
- `stop_managed_process`
- `list_managed_processes`

## 关键流程

### 本地文件访问

1. 用户在桌面面板输入本地路径。
2. Tauri command 列出目录项或读取文本预览。
3. 文件预览只返回有限字符数，避免一次读入大文件。

### 系统通知

1. 用户点击测试通知。
2. Tauri 调用 notification 插件发送系统通知。
3. 失败时前端显示错误，不影响 Web 主流程。
4. Tauri 环境下，Workspace 监听现有 SSE / Realtime 事件并转发关键事件为系统通知：
   - TaskRun `COMPLETED`。
   - TaskRun `BLOCKED`。
   - TaskRun `FAILED`。
   - Approval `PENDING`。
   - Deployment created。
   - Adapter fallback / quality failure。
5. 通知中心记录最近通知，但 REST / SSE 仍是权威状态源。

### Agent 进程管理

1. 用户探测 Claude Code / Codex / OpenCode CLI。
2. Tauri 使用 `ProcessBuilder` 风格执行，不拼 shell 字符串。
3. CLI 探测返回 executable path、version、help probe、auth probe、stream support、schema support、sandbox policy、tool policy。
4. 用户可用 Java jar 路径启动本地 backend。
5. 已启动进程记录在 Tauri app state，可停止和查看。
6. backend stdout / stderr 被采集到最近日志摘要，并写入临时 log 文件路径。

## 验收标准

- 普通浏览器运行时，Workspace 不崩溃，并明确提示桌面能力只在 Tauri 中可用。
- 前端构建通过。
- Tauri scaffold 存在，具备 package、Cargo、capability、Rust commands 和 README。
- 本地文件、通知、进程管理能力都有明确 UI 入口。
- 文档明确这是可选桌面壳，不是完整桌面生产客户端。
- `cargo check` 必须通过，证明 Rust command 和 capability 基础可编译。
- `npm run dev` 应能启动 Tauri shell，Desktop Console 在 Tauri 中显示已连接状态。
- `npm run build -- --no-bundle` 应能生成 `agenthub-desktop.exe`。
- 触发 TaskRun / Approval / Deployment / Adapter fallback 事件时，Tauri 环境应弹出系统通知并在 Desktop Console 中留下记录。
- 启动 backend 后，Desktop Console 应显示 pid、startedAt、running、log path 和最近 stdout / stderr 摘要。

## Fallback / Boundary

- Tauri 未安装依赖时，不影响 Web build、API smoke、Browser E2E。
- CLI 探测失败只显示不可用原因，不把 adapter 标记为可用。
- 进程管理只管理由当前 Tauri shell 启动的进程，不接管用户手动启动的系统进程。
- 系统通知是桌面增强能力，不作为任务完成的唯一提示渠道。
- 桌面壳不改变 Orchestrator、Adapter、Artifact、Approval、Realtime 的后端主链路。
- Installer / MSI bundling 是发布阶段能力；开发期 Tauri shell 能运行不等于完整安装包已可交付。
