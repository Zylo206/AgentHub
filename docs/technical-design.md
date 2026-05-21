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

关系：

- 属于某个 `Conversation`
- 可作为 `TaskSpec.sourceMessageId`
- `targetAgentId` 可被 Orchestrator 用于推断 selectedAgent

当前状态：

- 已实现

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

关系：

- 隶属于 `TaskRun`
- 产出多个 `Artifact`

当前状态：

- 已实现
- 已能展示 preferred / actual / fallback

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
- 在需要时从 `Message.targetAgentId` 推断 selectedAgent
- 创建 TaskSpec
- 创建 TaskRun / TaskStep
- 调用 AgentExecutorService
- 生成 Artifact
- 生成 ContextSnapshot / HandoffSummary

必须明确：

- 当前 Orchestrator 仍偏规则化、静态 Demo
- 不是复杂动态规划系统
- 不是基于真实 LLM 的多轮拆解器

## 7. Message.targetAgentId 到 selectedAgent 推断链路

当前链路已打通：

1. 前端发送消息时可附带 `targetAgentId`
2. `MessageApplicationService` 保存 `targetAgentId`
3. `demo-task` 请求仍可显式传 `selectedAgentId`
4. `OrchestratorService` 优先使用显式 `selectedAgentId`
5. 若显式值为空，则读取 source message 的 `targetAgentId`
6. 将推断出的 selectedAgent 注入第一个 specialist step

影响范围：

- `assignedAgentId`
- `inputContext`
- preferred adapter 选择
- `TaskRun.resultSummary`
- `ContextSnapshot`
- `HandoffSummary`

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

作用：

- 统一不同平台的执行接口
- 让 TaskStep 显式记录 adapter 行为
- 提供稳定 demo fallback

## 9. Mock / Placeholder / Real integration 边界

### MockAdapter

- 当前是稳定 Demo 兜底
- 会根据 taskDescription 返回静态前端 / backend / review 文本

### CodexAgentAdapter

- 当前是 placeholder
- 不做真实外部调用

### ClaudeCodeAgentAdapter

- 当前是 placeholder
- 不做真实外部调用

### Real integration

- 当前未完成
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

前端：

- `ContextPanel` 展示 snapshot / handoff

边界说明：

- 当前是静态 demo 内容，不是生产级 memory system

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

当前是静态摘要，不是真实 diff 算法。

设计意图：

- 先把版本演进关系可视化
- 后续再考虑真实 diff

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

### SSE / WebSocket

后续可用于：

- Message 流式输出
- TaskRun 状态更新
- Adapter 执行进度反馈

### 真实 Adapter

后续目标：

- 至少接入两个主流平台
- 让 preferredAdapterType 影响真实执行
- 保留 Mock fallback 作为兜底

## 16. 风险与扩展点

当前主要风险：

- static demo 容易被误解为真实执行
- Adapter placeholder 不满足硬要求
- 文档可能滞后于代码
- 演示链路依赖静态模板

当前最重要的扩展点：

- 两个平台最小真实/半真实接入
- 更规则化的 Orchestrator
- Deploy Status Card
- 更强的多 Agent 协作语义
