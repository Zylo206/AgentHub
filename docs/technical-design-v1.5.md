# AgentHub 技术文档 v1.5

## 1. 文档说明

- 版本：v1.5
- 更新时间：2026-06-08
- 文档目标：说明 AgentHub 当前可交付版本的技术架构、核心模块、关键流程、验证方式和明确边界

AgentHub v1.5 的核心定位，是一个以 IM 为主交互路径的多 Agent 协作平台 MVP。系统目标不是替代 IDE，也不是把真实大模型调用作为默认前提，而是在“可解释协作 + 可追踪产物 + 可审计高风险操作”的框架下，提供稳定的 Web 主链路和可选桌面扩展。

## 2. 总体架构

```text
Frontend (React + Vite + TypeScript)
  -> REST API
  -> SSE Realtime
  -> WebSocket control plane (minimal)

Backend (Spring Boot + Java 17)
  -> API Layer
  -> Application Layer
  -> Domain Layer
  -> Infrastructure Layer
      -> Adapter Registry
      -> Memory/JDBC Repository
      -> File Storage
      -> Audit / Approval / Deploy Preview

Desktop (Tauri v2, optional)
  -> Reuse Web frontend build
  -> Native file / notification / process capability
```

### 2.1 设计原则

- IM-first：主链路从消息出发，而不是从脚本或调试按钮出发
- Artifact-centered：Agent 输出以可管理产物为中心
- Explainable orchestration：Planner、Router、Executor、Aggregator 都要可解释
- Safe-by-default：Apply、Restore、Deploy 等高风险操作必须走审批与审计
- Visible fallback：Mock、fixture、static fallback 必须可见且不可伪装为真实能力

## 3. 技术栈

| 层次 | 技术选型 |
|---|---|
| 前端 | React 18、Vite 7、TypeScript 5 |
| 后端 | Spring Boot 3、Java 17 |
| 实时 | SSE 为主，WebSocket 仅做控制面 |
| 数据持久化 | `memory` 默认，`jdbc`/MySQL 可选 |
| 桌面壳 | Tauri v2、Rust |
| 自动化验证 | Maven、TypeScript、Node smoke、Playwright Browser E2E |

## 4. 代码结构

## 4.1 后端

后端入口位于 `backend/src/main/java/com/agenthub`。

分层如下：

- `api/`
  - REST Controller
  - 所有外部接口统一返回 `ApiResponse`
- `application/`
  - 业务编排与工作流服务
  - 例如 Orchestrator、Context、Approval、Deployment、Realtime
- `domain/`
  - 核心领域对象
  - 包括 Conversation、Message、Agent、TaskRun、Artifact、Memory、Approval、Audit 等
- `infrastructure/`
  - Repository、Adapter、CLI runner、文件存储、外部能力接入

关键后端链路：

- `OrchestratorService -> TaskPlanner -> AgentRouter -> AgentStepExecutor -> ResultAggregator`
- `AgentAdapterRegistry` 统一管理 MOCK、OPENAI_COMPATIBLE、CLAUDE_CODE、CODEX、OPEN_CODE
- `RealtimeEventPublisher` 统一发布 SSE 事件

## 4.2 前端

前端入口位于 `frontend/src/main.tsx`，路由定义在 `frontend/src/router`。

关键页面和模块：

- `frontend/src/pages/workspace/WorkspacePage.tsx`
  - IM 主工作台
- `frontend/src/pages/preview/PreviewPage.tsx`
  - 产物预览页
- `frontend/src/api/agenthubApi.ts`
  - 前端统一 API 调用入口
- `frontend/src/features/artifacts`
  - Artifact 工作台与修订流程
- `frontend/src/features/deployments`
  - Deploy Preview 能力
- `frontend/src/features/...`
  - 聊天、Agent、Context、Approval、Audit、TaskRun 等各功能模块

前端约束：

- 组件层不直接散落 raw `fetch`
- 不引入 axios、Redux、Zustand 或额外 UI 组件库
- 重要 UI 路径保留稳定 `data-testid`，供 Browser E2E 使用

## 4.3 桌面壳

桌面目录位于 `desktop/`。

职责边界：

- 复用 Web 主界面作为桌面渲染层
- 提供本地文件读取、系统通知、CLI 探测、托管进程等原生能力
- 不替代 Web 主客户端
- 不是默认运行时依赖

## 5. 核心领域模型

| 模型 | 职责 |
|---|---|
| Conversation | 会话容器，承载消息、参与者、模式、可见性 |
| Message | 用户消息、Agent 协议消息、部署消息等 |
| Agent | 内置或自定义 Agent，包含标签、适配器偏好和策略 |
| TaskRun | 一次协作运行实例 |
| TaskStep | TaskRun 下的具体执行步骤 |
| Artifact | 产物对象，支持版本和来源追踪 |
| ArtifactSnapshot | 产物快照，用于恢复 |
| ContextSnapshot | 运行时上下文快照 |
| MemoryItem | 长期记忆对象 |
| ApprovalRequest | 高风险操作审批 |
| ActionAuditLog | 高风险操作审计记录 |
| AttachmentRecord | 附件元数据 |
| DeploymentRecord | 本地静态预览部署记录 |

## 6. 核心技术流程

## 6.1 多 Agent 协作主流程

1. 用户在 Workspace 发送消息，或通过协作确认卡启动协作
2. 后端读取 `selectedAgent`、`targetAgentId`、`mentionedAgentIds`
3. `TaskPlanner` 生成步骤计划
4. `AgentRouter` 结合 Agent 能力、工具标签和适配器偏好分派步骤
5. `AgentStepExecutor` 通过 `AgentAdapterRegistry` 执行
6. `ResultAggregator` 聚合结果并写入消息、产物和上下文快照
7. 前端通过 REST 加载结果，通过 SSE 获取增量刷新信号

## 6.2 Context / Memory 检索流程

1. 用户可将消息固定到 Context，或保存为 Memory
2. 运行前后端汇总 pinned context、memory、附件摘要、最近消息、历史产物、TaskRun summary
3. `ContextSearchService` 给出检索解释，包括来源、得分和排序依据
4. `ContextSnapshot` 持久化当前运行输入上下文

当前边界：

- 默认不是向量数据库检索
- `memory` 模式下为本地持久化与规则检索
- `jdbc` 只在显式启用时生效

## 6.3 Artifact 生命周期

1. TaskRun 产出 CODE、REVIEW_REPORT、API_CONTRACT、WEB_PREVIEW 等 Artifact
2. 用户可对选中产物发起 Revision
3. 系统生成 Version History 和 Diff Summary
4. Apply Diff、Force Apply、Restore、Deploy 必须先创建 `ApprovalRequest`
5. 审批通过后执行操作，并写入 `ActionAuditLog`

## 6.4 Deploy Preview

当前 Deploy 不是云部署，而是本地静态预览流程：

1. 用户确认部署意图
2. 后端创建部署审批
3. 审批通过后生成本地静态预览记录
4. 前端通过 `/preview/:artifactId` 打开展示页

边界：

- 不接入真实 Vercel、Netlify、Docker、Kubernetes
- 不包含公网发布和发布回滚平台能力

## 6.5 实时能力

当前实时能力以 SSE 为主：

- `MESSAGE_CREATED`
- `TASK_RUN_CREATED`
- `TASK_RUN_UPDATED`
- `ARTIFACT_CREATED`
- 其他审批、审计、部署相关事件

恢复能力：

- 支持 `Last-Event-ID` 回放
- 支持 active realtime state 查询
- REST 仍是权威状态源

边界：

- WebSocket 仅为控制面 MVP
- 不是完整双向聊天通道
- 不是多节点事件总线

## 6.6 Adapter 体系

适配器入口为 `AgentAdapterRegistry`。

当前类型：

- `MOCK`
- `OPENAI_COMPATIBLE`
- `CLAUDE_CODE`
- `CODEX`
- `OPEN_CODE`

技术规则：

- 所有适配器输出必须走统一 Artifact JSON 合约
- 非 MOCK 输出只有在合约校验、质量评估和可选构建校验都通过后，才能成为 `REAL_ADAPTER`
- `REAL_FIRST` 只在真实输出满足质量门槛时提升真实产物为主产物

当前边界：

- 真实适配器链路为可选启用能力
- Claude Code / Codex 当前是 headless、artifact-only v1，不允许直接改 AgentHub 工作区

## 7. API 设计原则

核心 API 原则：

- 统一返回 `ApiResponse`
- Controller 只做请求编排和参数校验
- 业务逻辑下沉到 application service
- 前端调用统一经 `agenthubApi.ts`

主要 API 领域：

- `/api/auth/*`
- `/api/agents/*`
- `/api/adapters/*`
- `/api/conversations/*`
- `/api/messages/*`
- `/api/task-runs/*`
- `/api/artifacts/*`
- `/api/attachments/*`
- `/api/deployments/*`
- `/api/approvals/*`
- `/api/action-audits/*`

## 8. 持久化模式

## 8.1 默认模式

- `memory`
- 适合默认演示、开发和基线验收

## 8.2 JDBC 模式

- 通过环境变量切换为 `jdbc`
- 依赖 MySQL 兼容数据库和 `schema-jdbc.sql`
- 支持 Conversation、Message、Attachment、TaskRun、Artifact、Snapshot、Approval、Audit 等持久化

当前边界：

- JDBC 不是默认模式
- 本轮 v1.5 基线验收未在 `jdbc` 模式下完成

## 9. 验证体系

AgentHub v1.5 的技术验收由多层验证组成：

- 后端单元测试：`mvn test`
- 后端构建：`mvn package`
- 前端类型检查：`npm.cmd run lint`
- 前端构建：`npm.cmd run build`
- API 主链路：`node scripts/smoke-test.mjs`
- SSE：`node scripts/sse-smoke-test.mjs`
- Browser E2E：`node scripts/e2e-browser.mjs`
- JDBC 条件验收：`node scripts/jdbc-smoke-test.mjs`
- 真实适配器条件验收：`real-adapter-smoke-test.mjs`、`claude-code-smoke-test.mjs`、`codex-smoke-test.mjs`

本轮 v1.5 实测结果：

- Web 主链路全部通过
- Desktop 构建级验收通过
- 真实适配器和 JDBC 条件能力未完成有效实测
- 三个条件 smoke 脚本存在认证前置不一致问题

## 10. 安全与风控

AgentHub 当前通过以下机制控制高风险操作：

- `ApprovalRequest`
  - Apply Diff
  - Force Apply
  - Restore
  - Deploy
- `ActionAuditLog`
  - 记录审批创建、审批通过、操作执行等事件
- `AttachmentAccessGuard`
  - 控制附件访问
- Adapter fallback 可见
  - 防止把本地兜底结果伪装成真实大模型输出

## 11. v1.5 已知边界

- 默认不依赖真实 LLM
- 默认不依赖 MySQL
- 默认不依赖 Desktop
- Deploy Preview 不是云部署
- Realtime 不是多节点事件总线
- Claude Code / Codex 不是 workspace-write 模式
- Browser E2E 是 UI 集成门禁，不替代真实提供商和数据库验收

## 12. 下一步技术建议

1. 统一所有条件 smoke 脚本的登录前置逻辑，保持与 `smoke-test.mjs` 一致。
2. 在 `jdbc` 模式下补跑重启后查询型验收，形成数据库证据闭环。
3. 在至少一个真实适配器场景下补跑 `REAL_FIRST` 条件验收。
4. 继续把 Desktop 能力保持为可选扩展，不让其污染 Web 主路径。
