# AgentHub

AgentHub 是一个 IM-first 多 Agent 协作平台 MVP。用户像使用即时通讯工具一样，通过会话、Agent 联系人、`@Agent` 指令和协作消息流，驱动多个 Agent 完成代码、页面、API 文档、评审报告等 Artifact 的生成、修改、评审和预览。

## 当前能力概览

- IM Workspace：会话、消息流、`@Agent`、多 Agent 协作建议、TaskRun 解释链。
- Orchestrator：Planner、Router、Executor、Aggregator、轻量 Task DAG、并行分组、fallback 可见。
- Artifact 生命周期：Revision、Diff、Compare、Apply、Snapshot、Restore、Deploy Preview、Bundle Download。
- Approval / Audit：高风险操作审批、关键动作审计。
- Auth / Admin：本地账号注册登录、refresh token、管理员用户管理、用户目录搜索。
- Adapter：`MOCK`、`OPENAI_COMPATIBLE`、`CLAUDE_CODE`、`CODEX`、`OPEN_CODE`。
- Runtime Config：IM 端 OpenAI-compatible Provider 的 `USER / ORG / GLOBAL` 作用域配置。
- Persistence：默认内存模式；JDBC / MySQL、对象存储、doc-collab snapshot 为可选增强。

## 明确边界

- `Deploy Preview` 是本地静态预览，不是真实云部署。
- `REAL_ADAPTER` 仅表示通过当前 contract / quality / build gate，不代表产物可直接生产上线。
- Claude Code / Codex 当前是 headless、Artifact-only、CLI 探测 / 执行接入，不是深度 IDE 集成。
- IM API Provider 配置服务于远程 HTTP 问答，不是本地 CLI 开关。
- 默认本地启动不要求 MySQL、Redis、MinIO、真实 Provider Key 全部到位。

## 目录结构

```text
backend/      Spring Boot 后端
frontend/     React + Vite 前端
doc-collab/   独立协同编辑服务
desktop/      Tauri 桌面壳
docs/         产品、技术、验收与专题设计文档
scripts/      本地启动、初始化、smoke、E2E、运维辅助脚本
```

## 快速启动

### 一键本地启动

Windows 本机优先使用：

```powershell
scripts/start-local.ps1
```

默认会拉起后端和前端；`doc-collab`、MySQL、Redis、MinIO 属于按需增强能力。

### 手动启动

后端：

```powershell
cd backend
mvn spring-boot:run
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

默认访问：

- 前端：[http://127.0.0.1:5173](http://127.0.0.1:5173)
- 后端：[http://127.0.0.1:8080/api/health](http://127.0.0.1:8080/api/health)

## 登录与运行模式

### 默认 demo 模式

默认本地模式偏向演示和 smoke 稳定性，可直接使用 demo 登录链路。

### 真实账号 + JDBC 模式

如需切到真实用户体系和 MySQL 持久化，核心变量包括：

```powershell
$env:AGENTHUB_AUTH_MODE="real"
$env:AGENTHUB_PERSISTENCE_MODE="jdbc"
```

初始化可参考：

```powershell
node scripts/init-local-mysql.mjs
node scripts/mysql-init-profile.mjs
```

当前真实模式已支持：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `/admin/users` 管理后台

## IM 远程问答 Provider

Workspace 高级面板内提供 IM 端 OpenAI-compatible Provider 配置，支持：

- provider name
- base URL
- model
- API key
- `USER / ORG / GLOBAL` scope

这项能力只影响 IM 远程问答链路，不替代本地 Claude Code / Codex CLI。

## 本地 CLI 与适配器

项目当前支持的主要适配器：

- `MOCK`
- `OPENAI_COMPATIBLE`
- `CLAUDE_CODE`
- `CODEX`
- `OPEN_CODE`

其中：

- `MOCK` 是稳定兜底；
- `OPENAI_COMPATIBLE` 用于真实远程 HTTP Provider；
- `CLAUDE_CODE` 与 `CODEX` 依赖本机 CLI、探测与鉴权状态；
- `/api/adapters` 会返回当前适配器的可用状态与能力说明。

## 验证命令

### 构建

后端构建：

```powershell
cd backend
mvn clean package -DskipTests
```

前端构建：

```powershell
cd frontend
npm run build
```

### 核心 smoke

```powershell
node scripts/smoke-test.mjs
node scripts/sse-smoke-test.mjs
node scripts/jdbc-smoke-test.mjs
node scripts/real-adapter-smoke-test.mjs
node scripts/claude-code-smoke-test.mjs
node scripts/codex-smoke-test.mjs
node scripts/task-dag-smoke-test.mjs
node scripts/run-control-smoke-test.mjs
node scripts/conflict-smoke-test.mjs
node scripts/aggregator-smoke-test.mjs
node scripts/observability-smoke-test.mjs
node scripts/collab-smoke-test.mjs
node scripts/object-storage-smoke-test.mjs
node scripts/openai-provider-matrix-smoke.mjs
node scripts/e2e-browser.mjs
```

说明：

- 默认 smoke 不依赖真实 Provider。
- 真实 Provider、真实 CLI、对象存储、JDBC 相关 smoke 需要显式配置环境。
- Browser E2E 是 UI 主链路回归门禁。

## 文档

- [产品设计文档](docs/product-design.md)
- [技术设计文档](docs/technical-design.md)
- [验收报告 v1.5](docs/acceptance-report-v1.5.md)
- [下一阶段计划](docs/plans/next.md)
- [脚本说明](scripts/README.md)

## 开发原则

- 默认 demo 不能依赖真实 LLM、真实云部署或多节点基础设施。
- 新能力必须说明边界，尤其是 fallback、静态模板、本地预览和 CLI 探测结果。
- 高风险操作必须走 Approval / Audit。
- Adapter 变更不要绕过 `AgentAdapterRegistry`。
- 文档描述必须和当前代码一致，不要把规划当已交付。
