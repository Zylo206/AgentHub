# AgentHub 技术设计文档 V1.0

## 1. 总体架构

AgentHub 采用前后端分离架构：

```text
React + Vite Workspace
  -> REST API / SSE / WebSocket control
  -> Spring Boot API layer
  -> Application services
  -> Domain models
  -> Infrastructure adapters / repositories / storage
```

设计目标：

- 支撑 IM-first 多 Agent 协作主链路。
- 支撑 Orchestrator 的规划、路由、执行、聚合。
- 支撑 Artifact 的生成、修订、Diff、审批、预览。
- 支撑真实 Adapter 和 Mock fallback 共存。
- 支撑 memory 默认运行和 JDBC/MySQL opt-in 验证。
- 支撑可解释、可回归、可继续产品化的 MVP 后期架构。

## 2. 技术栈

| 层 | 技术 |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Spring Boot 3 + Java 17 |
| API | REST + `ApiResponse` |
| Realtime | SSE + WebSocket control plane |
| Persistence | memory 默认；JDBC/MySQL opt-in |
| Adapter | MOCK、OPENAI_COMPATIBLE、CLAUDE_CODE、CODEX、OPEN_CODE |
| Verification | Node smoke scripts、Browser E2E、Maven build、Vite build |

## 3. 后端分层

后端位于 `backend/src/main/java/com/agenthub`。

### 3.1 API layer

`api/` 负责 REST Controller：

- 不承载业务逻辑。
- 统一返回 `ApiResponse`。
- 将请求委托给 application service。

主要 API 领域：

- agents
- adapters
- conversations
- messages
- task-runs
- artifacts
- artifact snapshots
- approvals
- action audits
- attachments
- deployments
- realtime events

### 3.2 Application layer

`application/` 负责用例编排：

- Orchestrator。
- Agent 管理。
- Context / Memory。
- Artifact mutation。
- Approval / Audit。
- Deployment。
- Attachment。
- Realtime。

重点服务：

- `OrchestratorService`
- `TaskPlanner`
- `AgentRouter`
- `AdapterRoutingService`
- `AgentStepExecutor`
- `ResultAggregator`
- `ContextRetrievalService`
- `ContextSearchService`
- `ApprovalApplicationService`
- `ActionAuditApplicationService`
- `DeploymentApplicationService`
- `RealtimeEventPublisher`

### 3.3 Domain layer

`domain/` 存放领域模型：

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
- `AttachmentRecord`
- `DeploymentRecord`

### 3.4 Infrastructure layer

`infrastructure/` 负责外部系统和存储实现：

- Agent Adapter 实现。
- CLI runner。
- memory repository。
- JDBC repository。
- 本地文件附件存储。
- Adapter quality metrics。
- fixture / fallback 支持。

## 4. 前端架构

前端位于 `frontend/`。

### 4.1 路由

- `/workspace`：主工作台。
- `/agents`：Agent Builder / Adapter Test。
- `/preview/:artifactId`：静态 Artifact Preview Studio。

### 4.2 核心模块

- `frontend/src/pages/workspace/WorkspacePage.tsx`
- `frontend/src/features/chat/`
- `frontend/src/features/agents/`
- `frontend/src/features/artifacts/`
- `frontend/src/features/context/`
- `frontend/src/pages/preview/PreviewPage.tsx`
- `frontend/src/api/agenthubApi.ts`

### 4.3 前端约束

- API 调用统一经过 `agenthubApi.ts`。
- 不引入 axios、Redux、Zustand、UI 组件库。
- UI 使用现有 CSS 和设计 tokens。
- Browser E2E 依赖稳定 `data-testid`，不要随意删除。

## 5. Orchestrator 执行链路

核心链路：

```text
Message / Manual request
  -> Trigger suggestion / Approval
  -> OrchestratorService
  -> TaskPlanner
  -> AgentRouter
  -> AdapterRoutingService
  -> AgentStepExecutor
  -> AgentAdapterRegistry
  -> ResultAggregator
  -> Message / TaskRun / Artifact / Context / Audit
```

### 5.1 Planner

Planner 模式：

- `RULE_BASED`：默认稳定模式。
- `LLM`：通过 OpenAI-compatible Provider 生成 `OrchestratorPlan.v1`，失败 fallback。

Prompt Layering：

- base capability。
- role instruction。
- available agents。
- conversation context。
- retrieved context。
- artifact history。
- output schema。
- fallback policy。

LLM Planner 只生成计划，不直接生成最终 Artifact。

### 5.2 Router

Router 输入：

- selectedAgent。
- targetAgentId。
- mentionedAgentIds。
- participant agents。
- requiredSkill。
- tool capability。
- preferredAdapter。
- Adapter health / success rate / fallback rate。

Router 输出：

- selected agent。
- selected adapter。
- routingReason。
- score evidence。
- fallback reason。

当前 Router 已支持多个 `@Agent` 进入 TaskGraph，而不是只影响第一个 step。

### 5.3 Executor

Executor 支持：

- TaskGraph。
- ExecutionBatch。
- `CompletableFuture` 并行 batch。
- dependsOnStepOrders。
- Stop / Cancel token。
- adapter fallback。
- late result discard。

边界：

- 非流式 HTTP 调用已经发出后，不保证硬中断底层请求。
- Cancel 后 late result 不落 Artifact。
- 当前不是完整动态 DAG 引擎。

### 5.4 Aggregator

Aggregator 输出：

- TaskRun result summary。
- Orchestrator summary message。
- produced Artifact IDs。
- fallback statistics。
- DecisionLog。

## 6. Adapter 设计

Adapter 统一由 `AgentAdapterRegistry` 管理。

### 6.1 Adapter 类型

| Adapter | 当前状态 |
|---|---|
| MOCK | 默认稳定 fallback |
| OPENAI_COMPATIBLE | 支持真实 OpenAI-compatible Provider、REAL_FIRST、streaming opt-in |
| CLAUDE_CODE | headless Artifact-only v1 |
| CODEX | headless Artifact-only v1 |
| OPEN_CODE | probe / fallback |

### 6.2 Artifact Contract

真实输出必须是 JSON object：

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

拒绝条件：

- 普通文本输出。
- Markdown fence 包裹 JSON。
- 缺字段。
- Artifact type 非枚举。
- content 为空或过短。
- CODE content 不像源码。
- CLI wrapper / logs 混入 Artifact content。

### 6.3 REAL_FIRST

`REAL_FIRST` 行为：

- 非 MOCK Adapter 成功。
- 输出通过 contract validator。
- 输出通过 quality evaluator。
- 可选 CODE build validation 通过或记录状态。
- 主 Artifact 使用 `sourceKind=REAL_ADAPTER`。
- 静态模板 Artifact 保留为 archived fallback evidence。

失败时：

- 不生成假 `REAL_ADAPTER`。
- 记录 `PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`。
- 使用静态模板兜底。

## 7. Claude Code / Codex headless 接入

### 7.1 共同原则

- Artifact-only。
- 使用 `ProcessBuilder`。
- prompt 通过 stdin 或隔离目录传入。
- 工作目录固定在 `.agenthub/*-runs/{requestId}`。
- 不直接写 AgentHub workspace。
- 不使用危险权限开关。
- 最终输出必须走 Artifact Contract。
- 支持 fixture smoke 和 real CLI smoke。

### 7.2 Claude Code

支持：

- `json`。
- `stream-json`。
- fixture mode。
- real CLI mode。
- streaming chunk preview。
- Stop / Cancel 后丢弃 late output。

边界：

- 不是 Claude Code 交互终端。
- 不是 workspace-write 模式。

### 7.3 Codex

支持：

- `codex exec` headless。
- read-only sandbox。
- output schema。
- streaming opt-in。
- fixture mode。
- real CLI smoke。

边界：

- 不是 Codex Desktop GUI 自动化。
- 不是完整外部 Agent session 管理。

## 8. Context Search / Memory

### 8.1 Context Search

默认检索策略是 DB-backed Agentic Search：

1. `List / Glob`：列候选。
2. `Grep`：关键词匹配。
3. `Read`：读取权威内容片段。
4. `Scoring`：启发式打分。
5. `Inject`：注入 TaskStep。

覆盖来源：

- Message。
- Artifact。
- MemoryItem。
- PinnedContext。
- Attachment preview。
- TaskRun summary。

### 8.2 FULLTEXT 和 Embedding

当前能力：

- memory profile：内存检索。
- JDBC profile：SQL LIKE + LIMIT。
- MySQL FULLTEXT：opt-in，不替代 LIKE。
- embeddingJson：存储骨架。
- semantic backend：默认 heuristic。

边界：

- 默认不依赖 embedding provider。
- 不引入 ES / OpenSearch / pgvector / Milvus。
- MySQL 是权威业务库，不是专业向量库。

## 9. Artifact Lifecycle

Artifact 生命周期：

```text
Generated
  -> Preview
  -> Revision
  -> Version History
  -> Diff Summary
  -> Apply / Force Apply
  -> Snapshot
  -> Restore
  -> Deploy Preview
```

Artifact sourceKind：

- `REAL_ADAPTER`
- `STATIC_TEMPLATE`
- `MOCK_FALLBACK`
- `USER_REVISION`
- `DEPLOY_PREVIEW`

关键约束：

- Artifact mutation 必须考虑 Snapshot。
- 高风险操作必须走 Approval。
- Diff / Apply 需要风险摘要。
- Restore 创建新版本，不覆盖旧版本。

## 10. Approval / Audit

高风险 API 强制校验 `approvalId`：

- apply diff。
- force apply diff。
- demo deploy。
- restore snapshot。

校验规则：

- approval 存在。
- 状态为 `APPROVED`。
- actionType / targetType / targetId / conversationId 匹配。
- 执行成功后标记 `CONSUMED`。

ActionAuditLog 用于：

- 操作时间线。
- 审批轨迹。
- stop / cancel 记录。
- fallback / rejected 记录。

## 11. Realtime

### 11.1 SSE

SSE 事件用于刷新提示：

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

SSE 特性：

- conversation 维度连接。
- Last-Event-ID replay。
- heartbeat。
- active realtime state。

### 11.2 WebSocket Control Plane

WebSocket 当前用于：

- STOP_RUN。
- CANCEL_RUN。

边界：

- 不是完整双向聊天系统。
- 不做多节点事件总线。
- token chunk 不作为权威数据源。

## 12. Persistence

### 12.1 Memory profile

默认 profile：

- 无外部依赖。
- 支撑本地 demo 和 smoke。
- 不保证重启后完整保留所有数据。

### 12.2 JDBC / MySQL profile

JDBC profile 支持：

- Conversation。
- Message。
- Agent。
- AttachmentRecord。
- Artifact。
- ArtifactSnapshot。
- DeploymentRecord。
- TaskSpec / TaskRun / TaskStep。
- ContextSnapshot。
- PinnedContext。
- HandoffSummary。
- MemoryItem。
- ApprovalRequest。
- ActionAuditLog。

验证入口：

- `scripts/mysql-init-profile.mjs`
- `scripts/jdbc-smoke-test.mjs`

边界：

- 不默认切换 MySQL。
- 没有 Flyway / Liquibase migration system。
- JDBC sprint 验证的是 schema / repository / restart verify，不是完整生产数据库治理。

## 13. Attachment

附件能力：

- 上传。
- 本地文件存储。
- metadata。
- checksumSha256。
- visibility。
- ownerUserId。
- storageKey。
- scanStatus。
- deletedAt。
- download。
- contentPreview。

安全骨架：

- `AttachmentAccessGuard`
- `AttachmentCleanupService`
- `AttachmentScanService`

边界：

- 默认 scan 是 no-op。
- 未实现真实杀毒。
- 未实现多租户权限体系。

## 14. API 入口

关键 API：

- `GET /api/health`
- `GET /api/adapters`
- `POST /api/adapters/{adapterType}/execute`
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/{conversationId}/messages`
- `POST /api/conversations/{conversationId}/messages/{messageId}/orchestrator-run`
- `POST /api/conversations/{conversationId}/messages/{messageId}/orchestrator-trigger-suggestion`
- `POST /api/conversations/{conversationId}/demo-task`
- `GET /api/conversations/{conversationId}/task-runs`
- `GET /api/conversations/{conversationId}/artifacts`
- `POST /api/artifacts/{artifactId}/apply-diff`
- `POST /api/artifacts/{artifactId}/force-apply-diff`
- `POST /api/artifacts/{artifactId}/demo-deploy`
- `POST /api/artifact-snapshots/{snapshotId}/restore`
- `GET /api/conversations/{conversationId}/events`

## 15. 验证命令

常用命令：

```powershell
cd backend
mvn clean package -DskipTests
```

```powershell
cd frontend
npm run build
```

```powershell
node scripts/smoke-test.mjs
node scripts/sse-smoke-test.mjs
node scripts/jdbc-smoke-test.mjs
node scripts/real-adapter-smoke-test.mjs
node scripts/claude-code-smoke-test.mjs
node scripts/codex-smoke-test.mjs
node scripts/e2e-browser.mjs
```

验证原则：

- 默认 smoke 不依赖真实 API key。
- 真实 Provider smoke 必须 opt-in。
- Browser E2E 是 UI 回归，不替代 API smoke。
- JDBC smoke 是 profile 验证，不表示默认切换 MySQL。

## 16. 当前技术边界

| 能力 | 当前边界 |
|---|---|
| 真实部署 | 未接 Vercel / Netlify / Docker / Kubernetes |
| 桌面端 / 移动端 | 未实现 |
| 多节点事件总线 | 未实现 |
| 完整 token streaming | 非默认，仍是体验增强 |
| MySQL 默认运行 | 未默认启用 |
| Embedding / Vector Search | 仅保留可插拔边界 |
| 图片 / PPT 富媒体 | 附件弱能力 |
| 企业级 RBAC | 未实现 |
| 完整 Workflow Canvas | 未实现 |
| 完整动态 DAG | 未实现 |

## 17. 技术验收标准

V1.0 技术设计对应的验收标准：

- 默认 memory + mock/static fallback 可稳定运行。
- Orchestrator 决策链可解释。
- 多 `@Agent` 能进入 TaskGraph。
- 真实 Adapter 输出必须经过 contract / quality / build 门禁。
- 高风险 Artifact 操作必须经过 Approval / Audit。
- Context Search 输出可解释。
- SSE 刷新和 Stop / Cancel 状态可回归验证。
- Browser E2E 覆盖 IM-first 主路径。
- 文档明确真实、半真实、fixture、mock、static preview 的边界。
