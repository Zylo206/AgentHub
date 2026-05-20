# AgentHub 技术设计文档 V0.1

## 1. 总体架构

AgentHub 采用 Web 优先的前后端分层结构，核心目标是先支持 IM 式多 Agent 协作主链路，而不是一开始追求复杂平台化。

总体分层如下：

- Frontend：聊天工作台、Agent Builder、Artifact Panel、Task Status UI
- Backend API：会话接口、消息接口、Agent 接口、Task 接口
- Orchestrator Layer：Task Spec 生成、TaskPlan 生成、Routing、Aggregation
- Agent Adapter Layer：对接外部 Agent 平台的统一适配器
- Context Layer：Pinned Context、Artifact Handoff、ContextSnapshot
- Artifact Layer：代码、文档、网页预览等 Artifact 管理

推荐逻辑架构：

```text
User
  -> Chat Workspace
  -> Backend API
  -> Orchestrator
  -> AgentRouter
  -> AgentExecutor
  -> Agent Adapter
  -> ContextManager
  -> ArtifactService
  -> Reviewer
  -> Frontend Render
```

## 1.1 技术栈确认

V0.1 阶段推荐采用以下技术栈，目标是优先保障开发速度、演示稳定性和后续扩展性。

### 前端技术栈

- `React 18`
- `TypeScript`
- `Vite`
- `React Router`
- `Ant Design`
- `Zustand`
- `Monaco Editor`
- `axios`
- `SSE`

说明：

- React 负责搭建 IM 工作台、Agent Builder 和 Artifact Panel
- TypeScript 用于约束 Message、TaskRun、Artifact 等核心前端数据结构
- Vite 用于快速开发和构建
- React Router 用于管理主工作台和辅助页面
- Ant Design 用于快速搭建稳定的中后台与工作台界面
- Zustand 用于管理会话、任务状态和右侧预览面板状态
- Monaco Editor 用于代码类 Artifact 的查看与后续编辑能力
- SSE 用于消息流、执行状态和 Agent 输出的增量更新

### 后端技术栈

- `Java 21`
- `Spring Boot 3.5`
- `Spring Web`
- `Spring Validation`
- `MyBatis`
- `Lombok`
- `Jackson`

说明：

- Java 21 和 Spring Boot 3.5 用于承载 API、Orchestrator 和服务编排逻辑
- Spring Web 用于 REST API 和基础执行接口
- Spring Validation 用于请求参数和领域对象校验
- MyBatis 用于控制核心实体的数据访问层，保持 SQL 可见、可控，便于后续按 TaskRun、TaskStep、Artifact 做精细查询
- Jackson 用于 Task Spec、Artifact、TaskRun 等结构化对象的序列化

### 数据层

- `MySQL`

说明：

- 正式方向采用 MySQL 持久化核心实体
- V0.1 允许先以内存实现或轻量持久化跑通主链路
- 优先落库的实体为 Agent、Conversation、Message、TaskSpec、TaskRun、TaskStep、Artifact
- 数据访问层推荐采用 `Mapper Interface + XML SQL` 或 `Mapper Interface + 注解 SQL` 的轻量方式，不在 V0.1 阶段引入复杂数据访问抽象

### 通信方式

- `REST API` 用于基础读写
- `SSE` 用于长任务流式输出和状态更新

说明：

- V0.1 不优先引入复杂实时通信方案
- 单用户 Demo 场景下，REST + SSE 足以支撑稳定演示

### 当前不纳入 MVP 主栈

以下内容在 V0.1 阶段不作为主栈要求：

- 复杂消息中间件
- 企业级搜索基础设施
- 多端真实落地
- 复杂 Workflow Canvas
- 深度平台级外部能力耦合

## 2. 前端模块设计

### 2.1 Chat Workspace

用途：

- 承载主入口
- 展示单聊、群聊、消息流、状态卡片、Artifact 卡片

子模块：

- conversation-list
- message-stream
- message-composer
- task-status-card
- handoff-summary-card
- artifact-inline-card

### 2.2 Agent Builder

用途：

- 创建用户自定义 Agent
- 维护 System Prompt、Tool Tags、Capability Tags

### 2.3 Artifact Panel

用途：

- 右侧集中展示当前会话的核心 Artifact
- 展示 Code Preview、Markdown Preview、Web Preview、Review Report

### 2.4 Task Drawer

用途：

- 查看 Task Spec
- 查看 TaskPlan
- 查看 TaskRun / TaskStep 状态

## 3. 后端模块设计

### 3.1 Conversation Service

职责：

- 管理会话、群聊成员、消息流
- 提供 Conversation、Message 的基础 CRUD

### 3.2 Orchestrator Service

职责：

- 从用户消息生成 Task Spec
- 生成 TaskPlan
- 根据 Routing Rules 分派 Agent
- 聚合多个 Agent 结果

### 3.3 Agent Registry Service

职责：

- 管理系统内置 Agent 和用户自定义 Agent
- 维护 Agent 与 Skill 的绑定关系

### 3.4 Agent Router

职责：

- 读取 TaskPlan、Skill、Routing Rules
- 为每个 TaskStep 分配最合适的 Agent

### 3.5 Agent Executor

职责：

- 驱动 TaskStep 执行
- 调用对应 Agent Adapter
- 记录执行结果

### 3.6 Context Manager

职责：

- 管理聊天历史
- 管理 Pinned Context
- 生成 Handoff Summary
- 形成 ContextSnapshot

### 3.7 Artifact Service

职责：

- 保存代码、Markdown、网页预览、文件等 Artifact
- 管理 Artifact 状态
- 供前端预览

### 3.8 Review Service

职责：

- 按 Acceptance Criteria 触发 Reviewer
- 生成结构化 Review Report

## 4. 核心数据模型

以下实体是 V0.1 的最小闭环。

### 4.1 Agent

用途：

- 表示一个可参与协作的 Agent 实体

核心字段：

- agentId
- name
- role
- provider
- systemPrompt
- toolTags
- capabilityTags
- enabled

关系：

- 一个 Agent 可绑定多个 Skill
- 一个 Conversation 可包含多个 Agent

### 4.2 Conversation

用途：

- 表示一次单聊或群聊会话

核心字段：

- conversationId
- title
- mode
- participantAgentIds
- createdAt
- updatedAt

关系：

- 一个 Conversation 包含多个 Message
- 一个 Conversation 可对应多个 TaskRun

### 4.3 Message

用途：

- 表示聊天流中的一条消息

核心字段：

- messageId
- conversationId
- senderType
- senderId
- content
- messageType
- referencedMessageId
- pinned
- createdAt

关系：

- Message 可以关联多个 Artifact
- Message 可以关联 TaskRun 或 TaskStep

### 4.4 TaskSpec

用途：

- 表示任务规格 Task Spec，是 Orchestrator 的输入基础

核心字段：

- taskSpecId
- conversationId
- title
- userGoal
- userInput
- scope
- nonGoals
- acceptanceCriteria
- requiredSkills
- expectedArtifacts
- constraints
- risks
- fallbackPlan
- status

关系：

- 一个 TaskSpec 可生成一个或多个 TaskRun
- TaskSpec 与 Skill、Artifact 强关联

### 4.5 TaskPlan

用途：

- 表示由 Orchestrator 生成的执行计划

核心字段：

- taskPlanId
- taskSpecId
- planSummary
- steps
- createdAt

关系：

- 一个 TaskPlan 包含多个 TaskStep 定义

### 4.6 TaskRun

用途：

- 表示一次任务执行实例

核心字段：

- taskRunId
- taskSpecId
- taskPlanId
- conversationId
- status
- startedAt
- endedAt
- summary

关系：

- 一个 TaskRun 包含多个 TaskStep

### 4.7 TaskStep

用途：

- 表示 TaskRun 中的一个执行步骤

核心字段：

- taskStepId
- taskRunId
- title
- assignedAgentId
- requiredSkillId
- inputSummary
- outputSummary
- status
- dependsOnStepIds
- startedAt
- endedAt

关系：

- 一个 TaskStep 可产出多个 Artifact
- 一个 TaskStep 可依赖前置 TaskStep

### 4.8 Artifact

用途：

- 表示协作过程中的产物

核心字段：

- artifactId
- conversationId
- taskRunId
- taskStepId
- artifactType
- title
- content
- previewUrl
- sourceAgentId
- status
- version
- createdAt

关系：

- Artifact 可被 Handoff 给后续 Agent
- Artifact 可被 Reviewer 检查

### 4.9 Skill

用途：

- 表示一个可复用的能力单元

核心字段：

- skillId
- name
- description
- inputSchema
- outputSchema
- supportedArtifactTypes
- verificationRules

关系：

- Skill 与 Agent 是多对多关系
- Skill 被 Routing Rules 引用

### 4.10 ContextSnapshot

用途：

- 表示一次执行时注入给 Agent 的结构化上下文快照

核心字段：

- contextSnapshotId
- conversationId
- taskRunId
- taskStepId
- pinnedMessages
- selectedHistory
- artifactRefs
- handoffSummary
- createdAt

关系：

- 一个 TaskStep 通常对应一个 ContextSnapshot

## 5. Orchestrator 执行流程

目标流程如下：

用户输入任务  
-> 保存用户消息 Message  
-> 生成任务规格 Task Spec  
-> Orchestrator 生成 TaskPlan  
-> AgentRouter 根据 Skill 和 Rules 分配 Agent  
-> AgentExecutor 调用对应 Agent Adapter  
-> ContextManager 负责上下文注入与 Handoff  
-> ArtifactService 保存代码、文档、网页预览等 Artifact  
-> Reviewer 根据 Acceptance Criteria 检查结果  
-> 前端展示消息流、任务状态和 Artifact  
-> 用户基于 Artifact 继续修改

### 5.1 简化版伪代码

```text
onUserMessage(message):
  saveMessage(message)

  taskSpec = orchestrator.buildTaskSpec(message)
  saveTaskSpec(taskSpec)

  taskPlan = orchestrator.buildTaskPlan(taskSpec)
  saveTaskPlan(taskPlan)

  taskRun = createTaskRun(taskSpec, taskPlan)

  for step in taskPlan.steps:
    agent = agentRouter.pickAgent(step, taskSpec, routingRules)
    contextSnapshot = contextManager.buildSnapshot(taskRun, step)
    result = agentExecutor.execute(agent, step, contextSnapshot)
    artifacts = artifactService.save(result.artifacts)
    contextManager.recordHandoff(step, artifacts, result.summary)

  reviewResult = reviewService.review(taskRun, taskSpec.acceptanceCriteria)
  publishToConversation(taskRun, artifacts, reviewResult)
```

### 5.2 简化版流程图文本

```text
User Message
  -> Task Spec
  -> Task Plan
  -> Route Step 1
  -> Execute Step 1
  -> Save Artifact
  -> Route Step 2
  -> Execute Step 2
  -> Save Artifact
  -> Reviewer Check
  -> Aggregate Result
  -> User Iteration
```

## 6. Agent Adapter 设计

### 6.1 设计目标

- 屏蔽不同 Agent 平台的调用差异
- 在 V0.1 阶段先保证统一接口，不承诺深度能力对齐
- 支持后续增加更多 provider

### 6.2 推荐接口

```json
{
  "adapterId": "codex-adapter",
  "provider": "codex",
  "input": {
    "taskStepId": "step_001",
    "systemPrompt": "...",
    "userPrompt": "...",
    "contextSnapshot": {}
  },
  "output": {
    "summary": "...",
    "artifacts": []
  }
}
```

### 6.3 最小能力

- sendTask
- parseResult
- normalizeArtifacts
- normalizeError

## 7. Context Manager 设计

### 7.1 目标

解决多 Agent 协作中的上下文丢失、冗余、污染问题。

### 7.2 上下文来源

- 当前 Task Spec
- Pinned Messages
- 最近相关聊天记录
- 上一个 Agent 输出的 Artifact
- Handoff Summary

### 7.3 输出对象

Context Manager 最终输出 `ContextSnapshot`：

- 供当前 Agent 执行
- 供后续调试和回溯

### 7.4 核心原则

- 不无差别传递完整聊天历史
- Task Spec 永远优先
- Artifact 是下游 Agent 的核心上下文
- Handoff Summary 用于压缩长上下文

## 8. Artifact Service 设计

### 8.1 目标

把代码、网页、文件、Markdown 等产物从“普通文本回复”提升为系统内可管理对象。

### 8.2 支持类型

- CODE
- WEB_PREVIEW
- FILE
- MARKDOWN
- REVIEW_REPORT

### 8.3 核心职责

- 生成 ArtifactId
- 保存 Artifact 元数据
- 保存可预览内容
- 提供前端读取接口
- 管理 Artifact 状态和版本

## 9. TaskRun / TaskStep 设计

### 9.1 TaskRun

表示一次端到端执行过程，负责承载：

- 计划执行状态
- 聚合结果
- 失败和阻塞信息

### 9.2 TaskStep

表示一次具体分派动作，负责承载：

- 当前步骤由谁执行
- 输入是什么
- 输出是什么
- 状态如何变化

推荐设计上让 Reviewer 也是一个 TaskStep，而不是游离流程。

## 10. API 草案

以下是 V0.1 草案，不代表已实现。

### 10.1 Conversation APIs

- `POST /api/conversations`
- `GET /api/conversations`
- `GET /api/conversations/{conversationId}`

### 10.2 Message APIs

- `POST /api/conversations/{conversationId}/messages`
- `GET /api/conversations/{conversationId}/messages`

### 10.3 Agent APIs

- `GET /api/agents`
- `POST /api/agents`
- `PATCH /api/agents/{agentId}`

### 10.4 Task APIs

- `POST /api/tasks/spec`
- `POST /api/tasks/plan`
- `POST /api/tasks/run`
- `GET /api/tasks/run/{taskRunId}`
- `GET /api/tasks/run/{taskRunId}/steps`

### 10.5 Artifact APIs

- `GET /api/artifacts/{artifactId}`
- `GET /api/conversations/{conversationId}/artifacts`

### 10.6 示例响应

```json
{
  "taskRunId": "run_001",
  "status": "RUNNING",
  "taskStepIds": ["step_001", "step_002", "step_003"]
}
```

## 11. 状态流转

统一使用英文状态枚举：

- DRAFT
- READY
- APPROVED
- REVISED
- CANCELLED
- PENDING
- RUNNING
- COMPLETED
- FAILED
- BLOCKED
- WAITING
- SKIPPED
- CREATED
- UPDATED
- REVIEWED
- ACCEPTED
- REJECTED
- ARCHIVED

详细定义见 [state-machine.md](/E:/CodeProject2/AgentHub/docs/collaboration/state-machine.md)

## 12. 风险与扩展点

### 12.1 当前风险

- 外部 Agent 平台实际接入复杂度可能高于预期
- 上下文组织不当会导致演示不稳定
- Artifact 渲染范围过大容易拖慢实现

### 12.2 控制策略

- 先做薄 Adapter
- 先做稳定 Demo 场景
- 先支持 4 种核心 Artifact
- Reviewer 先以结构化检查为主，不追求复杂静态分析

### 12.3 扩展点

- Diff View
- Version History
- Deploy Action
- Knowledge Bridge 深化
- 多端支持
