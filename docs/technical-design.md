# AgentHub 技术设计文档

## 1. 总体架构

当前 AgentHub 采用前后端分离结构：

```text
User
  -> React IM Workspace
  -> Spring Boot REST API
  -> TaskApplicationService
  -> OrchestratorService
  -> AgentRoutingService
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> Mock / Placeholder Adapter
  -> InMemory Repository
  -> Frontend render of Message / TaskRun / Context / Artifact
```

当前架构目标不是生产化，而是：

- 稳定支撑 MVP 演示闭环
- 显式展示多 Agent 协作结构
- 为后续真实 Adapter、MySQL、SSE 迁移预留清晰入口

## 2. 前端模块结构

前端位于：

- [frontend](E:/CodeProject2/AgentHub/frontend)

主要模块：

- `src/api`
- `src/features/agents`
- `src/features/chat`
- `src/features/context`
- `src/features/artifacts`
- `src/pages/workspace`
- `src/pages/agents`
- `src/styles`

当前前端职责：

- 渲染三栏 Workspace
- 管理会话、Agent、消息、TaskRun、Artifact 状态
- 处理 selectedAgent 和最小 `@Agent` 解析
- 展示 Context / Handoff / Version History / Diff Summary

## 3. 后端模块结构

后端位于：

- [backend](E:/CodeProject2/AgentHub/backend)

主要分层：

- `api`
- `application`
- `domain`
- `infrastructure`
  - `adapter`
  - `persistence/memory`

当前后端职责：

- 提供 REST API
- 管理内存模型与状态
- 编排 demo-task 与 revision
- 调用 Adapter Layer
- 生成 Context / Handoff / Artifact

## 4. 核心领域模型

### Agent

用途：

- 表示内置 Agent 或用户自建 Agent

关键字段：

- `id`
- `name`
- `avatarUrl`
- `role`
- `systemPrompt`
- `preferredAdapterType`
- `capabilityTags`
- `toolTags`
- `status`

关系：

- 被 `Conversation`、`TaskStep` 间接引用
- 被 `AgentRoutingService` 用于选择 preferred adapter

当前状态：

- 已实现
- 支持 `CUSTOM` Agent

### Conversation

用途：

- 表示聊天会话

关键字段：

- `id`
- `title`
- `type`
- `participantAgentIds`

关系：

- 关联多条 `Message`
- 关联多条 `TaskSpec / TaskRun / Artifact`

当前状态：

- 已实现

### Message

用途：

- 表示聊天流中的一条消息

关键字段：

- `id`
- `conversationId`
- `senderType`
- `senderId`
- `messageType`
- `content`
- `artifactIds`
- `targetAgentId`
- `mentionedAgentIds`

关系：

- 属于某个 `Conversation`
- 可作为 `TaskSpec.sourceMessageId`
- `targetAgentId` 可被 Orchestrator 用于推断 selectedAgent
- `mentionedAgentIds` 支持消息开头连续多个 `@AgentName` 的最小群聊目标表达

当前状态：

- 已实现
- 保留 `targetAgentId` 兼容旧流程，多个 @Agent 使用 `mentionedAgentIds`

### TaskSpec

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

关系：

- 来源于用户消息
- 驱动后续 `TaskRun`

当前状态：

- 已实现
- 当前由静态 demo-task 生成

### TaskRun

用途：

- 表示一次完整任务执行

关键字段：

- `id`
- `conversationId`
- `taskSpecId`
- `status`
- `steps`
- `resultSummary`

关系：

- 包含多个 `TaskStep`
- 关联多个 `Artifact`
- 关联多个 `ContextSnapshot / HandoffSummary`

当前状态：

- 已实现
- 支持初始 demo-task 和 revision TaskRun

### TaskStep

用途：

- 表示 TaskRun 中的一个执行步骤

关键字段：

- `id`
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
- `parallelGroupKey`
- `dependsOnStepOrders`
- `routingReason`

关系：

- 隶属于 `TaskRun`
- 产出多个 `Artifact`

当前状态：

- 已实现
- 已能展示 preferred / actual / fallback
- demo-task 已在执行层使用 `CompletableFuture` 按 parallel group / dependencies 调度 Agent Step
- 当前仍不是完整动态 DAG 引擎

### Artifact

用途：

- 表示代码、文档、评审报告、接口契约等产物

关键字段：

- `id`
- `conversationId`
- `taskRunId`
- `title`
- `type`
- `status`
- `version`
- `content`
- `language`
- `parentArtifactId`
- `revisionInstruction`

关系：

- 来自某个 `TaskRun`
- 可进入 revision
- 可形成版本链路

当前状态：

- 已实现

### ContextSnapshot

用途：

- 表示一次任务执行中的上下文快照

关键字段：

- `id`
- `conversationId`
- `taskRunId`
- `includedMessageIds`
- `includedArtifactIds`
- `pinnedContextItems`
- `summary`

关系：

- 关联 `TaskRun`
- 引用 Message 和 Artifact

当前状态：

- 已实现
- 当前内容由静态 demo 生成

### HandoffSummary

用途：

- 表示 Agent 间交接摘要

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

关系：

- 关联 `TaskRun`
- 串联不同 `TaskStep`

当前状态：

- 已实现
- 当前内容由静态 demo 生成

## 5. API 分层

当前主要 API 分层如下：

- `api/agent`
- `api/message`
- `api/task`
- `api/artifact`
- `api/context`
- `api/adapter`

API 主要提供：

- Agent 创建与查询
- Conversation / Message 查询与发送
- demo-task 触发
- revision 触发
- Context / Handoff 查询
- Adapter 测试调用

## 6. Orchestrator 当前实现

当前核心入口是：

- [OrchestratorService.java](E:/CodeProject2/AgentHub/backend/src/main/java/com/agenthub/application/orchestrator/OrchestratorService.java)

当前职责：

- 读取 source message
- 解析显式 `selectedAgentId`
- 在需要时从 `Message.mentionedAgentIds` / `Message.targetAgentId` 推断 selectedAgent
- 创建 TaskSpec
- 通过 TaskPlanner / AgentRouter / AgentStepExecutor / ResultAggregator 组织 demo-task
- 创建 TaskRun / TaskStep，并记录 parallel group、routing reason 和 adapter fallback
- 调用 AgentExecutorService / AgentAdapterRegistry
- 生成 Artifact
- 生成 ContextSnapshot / HandoffSummary
- 追加 Orchestrator / Frontend / Backend / Reviewer 群聊式 Agent 消息
- 将 pinned context 和 MemoryItem 注入 TaskStep inputContext

必须明确：

- 当前 Orchestrator 仍偏规则化、静态 Demo
- 不是复杂动态规划系统
- LLM Planner 当前是可配置 MVP：仅生成 `OrchestratorPlan`，不直接生成真实产物
- 当前 parallel group 已进入 demo-task 执行层并发，但不是完整动态 DAG 引擎

## 7. Message target / mentioned agents 到 selectedAgent 推断链路

当前链路已打通：

1. 前端发送消息时可附带 `targetAgentId`
2. 前端也可通过开头连续多个 `@AgentName` 发送 `mentionedAgentIds`
3. `MessageApplicationService` 保存 `targetAgentId` 和 `mentionedAgentIds`
4. `demo-task` 请求仍可显式传 `selectedAgentId`
5. `OrchestratorService` 优先使用显式 `selectedAgentId`
6. 若显式值为空，则优先读取 source message 的 `mentionedAgentIds`
7. 若没有 `mentionedAgentIds`，再读取 `targetAgentId`
8. 将推断出的 selectedAgent 注入第一个 specialist step，并把 mentioned agents 加入 conversation participants

影响范围：

- `assignedAgentId`
- `inputContext`
- preferred adapter 选择
- `TaskRun.resultSummary`
- `ContextSnapshot`
- `HandoffSummary`
- MessageStream 中的群聊式 Agent 回复

## 8. Agent Adapter Layer 设计

当前实现包括：

- `AgentAdapter`
- `AgentRequest`
- `AgentResponse`
- `AgentExecutionStatus`
- `AgentAdapterType`
- `AgentAdapterRegistry`
- `AgentExecutorService`
- `MockAgentAdapter`
- `CodexAgentAdapter`
- `ClaudeCodeAgentAdapter`
- `OpenCodeAgentAdapter`
- `OpenAICompatibleAgentAdapter`
- CLI command runner / CLI adapter support

作用：

- 统一不同平台的执行接口
- 让 TaskStep 显式记录 adapter 行为
- 提供稳定 demo fallback
- 支持 Adapter status descriptor，供前端 Agent Builder / Workspace 展示

## 9. Mock / Placeholder / Real integration 边界

### MockAdapter

- 当前是稳定 Demo 兜底
- 会根据 taskDescription 返回静态前端 / backend / review 文本

### CodexAgentAdapter

- 当前是 CLI 探测型半真实 Adapter
- 默认 disabled，不要求本机安装 Codex CLI
- 启用后通过 command / args-template 执行最小非交互调用
- 命令不可用、args-template 缺失、超时或退出码非 0 时 fallback 到 MOCK

### ClaudeCodeAgentAdapter

- 当前是 CLI 探测型半真实 Adapter
- 默认 disabled，不要求本机安装 Claude Code CLI
- 命令不可用、args-template 缺失、超时或退出码非 0 时 fallback 到 MOCK

### OpenCodeAgentAdapter

- 当前是 CLI 探测型半真实 Adapter
- 默认 disabled，不要求本机安装 OpenCode CLI
- 命令不可用、args-template 缺失、超时或退出码非 0 时 fallback 到 MOCK

### OpenAICompatibleAgentAdapter

- 当前是可配置真实模型调用入口
- 需要 `AGENTHUB_OPENAI_BASE_URL`、`AGENTHUB_OPENAI_API_KEY`、`AGENTHUB_OPENAI_MODEL`
- 未配置或调用失败时 fallback 到 MOCK
- 当前非流式，且不代表 Codex / Claude Code / OpenCode 深度接入完成

### Adapter Output Artifact

- `AgentStepExecutor` 会检查 `AgentResponse`
- 只有满足以下条件才会创建 `Adapter Output - ...` Artifact：
  - `status = COMPLETED`
  - `fallbackUsed = false`
  - `actualAdapterType != MOCK`
  - `content` 非空
- fallback 到 MOCK 时不会伪造真实 Adapter Output Artifact
- Adapter Output Artifact 会进入：
  - `TaskStep.producedArtifactIds`
  - Artifact Studio
  - MessageStream 的 Artifact Card
  - ContextSnapshot artifactIds / pinned context items
  - TaskRun resultSummary
- 该能力是半真实输出承接，不代表 Codex / Claude Code / OpenCode 深度集成完成

### Real integration

- 深度真实平台接入当前未完成
- 文档和演示中不得写成“已接入完成”

## 10. Agent Builder 设计

后端支持：

- `POST /api/agents`
- `GET /api/agents`
- `GET /api/agents/{agentId}`

前端支持：

- `AgentBuilderPage`
- name / avatarUrl / systemPrompt / capabilityTags / toolTags / preferredAdapterType

当前价值：

- 让自建 Agent 从文档概念变成可保存配置
- 让 selectedAgent / `@Agent` / demo-task 首步执行链路成立

## 11. ContextSnapshot / HandoffSummary 设计

当前实现目标是显式化上下文与交接。

后端：

- demo-task 生成 ContextSnapshot
- demo-task 和 revision 生成 HandoffSummary
- 支持 PinnedContext，用户可把 Message 固定为上下文
- 支持 MemoryItem MVP，用户可把 Message 保存为长期记忆
- MemoryItem 使用本地 JSON 文件持久化，默认路径为 `backend/.agenthub/memories.json`
- MemoryRepository 支持按 conversation / scope / category / importance / lastUsedAt 的规则检索
- Orchestrator demo-task 会检索 relevant memories，并把 pinned context 和 memory 注入第一个 TaskStep inputContext
- Orchestrator 使用过的 memory 会更新 `lastUsedAt`

前端：

- `ContextPanel` 展示 snapshot / handoff
- `ContextPanel` 展示手动固定上下文和长期记忆
- `MessageBubble` 支持固定到上下文和保存为记忆

边界说明：

- 当前 MemoryItem 仍是内存 Repository，不是生产级长期记忆系统
- 当前持久化是本地文件，不是 MySQL / 多端同步 / 生产级记忆存储
- 当前不使用 embedding / vector database
- 当前没有跨设备同步、隐私治理或复杂长期记忆策略

## 12. Artifact Revision 设计

当前 revision 链路支持：

- 基于已有 Artifact 发起 revision
- 生成 revision TaskRun
- 生成新 Artifact
- 生成新的 Review Report
- 生成新的 Context / Handoff

目标：

- 让 Artifact 成为持续迭代对象
- 强化“聊天不是终点，Artifact 才是迭代核心”

## 13. Version History / Diff Summary 前端设计

### Version History

由前端基于以下字段计算：

- `title`
- `version`
- `parentArtifactId`
- `revisionInstruction`

### Diff Summary

当前已从纯静态摘要升级为轻量 line diff 展示，并支持通过 `/api/artifacts/{artifactId}/apply-diff` 将 revision 产物的行级 Diff 应用到父版本，生成新的 `ACCEPTED` Artifact。这仍不是完整代码编辑器、AST diff 或冲突解决引擎。

设计意图：

- 先把版本演进关系可视化
- 一键应用 Diff 当前是轻量行级 patch apply，后续再考虑语义级 patch、代码编辑器和冲突处理

### Message Relation

消息关系已经从纯文本引用补充为结构化字段：

- `replyToMessageId`
- `quotedMessageId`
- `quotedMessageContent`

前端发送引用 / 回复消息时会传入结构化字段，后端校验引用消息属于同一 conversation，并保存引用内容快照。当前仍不是完整 IM thread 模型，没有消息树、折叠回复线程或单条 Agent 回复重新生成。

## 14. 当前内存 Repository 设计

当前所有核心模型都使用内存 Repository。

优点：

- 开发快
- 演示稳定
- 无需数据库依赖

限制：

- 无持久化
- 无并发控制
- 无跨进程状态保持

## 15. 后续 MySQL / SSE / 真实 Adapter 迁移设计

### MySQL

后续可把当前内存 Repository 迁移到 MyBatis + MySQL，保持 API 和领域模型尽量稳定。

优先迁移对象：

- Conversation / Message
- Artifact / TaskRun / TaskStep
- PinnedContext / MemoryItem
- DeploymentRecord

### SSE / WebSocket

后续可用于：

- Message 流式输出
- TaskRun 状态更新
- Adapter 执行进度反馈

### 真实 Adapter

后续目标：

- 至少深度接入两个主流平台
- 让 preferredAdapterType 影响真实执行
- 保留 Mock fallback 作为兜底
- 让成功的真实 / 半真实 Adapter 输出稳定进入 Artifact 链路

### LLM Planner

当前 MVP：

- 通过 `agenthub.orchestrator.planner.type=LLM` 可切换到 LLM Planner
- LLM Planner 使用 `OPENAI_COMPATIBLE` Adapter 发起非流式规划调用
- 模型输出必须是 JSON object，并通过最小 schema 校验：
  - 必须包含 `goal`
  - 必须包含 `steps`
  - 必须且只能包含 `FRONTEND`、`BACKEND`、`REVIEWER` 三类 specialist role
  - 每个 step 必须包含 `stepOrder`、`taskDescription`、`requiredSkill`
  - 可包含 `parallelGroupKey`、`dependsOnStepOrders`、`routingReason`
- 校验失败、Adapter 不可用、调用 fallback 或模型输出不合规时，默认回退 RuleBasedPlanner
- `agenthub.orchestrator.planner.fallback-to-rule-based=false` 时，LLM Planner 失败会显式报错
- TaskRun resultSummary 和 Orchestrator 可解释面板会展示 `LLM_PLANNER`、`RULE_BASED_FALLBACK` 和 fallback reason
- LLM Planner 只负责计划生成，不直接绕过现有 Artifact / Adapter / fallback 链路

## 16. 风险与扩展点

当前主要风险：

- static demo 容易被误解为真实执行
- CLI 探测型 Adapter 不能等同于深度平台接入
- 文档可能滞后于代码
- 演示链路依赖静态模板
- MemoryItem 仍是内存态，刷新后丢失
- 并发执行仍限定在 demo-task Agent Step 层，不是完整动态 DAG 调度

当前最重要的扩展点：

- LLM Planner JSON schema MVP
- MemoryItem 持久化与检索策略
- Adapter 成功输出 Artifact 增强
- Orchestrator Decision DTO
