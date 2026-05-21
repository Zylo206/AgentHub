# AgentHub 技术设计文档 V0.5

## 1. 总体架构

AgentHub 当前采用前后端分离结构：

```text
User
  -> React IM Workspace
  -> Spring Boot REST API
  -> TaskApplicationService
  -> OrchestratorService
  -> AgentRoutingService
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> Mock / Codex placeholder / Claude Code placeholder
  -> InMemory Repository
  -> Frontend render of Message / TaskRun / Context / Artifact
```

当前架构目标不是“完整生产化”，而是先稳定支撑比赛 Demo 的多 Agent 协作主链路。

## 2. 前端架构

前端位于：

- [frontend](E:/CodeProject2/AgentHub/frontend)

主要技术栈：

- React 18
- TypeScript
- Vite
- React Router
- 原生 `fetch`

主要页面：

- `/workspace`
- `/agents`

主要模块：

- `features/conversations`
- `features/agents`
- `features/chat`
- `features/artifacts`
- `features/context`

当前前端强调：

- 三栏 IM Workspace
- 低依赖、低复杂度
- 强可视展示，而不是复杂状态管理

## 3. 后端架构

后端位于：

- [backend](E:/CodeProject2/AgentHub/backend)

主要技术栈：

- Java 17
- Spring Boot 3.5.x
- Spring Web
- Spring Validation
- MyBatis 依赖已预留

当前后端特点：

- 领域模型已成型
- Repository 以内存实现为主
- API 已可支撑 Demo 联调
- Adapter Layer 已有 placeholder + Mock fallback

## 4. 核心领域模型

### 4.1 Agent

用途：

- 表示可参与协作的系统内置 Agent 或用户自定义 Agent

关键字段：

- `id`
- `name`
- `avatarUrl`
- `role`
- `description`
- `systemPrompt`
- `preferredAdapterType`
- `capabilityTags`
- `toolTags`
- `status`
- `createdAt`
- `updatedAt`

关系：

- 被 Conversation / TaskStep 间接引用
- 被 AgentRoutingService 用于选择 preferred adapter

当前实现状态：

- 已实现
- 已支持 `CUSTOM` Agent 创建
- 已支持 `avatarUrl` 和 `preferredAdapterType`

### 4.2 Conversation

用途：

- 表示一个聊天会话

关键字段：

- `id`
- `title`
- `type`
- `participantAgentIds`
- `createdAt`
- `updatedAt`

关系：

- 关联多个 Message
- 关联多个 TaskSpec / TaskRun / Artifact / ContextSnapshot

当前实现状态：

- 已实现
- 主要用于单条 Demo 主链路展示

### 4.3 Message

用途：

- 表示聊天流中的消息

关键字段：

- `id`
- `conversationId`
- `senderType`
- `senderId`
- `messageType`
- `content`
- `artifactIds`
- `createdAt`

关系：

- 属于某个 Conversation
- 可关联 Artifact

当前实现状态：

- 已实现
- 支撑聊天流、TaskSpec 卡片消息、Artifact card 消息

### 4.4 TaskSpec

用途：

- 表示结构化任务规格

关键字段：

- `id`
- `conversationId`
- `sourceMessageId`
- `title`
- `userGoal`
- `userInput`
- `scope`
- `nonGoals`
- `acceptanceCriteria`
- `requiredSkills`
- `expectedArtifacts`
- `status`
- `createdAt`
- `updatedAt`

关系：

- 来源于用户消息
- 驱动后续 TaskRun

当前实现状态：

- 已实现
- 当前由静态 demo-task 生成，不是真实 LLM 推导

### 4.5 TaskRun

用途：

- 表示一次完整任务执行

关键字段：

- `id`
- `conversationId`
- `taskSpecId`
- `status`
- `steps`
- `resultSummary`
- `createdAt`
- `updatedAt`

关系：

- 包含多个 TaskStep
- 关联多个 Artifact
- 关联多个 ContextSnapshot / HandoffSummary

当前实现状态：

- 已实现
- 同时支持初始 Demo 任务和 revision TaskRun

### 4.6 TaskStep

用途：

- 表示 TaskRun 中的一个子步骤

关键字段：

- `id`
- `taskRunId`
- `stepOrder`
- `assignedAgentId`
- `taskDescription`
- `status`
- `inputContext`
- `outputContent`
- `producedArtifactIds`
- `preferredAdapterType`
- `actualAdapterType`
- `adapterType`
- `adapterStatus`
- `adapterResponseSummary`
- `adapterErrorMessage`
- `createdAt`
- `updatedAt`

关系：

- 隶属于某个 TaskRun
- 产生多个 Artifact

当前实现状态：

- 已实现
- 已能展示 preferred adapter、actual adapter、fallback 状态

### 4.7 Artifact

用途：

- 表示代码、文档、Review Report、API Contract 等产物

关键字段：

- `id`
- `conversationId`
- `taskRunId`
- `title`
- `type`
- `status`
- `language`
- `content`
- `version`
- `parentArtifactId`
- `revisionInstruction`
- `createdAt`
- `updatedAt`

关系：

- 属于某个 TaskRun
- 可参与 revision 形成版本链

当前实现状态：

- 已实现
- 已支持 `v1 -> v2` 关系的前端展示

### 4.8 ContextSnapshot

用途：

- 记录一次任务执行的上下文快照

关键字段：

- `id`
- `conversationId`
- `taskRunId`
- `includedMessageIds`
- `includedArtifactIds`
- `pinnedContextItems`
- `summary`
- `createdAt`

关系：

- 与 TaskRun、Artifact、Message 相关

当前实现状态：

- 已实现
- 当前由静态 demo-task / revision 流程构造

### 4.9 HandoffSummary

用途：

- 表示 Agent 之间的交接摘要

关键字段：

- `id`
- `taskRunId`
- `sourceStepId`
- `targetStepId`
- `sourceAgentId`
- `targetAgentId`
- `passedArtifactIds`
- `keyDecisions`
- `openIssues`
- `summary`
- `createdAt`

关系：

- 与 TaskRun、TaskStep、Artifact 强关联

当前实现状态：

- 已实现
- 当前为静态构造，不是真实 memory handoff engine

## 5. API 分层

当前后端 API 位于 `backend/src/main/java/com/agenthub/api`，已覆盖以下能力：

- Health
- Agents
- Conversations
- Messages
- Tasks
- Artifacts
- Context
- Adapters

关键接口包括：

- `GET /api/agents`
- `POST /api/agents`
- `POST /api/conversations`
- `POST /api/conversations/{conversationId}/messages`
- `POST /api/conversations/{conversationId}/demo-task`
- `POST /api/artifacts/{artifactId}/demo-revision`
- `GET /api/conversations/{conversationId}/task-runs`
- `GET /api/conversations/{conversationId}/artifacts`
- `GET /api/task-runs/{taskRunId}/handoff-summaries`
- `GET /api/adapters`
- `POST /api/adapters/{adapterType}/execute`

## 6. Orchestrator / TaskApplicationService 当前实现说明

当前实现特点：

- `TaskApplicationService` 仍是 Task 领域的应用入口
- `OrchestratorService` 已抽离，负责 demo-task 和 revision 的主要编排流程
- 当前编排流程仍是静态 Demo 逻辑，不是真实动态规划

当前含义：

- 已有“Orchestrator 结构”
- 但还没有“真实 Orchestrator 智能”

## 7. Agent Adapter Layer 设计

当前 Adapter Layer 已实现第一版骨架：

- `AgentAdapter`
- `AgentRequest`
- `AgentResponse`
- `AgentExecutionStatus`
- `AgentAdapterType`
- `AgentAdapterRegistry`
- `AgentExecutorService`
- `AgentAdapterApplicationService`

当前支持的类型：

- `MOCK`
- `CODEX`
- `CLAUDE_CODE`
- `OPEN_CODE`

## 8. Mock / Codex / Claude Code / OpenCode 的接入状态

### MOCK

- 已实现
- 当前是主要稳定执行器
- 所有 Demo 主链路默认可 fallback 到它

### CODEX

- 只有 placeholder adapter
- 不发起真实外部调用
- 用于体现 preferred adapter 设计

### CLAUDE_CODE

- 只有 placeholder adapter
- 不发起真实外部调用
- 用于体现 preferred adapter 设计

### OPEN_CODE

- 当前仅保留枚举与设计空间
- 未形成真实接入链路

## 9. Agent Builder 设计

当前已实现：

- `POST /api/agents`
- 自定义 Agent 保存到内存 Repository
- `/agents` 页面可创建 Agent
- Agent List 可展示内置 Agent + 自定义 Agent

当前未实现：

- 更新 Agent
- 删除 Agent
- 自定义 Agent 进入真实 `@Agent` 执行链路

## 10. ContextSnapshot / HandoffSummary 设计

当前设计目标是把“上下文”和“交接”从隐式逻辑变成显式对象。

当前实现：

- demo-task 创建 ContextSnapshot
- revision 也创建 ContextSnapshot
- HandoffSummary 至少覆盖关键 Agent 之间的交接

当前限制：

- 仍是静态构造
- 不具备真实长期 memory 管理

## 11. Artifact Service / Revision 设计

当前后端已经支持：

- 查询 Artifact
- 查询 TaskRun 关联的 Artifact
- 对单个 Artifact 发起静态 revision

revision 流程当前行为：

- 基于原 Artifact 创建新的 TaskSpec
- 生成新的 TaskRun
- 生成 revision Artifact v2
- 生成新的 Review Report
- 生成新的 ContextSnapshot / HandoffSummary

当前限制：

- 不是基于真实代码分析
- 不是基于真实 LLM 修改

## 12. Version History / Diff Summary 前端设计

这部分目前主要在前端实现：

- 基于当前会话已加载的 Artifact 计算 lineage
- 基于 `parentArtifactId`、`revisionInstruction`、`title + version` 推导版本关系
- 静态生成 Diff Summary

当前限制：

- 没有真实 diff 算法
- 没有后端版版本图谱服务

## 13. TaskRun / TaskStep 状态流转

当前使用的关键状态：

- TaskRun
  - `PENDING`
  - `RUNNING`
  - `COMPLETED`
  - `FAILED`
  - `BLOCKED`
  - `CANCELLED`
- TaskStep
  - `WAITING`
  - `RUNNING`
  - `COMPLETED`
  - `FAILED`
  - `SKIPPED`

当前 demo 中大多数状态以 `COMPLETED` 为主，用于稳定展示主链路。

## 14. 当前内存 Repository 设计

当前仓库主要依赖内存 Repository：

- `InMemoryAgentRepository`
- `InMemoryConversationRepository`
- `InMemoryMessageRepository`
- `InMemoryTaskRepository`
- `InMemoryArtifactRepository`
- `InMemoryContextRepository`

优点：

- 联调快
- 适合比赛 Demo
- 便于快速重置数据

缺点：

- 刷新进程后数据丢失
- 不适合真实多用户协作

## 15. 未来 MyBatis + MySQL 迁移设计

当前依赖中已经引入 MyBatis 和 MySQL connector，但真实持久化尚未完成。

建议迁移顺序：

1. Agent
2. Conversation
3. Message
4. TaskSpec
5. TaskRun / TaskStep
6. Artifact
7. ContextSnapshot / HandoffSummary

迁移原则：

- 先保持 Repository 接口不变
- 再替换内存实现为 MyBatis 实现
- 前端 API 不感知存储层变化

## 16. WebSocket / SSE 后续设计

当前未实现流式执行。

后续建议：

- TaskRun 状态更新走 SSE 或 WebSocket
- Message Stream 支持 Agent 增量输出
- Adapter 执行过程支持实时状态推送

当前文档中应明确：

- 这仍是下一阶段能力
- 不是 V0.5 已完成内容

## 17. 风险与扩展点

### 当前风险

- Demo 逻辑较多依赖静态模板
- placeholder adapter 易被误解为真实接入
- 内存存储无法支撑持久演示环境

### 扩展点

- 自定义 Agent 接入执行链路
- 真实 provider 接入
- SSE / WebSocket
- 持久化存储
- Deploy Status Card
- 多端和多人协作
