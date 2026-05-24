# AgentHub 技术设计 V1.0

## 1. 总体架构

AgentHub 当前采用前后端分离架构，目标是支撑一个可运行、可解释、可 fallback 的多 Agent 协作 MVP。

```text
React Workspace
  -> REST API
  -> OrchestratorService
  -> TaskPlanner / AgentRouter / AgentStepExecutor / ResultAggregator
  -> TaskGraph / ExecutionBatch
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> MOCK / OPENAI_COMPATIBLE / CLI Adapter
  -> Domain Repository
  -> Message / TaskRun / Context / Artifact / Approval / Audit
```

当前不是生产级平台架构。核心设计目标是：

- 让 IM 式交互、多 Agent 协作、Artifact 迭代和部署预览形成闭环。
- 明确展示 Planner / Router / Executor / Aggregator 的决策链。
- 在真实 Adapter、LLM Planner、Deploy 不可用时保持 Mock fallback 稳定。
- 为后续 MySQL、SSE、真实部署、深度 Agent 平台接入预留边界。

## 2. 前端架构

前端位于 `frontend/`，使用 React + Vite + TypeScript。

主要模块：

- `src/pages/workspace`：IM Workspace 主页面。
- `src/pages/agents`：Agent Builder 和 Adapter Test Panel。
- `src/pages/preview`：`/preview/:artifactId` 静态 Artifact 预览页。
- `src/features/chat`：ChatInput、MessageStream、MessageBubble、TaskRunPanel。
- `src/features/context`：ContextPanel。
- `src/features/artifacts`：ArtifactPanel、VersionHistory、DiffSummary、Snapshot、Deploy、Audit。
- `src/api/agenthubApi.ts`：统一 REST API client，使用原生 `fetch`。

前端负责：

- 解析 selectedAgent 和消息开头单/多 `@AgentName`。
- 展示 `targetAgentId / mentionedAgentIds` 对消息和 TaskRun 的影响。
- 展示 Agent 协作消息协议：`TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR`。
- 展示 TaskGraph、ExecutionBatch、Adapter fallback、OrchestratorDecisionLog。
- 承载 Artifact 预览、Revision、Apply Diff、Approval Gate、Deploy Preview、Action Audit。

## 3. 后端架构

后端位于 `backend/`，使用 Spring Boot 3 + Java 17。

主要分层：

- `api`：REST Controller。
- `application`：应用服务和编排逻辑。
- `domain`：领域模型。
- `infrastructure`：Adapter、内存 Repository、本地 JSON Memory 存储。

关键应用服务：

- `OrchestratorService`：demo-task、revision 主入口。
- `TaskPlanner`：RuleBased / LLM Planner。
- `AgentRouter`：selectedAgent、mentionedAgents、Tool Capability 路由。
- `AgentStepExecutor`：执行 Agent request，写入 TaskStep adapter 字段。
- `ResultAggregator`：聚合 TaskRun summary 和 Orchestrator message。
- `AgentExecutorService` / `AgentAdapterRegistry`：Adapter 调用和 fallback。
- `ContextRetrievalService`：规则化上下文检索。
- `ApprovalApplicationService` / `ActionAuditApplicationService`：审批与审计。
- `DeploymentApplicationService`：静态 deploy simulation。

## 4. 核心领域模型

| 模型 | 用途 |
|---|---|
| Agent | 内置或自建 Agent，包含 role、prompt、capabilityTags、toolTags、preferredAdapterType |
| Conversation | IM 会话，包含 participantAgentIds |
| Message | 文本和 Agent 协作消息，包含 targetAgentId、mentionedAgentIds、reply/quote/pin 关系 |
| TaskSpec | Orchestrator 对用户需求的结构化任务描述 |
| TaskRun | 一次编排执行，包含 TaskPlan、TaskGraph、DecisionLog、resultSummary |
| TaskStep | 单个 Agent step，记录 assignedAgent、adapter、fallback、parallel group、inputContext |
| Artifact | 代码、文档、API 契约、评审报告、REAL_ADAPTER 输出、Apply Diff 结果 |
| ContextSnapshot | 本轮 TaskRun 使用的上下文快照 |
| HandoffSummary | Agent 间交接记录 |
| MemoryItem | 长期记忆 MVP，本地 JSON 持久化 + 规则检索 |
| ApprovalRequest | 高风险操作的后端强制审批 |
| ActionAuditLog | 操作审计时间线 |
| DeploymentRecord | 静态部署模拟结果 |

## 5. Orchestrator 设计

### Planner

`TaskPlanner` 支持两种模式：

- `RULE_BASED`：默认稳定模式，根据用户输入、selectedAgent、mentionedAgents 生成 OrchestratorPlan。
- `LLM`：通过 OPENAI_COMPATIBLE 调用真实模型，要求返回 `OrchestratorPlan.v1` JSON，schema 校验失败后 fallback。

`PlannerPromptBuilder` 将 LLM Planner prompt 分层：

- base capability
- role instruction
- available agents
- conversation context
- retrieved context
- artifact history
- output schema
- fallback policy

LLM Planner 只生成计划，不直接生成最终 Artifact。

### Router

`AgentRouter` 的优先级：

1. 显式 selectedAgent 用于第一个 step。
2. `mentionedAgentIds` 会让多个 Agent 进入 TaskGraph。
3. 默认 step 使用 `requiredSkill -> ToolCapabilityRegistry -> Agent` 打分选择 Agent。
4. 无匹配时回退到内置 Agent 角色默认策略。

`ToolCapabilityRegistry` 当前是静态映射：

- `code / code_editor / react` -> CODE / FRONTEND_ARTIFACT_GENERATION
- `preview / ui` -> WEB_PREVIEW / ARTIFACT_PREVIEW
- `review / review_checker` -> REVIEW_REPORT / QUALITY_REVIEW
- `api / contract_writer / schema_designer` -> API_CONTRACT_DESIGN
- `deploy` -> DEPLOY_PREVIEW

这不是完整工具执行系统，只是路由评分依据。

### Executor

`OrchestratorService` 将 step command 按依赖关系调度：

- 同一 parallel group 内使用 `CompletableFuture` 执行。
- 有 `dependsOnStepOrders` 的 step 等待依赖完成。
- Adapter 失败时由 `AgentAdapterRegistry` fallback 到 MOCK。
- TaskStep 记录 preferredAdapter、actualAdapter、adapterStatus、fallbackReason、routingReason。

当前已经具备执行层并行语义，但不是完整动态 DAG 引擎。

### Aggregator

`ResultAggregator` 和 `OrchestratorDecisionLog` 负责输出：

- TaskRun resultSummary。
- Planner / Router / Executor / Aggregator 决策链。
- fallback 统计。
- Artifact 数量和来源说明。

前端 Orchestrator explain panel 优先展示后端结构化 DecisionLog，而不是只靠前端推断。

## 6. Agent Adapter 层

Adapter 统一接口通过 `AgentAdapterRegistry` 管理。

当前 Adapter：

- `MOCK`：默认稳定兜底。
- `OPENAI_COMPATIBLE`：支持 OpenAI-style `/chat/completions`，可接 DeepSeek 等服务。
- `CODEX`：CLI 探测型 Adapter。
- `CLAUDE_CODE`：CLI 探测型 Adapter。
- `OPEN_CODE`：CLI 探测型 Adapter。

Adapter 状态：

- AVAILABLE
- DISABLED
- MISCONFIGURED
- PLACEHOLDER
- ERROR

失败策略：

- preferred Adapter 不可用、失败、超时或 fallback 时，不阻断 demo-task。
- TaskStep 和 MessageStream 均显示 fallback 信息。
- 非 MOCK 且未 fallback 的成功响应可被 `AdapterArtifactExtractor` 解析为 REAL_ADAPTER Artifact。

## 7. Artifact 与真实输出链路

Artifact 支持：

- 静态模板产物：LoginPage、README、API Contract、Review Report。
- REAL_ADAPTER Artifact：真实 / 半真实 Adapter 成功输出并满足 contract 时生成。
- USER_REVISION：用户 revision 生成的新版本。
- ACCEPTED：Apply Diff / Force Apply 后生成的新版本。
- DEPLOY_PREVIEW：静态部署预览记录。

Artifact 功能：

- Preview。
- Version History。
- line diff。
- Diff Summary。
- Apply Diff / Force Apply。
- Snapshot / Restore。
- Copy / Download。
- `/preview/:artifactId` 本地预览页。

当前仍保留静态模板兜底。下一阶段目标是 REAL_FIRST：真实 Adapter 成功时优先成为主 Artifact。

## 8. Context / Memory

上下文来源：

- recent messages
- pinned messages
- MemoryItem
- artifacts
- previous TaskRun summary

`ContextRetrievalService` 当前使用规则检索：

- conversation scope
- source type priority
- recency
- importance
- keyword match

结果写入：

- TaskStep.inputContext。
- ContextSnapshot。
- ContextPanel。

MemoryItem 使用本地 JSON 文件持久化，不是 MySQL / 向量数据库 / 生产级长期记忆。

## 9. Approval / Audit / Deploy

高风险操作必须带 `approvalId`：

- Apply Diff
- Force Apply Diff
- Demo Deploy
- Restore Snapshot

ApprovalRequest 生命周期：

- PENDING
- APPROVED
- CANCELLED
- CONSUMED
- EXPIRED

ActionAuditLog 记录：

- approval created / approved / cancelled / consumed / rejected
- apply diff
- force apply
- deploy
- restore

Deploy 当前是静态模拟：

- 不调用外部网络。
- 不接 Vercel / Netlify / Docker。
- 生成本地 preview URL。
- Preview 页面展示 Artifact 内容。

## 10. API 与验证

关键 API 覆盖：

- `/api/health`
- `/api/agents`
- `/api/adapters`
- `/api/conversations`
- `/api/conversations/{conversationId}/messages`
- `/api/conversations/{conversationId}/demo-task`
- `/api/conversations/{conversationId}/task-runs`
- `/api/conversations/{conversationId}/artifacts`
- `/api/conversations/{conversationId}/pinned-contexts`
- `/api/conversations/{conversationId}/memories`
- `/api/artifacts/{artifactId}/demo-revision`
- `/api/artifacts/{artifactId}/apply-diff`
- `/api/artifacts/{artifactId}/force-apply-diff`
- `/api/artifacts/{artifactId}/demo-deploy`
- `/api/artifact-snapshots/{snapshotId}/restore`
- `/api/conversations/{conversationId}/approval-requests`
- `/api/conversations/{conversationId}/action-audits`

验证命令：

```powershell
cd backend
mvn -q -DskipTests package

cd ../frontend
npm run build

cd ..
node scripts/smoke-test.mjs
```

smoke test 是 API 级验证，不是浏览器 E2E。

## 11. 当前技术边界

- 内存 Repository 仍是主要存储，MemoryItem 仅本地 JSON 持久化。
- 无 MySQL。
- 无 WebSocket / SSE。
- 无真实部署平台。
- 无完整动态 DAG 引擎。
- 无企业级 RBAC / 多人审批。
- 无文件附件 / 图片 / PPT 完整链路。
- Codex / Claude Code / OpenCode 不是深度真实接入。
- Tool Capability 不是真实 tool invocation。
