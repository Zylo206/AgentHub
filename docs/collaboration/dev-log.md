# AgentHub AI 协作开发记录 V0.5

## 说明

本文档用于记录 AgentHub 当前已经完成的主要 AI 协作开发阶段。当前记录按 Phase 组织，不编造具体日期。
每个阶段包含：
- 目标
- 主要变更
- 验证方式
- static / mock / placeholder 部分
- 下一步遗留

## Phase 1：文档体系初始化

### 目标

- 建立比赛所需的协作资产目录

### 主要变更

- 建立 `docs/spec`
- 建立 `docs/skills`
- 建立 `docs/rules`
- 建立 `docs/collaboration`

### 验证方式

- 检查目录结构存在
- 检查模板文档可读取

### static / mock / placeholder 部分

- 主要是文档模板，没有运行时实现

### 下一步遗留

- 文档需要逐步和代码实现同步

## Phase 2：项目骨架初始化

### 目标

- 建立前后端工程骨架

### 主要变更

- 建立 frontend 工程
- 建立 backend 工程
- 建立基础路由和启动入口

### 验证方式

- 前端可构建
- 后端可构建

### static / mock / placeholder 部分

- 只有工程骨架，没有实际主链路

### 下一步遗留

- 需要落核心领域模型

## Phase 3：后端领域模型和内存仓储

### 目标

- 建立最小后端领域模型和内存版数据流

### 主要变更

- 建立 Agent、Conversation、Message、TaskSpec、TaskRun、TaskStep、Artifact、ContextSnapshot、HandoffSummary
- 建立内存 Repository
- 建立基础 API

### 验证方式

- backend 构建通过
- 基础查询和创建接口可联调

### static / mock / placeholder 部分

- 存储仍为内存
- 未接 MySQL

### 下一步遗留

- 需要跑通 demo-task 主链路

## Phase 4：静态 demo-task 主链路

### 目标

- 先建立可演示的任务执行链路

### 主要变更

- 创建静态 TaskSpec
- 创建 TaskRun / TaskStep
- 创建静态 Artifact
- 追加任务相关消息

### 验证方式

- `/api/conversations/{conversationId}/demo-task`
- 前端可看到 Message / TaskRun / Artifact

### static / mock / placeholder 部分

- demo-task 为静态生成
- 不是真实动态 Orchestrator

### 下一步遗留

- 需要前端工作台承载展示

## Phase 5：前端三栏工作台

### 目标

- 建立 IM 主工作台

### 主要变更

- Conversation List
- Agent List
- Message Stream
- TaskRunPanel
- ArtifactPanel
- ChatInput

### 验证方式

- `/workspace` 可进入
- 能创建 Demo Conversation
- 能发送消息并查看结果

### static / mock / placeholder 部分

- 仍依赖后端静态 demo-task

### 下一步遗留

- 需要补 Context / Handoff 的可视化

## Phase 6：Context / Handoff 展示

### 目标

- 让上下文交接显式化

### 主要变更

- ContextSnapshot
- HandoffSummary
- ContextPanel

### 验证方式

- TaskRun 执行后可查看 ContextSnapshot
- 可查看 HandoffSummary 的 source / target / artifacts

### static / mock / placeholder 部分

- ContextSnapshot / HandoffSummary 为静态构造
- 不是真实 memory system

### 下一步遗留

- 需要围绕 Artifact 做下一轮迭代

## Phase 7：Artifact Revision

### 目标

- 打通 Artifact-centered iteration 最小闭环

### 主要变更

- 选中 Artifact
- 输入 revisionInstruction
- 创建 revision TaskRun
- 生成 revised Artifact
- 生成新的 Review Report

### 验证方式

- 右侧选中 `LoginPage.tsx`
- 执行 revision
- 能看到新的 TaskRun 和 Artifact

### static / mock / placeholder 部分

- revision 为静态模板
- 不是真实代码分析和修改

### 下一步遗留

- 需要更清晰的版本关系和修改摘要

## Phase 8：Version History / Diff Summary

### 目标

- 强化版本演进和修改可解释性

### 主要变更

- Version History
- Diff Summary
- Revision 来源提示

### 验证方式

- 看到 `v1 -> v2`
- 看到 revisionInstruction、changed items、risk

### static / mock / placeholder 部分

- Diff Summary 为静态摘要
- 不是真实代码 diff

### 下一步遗留

- 需要把 Adapter 执行信息纳入主链路

## Phase 9：Agent Adapter Layer

### 目标

- 建立统一 Agent Adapter Layer 骨架

### 主要变更

- AgentAdapter
- AgentRequest / AgentResponse
- AgentExecutionStatus
- AgentAdapterRegistry
- MockAgentAdapter
- Codex placeholder
- Claude Code placeholder

### 验证方式

- `/api/adapters`
- `/api/adapters/{adapterType}/execute`

### static / mock / placeholder 部分

- 真实 provider 未接
- 当前以 placeholder + Mock fallback 为主

### 下一步遗留

- 需要接入 demo-task 主链路

## Phase 10：TaskStep Adapter 信息展示

### 目标

- 让 TaskStep 的 Adapter 路由和 fallback 可见

### 主要变更

- TaskStep 增加 preferred / actual / status / response / error 字段
- TaskRunPanel 展示 Adapter 信息
- 引入 OrchestratorService 和 AgentRoutingService

### 验证方式

- TaskRunPanel 中能看到：
  - `CODEX -> MOCK`
  - `CLAUDE_CODE -> MOCK`
  - `FALLBACK_USED`

### static / mock / placeholder 部分

- 仍未真实接 provider

### 下一步遗留

- 需要让自定义 Agent 进入系统能力闭环

## Phase 11：用户自建 Agent 最小闭环

### 目标

- 支持用户创建自定义 Agent 并在 Workspace 中可见

### 主要变更

- Agent 模型支持 `avatarUrl`
- Agent 模型支持 `preferredAdapterType`
- `POST /api/agents`
- `/agents` 表单页面
- Agent List 展示内置 Agent + 自定义 Agent

### 验证方式

- `/agents` 创建自定义 Agent
- 返回 `/workspace` 后可在 Agent List 中看到

### static / mock / placeholder 部分

- 自定义 Agent 目前只形成配置闭环
- 尚未完整进入执行链路

### 下一步遗留

- 需要补 Selected Agent / `@Agent`

## Phase 12：V0.5 文档同步

### 目标

- 让文档、代码、Demo 状态一致

### 主要变更

- 更新 README
- 更新产品设计、技术设计、Demo 场景、Roadmap
- 明确 static demo / placeholder / 未完成边界

### 验证方式

- 检查文档路径正确
- 检查描述与当前仓库结构和实际能力一致

### static / mock / placeholder 部分

- 文档中显式标注未完成项

### 下一步遗留

- 需要继续固化协作流程文档
- 需要准备最终比赛提交版材料

## Phase 13：Selected Agent / @Agent 最小执行链路

### 目标

- 让自定义 Agent 从“能创建和展示”进入 TaskRun 可见执行链路

### 主要变更

- 后端 demo-task 请求支持 `selectedAgentId`
- 后端第一个 Specialist Step 支持使用 selectedAgent
- TaskStep 可记录 assignedAgentId 与 preferred / actual adapter 信息
- 前端 AgentList 支持选择 Agent
- WorkspacePage 支持传递 `selectedAgentId`
- TaskRunPanel 展示 assigned Agent、preferred adapter、actual adapter 和 fallback 状态

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 手动测试：在 `/agents` 创建自定义 Agent，回到 `/workspace` 选中该 Agent，运行 Demo Task，查看第一个 Specialist Step 的 assigned Agent 和 adapter fallback 信息

### 静态 / Mock / Placeholder 部分

- selectedAgent 当前仍只接入静态 demo-task
- 没有真实 `@Agent` 自然语言解析
- 没有真实 Codex / Claude Code / OpenCode 调用
- Adapter fallback 仍以 Mock 为主

### 遗留问题

- 还没有完整 `@Agent` 路由
- 还没有自定义 Agent 多轮上下文
- 还没有真实外部 Agent 调用

### 下一步建议

- 补充 Selected Agent / `@Agent` 在会话消息入口的最小指定体验
- 让自定义 Agent 的 `preferredAdapterType` 进一步影响执行策略
- 继续强化 Orchestrator 对任务拆解、Agent 路由和 fallback 的显式化展示

## Phase 14：ChatInput 显式指定 Agent 与最小 @Agent 标记展示

### 目标

- 让 selectedAgent 从 Workspace banner 进一步进入消息发送入口和消息展示

### 主要变更

- Message 支持 `targetAgentId`
- SendMessageRequest 支持 `targetAgentId`
- ChatInput 展示 `@Agent` token
- WorkspacePage 发送消息时传 selectedAgentId
- MessageBubble 展示 `To: @AgentName`

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 手动测试：在 `/workspace` 选中自定义 Agent，发送消息后查看消息气泡中的 `To: @AgentName`，再运行 Demo Task 检查 selectedAgent 链路保持正常

### 静态 / Mock / Placeholder 部分

- 本轮只做显式 selectedAgent，不做自然语言 `@Agent` 解析
- 不支持多个 Agent 同时被 `@`
- 不触发真实外部 Agent 调用
- Adapter fallback 仍以 Mock 为主

### 遗留问题

- 还没有完整自然语言 `@Agent` 解析
- 还没有多 Agent 群聊调度
- `targetAgentId` 还没有进入所有任务类型
- 没有真实外部 Agent 调用

### 下一步建议

- 让 selectedAgent / `targetAgentId` 进入更多任务触发入口
- 继续推进最小 `@Agent` 指定语法与后端解析规则
- 在不破坏稳定 Demo 的前提下，逐步接近真实多 Agent 路由

## Phase 15：Message targetAgentId 到 Orchestrator selectedAgent 推断

### 目标

- 让消息层的 `targetAgentId` 不只用于展示，也能被 Orchestrator 用于推断任务目标 Agent

### 主要变更

- Orchestrator 在 `selectedAgentId` 为空时，支持从 source message 的 `targetAgentId` 推断 selectedAgent
- MessageApplicationService 补充 message 查询能力，供 Orchestrator 读取 source message
- demo-task 的第一个 specialist step、resultSummary、ContextSnapshot、HandoffSummary 会记录 selectedAgent 的推断来源

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 手动测试：先发送带 `targetAgentId` 的消息，再在不显式传 `selectedAgentId` 的情况下运行 demo-task，检查第一个 step 的 assigned agent 与上下文说明

### 静态 / Mock / Placeholder 部分

- 仍不做自然语言 `@Agent` 解析
- 仍不支持多个 `@Agent`
- 仍不接真实外部 Agent
- demo-task 仍是静态 Demo

### 遗留问题

- 多 Agent 群聊调度未完成
- 真实 Agent Adapter 未完成
- 多轮上下文推断未完成

### 下一步建议

- 让前端提供一个更明确的“只依赖消息 targetAgentId 触发 demo-task”的测试入口
- 继续推进最小 `@Agent` 指定语法与后端解析规则
- 在保持稳定 Demo 的前提下，逐步收敛到更真实的 Agent 路由行为

## Phase 16：最小 @Agent 文本标记解析

### 目标

- 让用户可以通过消息开头的 `@AgentName` 显式指定目标 Agent

### 主要变更

- 新增 `@Agent` 解析工具
- WorkspacePage 在发送消息前解析开头的 `@Agent`
- ChatInput 增加 `@Agent` 使用提示
- 增加 `Unknown agent mention` 错误处理

### 验证方式

- `cd frontend && npm run build`
- 手动测试：输入 `@My Frontend Agent 帮我生成登录页面`，确认消息正文发送为清理后的内容，且 MessageBubble 继续显示 `To: @My Frontend Agent`

### 静态 / Mock / Placeholder 部分

- 仍不做多个 `@Agent`
- 仍不做复杂自然语言理解
- 仍不触发真实外部 Agent 调用
- demo-task 仍是静态 Demo

### 遗留问题

- 多 Agent 群聊调度未完成
- 多个 `@Agent` 未完成
- 真实 Agent Adapter 未完成

### 下一步建议

- 继续推进消息层 `@Agent` 指定与任务触发入口的一致性
- 让前端更明确地区分文本 `@Agent` 与左侧 selectedAgent 的当前生效来源
- 在保持稳定 Demo 的前提下，再评估是否支持更轻量的多 Agent 指定语法
