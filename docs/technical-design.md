# AgentHub 技术设计文档

## 1. 技术背景

AgentHub 的目标不是实现一个普通 Chatbot，而是实现一个 IM-first 多 Agent 协作平台 MVP。系统需要支持用户通过聊天消息触发任务，由 Orchestrator 规划任务、选择 Agent、调用 Adapter、聚合结果，并将输出沉淀为可预览、可修改、可审批、可追踪的 Artifact。

核心技术挑战包括：

- 如何建模多 Agent 协作链路；
- 如何将用户消息转化为 TaskGraph / TaskRun；
- 如何将不同 Agent 路由到合适的 Adapter；
- 如何让真实 Adapter 和 Mock fallback 共存；
- 如何管理 Artifact 的版本、Diff、审批和预览；
- 如何把上下文、记忆和历史产物注入后续任务；
- 如何通过 smoke test 和 Browser E2E 保证主链路可回归；
- 如何补齐真实登录、用户目录、成员管理和 JDBC 持久化。

## 2. 技术目标与非目标

### 2.1 技术目标

AgentHub 当前版本的技术目标是支撑 IM Workspace 主链路，让用户可以通过 selectedAgent、单 `@Agent`、多 `@Agent` 路由触发多 Agent 协作。

系统需要支持 Orchestrator 的 Planner、Router、Executor、Aggregator 分层设计，并支持 TaskGraph、ExecutionBatch、轻量 Task DAG 和并行执行语义。

系统需要支持多种 Adapter，包括 `MOCK`、`OPENAI_COMPATIBLE`、`CLAUDE_CODE`、`CODEX` 和 `OPEN_CODE`。真实 Adapter 输出必须经过 Artifact Contract、quality gate、build validation 和 fallback 机制。

系统需要支持 Artifact 的完整 MVP 生命周期，包括 Revision、Diff、Approval、Snapshot、Restore 和 Deploy Preview。

系统还需要支持 Context、Memory、PinnedContext、ContextSnapshot 等上下文能力，并通过 SSE 刷新和 WebSocket Stop / Cancel 控制来改善实时状态反馈。

在验证方面，系统需要支持 API smoke、SSE smoke、JDBC smoke、真实 Adapter smoke、对象存储 smoke、冲突 / DAG / 可观测性 smoke 和 Browser E2E，用于保证核心链路可以稳定回归。

### 2.2 非目标

当前版本不实现生产级多租户权限体系，不实现完整动态 DAG DSL，不实现完整 token 级持久化，不实现多节点生产事件总线，也不实现真实云部署平台。

当前版本不实现生产级向量数据库或完整 RAG 系统，不实现完整 IDE 级代码编辑器，也不实现完整桌面端或移动端产品化交付。

这些能力可以作为后续阶段增强，但不属于当前 MVP 的核心验收范围。

## 3. 总体架构

AgentHub 采用前后端分离架构，整体链路如下：

```text
React + Vite + TypeScript Frontend
        ↓
REST API / SSE / WebSocket Control
        ↓
Spring Boot 3 + Java 17 Backend
        ↓
Application Services
        ↓
Domain Models
        ↓
Infrastructure Adapters / Repositories / Storage
```

### 3.1 前端

前端负责承载用户主要交互，包括 IM Workspace、Agent Builder、Message Stream、TaskRunPanel、ContextPanel、Artifact Studio、Preview Page、Admin Users、Login / Register 和 IM API Provider Panel。

前端的核心目标是让用户通过聊天方式发起任务，查看多 Agent 协作过程，并在同一工作台中完成 Artifact 的预览、修改、审批和部署预览。

### 3.2 后端

后端负责 API Controller、Orchestrator 编排、Agent 管理、Adapter 调用、Artifact 生命周期管理、Approval / Audit、Context / Memory、Deployment Preview、Realtime Event、Auth、User Directory 和 Runtime Config 持久化。

后端的核心目标是把用户消息转化为可执行任务链路，并保证 Agent 调用、Artifact 生成、审批审计、权限控制和上下文注入都具备清晰边界。

## 4. 技术栈

| 层 | 技术 |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Spring Boot 3.5 + Java 17 |
| Data Access | MyBatis + JDBC repositories |
| API | REST + `ApiResponse` |
| Realtime | SSE + WebSocket Control Plane |
| Persistence | Memory profile 默认；JDBC / MySQL opt-in |
| Auth | Bearer access token + refresh token |
| Adapter | `MOCK` / `OPENAI_COMPATIBLE` / `CLAUDE_CODE` / `CODEX` / `OPEN_CODE` |
| Storage | Local filesystem + object storage abstraction |
| Verification | Node smoke scripts / Browser E2E / Maven build / Vite build |

## 5. 后端分层设计

### 5.1 API Layer

API Layer 负责 REST Controller，不承载核心业务逻辑。它主要负责参数接收、基础校验、调用 Application Service，并统一返回 `ApiResponse`。

主要 API 领域包括：

- auth；
- admin users；
- user directory；
- agents；
- adapters；
- conversations；
- messages；
- task-runs；
- artifacts；
- approvals；
- action audits；
- attachments；
- deployments；
- runtime config；
- realtime events；
- doc-collab。

### 5.2 Application Layer

Application Layer 负责用例编排，是后端业务流程的主要组织层。

核心服务包括：

- `OrchestratorService`
- `TaskPlanner`
- `AgentRouter`
- `AdapterRoutingService`
- `AgentStepExecutor`
- `ResultAggregator`
- `ContextRetrievalService`
- `ApprovalApplicationService`
- `DeploymentApplicationService`
- `RealtimeEventPublisher`
- `AuthSessionService`
- `UserAdminService`
- `UserDirectoryService`
- `OpenAICompatibleRuntimeConfigService`

这一层负责把用户消息、Agent、Adapter、Artifact、Context、Approval 和 Auth 等能力组织成完整业务链路。

### 5.3 Domain Layer

Domain Layer 负责核心领域模型。

核心领域模型包括：

- `Conversation`
- `Message`
- `Agent`
- `TaskSpec`
- `TaskRun`
- `TaskStep`
- `TaskGraph`
- `ExecutionBatch`
- `Artifact`
- `ArtifactSnapshot`
- `ContextSnapshot`
- `PinnedContext`
- `MemoryItem`
- `HandoffSummary`
- `ApprovalRequest`
- `ActionAuditLog`
- `DeploymentRecord`
- `UserAccount`
- `UserSession`

这些模型定义了 AgentHub 的核心业务对象和状态流转。

### 5.4 Infrastructure Layer

Infrastructure Layer 负责外部依赖和具体实现。

它包括：

- Agent Adapter；
- CLI runner；
- memory repository；
- JDBC repository；
- local file storage；
- object storage provider；
- runtime config crypto；
- adapter quality metrics；
- fixture / fallback support。

这一层的主要职责是隔离外部 Provider、CLI 工具、存储系统和本地文件系统，使上层业务逻辑不直接依赖具体实现。

## 6. Orchestrator 设计

### 6.1 执行链路

Orchestrator 是 AgentHub 的核心编排模块，负责把用户消息转化为任务计划、Agent 路由、Adapter 执行和结果聚合。

```text
Message / Manual Request
  → OrchestratorService
  → TaskPlanner
  → AgentRouter
  → AdapterRoutingService
  → AgentStepExecutor
  → AgentAdapterRegistry
  → ResultAggregator
  → Message / TaskRun / Artifact / Context / Audit
```

### 6.2 Planner

Planner 支持两种模式：`RULE_BASED` 和 `LLM`。

`RULE_BASED` 是默认稳定模式，不依赖真实 Provider，适合本地演示和默认 smoke test。`LLM` 模式通过 OpenAI-compatible Provider 生成 `OrchestratorPlan`，如果模型不可用、输出不合法或 schema 校验失败，则 fallback 到规则化 Planner。

LLM Planner 只负责生成计划，不直接生成最终 Artifact。最终产物仍需要经过 Executor、Adapter、Aggregator 和 Artifact Contract 流程。

### 6.3 Router

Router 负责选择合适的 Agent 和 Adapter。

Router 的输入包括：

- selectedAgent；
- targetAgentId；
- mentionedAgentIds；
- participant agents；
- requiredSkill；
- tool capability；
- preferredAdapter；
- adapter health / success rate / fallback rate。

Router 的输出包括 selected agent、selected adapter、routingReason、score evidence 和 fallback reason。

当前 Router 已支持多个 `@Agent` 进入 TaskGraph，而不是只影响第一个 step。当前 scoring 是规则化可解释实现，不是学习型调度系统。

### 6.4 Executor

Executor 负责执行 TaskGraph、ExecutionBatch 和轻量 DAG 节点。

当前 Executor 支持：

- `CompletableFuture` 并行 batch；
- dependsOnStepOrders；
- nodeId / nodeType；
- retryAttempt；
- timeoutSeconds；
- idempotencyKey；
- executionToken / leaseVersion；
- Stop / Cancel；
- adapter fallback；
- late result discard。

当前边界是：非流式 HTTP 调用发出后，不保证底层请求可以被硬中断；Cancel 后 late result 不会落入 Artifact；当前实现不是完整动态工作流引擎。

### 6.5 Aggregator

Aggregator 负责聚合执行结果。

Aggregator 的输出包括：

- TaskRun result summary；
- Orchestrator summary message；
- produced Artifact IDs；
- fallback statistics；
- node decision summary；
- selected agent / routing summary。

Aggregator 还负责把 Agent 输出沉淀到 Message、TaskRun、Artifact、Context 和 Audit 等后续链路中。

## 7. Adapter 设计

### 7.1 Adapter 类型

| Adapter | 当前定位 |
|---|---|
| `MOCK` | 默认稳定 fallback |
| `OPENAI_COMPATIBLE` | 支持真实 OpenAI-compatible Provider |
| `CLAUDE_CODE` | headless Artifact-only v1 |
| `CODEX` | headless Artifact-only v1 |
| `OPEN_CODE` | probe / fallback |

### 7.2 Artifact Contract

真实 Adapter 输出必须是 JSON object，并符合统一 Artifact Contract。

```json
{
  "assistantMessage": "string",
  "artifacts": [
    {
      "title": "string",
      "type": "CODE|MARKDOWN|REVIEW_REPORT|API_CONTRACT|DATA_MODEL|WEB_PREVIEW",
      "language": "string",
      "content": "string",
      "summary": "string"
    }
  ]
}
```

如果 Adapter 返回普通文本、Markdown fence 包裹 JSON、缺字段、Artifact type 非枚举、content 为空或过短，或者 CLI wrapper / logs 混入 Artifact content，则该输出会被拒绝。

### 7.3 REAL_FIRST

`REAL_FIRST` 表示真实 Adapter 成功时优先成为主 Artifact 的质量门禁路径。

`REAL_FIRST` 生效条件包括：

- 非 `MOCK` Adapter 成功；
- 输出通过 contract validator；
- 输出通过 quality evaluator；
- 可选 CODE build validation 通过或被明确记录；
- 主 Artifact 使用 `sourceKind = REAL_ADAPTER`。

如果失败，系统不会生成假的 `REAL_ADAPTER`，而是记录 `PARSE_FAILED`、`QUALITY_FAILED`、`BUILD_FAILED` 或 `FALLBACK`，并使用静态模板兜底。

## 8. Context / Memory 设计

Context / Memory 的目标是让历史消息、记忆、上下文和历史产物能够进入后续任务，而不是让每一次 Agent 执行都变成孤立调用。

上下文来源包括：

- Message；
- Artifact；
- MemoryItem；
- PinnedContext；
- Attachment preview；
- TaskRun summary。

默认检索策略分为五步：

1. `List / Glob` 用于列出候选内容；
2. `Grep` 用于关键词匹配；
3. `Read` 用于读取权威内容片段；
4. `Scoring` 用于启发式打分；
5. `Inject` 用于注入 TaskStep。

当前边界是：默认不是向量检索，embedding backend 只是可插拔边界，MySQL 是权威业务库，不是专业向量数据库。

## 9. Artifact 生命周期设计

Artifact 是 AgentHub 的核心交付对象。Agent 输出不应只停留在 Message 中，而应该形成可管理的产物。

Artifact 生命周期如下：

```text
Generated
  → Preview
  → Revision
  → Version History
  → Diff Summary
  → Compare
  → Apply / Force Apply
  → Snapshot
  → Restore
  → Deploy Preview
```

Artifact 的 `sourceKind` 包括：

- `REAL_ADAPTER`
- `STATIC_TEMPLATE`
- `MOCK_FALLBACK`
- `USER_REVISION`
- `DEPLOY_PREVIEW`

关键约束是：

- Artifact mutation 必须考虑 Snapshot；
- 高风险操作必须走 Approval；
- Restore 创建新版本而不是覆盖旧版本；
- Diff / Apply 需要风险摘要和冲突信息。

## 10. Approval / Audit 设计

Approval / Audit 用于控制高风险操作，避免用户在没有确认和记录的情况下直接修改、覆盖、部署或恢复产物。

高风险 API 必须校验 `approvalId`，包括：

- apply diff；
- force apply diff；
- demo deploy；
- restore snapshot。

校验规则包括：

- approval 必须存在；
- 状态必须为 `APPROVED`；
- `actionType / targetType / targetId / conversationId` 必须匹配；
- 执行成功后需要标记为 `CONSUMED`。

ActionAuditLog 记录：

- approval；
- apply；
- deploy；
- restore；
- regenerate；
- stop / cancel；
- fallback / rejected；
- approval bypass attempts；
- stale result discard；
- duplicate submission reject；
- runtime config 变更。

当前边界是：Approval / Audit 是 MVP 审批审计能力，不是企业级多人审批系统，也不包含完整 RBAC 和审计导出能力。

## 11. Realtime 设计

### 11.1 SSE

SSE 用于事件刷新，帮助前端及时更新 Workspace 状态。

SSE 事件包括：

- `MESSAGE_CREATED`
- `TASK_RUN_CREATED`
- `TASK_RUN_UPDATED`
- `TASK_STEP_UPDATED`
- `ARTIFACT_CREATED`
- `ARTIFACT_UPDATED`
- `APPROVAL_UPDATED`
- `ACTION_AUDIT_CREATED`
- `DEPLOYMENT_CREATED`
- `ADAPTER_STREAM_CHUNK`

SSE 支持 conversation 维度连接、Last-Event-ID replay、heartbeat 和 active realtime state。

### 11.2 WebSocket Control Plane

WebSocket 当前只用于控制平面，主要支持：

- `STOP_RUN`
- `CANCEL_RUN`

当前边界是：WebSocket 不是完整双向聊天系统，不做多节点权威事件总线，token chunk 不作为权威数据源。

## 12. Persistence 设计

### 12.1 Memory Profile

Memory Profile 是默认 profile。

它无外部依赖，适合本地 demo 和默认 smoke test，但不保证完整生产级持久化，也不代表数据治理能力完成。

### 12.2 JDBC / MySQL Profile

JDBC / MySQL Profile 是 opt-in 能力。

`schema-jdbc.sql` 当前已覆盖的核心表包括：

- `agenthub_users`
- `agenthub_user_sessions`
- `agenthub_conversations`
- `agenthub_agents`
- `agenthub_messages`
- `agenthub_attachments`
- `agenthub_artifacts`
- `agenthub_task_specs`
- `agenthub_task_runs`
- `agenthub_task_steps`
- `agenthub_context_snapshots`
- `agenthub_pinned_contexts`
- `agenthub_artifact_snapshots`
- `agenthub_deployments`
- `agenthub_memory_items`
- `agenthub_handoff_summaries`
- `agenthub_approval_requests`
- `agenthub_action_audits`
- `agenthub_adapter_runtime_configs`
- `agenthub_collab_snapshot_manifests`

当前边界是：系统不默认强制切换 MySQL，没有 Flyway / Liquibase 迁移体系；JDBC smoke 代表 profile 可验证，不代表数据库治理全部完成。

### 12.3 Auth / Runtime Config 持久化

真实账号模式下：

- 用户信息与会话信息进 JDBC；
- 密码使用 hash 存储；
- refresh token 可撤销；
- `OPENAI_COMPATIBLE` runtime config 通过 `USER -> ORG -> GLOBAL` 解析；
- JDBC 模式下可对 API key 做加密存储。

### 12.4 文件与对象存储

当前默认附件仍支持本地文件系统。

项目已具备对象存储抽象，可用于：

- 附件对象存储；
- Artifact bundle；
- doc-collab snapshot。

当前边界是：对象存储是 opt-in，不属于默认 `memory + MOCK` 本地运行依赖。

## 13. API 入口

核心 API 包括：

```text
GET  /api/health
GET  /api/adapters
POST /api/adapters/{adapterType}/execute

POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me

GET  /api/admin/users
POST /api/admin/users
POST /api/admin/users/{userId}/status
POST /api/admin/users/{userId}/reset-password
POST /api/admin/users/{userId}/admin
GET  /api/users/directory

GET  /api/conversations
POST /api/conversations
POST /api/conversations/{conversationId}/messages
POST /api/conversations/{conversationId}/messages/{messageId}/orchestrator-run
POST /api/conversations/{conversationId}/demo-task

GET  /api/conversations/{conversationId}/task-runs
GET  /api/conversations/{conversationId}/artifacts
GET  /api/artifacts/{artifactId}/compare-diff
POST /api/artifacts/{artifactId}/apply-diff
POST /api/artifact-snapshots/{snapshotId}/restore

POST /api/conversations/{conversationId}/approval-requests
POST /api/approval-requests/{approvalId}/approve

GET  /api/conversations/{conversationId}/events
```

## 14. 技术取舍

| 决策 | 选择 | 原因 | 代价 |
|---|---|---|---|
| 主交互范式 | IM-first | 用户理解成本低，适合展示多 Agent 协作 | Workflow Canvas 后置 |
| 默认运行模式 | Memory + Mock fallback | 降低环境依赖，保证 Demo 稳定 | 生产真实性不足 |
| Adapter 输出 | Artifact Contract | 便于质量门禁和统一展示 | 对模型输出格式要求更高 |
| 登录体系 | 本地账号 + refresh token | 快速形成真实可用登录闭环 | 不含 OAuth / SSO / MFA |
| Provider 配置 | 后端托管 runtime config | 避免前端保存明文 key，支持作用域解析 | 增加后台配置复杂度 |
| 部署能力 | Static Deploy Preview | 快速形成产品闭环 | 不是真实云部署 |
| 实时机制 | SSE + WS Control | SSE 适合状态刷新，WS 处理 Stop / Cancel | 不支持完整双向实时协同 |
| Context Search | Heuristic / DB-backed | 可解释、低依赖 | 不具备默认向量检索能力 |
| 持久化分层 | MySQL + file/object storage + realtime cache | 业务真相、文件大对象、实时态边界清晰 | 运维形态更复杂 |

## 15. 验证方案

常用后端验证命令：

```powershell
cd backend
mvn clean package -DskipTests
```

常用前端验证命令：

```powershell
cd frontend
npm run build
```

主链路验证命令：

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
node scripts/object-storage-smoke-test.mjs
node scripts/openai-provider-matrix-smoke.mjs
node scripts/e2e-browser.mjs
```

验证原则：

- 默认 smoke 不依赖真实 API key；
- 真实 Provider smoke 必须 opt-in；
- Browser E2E 用于验证 UI 主路径；
- JDBC smoke 只表示 profile 可验证，不表示默认生产化；
- 对象存储、真实 CLI、真实 Provider 属于增强验证路径，不应被包装成默认必需依赖。
