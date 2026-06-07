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

## Phase 17：课题要求对齐与 V0.5 / V0.8 文档同步

### 目标

- 将 README、产品设计文档、技术设计文档、Demo 场景文档和 Roadmap 同步到当前 MVP 演示闭环状态
- 明确区分已完成、静态 Demo、Mock、Placeholder、未完成和下一阶段

### 主要变更

- 重写 `README.md`，同步当前 MVP 演示闭环、技术栈、启动方式、Demo 主线和课题要求对齐情况
- 更新 `docs/product-design.md`，同步 IM Workspace、selectedAgent / `@Agent`、Artifact-centered iteration 和当前已实现 / 未实现边界
- 更新 `docs/technical-design.md`，同步 OrchestratorService、Message.targetAgentId 推断链路、Adapter Layer、Artifact Revision 和迁移设计
- 更新 `docs/demo-scenario.md`，整理为可直接用于 3 分钟视频的脚本草案
- 更新 `docs/roadmap.md`，切换到收敛式开发阶段视角

### 验证方式

- 本轮仅改文档，不执行前后端构建
- 逐项核对文档内容是否与当前代码状态一致
- 重点核对 selectedAgent、`@Agent`、`targetAgentId -> selectedAgent` 推断、TaskRun / Artifact / Revision / Context / Handoff 是否已在文档中正确体现

### 静态 / Mock / Placeholder 部分

- demo-task 仍是静态 Demo
- Artifact revision 仍是静态模板
- Diff Summary 仍是静态摘要
- ContextSnapshot / HandoffSummary 仍是静态构造
- Codex / Claude Code / OpenCode 仍以 Placeholder / Mock fallback 为主

### 遗留问题

- 至少两个主流 Agent 平台的真实 / 半真实接入仍未完成
- 群聊模式和多 Agent 协作语义仍未完成
- Deploy Status Card 仍未实现
- 最终文档 V1.0 和 3 分钟视频仍未完成

### 下一步建议

- 优先补两个主流平台的最小真实 / 半真实接入
- 继续增强 OrchestratorService 的规则化规划能力
- 补静态 Deploy Status Card
- 以当前文档为基础开始收敛最终视频脚本和 V1.0 交付材料

## Phase 18：Agent Adapter 半真实接入与 OpenAI Compatible 配置化调用

### 目标

- 降低 Adapter placeholder 风险，新增可配置真实模型 Adapter，同时保留 Mock fallback

### 主要变更

- 新增 `OPENAI_COMPATIBLE` adapter type
- 新增 `OpenAICompatibleAgentAdapter`
- 新增 `OpenCodeAgentAdapter` placeholder
- 为 Adapter Layer 增加 descriptor / health status
- `/api/adapters` 返回 adapter status、enabled、placeholder、failureReason
- `application.yml` 增加 OpenAI Compatible 配置结构
- 新增 `.env.example` 说明环境变量
- Agent Builder 可选择 `OPENAI_COMPATIBLE`

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 手动测试 `/api/adapters`
- 手动测试 `POST /api/adapters/MOCK/execute`
- 手动测试 `POST /api/adapters/OPENAI_COMPATIBLE/execute`

### 静态 / Mock / Placeholder 部分

- Codex / Claude Code / OpenCode 仍是 placeholder，未实现真实外部调用
- OpenAI Compatible 需要环境变量，未配置时会 fallback 到 Mock
- demo-task 的 Artifact 仍是静态生成
- 本轮不代表完整主流 Agent 平台接入完成

### 遗留问题

- 真实 Codex / Claude Code / OpenCode 接入仍未完成
- 当前只有一个可配置真实模型 Adapter 入口
- 仍未实现流式调用、真实并行调度和真实部署链路

### 下一步建议

- 优先验证一个真实可用的 OpenAI Compatible 环境配置
- 在此基础上补第二个主流平台的最小真实 / 半真实接入
- 继续增强 OrchestratorService 的规则化 planning 与任务路由解释能力

## Phase 19：Adapter 状态可视化与 OPENAI_COMPATIBLE 前端接入

### 目标

- 让已有 OPENAI_COMPATIBLE Adapter 从后端能力变成前端可见、可选择、可演示的产品能力

### 主要变更

- `getAdapters` API client
- `AdapterDescriptor` 前端类型
- Agent Builder preferred adapter 动态选项与状态展示
- AgentList / selectedAgent banner adapter health 展示
- `.env.example` / `README.md` 补充 OPENAI_COMPATIBLE 配置说明

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 手动测试 `/agents` 和 `/workspace`

### 静态 / Mock / Placeholder 部分

- Codex / Claude Code / OpenCode 仍是 placeholder，未实现真实外部调用
- OPENAI_COMPATIBLE 需要环境变量，未配置时 fallback
- demo-task Artifact 仍是静态生成
- 不代表完整主流 Agent 平台接入完成

### 遗留问题

- 真实 Codex / Claude Code / OpenCode 接入仍未完成
- OPENAI_COMPATIBLE 仍非流式
- 真实 Agent 产物尚未替代静态 Artifact

### 下一步建议

- 优先验证一个真实可用的 OPENAI_COMPATIBLE 环境
- 再补第二个主流平台的最小真实 / 半真实接入
- 继续增强 OrchestratorService 的规则化 planning 和路由解释能力

## Phase 20：前端 UI/UX 产品级打磨

### 目标

- 提升 AgentHub 三栏 IM 工作台和 Agent Builder 的产品观感，为后续完整功能展示和答辩演示打基础

### 主要变更

- 重写 `global.css` 的全局视觉基调、导航、按钮、输入框和 Agent Builder 样式
- 重写 `workspace.css` 的三栏布局、Sidebar、Message Stream、TaskRunPanel、ContextPanel、ArtifactPanel 和状态 badge 样式
- Agent Builder 增加正式配置页布局、adapter 状态卡片和 agent preview 区域
- 修正 Workspace 与 Artifact Revision 的默认演示文案，避免乱码影响演示
- 保留 selectedAgent、@Agent、adapter health、fallback、Artifact Revision、Version History、Diff Summary 等现有功能链路

### 验证方式

- `cd frontend && npm run build`
- 手动检查 `/workspace`
- 手动检查 `/agents`

### 静态 / Mock / Placeholder 部分

- 本轮只做 UI 打磨，不改变 mock / placeholder / static demo 本质
- Codex / Claude Code / OpenCode 仍是 placeholder，未实现真实外部调用
- OPENAI_COMPATIBLE 仍依赖环境变量配置，未配置时会 fallback 到 Mock
- demo-task Artifact 仍可能是静态生成

### 遗留问题

- 仍需继续补 Adapter 深度和第二个主流平台最小接入
- 仍需 OrchestratorService 规则化增强
- 仍需 Deploy Status Card
- 仍需最终 Demo 视频和文档 V1.0

### 下一步建议

- 优先补静态 Deploy Status Card，提升 3 分钟演示完整度
- 然后继续推进第二个主流 Agent 平台的最小真实 / 半真实接入
- 最后做最终 Demo 视频脚本校准和文档 V1.0 收口

## Phase 21：前端视觉设计升级与产品级 UI 打磨

### 目标

- 提升 AgentHub 前端产品感，让 Workspace、Agent Builder、Artifact Studio 更适合比赛展示

### 主要变更

- Workspace 三栏改为深色 IM Sidebar、浅色 Chat Workspace 和 Artifact Studio 检查器风格
- Sidebar 中 Conversation / Agent item 更接近联系人列表，并压缩 Agent 标签展示密度
- Message Stream、ChatInput、selectedAgent banner 和错误提示统一为现代 SaaS / IM 风格
- TaskRunPanel 通过 CSS 升级为 timeline 视觉，强化 TaskStep、assigned Agent 和 Adapter fallback 层级
- ContextPanel、ArtifactPanel、Version History、Diff Summary 统一卡片、badge、状态色和代码预览样式
- Agent Builder 保留原业务流程，增强为表单 + sticky preview 的 Agent 配置台视觉

### 验证方式

- `cd frontend && npm run build`
- 手动检查 `/workspace`
- 手动检查 `/agents`

### 静态 / Mock / Placeholder 部分

- 本轮只改视觉，不改变 mock / placeholder / static demo 本质
- Adapter 真实接入能力没有因 UI 打磨而变化
- Codex / Claude Code / OpenCode 如未真实接入，仍然不是完整真实接入
- demo-task Artifact 仍可能是静态生成

### 遗留问题

- 仍需补更完整 Adapter 接入
- 仍需 Orchestrator 规则化增强
- 仍需 Deploy Status Card
- 仍需最终 Demo 视频脚本和文档 V1.0 收口

### 下一步建议

- 先做静态 Deploy Status Card，补齐 P2 加分项可视化入口
- 再做 Demo 视频脚本与手动 smoke checklist 收敛
- 最后按演示反馈微调 Artifact Studio 和 TaskRun timeline 的信息密度

## Phase 22：Demo Checklist 补充与 CLI 探测型 Adapter

### 目标

- 补充完整 Demo 验收清单
- 将 Codex / Claude Code / OpenCode 从纯 placeholder 推进为可配置、可探测、可 fallback 的半真实 Adapter

### 主要变更

- 重写 `docs/collaboration/demo-checklist.md`，覆盖 Workspace 主链路、Artifact Revision、Agent Builder、selectedAgent、文本 @Agent、Adapter fallback、Context / Handoff、AI 协作记录和仓库卫生
- 新增 `CliAgentCommandRunner`，负责 CLI command availability detection、args-template 解析、ProcessBuilder 执行、stdout / stderr 捕获和 timeout 控制
- 新增 `CliAgentAdapterSupport`，复用 Codex / Claude Code / OpenCode 的 CLI Adapter 行为
- 升级 `CodexAgentAdapter`、`ClaudeCodeAgentAdapter`、`OpenCodeAgentAdapter` 为 CLI 探测型 Adapter
- 补充 `application.yml`、`.env.example` 和 `README.md` 中的 CLI Adapter 配置说明
- 补充 `.gitignore` 中的 `*.tsbuildinfo`，避免新的 TypeScript build cache 被误提交

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 手动测试 `/api/adapters`
- 手动测试 `POST /api/adapters/CODEX/execute`
- 手动测试 `POST /api/adapters/CLAUDE_CODE/execute`
- 手动测试 `POST /api/adapters/OPEN_CODE/execute`
- 手动检查 `docs/collaboration/demo-checklist.md`

### 静态 / Mock / Placeholder 部分

- 这仍不是完整深度 Codex / Claude Code / OpenCode 接入
- CLI 未配置、不可用、超时或执行失败时仍 fallback 到 MOCK
- demo-task Artifact 仍是静态生成
- 没有流式输出
- demo-checklist 是验收文档，不代表自动化测试

### 遗留问题

- 真实平台深度 API / CLI 参数适配仍未完成
- 真实 Agent 产物尚未替代静态 Artifact
- 未实现流式执行状态
- demo-checklist 仍需在提交前实际跑一遍

### 下一步建议

- 用一台真实安装 Codex / Claude Code / OpenCode CLI 的环境验证 args-template
- 为至少一个 CLI Adapter 沉淀推荐 args-template 示例
- 补一个静态 Deploy Status Card，增强最终 Demo 的发布闭环感

## Phase 23：静态 Deploy Status Card 与部署状态模拟

### 目标

- 补齐课题中的部署状态卡片能力，让 Artifact 支持静态部署模拟和 Preview URL 展示

### 主要变更

- 新增 `DeploymentRecord`、`DeploymentStatus`、`DeploymentRepository`
- 新增 `InMemoryDeploymentRepository`
- 新增 `DeploymentApplicationService`
- 新增 `DeploymentController`
- 新增 `POST /api/artifacts/{artifactId}/demo-deploy`
- 新增 deployment 查询接口：conversation、artifact、deploymentId 三种维度
- MessageType 新增 `DEPLOY_STATUS`，部署成功后向 Message Stream 追加部署状态消息
- 前端新增 `DeploymentRecord` 类型和 deployment API client 方法
- ArtifactPanel 增加 `Deploy Selected Artifact` 按钮和 Deploy Status Card
- WorkspacePage 集成 deployments 状态，部署后刷新 messages 和 deployments

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 手动测试 `/workspace` deploy flow

### 静态 / Mock / Placeholder 部分

- 本轮部署是 static demo simulation
- 没有真实 Vercel / Netlify / Docker / Kubernetes 部署
- Preview URL 是模拟 URL
- 不代表真实生产部署能力

### 遗留问题

- 真实部署未完成
- 构建日志未完成
- 部署失败恢复未完成
- 部署状态流式更新未完成

### 下一步建议

- 为 `/preview/{artifactId}` 增加轻量占位页面，提升 Preview URL 点击后的完整度
- 后续可补静态构建日志卡片和部署失败状态模拟
- 最终提交前把 Deploy Status Card 纳入 Demo 视频脚本

## Phase 24：Orchestrator 规则化增强与 Planner / Router / Aggregator 拆分

### 目标

- 将当前 demo-task 静态编排整理为更清晰的 Orchestrator 内部结构，让主 Agent 更符合 PM / PMO 协调器定位

### 主要变更

- 新增 `OrchestratorPlan` 和 `OrchestratorStepPlan`，用于表达应用层规则计划
- 新增 `TaskPlanner`，按规则生成 Frontend Builder、Backend Worker、Reviewer 三段式 demo plan
- 新增 `AgentRouter`，集中表达 selectedAgent 优先和默认 Agent preferredAdapter 路由策略
- 新增 `AgentStepExecutor`，集中构造 `AgentRequest`、调用 `AgentExecutorService` 并写回 TaskStep Adapter 执行字段
- 新增 `ResultAggregator`，集中生成 demo-task 的 Orchestrator 汇总信息
- 调整 `OrchestratorService`，在 demo-task 主链路中接入 plan、route、execute、aggregate 的内部阶段

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 手动测试 `/workspace` demo-task
- 手动测试 revision / deploy 不受影响

### 静态 / Mock / Placeholder 部分

- Planner 仍是规则化 planner，不是 LLM planner
- Artifact 内容仍是静态 Demo 生成
- Adapter 仍可能 fallback 到 Mock
- 当前不是完整动态 DAG 引擎

### 遗留问题

- 真实 LLM planning 未完成
- 并行调度未完成
- 代码冲突处理未完成
- 动态多 Agent 规划未完成
- Planner 规则还没有外部化为可配置策略

### 下一步建议

- 为 Orchestrator plan 增加前端可视化说明，让答辩时能直接展示 Planner / Router / Executor / Aggregator 四段结构
- 补充最小 smoke test 覆盖 demo-task、revision、deploy 三条链路
- 后续再考虑 LLM planner 或半动态 DAG，不要在当前 Demo 收敛阶段大改主链路

## Phase 25：本地 Smoke Test 与 Demo 主链路验证脚本

### 目标

- 为当前 MVP 主链路增加可重复执行的 API 级 smoke test，降低后续功能开发导致回归的风险

### 主要变更

- 新增 `scripts/smoke-test.mjs`
- 更新 `scripts/README.md`，说明运行方式和 `AGENTHUB_API_BASE_URL` 配置
- smoke test 覆盖 health、adapter、conversation、message、demo-task、task-run、artifact、revision、deployment、message stream

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 后端需要先启动

### 静态 / Mock / Placeholder 部分

- smoke test 验证的是当前 static demo / mock fallback 主链路
- 不验证真实 LLM
- 不验证真实外部 Agent
- 不验证真实部署
- 不验证浏览器 UI

### 遗留问题

- 仍缺浏览器级 E2E 测试
- 仍缺真实 Adapter 输出验证
- 仍缺真实部署可用性验证
- 仍缺 CI 环境中的自动执行配置

### 下一步建议

- 增加一个 `scripts/start-demo` 或说明文档，降低启动前后端和执行 smoke test 的手动成本
- 后续在 GitHub Actions 或本地 CI 中复用该脚本
- 为 `/preview/{artifactId}` 增加轻量页面，让 Deploy Preview URL 的手动验收更完整

## Phase 26：静态 Artifact Preview 页面与 Deploy URL 闭环

### 目标

- 补齐 Deploy Status Card 的 Preview URL 闭环，让 `/preview/:artifactId` 可以展示 Artifact 内容

### 主要变更

- 新增 `PreviewPage`
- 在 React Router 中新增 `/preview/:artifactId` 路由
- 复用 `getArtifact(artifactId)` API client 读取 Artifact
- 根据 Artifact 类型展示 code block、文本预览、review report、结构化文本或 HTML iframe
- 补充 Preview 页面样式，与当前 Workspace / Artifact Studio 风格保持一致
- 保持 Deploy Status Card 的 previewUrl 链接兼容，不改变部署创建逻辑

### 验证方式

- `cd frontend && npm run build`
- 手动打开 `/preview/{artifactId}`
- 手动从 Deploy Status Card 点击 Preview URL

### 静态 / Mock / Placeholder 部分

- 本轮是静态 Artifact 预览页，不是真实部署页面
- Preview URL 是本地模拟 URL
- 不代表真实生产部署
- 不做真实构建或公网发布

### 遗留问题

- 真实部署未完成
- 真实构建日志未完成
- 真实公网预览 URL 未完成
- Markdown 富渲染仍可后续增强
- iframe 沙箱策略仍可后续细化

### 下一步建议

- 为 Deploy Status Card 增加更明确的 `Open Preview` 按钮文案
- 为 Preview 页面增加 artifact version 切换入口
- 后续可补真实 line diff 和代码复制能力

## Phase 27：Deploy Preview 页面增强与 Artifact 版本切换

### 目标

- 增强 Deploy Status Card 的 Open Preview 体验，并让 `/preview/:artifactId` 支持 Artifact v1 / v2 版本切换

### 主要变更

- Deploy Status Card 增加 `Open Preview` 和 `Copy URL` 操作
- PreviewPage 加载当前 Artifact 后，会继续按 conversation 查询相关 Artifact
- 复用并补充 `artifactLineage` 版本链计算逻辑
- Preview 页面展示 Version Switcher，支持点击 v1 / v2 跳转对应 `/preview/{artifactId}`
- Preview 页面继续支持 code block、文本预览、review report、结构化文本和 HTML iframe

### 验证方式

- `cd frontend && npm run build`
- 手动从 Deploy Status Card 点击 Open Preview
- 手动测试 `/preview/{artifactId}`
- 手动测试 v1 / v2 切换

### 静态 / Mock / Placeholder 部分

- Preview 页面仍是本地静态 Artifact 内容展示
- Preview URL 仍是本地模拟 URL
- 不代表真实部署
- 不做真实构建或公网发布

### 遗留问题

- 真实部署未完成
- 真实构建日志未完成
- Markdown 富渲染未完成
- iframe 沙箱策略仍可增强
- Copy URL 当前失败时只通过 console.warn 提示

### 下一步建议

- 为 Preview 页面补充代码复制能力
- 为 Deploy Status Card 增加静态构建日志卡片
- 后续将 smoke test 增加 preview URL 可访问性检查

## Phase 28：Smoke Test Preview URL 自动验证

### 目标

- 将 Deploy Preview URL 可访问性纳入本地 smoke test，验证部署后 `/preview/{artifactId}` 静态预览页至少返回 HTTP 200

### 主要变更

- `scripts/smoke-test.mjs` 新增 `AGENTHUB_FRONTEND_BASE_URL` 配置，默认指向 `http://127.0.0.1:5173`
- 部署成功后从 `deployment.previewUrl` 解析完整 Preview URL
- 支持相对路径 `/preview/{artifactId}` 和完整 URL 两种形式
- 请求 Preview URL 并校验 HTTP 200，前端未启动时输出明确失败原因
- `scripts/README.md` 补充前端地址配置和 Preview URL reachability 检查说明

### 验证方式

- `node scripts/smoke-test.mjs`
- 运行前需要先启动 backend 和 frontend
- smoke test 会先验证 backend API 主链路，再验证部署后的本地 Preview URL 可访问

### 静态 / Mock / Placeholder 部分

- 本轮只验证本地静态 Preview 页面 HTTP 可达
- 不做浏览器级 E2E
- 不解析 DOM 或校验页面具体文案
- 不验证真实 LLM、真实外部 Agent 或真实部署
- Preview URL 仍是本地模拟部署预览 URL

### 遗留问题

- 仍缺浏览器级 E2E 测试
- 仍缺 Preview 页面内容断言
- 仍缺真实部署可用性验证
- 仍缺 CI 环境中的前后端联动 smoke test 配置

### 下一步建议

- 在最终提交前固定一套本地 Demo 验收命令顺序
- 后续可增加 Preview 页面内容关键词的轻量检查，但不要替代浏览器级 E2E
- 如果需要进入 CI，再增加独立的前后端启动脚本和端口等待逻辑

## Phase 29：MVP 课题要求对齐评估文档

### 目标

- 将当前 AgentHub MVP 与课题要求的对齐情况固化为仓库文档，明确已实现、部分实现、静态 Demo、半真实和未完成能力

### 主要变更

- 新增 `docs/mvp-requirements-alignment.md`
- 按 IM 聊天、Orchestrator、多 Agent 接入、Artifact、部署、多端、交付物和评分维度进行对齐
- 明确当前项目处于 MVP 功能扩展期，不急于最终 Demo 收敛
- 梳理下一阶段优先级：群聊多 Agent 最小闭环、Context pin、真实 Adapter 输出进入 Artifact、消息操作、真实 line diff

### 验证方式

- 人工检查 Markdown 表格结构
- 对照当前仓库已实现模块：Workspace、Agent Builder、Orchestrator、Adapter、Artifact、Deploy Preview、smoke test、协作文档

### 静态 / Mock / Placeholder 部分

- 文档明确区分静态 Demo、Mock fallback、CLI 探测型半真实 Adapter 和未完成能力
- 未将 Codex / Claude Code / OpenCode CLI 探测写成完整深度平台接入
- 未将静态 Deploy Preview 写成真实部署

### 遗留问题

- 技术文档和 Roadmap 仍需在后续阶段同步最新 Orchestrator / Deploy / Preview / smoke test 状态
- 群聊多 Agent、真实上下文、消息操作和真实 Adapter 输出仍是下一阶段重点缺口
- 当前评估文档是人工阶段评估，不是自动测试报告

### 下一步建议

- 优先实现群聊多 Agent 最小消息流
- 随后补 Context pin 和消息操作最小集
- 在真实 Adapter 输出能进入 Artifact 后，再更新 technical-design 和 roadmap 到下一版

## Phase 30：群聊多 Agent 最小消息流

### 目标

- 补齐课题中“群聊协作”和“Agent 依次回复”的最小可见链路，让 Run Demo Task 后 Message Stream 中出现 Orchestrator、Frontend、Backend、Reviewer 的多条 Agent 消息

### 主要变更

- 后端 demo-task 完成后追加 Orchestrator 群聊协调消息
- 后端为 Frontend / Backend / Reviewer 三个 TaskStep 追加 Agent 消息
- Specialist Agent 消息关联对应 Artifact，仍可从聊天流点击打开产物
- 前端 MessageBubble 对 AGENT 消息展示 Agent role
- smoke test 增加 group chat Agent messages 检查

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试 `/workspace`：创建会话、发送消息、运行 Demo Task，确认消息流出现多个 Agent 回复

### 静态 / Mock / Placeholder 部分

- 本轮是最小群聊消息流，不是真正并行调度
- 不支持多个自然语言 `@Agent`
- 不改变 Codex / Claude Code / OpenCode 的半真实 CLI 探测边界
- Artifact 内容仍可能来自 static demo，Adapter 不可用时仍 fallback 到 MOCK

### 遗留问题

- Conversation participants 最小模型尚未实现
- 多 Agent 动态调度未完成
- 多个 `@Agent` 群聊路由未完成
- Agent 消息和 TaskStep 仍通过文本内容弱关联，尚未引入结构化 message metadata

### 下一步建议

- 实现 Conversation participants 最小模型
- 增加手动 pin 消息作为 Context
- 再推进真实 / 半真实 Adapter 输出进入 Artifact

## Phase 31：Conversation Participants 最小模型

### 目标

- 让 Conversation 明确记录当前会话参与的 Agent，为后续真正群聊模式、多 Agent 路由和参与者管理打基础

### 主要变更

- `ConversationApplicationService` 新增 `addParticipantAgents`，可在不破坏原会话数据的前提下合并参与 Agent
- demo-task 编排完成路由后，将 Orchestrator、Frontend、Backend、Reviewer 以及被 selectedAgent 替换的自定义 Agent 写入 Conversation participants
- Workspace 会话头部展示当前参与 Agent pill，显示 Agent 名称和角色
- Run Demo Task 后前端刷新当前 Conversation，确保 participantAgentIds 能及时反映后端更新
- smoke test 增加 Conversation participants 初始化和查询校验

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试 `/workspace`：创建 GROUP 会话后查看参与 Agent，运行 Demo Task 后确认会话参与者仍正常展示

### 静态 / Mock / Placeholder 部分

- 本轮只补 Conversation participants 元数据，不实现完整参与者管理 UI
- 不支持多个自然语言 `@Agent`
- 不实现真正并行调度或动态群聊路由
- Adapter fallback、static demo Artifact、Deploy Preview 的边界保持不变

### 遗留问题

- 还没有手动添加 / 移除会话参与 Agent
- 还没有 Conversation participants 与多个 `@Agent` 的群聊调度闭环
- 参与者数据仍使用内存 Repository，刷新后不会持久化
- Agent 消息与 TaskStep 的结构化 metadata 仍可继续增强

### 下一步建议

- 推进 P0-3：手动 pin 消息作为 Context
- 随后补消息操作最小集，例如引用消息、复制内容、基于消息重新运行 Demo Task
- 再推进真实 / 半真实 Adapter 输出进入 Artifact

## Phase 32：手动 Pin 消息作为 Context

### 目标

- 将上下文管理从静态 ContextSnapshot 展示推进到用户可操作能力，让用户可以把聊天消息固定为长期上下文，并让后续 Demo Task 引用这些 pinned messages

### 主要变更

- `ContextRepository` / `InMemoryContextRepository` 增加 `PinnedContext` 保存、查询、按 source 去重和删除能力
- `ContextApplicationService` 增加 pin message、unpin context、list pinned contexts 的应用服务能力
- `ContextController` 新增 pinned context API：
  - `GET /api/conversations/{conversationId}/pinned-contexts`
  - `POST /api/conversations/{conversationId}/messages/{messageId}/pin`
  - `DELETE /api/pinned-contexts/{pinnedContextId}`
- Orchestrator demo-task 会读取当前会话 pinned contexts，并写入第一个 TaskStep 的 `inputContext` 和 `ContextSnapshot.pinnedContextItems`
- 前端 MessageBubble 增加“固定到 Context / 已固定到 Context”操作
- Workspace 加载并维护 pinned contexts，ContextPanel 增加“手动固定上下文”区域
- smoke test 增加 pin message、pinned context 查询、TaskStep inputContext 和 ContextSnapshot pinned items 校验

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试 `/workspace`：发送消息后点击固定到 Context，再运行 Demo Task，确认 ContextPanel 和 TaskStep inputContext 能看到 pinned message

### 静态 / Mock / Placeholder 部分

- 本轮只实现手动 pin 消息的最小闭环，不实现复杂自动上下文选择
- pinned context 仍存放在内存 Repository，刷新后不持久化
- Orchestrator 仍是规则化 demo-task，不是真实 LLM context reasoning
- Adapter fallback、静态 Artifact、静态 Deploy Preview 边界不变

### 遗留问题

- 还没有 pin Artifact、pin 文档段落或 pin 代码片段
- 还没有 Context 权重、过期策略或 token budget 管理
- 还没有把 pinned contexts 接入真实外部 Agent 调用的上下文窗口
- 还没有浏览器级 E2E 覆盖 Pin / Unpin 交互

### 下一步建议

- 推进 P0-4：真实 / 半真实 Adapter 输出进入 Artifact
- 或先做 P0-5 的消息操作最小集：复制、引用、基于消息重新运行 Demo Task
- 后续再将 pinned context 与多个 `@Agent` 群聊路由联动

## Phase 33：Adapter 成功输出进入 Artifact

### 目标

- 降低“Adapter 只是状态展示”的风险，让真实 / 半真实 Adapter 在成功执行且未 fallback 时，其响应内容能够沉淀为可见 Artifact

### 主要变更

- `AgentStepExecutor` 在 Adapter 响应满足以下条件时自动创建 Adapter Output Artifact：
  - `status = COMPLETED`
  - `fallbackUsed = false`
  - `actualAdapterType != MOCK`
  - `content` 非空
- Adapter Output Artifact 使用 Markdown 内容保存，包含 Agent、TaskStep、Preferred Adapter、Actual Adapter、Status 和完整 response
- Adapter Output Artifact 会追加到对应 TaskStep 的 `producedArtifactIds`
- demo-task 的 Artifact 汇总改为从 `ArtifactRepository.findByTaskRunId` 读取，确保真实 / 半真实 Adapter 产物进入 TaskRun 汇总和 ContextSnapshot
- demo-task 追加 Adapter Output 的 Artifact Card 消息，让 Message Stream 能看到该产物
- smoke test 增加条件校验：如果存在非 MOCK 成功 step，则必须存在对应 Adapter Output Artifact
- `scripts/README.md` 补充 Adapter Output Artifact 条件校验说明

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node scripts/smoke-test.mjs`
- 默认未配置 Adapter 场景：全部 fallback / MOCK，smoke test 通过，Artifact 数量保持静态 Demo 路径
- 临时配置 CODEX CLI 探测场景：
  - `AGENTHUB_CODEX_ENABLED=true`
  - `AGENTHUB_CODEX_COMMAND=cmd`
  - `AGENTHUB_CODEX_ARGS_TEMPLATE=/c echo Codex adapter output from {taskDescription}`
  - smoke test 显示 `CODEX=AVAILABLE`
  - Artifact 数量从 4 增加到 5
  - smoke test 输出 `adapter output artifacts loaded: 1`

### 静态 / Mock / Placeholder 部分

- 默认环境下 Codex / Claude Code / OpenCode 仍可能是 DISABLED 或 MISCONFIGURED
- 未配置或执行失败时仍 fallback 到 MOCK，不创建虚假的 Adapter Output Artifact
- 这不是完整真实平台深度接入，只是把成功的半真实 Adapter response 落入 Artifact 链路
- demo-task 其他静态 Artifact 仍然保留

### 遗留问题

- Adapter Output Artifact 目前按 Markdown / Review Report 保存，尚未根据 response 自动生成 CODE / API_CONTRACT 等类型
- 真实 Adapter 输出尚未替代静态 LoginPage / README / API Contract
- 没有对真实 Adapter response 做结构化解析或质量校验
- 没有在前端单独突出“该产物来自真实 / 半真实 Adapter”

### 下一步建议

- 推进 P0-5：消息操作最小集，包括复制、引用、基于消息重新运行 Demo Task
- 或继续增强 Adapter Output：让 OPENAI_COMPATIBLE 成功输出能按 prompt 类型生成 Review Report / Markdown / Code Artifact
- 后续再补真实 line diff，让 Artifact Revision 更可信

## Phase 34：消息操作最小集

### 目标

- 补齐 IM 核心体验中的基础消息操作，让用户可以复制消息、引用消息，并基于某条用户消息重新运行 Demo Task

### 主要变更

- `MessageBubble` 增加消息操作区：
  - 复制消息
  - 引用消息
  - 用户消息可重新运行 Demo Task
  - 保留 Pin / Unpin Context 操作
- `MessageStream` 透传复制、引用、重新运行事件，并支持当前重跑消息的 loading 状态
- `WorkspacePage` 增加：
  - Clipboard 复制及 textarea fallback
  - quoted message 状态和 ChatInput 引用预览
  - 发送时将引用消息写入正文，避免新增后端消息模型
  - 基于指定 Message 调用现有 `createDemoTask` 的重新运行逻辑
- `ChatInput` 展示引用预览并支持取消引用
- `workspace.css` 补充消息操作按钮、引用预览和操作提示样式
- `scripts/smoke-test.mjs` 增加基于同一条消息再次运行 demo-task 的 API 验证
- `scripts/README.md` 补充 message-based demo task rerun 覆盖说明

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试 `/workspace`：
  - 点击消息“复制”，确认消息内容进入剪贴板
  - 点击消息“引用”，确认 ChatInput 出现引用预览
  - 发送引用消息，确认消息正文包含引用内容
  - 对用户消息点击“重新运行 Demo Task”，确认 TaskRun / Artifact / Context 正常刷新

### 静态 / Mock / Placeholder 部分

- 本轮不新增后端消息引用模型，引用内容以文本方式写入下一条消息正文
- 复制和引用是前端交互，API smoke test 不验证浏览器剪贴板或 DOM 行为
- 重新运行 Demo Task 复用现有 demo-task 静态 / mock / fallback 链路
- 不改变真实 Adapter、Artifact Revision、Deploy Preview 的能力边界

### 遗留问题

- 还没有结构化 quotedMessageId 字段
- 还没有“重新生成 Agent 回复”或按 TaskStep 重跑
- 还没有一键应用 Diff
- 还没有浏览器级 E2E 覆盖消息操作

### 下一步建议

- 推进 P1：真实 line diff 轻量版，提升 Revision / Diff Summary 可信度
- 或继续补消息操作：复制代码块、一键应用 Diff、按引用消息生成局部修改任务
- 后续可将引用消息升级为后端结构化关系，便于 Orchestrator 精准读取上下文

## Phase 35：轻量真实 Line Diff 与 Diff Summary 增强

### 目标

- 将 Artifact Revision 的 Diff Summary 从静态文案升级为基于父级 Artifact 和当前 Artifact 内容的轻量行级 diff，提高产物二次修改的可信度

### 主要变更

- `artifactLineage.ts` 增加轻量 LCS 行级 diff：
  - 读取 `parentArtifactId` 找到父级 Artifact
  - 对比父级 `content` 和当前 Artifact `content`
  - 生成 added / removed / context 行
  - 统计新增行、删除行、未变行和估算修改块
- `DiffSummaryPanel` 展示真实行级 diff：
  - 行级统计
  - 变更项
  - 未变更项
  - 暗色 diff viewer
  - 新增 / 删除 / context 行号
- `workspace.css` 增加 line diff viewer、统计 badge、added / removed 行样式
- 保留 Version History / Revision / Deploy Preview / Artifact Studio 原有交互

### 验证方式

- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试建议：
  - 在 `/workspace` 运行 Demo Task
  - 选择 `LoginPage.tsx`
  - 执行 Artifact Revision
  - 选择 v2，查看 Diff Summary 是否展示真实行级统计和 diff 行

### 静态 / Mock / Placeholder 部分

- 本轮实现的是前端轻量行级 diff，不是 AST diff、语义 diff 或冲突合并
- Revision 产物内容仍可能来自 static demo
- 不引入 Monaco Editor、Markdown 渲染库或真实代码编辑器
- 不改变后端 Artifact Revision 生成逻辑

### 遗留问题

- 还没有语义级代码变更解释
- 还没有一键应用 Diff
- 还没有冲突检测 / merge 策略
- 大文件 diff 目前只做前端轻量计算和截断展示

### 下一步建议

- 增加 Artifact 代码复制 / 下载能力
- 或继续做 Orchestrator 可解释面板，展示 Planner / Router / Executor / Aggregator 决策链
- 后续可将 line diff 结果沉淀为后端结构化 Diff Artifact

## Phase 36：Artifact 内容复制与文件下载

### 目标

- 提升 Artifact Studio 可用性，让用户可以直接复制当前 Artifact 内容或下载当前 Artifact 文件，补齐产物操作的基础能力

### 主要变更

- `ArtifactPanel` 新增 Artifact 操作区：
  - 复制内容
  - 下载文件
  - 操作结果提示
- 复制逻辑复用 Clipboard API，并提供隐藏 textarea fallback，避免不支持 Clipboard API 时直接失败
- 下载逻辑使用浏览器 Blob / Object URL 本地生成文件，不新增后端接口
- 下载文件名根据 Artifact title 和 version 生成，例如 `LoginPage-v2.tsx`
- 文件扩展名根据 Artifact language / type 推断：
  - CODE 使用 `tsx` / `ts` / `js` / `css` 等 language
  - MARKDOWN / REVIEW_REPORT 使用 `md`
  - API_CONTRACT / DATA_MODEL 使用 `json`
  - WEB_PREVIEW 使用 `html`
  - 其他类型降级为 `txt`
- `workspace.css` 增加 Artifact 操作区、按钮和操作提示样式

### 验证方式

- `cd frontend && npm run build`
- 手动测试建议：
  - 在 `/workspace` 运行 Demo Task
  - 选择 `LoginPage.tsx`
  - 点击“复制内容”，确认代码内容进入剪贴板
  - 点击“下载文件”，确认浏览器下载 `LoginPage-v1.tsx` 或对应版本文件
  - 对 README / Review Report / API Contract 产物重复验证

### 静态 / Mock / Placeholder 部分

- 本轮只做前端本地复制和下载，不新增后端文件存储或真实附件服务
- 下载内容来自当前 Artifact `content`
- 不实现源码打包下载、目录结构下载或真实构建产物下载
- 不改变 Artifact Revision、Deploy Preview、Adapter fallback 的能力边界

### 遗留问题

- 还没有批量下载多个 Artifact
- 还没有源码 zip 打包
- 还没有文件附件上传 / 下载模型
- 还没有代码块级复制按钮

### 下一步建议

- 推进 Orchestrator 可解释面板，增强答辩时对 Planner / Router / Executor / Aggregator 的解释力
- 或继续补消息操作：一键应用 Diff、按引用消息生成局部修改任务

## Phase 37：群聊多 Agent 消息流与手动 Pin Context 完善

### 目标

- 将已有群聊 Agent 消息和手动 Pin Context 链路从“可用”补强到“可验收、可解释、可展示”
- 让 Demo Task 后的 MessageStream 更明确呈现 Orchestrator / Frontend / Backend / Reviewer 多 Agent 依次回复
- 让手动固定消息更清楚地进入 ContextPanel、TaskStep inputContext 和 ContextSnapshot

### 主要变更

- `OrchestratorService` 补强 demo-task 群聊消息：
  - 保留 Orchestrator 启动消息
  - Frontend / Backend / Reviewer 消息补充 TaskStep、assignedAgentId、Artifact 和 Adapter fallback 信息
  - 新增 Orchestrator 聚合总结消息，说明产物数量、selectedAgent 来源和 fallback 汇总
- `MessageStream` / `MessageBubble` 展示增强：
  - 为内置 Agent 补充名称和角色兜底映射
  - 从 Agent 消息内容中识别 TaskStep 标签
  - Pin 按钮显示“已固定 / 取消固定”状态
- `ContextPanel` 展示增强：
  - 手动固定上下文改为独立列表卡片
  - 展示 sourceType、sourceId、createdAt 和 content snapshot
  - ContextSnapshot 无 pinned items 时显示明确空状态
- `scripts/smoke-test.mjs` 强化断言：
  - 校验 Orchestrator / Frontend / Backend / Reviewer Agent 消息
  - 校验 Orchestrator 汇总消息
  - 校验 pinned context 进入 ContextSnapshot pinned items 或 includedMessageIds

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动测试建议：
  - 打开 `/workspace`
  - 创建 Demo Conversation
  - 发送消息并运行 Demo Task
  - 检查 MessageStream 是否出现 Orchestrator / Frontend / Backend / Reviewer 多条 Agent 回复
  - Pin 一条消息后再次运行 Demo Task
  - 检查 ContextPanel、TaskStep inputContext 和 ContextSnapshot 是否体现 pinned context

### 静态 / Mock / Placeholder 部分

- 本轮仍不是完整真实并行多 Agent 调度
- Planner 仍是规则化，不是 LLM planner
- Adapter 仍可能 fallback 到 MOCK
- Pin Context 是最小用户可操作上下文，不是完整长期记忆系统
- smoke test 仍是 API 级验证，不是浏览器 E2E

### 遗留问题

- 多个 `@Agent` 群聊调度仍未完成
- Agent 回复仍由 demo-task 静态编排追加，不是实时流式生成
- Context pin 还没有结构化 quotedMessageId / message reference 模型
- 还没有基于 pinned context 的真实 LLM 推理

### 下一步建议

- 推进 Orchestrator 可解释面板，展示 Planner / Router / Executor / Aggregator 决策链
- 或继续补消息操作：一键应用 Diff、按引用消息生成局部修改任务
- 后续可将 pinned context 升级为更结构化的 ContextItem 模型

## Phase 38：Orchestrator 可解释面板

### 目标

- 在 Workspace 的 TaskRunPanel 中直接展示 Planner / Router / Executor / Aggregator 决策链
- 提升答辩时对主 Agent Orchestrator 的解释力，让规则化编排不只停留在后端代码和日志中

### 主要变更

- `TaskRunPanel` 新增 Orchestrator 决策链面板：
  - Planner：展示任务目标、TaskStep 数量、预期产物和 required skills
  - Router：展示每个 Step 路由到的 Agent 和 preferred Adapter
  - Executor：展示执行 Step 数量、actual Adapter 和 fallback 数量
  - Aggregator：展示 TaskRun resultSummary 和产物数量
- `workspace.css` 增加可解释面板样式：
  - stage card
  - route item
  - mode pill
  - Adapter / fallback chip
- 本轮复用现有 TaskRun / TaskSpec / TaskStep / Artifact 字段派生说明，不新增后端 API 或领域模型

### 验证方式

- `cd frontend && npm run build`
- 手动测试建议：
  - 打开 `/workspace`
  - 运行 Demo Task
  - 在 TaskRunPanel 中检查 Orchestrator 决策链是否展示 Planner / Router / Executor / Aggregator
  - 检查 selectedAgent、Adapter fallback、Artifact Revision、Deploy Preview 不受影响

### 静态 / Mock / Placeholder 部分

- 本轮只是前端可解释展示，不改变 Orchestrator 实际执行能力
- Planner 仍是规则化，不是 LLM planner
- Router / Executor / Aggregator 的展示由现有 TaskRun 数据派生
- Adapter 仍可能 fallback 到 MOCK
- 不是动态 DAG、并行调度或真实 Agent 流式执行

### 遗留问题

- 还没有后端结构化 OrchestratorDecision DTO
- 还没有展示 Planner 规则命中的具体关键词
- 还没有展示多 Agent 并行调度或失败恢复树
- 还没有将可解释信息纳入 smoke test

### 下一步建议

- 将 Orchestrator 决策链补充到 technical-design / demo-checklist
- 或继续实现 Adapter 成功输出进入更真实的 Artifact 编辑链路
- 后续可新增后端结构化 decision trace，替代前端派生展示

## Phase 39：多 @Agent、并行计划字段、Planner fallback 与长期记忆 MVP

### 目标

- 将单目标 Agent 消息扩展为多个 `@Agent` 的最小闭环
- 为后续并行多 Agent 调度增加计划字段和前端可解释展示基础
- 增加可配置 LLM Planner 入口，同时保持规则化 Planner fallback
- 从 pinned message 扩展出最小长期记忆 MemoryItem / Memory API / ContextPanel 展示

### 主要变更

- `Message` / `SendMessageRequest` 新增 `mentionedAgentIds`，保留 `targetAgentId` 兼容旧流程
- `parseLeadingAgentMention` 支持消息开头连续多个 `@AgentName`
- `MessageBubble` 支持多 Agent 目标展示，并增加“保存为记忆”操作
- `OrchestratorService` 在无显式 selectedAgentId 时优先从 `mentionedAgentIds` 推断 selectedAgent，并把 mentioned agents 加入会话参与者
- `OrchestratorPlan` / `OrchestratorStepPlan` 增加 parallel group、dependsOn 和 routing reason 等计划字段
- `TaskPlanner` 增加 planner 配置读取：
  - `agenthub.orchestrator.planner.type`
  - `agenthub.orchestrator.planner.fallback-to-rule-based`
  - 当前 LLM 配置会进入 `RULE_BASED_FALLBACK`，不破坏无 API key Demo
- 新增 `MemoryItem`、`MemoryRepository`、`MemoryApplicationService`、`MemoryController`
- `ContextPanel` 增加“长期记忆”区，Workspace 加载 conversation memories
- smoke test 增加多 @Agent、memory save/list、memory 注入 TaskStep inputContext 的验证

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 启动后端时设置 `AGENTHUB_PLANNER_TYPE=LLM` 且不配置 OpenAI，执行 `node scripts/smoke-test.mjs` 验证 `RULE_BASED_FALLBACK`

### 静态 / Mock / Placeholder 部分

- 并行多 Agent 当前是计划字段和可解释展示基础，不是真实线程级并发 DAG
- LLM Planner 当前是可配置入口和规则 fallback，不会在无配置时调用真实模型
- MemoryItem 使用内存 Repository，不是持久化长期记忆系统
- 不使用 embedding / vector database
- Adapter 仍可能 fallback 到 MOCK

### 遗留问题

- 还没有真正基于 `parallelGroupKey` 做线程级并行执行
- 还没有严格 JSON schema 的真实 LLM Planner 输出校验
- MemoryItem 还没有 MySQL 持久化、跨会话全局检索或向量召回
- 多 `@Agent` 仍只支持消息开头连续 @，不解析消息中间自然语言 @

### 下一步建议

- 将真实并行执行限定在 AgentStepExecutor 层，用 `CompletableFuture` 执行同组 step，并保持 Mock fallback
- 或先补 LLM Planner JSON schema validator，让 OPENAI_COMPATIBLE 可真正生成 OrchestratorPlan
- 后续再把 MemoryItem 持久化到数据库并引入可控检索策略

## Phase 40：课题对齐评估与下一阶段 P0/P1/P2 路线同步

### 目标

- 基于当前 AgentHub MVP 实际能力，重新对齐比赛课题要求
- 明确已实现、部分满足、静态 Demo / 半真实、未完成能力
- 将下一阶段 P0 / P1 / P2 开发计划同步到项目文档，避免后续开发方向发散

### 主要变更

- `docs/mvp-requirements-alignment.md` 更新为当前 MVP 功能扩展期评估：
  - IM Workspace
  - 多 @Agent
  - 群聊式 Agent 消息
  - Context / Memory
  - Orchestrator 可解释面板
  - Adapter fallback
  - Artifact Revision / Deploy Preview
  - smoke test
- `docs/roadmap.md` 更新为下一阶段 P0 / P1 / P2 路线：
  - P0：真实并行多 Agent 调度、LLM Planner JSON Schema、MemoryItem 持久化、Adapter 输出 Artifact 增强、文档同步、仓库卫生
  - P1：消息操作深化、一键应用 Diff、Orchestrator Decision DTO、Adapter 测试面板、smoke test 扩展
  - P2：MySQL、SSE / WebSocket、真实部署、附件、多端、动态 DAG
- `docs/technical-design.md` 同步最新架构状态：
  - `mentionedAgentIds`
  - parallel group 字段
  - CLI 探测型 Adapter
  - OpenAI Compatible Adapter
  - Pinned Context / MemoryItem
  - LLM Planner 迁移设计
- `docs/collaboration/demo-checklist.md` 增加多 @Agent、群聊消息、Memory、Orchestrator 可解释面板和 smoke test 验收项
- `README.md` 补充当前能力、边界和下一阶段 Roadmap 指向

### 验证方式

- 文档路径检查：
  - `README.md`
  - `docs/mvp-requirements-alignment.md`
  - `docs/roadmap.md`
  - `docs/technical-design.md`
  - `docs/collaboration/demo-checklist.md`
- 建议继续执行：
  - `cd backend && mvn -q -DskipTests package`
  - `cd frontend && npm run build`
  - `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是课题对齐和路线同步，不新增业务能力
- 当前并行调度仍是计划字段和展示基础，不是真实线程级并发
- LLM Planner 当前仍是配置入口和规则 fallback，不是真实模型规划主链路
- MemoryItem 仍是内存 Repository，不是持久化长期记忆系统
- Deploy Preview 仍是静态本地模拟，不是真实部署
- CLI 探测型 Adapter 不等于 Codex / Claude Code / OpenCode 深度平台接入完成

### 遗留问题

- 真实并行多 Agent 调度未完成
- LLM Planner JSON schema 校验未完成
- MemoryItem 持久化与检索策略未完成
- Adapter 成功输出 Artifact 质量仍需增强
- README / 技术文档仍需在最终提交前继续整理为 V1.0

### 下一步建议

- 先完成仓库卫生与提交前检查，尤其清理被 Git 跟踪的 `frontend/tsconfig.app.tsbuildinfo`
- 下一轮优先做真实并行多 Agent 调度 v1，将 `parallelGroupKey` 从展示字段推进到执行层
- 随后推进 LLM Planner JSON Schema MVP，并保留 RuleBasedPlanner fallback

## Phase 41：真实并行多 Agent 调度 v1

### 目标

- 将 `parallelGroupKey` / `dependsOnStepOrders` 从展示字段推进到 demo-task Agent Step 执行层
- 让同一 parallel group 的 Step 使用 `CompletableFuture` 并发执行，同时保留依赖顺序和 Adapter fallback

### 主要变更

- `TaskPlanner` 增强并行计划：
  - 默认 Demo 仍保留 Frontend -> Backend -> Reviewer 的依赖语义
  - 多 `@Agent` 场景下将 Frontend / Reviewer 放入 `MENTIONED_AGENT_GROUP`
  - Backend Step 继续依赖 Frontend Step
- `OrchestratorService` 新增 Agent Step 并发调度：
  - 将 Step 构造成 `StepExecutionCommand`
  - 按 `dependsOnStepOrders` 等待依赖
  - 无依赖或同组 Step 使用 `CompletableFuture` 并发执行
  - 执行完成后按 `stepOrder` 还原 TaskRun 展示顺序
- `AgentStepExecutor` 将 parallel group、dependsOn 和 routing reason 写入 Adapter metadata 和 TaskStep output
- `TaskRunPanel` 增加并行执行组展示：
  - 显示 `后端 CompletableFuture 并发执行`
  - 展示 parallel group 中包含哪些 Step
  - Router 区域展示 dependsOn 信息
- `scripts/smoke-test.mjs` 增加并行组断言：
  - 多 @Agent demo-task 至少存在一个包含多个 Step 的 parallel group
  - 至少一个 Step 声明 `dependsOnStepOrders`

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是真实执行层并发，但范围限定在 demo-task Agent Step
- 不是完整动态 DAG 引擎
- 不实现 WebSocket / SSE 流式状态
- Adapter 仍可能 fallback 到 MOCK
- Artifact 内容仍以现有静态 Demo 产物为主

### 遗留问题

- 还没有任务级失败恢复树
- 还没有并发执行耗时、开始时间、结束时间等结构化指标
- 还没有动态 DAG UI
- 还没有 LLM Planner 生成并行计划

### 下一步建议

- 推进 P0-2：LLM Planner JSON Schema MVP
- 让 OPENAI_COMPATIBLE 在配置可用时生成 OrchestratorPlan，并在 schema 校验失败时回退 RuleBasedPlanner

## Phase 42：LLM Planner JSON Schema MVP

### 目标

- 让 Orchestrator 可以通过 `OPENAI_COMPATIBLE` 可选生成 `OrchestratorPlan`
- 对 LLM Planner 输出做最小 JSON schema 校验，并在不可用、fallback、超时或输出不合规时回退 RuleBasedPlanner
- 在 TaskRun summary 和 Orchestrator 可解释面板中展示 planner mode 与 fallback reason

### 主要变更

- `TaskPlanner` 增加 LLM planner 分支：
  - 读取 `agenthub.orchestrator.planner.type`
  - `LLM` 模式下调用 `OPENAI_COMPATIBLE`
  - 要求返回 JSON object
  - 校验 `goal`、`steps`、`FRONTEND / BACKEND / REVIEWER` 三类 role、`stepOrder`、`taskDescription`、`requiredSkill`
  - 支持 `parallelGroupKey`、`dependsOnStepOrders`、`routingReason`
- `TaskPlanner` 保留 RuleBasedPlanner 作为稳定默认路径
- `ResultAggregator` 将 `plannerReasoningSummary` 和 `fallbackReason` 写入 resultSummary
- `TaskRunPanel` 识别 `LLM_PLANNER`、`RULE_BASED_FALLBACK` 和规则化 Planner，并展示 fallback reason
- `.env.example` 增加：
  - `AGENTHUB_PLANNER_TYPE`
  - `AGENTHUB_PLANNER_FALLBACK_TO_RULE_BASED`
- `scripts/smoke-test.mjs` 增加 planner mode 可见性断言
- `README.md`、`docs/technical-design.md`、`docs/roadmap.md`、`docs/mvp-requirements-alignment.md` 同步 P0-2 状态

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 启动后端时设置 `AGENTHUB_PLANNER_TYPE=LLM` 且不配置 OpenAI，执行 `node scripts/smoke-test.mjs` 验证 `RULE_BASED_FALLBACK`

### 静态 / Mock / Placeholder 部分

- 默认 planner 仍是 `RULE_BASED`
- LLM Planner 需要显式配置 `AGENTHUB_PLANNER_TYPE=LLM`
- LLM Planner 依赖 `OPENAI_COMPATIBLE` Adapter 可用，不提交任何 API key
- LLM Planner 只生成计划，不直接生成最终代码 / 文档 Artifact
- 模型不可用、Adapter fallback 或 JSON schema 不合规时默认回退规则 Planner
- 这不是完整动态 DAG 引擎，也不是生产级真实多 Agent planning

### 遗留问题

- 还没有更完整的 JSON Schema 库级校验
- 还没有后端结构化 Orchestrator Decision DTO
- 还没有将 LLM Planner 产物质量接入真实 Artifact 生成
- 还没有真实多轮计划修正和任务级失败恢复树

### 下一步建议

- 推进 P0-3：MemoryItem 持久化与检索策略
- 推进 P0-4：Adapter 成功输出进入真实 Artifact 链路增强
- 后续可补 Orchestrator Decision DTO，让前端解释面板不再依赖 resultSummary 文本解析

## Phase 43：MemoryItem 本地持久化与规则检索策略

### 目标

- 将 MemoryItem 从纯内存 MVP 推进到可重启保留的本地持久化能力
- 增加按 scope / category / importance / lastUsedAt 的规则检索，让长期记忆更稳定地进入 Orchestrator inputContext

### 主要变更

- `MemoryItem` 增加不可变更新方法：
  - `withUpdatedFields`
  - `withLastUsedAt`
- `MemoryRepository` 增加：
  - `findRelevantForConversation`
  - `markUsed`
- `InMemoryMemoryRepository` 增加本地 JSON 文件持久化：
  - 默认路径 `backend/.agenthub/memories.json`
  - 启动时加载已有 memory
  - save / update / delete / markUsed 后写回文件
- `MemoryApplicationService` 增强：
  - 支持 scope / category / importance / content 更新
  - 支持 relevant memories 检索
  - 支持 used memory 的 `lastUsedAt` 更新
- `MemoryController` 增加：
  - `GET /api/conversations/{conversationId}/memories/relevant?limit=`
  - `SaveMemoryRequest` / `UpdateMemoryRequest` 支持 scope、importance、content
- `OrchestratorService` 改为使用 relevant memories，并将使用过的 memory 标记为 used
- `ContextPanel` 展示 memory scope 和 lastUsedAt
- `scripts/smoke-test.mjs` 增加 memory update、relevant retrieval、inputContext 内容断言
- `.env.example` 增加 Memory 持久化和检索配置
- `.gitignore` 忽略 `backend/.agenthub/`
- README、technical-design、roadmap、mvp-requirements-alignment 同步当前状态

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 重启 backend 后查询 smoke test 创建的 conversation memories，确认 memory 从本地文件重新加载

### 静态 / Mock / Placeholder 部分

- 本轮持久化是本地 JSON 文件，不是 MySQL
- 本轮检索是规则排序，不是 embedding / vector database
- MemoryItem 仍不是完整长期记忆治理系统
- 没有跨设备同步、权限治理、隐私脱敏或自动摘要压缩

### 遗留问题

- 仍需生产级持久化方案，例如 MySQL 或其他数据库
- 仍需更完整的 MemoryPolicy 和自动摘要 / 去重策略
- 仍需按 Agent scope 和 global scope 做更完整 UI 管理
- 仍需 smoke test 覆盖 delete 后重启不恢复的场景

### 下一步建议

- 推进 P0-4：Adapter 成功输出进入真实 Artifact 链路增强
- 后续补 Memory 管理 UI，支持编辑 category / scope / importance 和删除

## Phase 44：Adapter 成功输出进入 Artifact 链路增强

### 目标

- 降低“Adapter 只是状态展示”的风险
- 让非 MOCK Adapter 的成功输出稳定进入 Artifact、MessageStream、ContextSnapshot 和 TaskRun summary
- 保持 Mock fallback 稳定，不伪造真实平台输出

### 主要变更

- `AgentStepExecutor` 保留 Adapter Output Artifact 创建条件：
  - `status = COMPLETED`
  - `fallbackUsed = false`
  - `actualAdapterType != MOCK`
  - `content` 非空
- `AgentStepExecutor` 增强 Adapter Output Artifact 内容，明确说明：
  - artifact 因 actual adapter completed without MOCK fallback 才持久化
  - preferred / actual adapter
  - TaskStep 和原始 response
- `ResultAggregator` 在 TaskRun summary 中统计真实 / 半真实 Adapter 输出产物数量
- `OrchestratorService` 增强 demo-task 汇总链路：
  - Adapter Output Artifact 进入 ContextSnapshot artifactIds
  - Adapter Output Artifact 进入 pinned context items
  - ContextSnapshot summary 说明 Adapter 输出产物数量
  - MessageStream 增加更清晰的 Adapter Output Artifact card 文案
- `scripts/smoke-test.mjs` 增强断言：
  - 如果出现真实 Adapter Step，则必须有对应 Adapter Output Artifact
  - Adapter Output Artifact 内容必须说明非 MOCK fallback
  - 如果存在 Adapter Output Artifact，MessageStream 必须出现对应内容
- README、technical-design、roadmap、mvp-requirements-alignment 同步 P0-4 状态

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 默认 Adapter 配置下执行 `node scripts/smoke-test.mjs`
- 临时启用本地 echo 型 CODEX CLI Adapter，执行 `node scripts/smoke-test.mjs`，验证生成 Adapter Output Artifact

### 静态 / Mock / Placeholder 部分

- 默认未配置真实 Adapter 时不会生成 Adapter Output Artifact
- 本轮不代表 Codex / Claude Code / OpenCode 深度真实接入完成
- 本轮没有接真实外部网络服务
- 本轮没有让 Adapter 输出替代全部静态 Demo Artifact
- demo-task 仍保留静态核心产物用于稳定演示

### 遗留问题

- 真实 Adapter 输出质量仍取决于用户配置的 CLI / OpenAI Compatible 服务
- 还没有针对 Adapter Output Artifact 的专门 UI badge
- 还没有把 Adapter Output Artifact 纳入更完整的版本 lineage
- 还没有真实平台深度 API / CLI 参数适配

### 下一步建议

- 进入文档 V1.0 与 Demo Checklist 同步
- 补消息操作深化和一键应用 Diff
- 后续可增加 Adapter 测试面板，让半真实输出更容易手动验收

## Phase 45：文档 V1.0 同步与消息操作 / Diff 应用深化

### 目标

- 将 Demo Checklist 和阶段性文档同步到当前 MVP V1.0 能力边界
- 补强 IM 消息操作，让复制、引用、回复、基于消息重跑 Demo Task 更清晰可验收
- 让 Diff Summary 从纯展示推进到可操作，支持将 revision 产物标记为工作台已应用版本

### 主要变更

- `demo-checklist.md` 补充 V1.0 验收项：
  - 执行层并发组
  - LLM Planner fallback
  - MemoryItem 本地持久化和规则检索
  - Adapter Output Artifact
  - 消息复制 / 引用 / 回复 / 重跑
  - 一键应用 Diff
- `MessageBubble` 增加 `回复` 操作，并保留复制、引用、固定、保存为记忆、重新运行 Demo Task
- `ChatInput` 增加引用 / 回复模式展示，发送时把被引用或回复的消息快照带入正文
- `DiffSummaryPanel` 增加 `应用 Diff 结果` 操作
- `ArtifactPanel` 记录当前已应用的 revision artifact，并提示后续可部署或预览
- `technical-design.md`、`roadmap.md`、`mvp-requirements-alignment.md` 同步当前能力和边界

### 验证方式

- `cd frontend && npm run build`
- 手动检查 `/workspace`：
  - MessageBubble 复制 / 引用 / 回复 / 基于消息重跑
  - ChatInput 引用 / 回复预览
  - Artifact Revision 后 Diff Summary 的 `应用 Diff 结果`
- 手动检查 `docs/collaboration/demo-checklist.md`

### 静态 / Mock / Placeholder 部分

- 本轮不改变后端业务逻辑，不接真实 LLM 或真实外部 Agent
- 回复 / 引用当前以消息正文快照形式保存，不是完整结构化 `replyToMessageId` 模型
- 一键应用 Diff 当前是把 revision 产物标记为工作台已应用版本，不是真实 patch apply、代码编辑器或冲突解决
- Adapter、Planner、Deploy 的 mock / fallback / static demo 边界没有变化

### 遗留问题

- 仍需补结构化消息关系字段，例如 `replyToMessageId` / `quotedMessageId`
- 仍需支持单条 Agent 回复重新生成
- 仍需真实 patch apply 和冲突处理
- 仍需浏览器级 E2E 覆盖消息操作和 Diff 应用

### 下一步建议

- 进入仓库卫生与提交前检查
- 扩展 smoke test 覆盖消息操作相关 API 能力或补轻量浏览器 E2E
- 后续再推进 Orchestrator Decision DTO 或 Adapter 测试面板

## Phase 46：结构化消息关系与轻量 Patch Apply

### 目标

- 将引用 / 回复从纯文本前缀推进为结构化消息关系字段
- 将一键应用 Diff 从前端标记升级为后端轻量行级 patch apply，并生成可持久化 Artifact
- 保持现有 demo-task、revision、deploy、preview 和 fallback 链路不受影响

### 主要变更

- `Message` 新增结构化字段：
  - `replyToMessageId`
  - `quotedMessageId`
  - `quotedMessageContent`
- `SendMessageRequest` 支持 `replyToMessageId` / `quotedMessageId`
- `MessageApplicationService` 校验引用消息属于同一 conversation，并保存引用内容快照
- `MessageBubble` 展示结构化引用 / 回复卡片
- `ChatInput` 保留引用 / 回复预览，发送时传结构化字段而不是把引用内容硬塞进正文
- `ArtifactApplicationService` 新增 `applyDiff`
  - 基于父 Artifact 和 revision Artifact 计算行级 patch
  - 将 patch 应用到父版本
  - 校验应用结果等于 revision 内容
  - 生成新的 `ACCEPTED` Artifact 版本
- `ArtifactController` 新增：
  - `POST /api/artifacts/{artifactId}/apply-diff`
- `ArtifactPanel` 的 `应用 Diff 结果` 改为调用后端 apply-diff，并选中新生成的 Artifact
- `scripts/smoke-test.mjs` 增加：
  - structured reply / quote 字段断言
  - `apply-diff` 生成 ACCEPTED Artifact 断言
- `scripts/README.md` 同步 smoke test 覆盖范围
- `demo-checklist.md`、`technical-design.md`、`roadmap.md`、`mvp-requirements-alignment.md` 同步当前能力和边界

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`：
  - 引用 / 回复消息卡片
  - Revision 后点击 `应用 Diff 结果`
  - 新生成的 ACCEPTED Artifact 可继续 Deploy / Preview

### 静态 / Mock / Placeholder 部分

- 结构化消息关系仍是最小字段模型，不是完整 IM thread / message tree
- 轻量 patch apply 是行级 LCS patch，不是 AST diff、语义合并或冲突解决
- 不接真实 LLM，不接真实外部 Agent，不改变 Adapter fallback
- Deploy Preview 仍是本地静态模拟

### 遗留问题

- 仍需完整 reply thread UI 和消息折叠 / 跳转
- 仍需单条 Agent 回复重新生成
- 仍需代码冲突检测和 resolution UI
- 仍需浏览器级 E2E 覆盖引用 / 回复 / apply-diff

### 下一步建议

- 进入仓库卫生与提交前检查
- 补 Orchestrator Decision DTO 或 Adapter 测试面板
- 后续再评估真实代码编辑器和冲突处理

## Phase 47：回复线程 UI、单条 Agent 回复重新生成与 Diff 冲突处理

### 目标

- 在结构化消息关系字段基础上补完整回复线程展示
- 支持对单条 Agent 回复做最小重新生成
- 为后端轻量 patch apply 增加冲突检测和强制应用入口
- 保持 demo-task、Artifact Revision、Deploy Preview、Context / Memory 和 smoke test 主链路稳定

### 主要变更

- `MessageStream` 基于 `replyToMessageId` 构建本地回复线程：
  - 父消息显示回复数量
  - 支持展开 / 隐藏回复线程
  - 支持从引用卡片定位原消息
  - 被定位消息有短暂高亮
- `MessageBubble` 增加：
  - 回复线程列表
  - 定位原消息按钮
  - 单条 Agent 回复重新生成按钮
- `MessageApplicationService` 增加 `regenerateAgentReply`
  - 仅允许重新生成 `AGENT` 消息
  - 新消息保留原 Agent sender
  - 新消息以 `replyToMessageId` / `quotedMessageId` 指向原消息
  - 本轮仍是静态 Demo 再生成，不调用真实外部 Agent
- `MessageController` 新增：
  - `POST /api/conversations/{conversationId}/messages/{messageId}/regenerate-agent-reply`
- `ArtifactApplicationService.applyDiff` 增加冲突检测：
  - 如果同一标题 / 同一会话下已有更新的 `ACCEPTED` Artifact，默认返回 conflict
  - 支持 `{ "force": true }` 强制应用
- `ArtifactController` 的 apply-diff 响应补充：
  - `conflict`
  - `conflictReason`
  - `latestAppliedArtifactId`
- `ArtifactPanel` / `DiffSummaryPanel` 增加 Diff 冲突提示和强制应用入口
- `scripts/smoke-test.mjs` 增加：
  - 重复 apply-diff 冲突断言
  - force apply 断言
  - 单条 Agent 回复重新生成断言
- `scripts/README.md` 同步 smoke test 覆盖范围

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`：
  - 回复线程展开 / 折叠
  - 引用卡片定位原消息
  - Agent 回复重新生成
  - Revision 后重复 apply-diff 触发冲突提示
  - 强制应用 Diff 后生成新 Artifact

### 静态 / Mock / Placeholder 部分

- 单条 Agent 回复重新生成仍是静态 Demo，不重新调用真实 LLM 或真实 Agent
- Diff 冲突检测是轻量版本链规则，不是完整 Git merge / AST merge / CRDT
- 强制应用 Diff 会生成新 Artifact，但不代表真实代码合并已完成
- Adapter、Planner、Deploy 仍保留 mock / fallback / static demo 边界

### 遗留问题

- 回复线程 UI 仍是单层 thread，不是完整多级 threaded conversation
- 单条 Agent 回复重新生成未重新执行真实 Adapter
- 冲突处理未提供可视化三方合并视图
- 仍缺浏览器级 E2E 覆盖回复线程和冲突 UI

### 下一步建议

- 做仓库卫生和提交前检查
- 后续进入结构化 Orchestrator Decision DTO 或 Adapter 测试面板
- 若继续深化编辑能力，再补三方 diff / conflict resolution UI

## Phase 48：Context Retrieval v2、TaskGraph、Artifact Snapshot 与 Action Audit

### 目标

- 借鉴已有项目中的轻量上下文检索、执行快照 / 审计、TaskGraph / ExecutionBatch 模型
- 将 pinned context / MemoryItem 从展示推进到可检索、可注入、可解释
- 将 TaskRun 的并行调度信息结构化为 TaskGraph
- 为 revision / apply-diff / deploy / restore 增加 Artifact safety snapshot 和 Action Audit

### 主要变更

- 新增 `RetrievedContextItem` 和 `ContextRetrievalService`
  - 检索来源包括 pinned message、MemoryItem、recent message、Artifact、previous TaskRun summary
  - 使用轻量规则评分：source priority、keyword match、importance、recency
  - Orchestrator 在 Run Demo Task 时将 retrieved context 注入 TaskStep inputContext 和 ContextSnapshot
- 新增 `TaskGraph` / `ExecutionBatch`
  - TaskRun 返回 execution batches
  - TaskRunPanel 展示后端结构化 TaskGraph summary 和 batch 信息
- 新增 `ArtifactSnapshot` / `ArtifactSnapshotRepository`
  - revision、apply-diff、deploy、restore 前后创建安全快照
  - Artifact Studio 展示 selected Artifact 的 snapshots，并支持 Restore Snapshot
- 新增 `ActionAuditLog` / `ActionAuditService`
  - 记录 apply diff、deploy、restore 等关键操作
  - Workspace header 显示当前会话 action audit 计数
- 扩展 API client 和 smoke test
  - snapshot 查询 / restore
  - action audit 查询
  - retrieved context、TaskGraph、snapshot、restore、audit 断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`
  - Run Demo Task 后 ContextPanel 显示 Retrieved Context
  - TaskRunPanel 显示 TaskGraph execution batches
  - Revision / Apply Diff / Deploy 后 Artifact Studio 显示 Safety Snapshots
  - Restore Snapshot 能生成恢复后的 Artifact

### 静态 / Mock / Placeholder 部分

- Context Retrieval v2 仍是轻量规则检索，不接 Elasticsearch、vector database、embedding、Kafka 或 MinIO
- TaskGraph 是 MVP 执行结构，不是完整 Workflow Canvas 或动态 DAG 引擎
- Artifact Snapshot 是内存快照，不是 Git side repository 或真实文件系统 checkout
- Action Audit 是最小操作记录，不是企业级审计后台或完整 HITL 审批系统

### 遗留问题

- Retrieved Context 仍缺更精细的 token budget / compression
- TaskGraph 尚未做可视化 DAG 编辑
- Snapshot restore 仍是生成新 Artifact，不是三方 merge
- Action Audit 还未形成完整审批流

### 下一步建议

- 继续补 HITL / Approval Gate，用于 Apply Diff、Force Apply、Deploy、Restore
- 将 LLM Planner prompt layering 进一步产品化
- 后续再评估真实 RAG infra、SSE、MySQL 和 Workflow Canvas

## Phase 49：HITL Approval Gate 与操作确认审计

### 目标

- 为 Apply Diff、Force Apply Diff、Demo Deploy、Restore Snapshot 增加最小人工确认流
- 将确认 / 取消结果写入 Action Audit，避免高风险产物操作只有结果记录、没有用户确认记录
- 保持现有 Artifact Revision、Deploy Preview、Snapshot Restore 和 smoke test 主链路不变

### 主要变更

- 后端 `ActionAuditController` 增加 `POST /api/conversations/{conversationId}/action-audits`
  - 用于记录 approval gate 的 `APPROVED` / `CANCELLED` 结果
  - 复用现有 `ActionAuditService` 和内存 `ActionAuditRepository`
- 前端 `agenthubApi.ts` 增加 `recordActionAudit`
- `WorkspacePage` 增加 approval audit 写入回调，并继续刷新 / 展示 Action Audit 计数
- `ArtifactPanel` 增加 HITL Approval Gate
  - Deploy Selected Artifact：中风险确认
  - Apply Diff：中风险确认
  - Force Apply Diff：高风险确认
  - Restore Snapshot：高风险确认
- `workspace.css` 增加 approval gate 卡片、风险 badge 和操作按钮样式
- `scripts/smoke-test.mjs` 增加 approval audit 写入断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`
  - 点击 Apply Diff / Force Apply / Deploy / Restore 时先出现确认卡片
  - 确认后继续执行原操作
  - 取消后不执行原操作，并写入取消审计记录

### 静态 / Mock / Placeholder 部分

- Approval Gate 是最小 HITL 确认流，不是完整审批工作流
- Action Audit 仍是内存记录，不是企业级审计后台
- Deploy 仍是 static demo simulation，不是真实外部部署
- Diff Apply / Force Apply 仍基于当前轻量 patch 规则，不是完整 Git merge

### 遗留问题

- 还没有独立 ApprovalRequest 领域模型
- 审计记录没有用户身份、审批人和权限控制
- 没有审批队列、过期策略和多人确认
- 浏览器级 E2E 尚未覆盖确认流 UI

### 下一步建议

- 将 Action Audit 展示从计数升级为可展开审计时间线
- 为 Approval Gate 增加 operation diff preview / affected files summary
- 后续如接入真实部署或真实文件写入，再升级为后端强制审批校验

## Phase 50：Action Audit 时间线面板

### 目标

- 将 Workspace 中的 Action Audit 从计数提示升级为可展开时间线
- 让确认、取消、Apply Diff、Deploy、Restore 等关键操作可以在界面中直接追溯
- 保持现有 HITL Approval Gate、Artifact、Deploy、Snapshot、Context、smoke test 主链路不变

### 主要变更

- 新增 `ActionAuditTimelinePanel`
  - 默认折叠展示最近一条审计记录
  - 展开后按时间倒序展示完整 Action Audit timeline
  - 显示 actionType、status、targetType、targetId、summary、createdAt 和 auditId
- `WorkspacePage` 接入 Action Audit 时间线面板
- `workspace.css` 增加审计面板、时间线、状态 badge 和最新记录卡片样式
- 调整 Workspace 内容区 grid rows，容纳新增 Action Audit 面板

### 验证方式

- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`
  - 执行 Apply Diff / Force Apply / Deploy / Restore
  - 检查 Action Audit 面板计数和最近记录
  - 展开时间线查看确认、取消和执行结果记录

### 静态 / Mock / Placeholder 部分

- Action Audit 仍是内存记录，不是企业级审计后台
- Timeline 是前端展示增强，不改变后端审批强制策略
- Approval Gate 仍是最小 HITL 确认流，不是多用户审批系统

### 遗留问题

- 审计记录仍缺用户身份、审批人、权限和审批队列
- 时间线未支持筛选 / 搜索 / 导出
- 浏览器级 E2E 尚未覆盖审计面板展开和取消流

### 下一步建议

- 给 Approval Gate 增加 affected artifact / diff preview 摘要
- 后续若接入真实部署或文件写入，再把审批从前端提示升级为后端强制校验

## Phase 51：Approval Gate 影响范围与 Diff Preview 摘要

### 目标

- 在用户确认 Apply Diff、Force Apply Diff、Deploy、Restore 前展示受影响范围
- 让 HITL 确认不只是二次点击，而能看到目标 Artifact、版本、Diff 统计、快照来源和风险说明
- 将影响范围摘要写入 Action Audit，方便后续时间线追溯

### 主要变更

- `ArtifactPanel` 的 Approval Gate 增加 `affectedItems`
  - Deploy 展示目标 Artifact、版本、类型、语言、静态预览目标和本地 Preview URL 产出说明
  - Apply Diff / Force Apply Diff 复用 `buildDiffSummary`
    - 展示父版本、增加 / 删除 / 修改块统计
    - 展示普通应用或强制应用模式
    - 展示最多 3 条 changed item 和最多 3 条行级 diff 样例
  - Restore Snapshot 展示 snapshotId、来源操作、Artifact 标题、版本、类型、语言和快照内容长度
- Approval Audit 写入时附带 affected summary
- `workspace.css` 增加 Approval Gate 影响范围列表样式

### 验证方式

- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 手动检查 `/workspace`
  - 点击 Apply Diff / Force Apply / Deploy / Restore
  - 确认 Approval Gate 展示 affected summary
  - 确认审批后 Action Audit 时间线能看到影响范围摘要

### 静态 / Mock / Placeholder 部分

- Diff preview 仍复用当前轻量行级 diff，不是 AST diff、三方 merge 或真实 IDE patch preview
- Deploy 仍是 static demo simulation，不是真实外部部署
- Restore 仍是生成新 Artifact 版本，不是 Git checkout 或文件系统回滚

### 遗留问题

- Approval Gate 还没有完整的 side-by-side diff 预览
- affected summary 仍是文本摘要，不是结构化 ApprovalRequest 领域模型
- 后端仍未强制要求审批 token 才能执行高风险操作

### 下一步建议

- 将 Action Audit / Approval Gate 的核心字段结构化为后端 ApprovalRequest
- 或继续补 Adapter 测试面板，让真实 / 半真实 Agent 接入更容易验收

## Phase 52：结构化 Orchestrator Decision Log

### 目标

- 将 Orchestrator 可解释面板从前端推断升级为后端事实输出
- 让 TaskRun 直接携带 Planner / Router / Executor / Aggregator / Fallback 决策链
- 提升答辩时解释 Orchestrator 工作方式的可信度

### 主要变更

- 新增 `OrchestratorDecisionLog`
  - `decisionMode`
  - `plannerDecision`
  - `routingDecision`
  - `executionDecision`
  - `aggregationDecision`
  - `fallbackDecision`
  - `summary`
- `TaskRun` 增加 `orchestratorDecisionLog`
- `OrchestratorService` 在 demo-task 和 artifact revision 链路生成结构化决策日志
- `TaskRunPanel` 的 Orchestrator explain panel 优先展示后端决策日志
- `scripts/smoke-test.mjs` 增加结构化决策日志断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是结构化解释能力，不是新的真实 Agent 执行能力
- Planner 仍可能是规则化或 LLM fallback
- Adapter 仍可能 fallback 到 MOCK
- Decision Log 不是企业级审计系统，也不替代 Action Audit

### 遗留问题

- Orchestrator Decision 仍随 `TaskRun` 内存保存，未独立持久化为可查询审计表
- 前端 explain panel 仍是卡片展示，未做图形化 DAG / 决策图
- 还没有按用户、任务、Agent 维度筛选或导出决策记录

### 下一步建议

- 将 Approval Gate 核心字段升级为后端 `ApprovalRequest`
- 或继续做 Adapter 测试面板，补强半真实 Agent 接入验收能力

## Phase 53：Prompt Layering、后端强制审批与并行执行语义固化

### 目标

- 将 LLM Planner prompt 从内联拼接升级为分层 Prompt Layering
- 将前端 Approval Gate 升级为后端可校验的 `ApprovalRequest`
- 将现有 `CompletableFuture` 并行执行语义固化到 `TaskGraph / ExecutionBatch`

### 主要变更

- 新增 `PlannerPromptBuilder`
  - 固定 `baseCapability / roleInstruction / availableAgents / conversationContext / retrievedContext / artifactHistory / outputSchema / fallbackPolicy` 分层
  - `TaskPlanner` 调用分层 prompt，并继续保持 LLM Planner 失败回退规则化 Planner
- 新增后端 `ApprovalRequest`
  - `PENDING / APPROVED / CANCELLED / CONSUMED / EXPIRED`
  - 新增 Approval API：创建、批准、取消、按会话查询
  - Apply Diff / Force Apply Diff / Demo Deploy / Restore Snapshot 必须携带匹配且已批准的 `approvalId`
  - 成功执行后 approval 会被标记为 `CONSUMED`
- `ExecutionBatch` 增加运行时字段
  - `batchStatus`
  - `startedAt`
  - `completedAt`
  - `durationMs`
  - `failurePolicy`
- 前端 Approval Gate 改为先创建后端 approval，再 approve，再执行高风险操作
- `TaskRunPanel` 展示 batch runtime / failure policy
- `scripts/smoke-test.mjs` 增加后端强制审批、prompt layering 证据、parallel batch runtime 断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- Prompt Layering 只是增强 LLM Planner 输入结构，不代表真实 LLM Planner 一定启用
- ApprovalRequest 仍是内存态，不是企业级多用户审批系统
- 并行执行语义仍是 TaskRun 内部 batch 级别，不是完整动态 DAG 引擎
- Adapter 仍可能 fallback 到 MOCK，Deploy 仍是 static demo simulation

### 遗留问题

- ApprovalRequest 未持久化到数据库，刷新后会丢失
- 审批仍缺用户身份、审批人、权限、过期队列和批量处理
- 并行执行未提供流式状态更新
- LLM Planner prompt 仍可继续引入更完整的 adapter health、artifact history 和 conversation summary

### 下一步建议

- 做 Adapter 测试面板，让 OPENAI_COMPATIBLE / CLI Adapter 的可用性和执行结果可手动验证
- 或推进 ApprovalRequest 的 UI 时间线合并展示，减少 Action Audit 与 Approval 两套记录割裂

## Phase 54：V1.0 文档同步与课题对齐收口

### 目标

- 将 README、产品设计、技术设计、Demo 场景、Roadmap、Demo Checklist 和课题对齐文档同步到当前 V1.0 MVP 状态
- 修正过期表述，避免把静态 Demo、Mock、CLI 探测、半真实能力写成生产级完成
- 为后续提交前仓库卫生、smoke test 和 Demo 脚本收敛提供文档基线

### 主要变更

- README 同步 V1.0 当前阶段、已实现能力、静态 / Mock / 半真实边界和下一阶段 Roadmap
- `product-design.md` 同步多 `@Agent`、TaskGraph / ExecutionBatch、Approval / Audit、line diff / Apply Diff、Snapshot / Restore 设计
- `technical-design.md` 补充 ApprovalRequest、ActionAudit、ArtifactSnapshot、TaskGraph / ExecutionBatch、OrchestratorDecisionLog 和本地 Memory 持久化说明
- `demo-scenario.md` 更新 3 分钟 Demo 口径，加入 Apply Diff Approval Gate、Deploy Status Card、Preview URL 和 Action Audit
- `roadmap.md` 将已完成的 P0 / P1 增强从“待做”调整为 V1.0 已完成 MVP，并重排下一阶段优先级
- `demo-checklist.md` 增加 Approval Gate / Action Audit / Snapshot Restore 验收段落，并修正 Orchestrator explain panel 为后端结构化决策日志
- `mvp-requirements-alignment.md` 同步当前完成度和仍未完成边界

### 验证方式

- 本轮只修改文档，未修改业务代码
- 手动检查 Markdown 路径和章节命名
- 未执行 `cd backend && mvn -q -DskipTests package`
- 未执行 `cd frontend && npm run build`
- 未执行 `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 文档明确保留以下边界：
  - Codex / Claude Code / OpenCode 仍是 CLI 探测型半真实 Adapter，不是深度平台接入
  - Deploy Status Card 仍是 static demo simulation，不是真实 Vercel / Netlify / Docker 部署
  - LLM Planner 需要配置 OPENAI_COMPATIBLE，失败仍 fallback 到 RuleBasedPlanner
  - ApprovalRequest / ActionAudit 仍是 MVP 能力，不是企业级多人审批系统
  - TaskGraph / ExecutionBatch 不是完整动态 DAG 引擎

### 遗留问题

- 提交前仍需重新跑 backend build、frontend build 和 smoke test
- 部分文档仍需最终人工通读，确保视频脚本和实际 UI 文案完全一致
- README 中英文术语较多，后续可在最终提交前做一次语言风格统一
- Adapter 测试面板、Approval / Audit 合并展示、Context Retrieval 排序解释仍未完成

### 下一步建议

- 做仓库卫生和三项验证：backend build、frontend build、smoke test
- 启动前后端后按 `docs/collaboration/demo-checklist.md` 人工跑一遍 V1.0 主链路
- 下一轮优先做 Adapter 测试面板，提升半真实 Adapter 接入的可验收性

## Phase 55：真实 Adapter 输出进入核心 Artifact 链路

### 目标

- 将真实 / 半真实 Adapter 的成功输出从“状态展示”推进为可见、可追踪的 Artifact
- 保留静态模板和 Mock fallback，避免无 API key 或 Adapter 失败时破坏 Demo 主链路
- 为后续从静态模板切到动态产物生成建立第一阶段基础

### 主要变更

- 新增 Artifact 来源元数据
  - `sourceKind`
  - `sourceAdapterType`
  - `sourceTaskStepId`
  - `generationMode`
- 新增 `ArtifactSourceKind`
  - `STATIC_TEMPLATE`
  - `REAL_ADAPTER`
  - `MOCK_FALLBACK`
  - `USER_REVISION`
  - `DEPLOY_PREVIEW`
- 新增 `AdapterArtifactExtractor`
  - 优先解析 Adapter 返回的结构化 JSON artifact contract
  - JSON 不合法时降级为 Markdown / Review Report Artifact
  - 仅在非 MOCK Adapter 成功且未 fallback 时持久化真实 Adapter Artifact
- `OpenAICompatibleAgentAdapter` 的 user prompt 增加 artifact JSON 输出契约
- `AgentStepExecutor` 支持 `agenthub.orchestrator.artifact-generation-mode`
  - `STATIC_TEMPLATE`
  - `HYBRID_REAL`
  - `REAL_FIRST`
- 前端 Artifact Studio、PreviewPage、TaskRunPanel 增加 Artifact source badge 和 source metadata 展示
- `scripts/smoke-test.mjs` 增加 `AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER=true` 可选断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`
- 如已配置真实 Adapter，可额外执行：
  - `AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER=true node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 默认仍保留静态模板 Artifact，真实输出第一阶段以 `HYBRID_REAL` 方式并存
- Codex / Claude Code / OpenCode 仍是 CLI 探测型半真实 Adapter，不代表深度平台接入完成
- OPENAI_COMPATIBLE 需要环境变量配置；未配置或调用失败时仍 fallback 到 MOCK
- REAL_FIRST 目前是配置语义入口，后续仍需继续收敛“真实产物替代静态模板”的执行策略

### 遗留问题

- 真实 Adapter 输出质量依赖模型响应，仍需要更严格 schema 校验和错误提示
- 真实输出还没有完全替代 LoginPage / README / API Contract / Review Report 静态模板
- CLI Adapter 输出结构无法保证，仍可能只能降级为文本 Artifact
- 还缺 Adapter 测试面板，用户不能在 UI 中单独验证真实输出契约

### 下一步建议

- 做 Adapter 测试面板，允许在 `/agents` 或 Workspace 中手动触发 Adapter execute 并查看 JSON contract 解析结果
- 继续推进 REAL_FIRST 模式，让真实 Adapter 产物在配置启用时成为主产物，静态模板只作为 fallback
- 补充 smoke test 的真实 Adapter mock server 或 fixture，降低真实外部模型依赖

## Phase 56：Adapter 测试面板与真实输出契约可视化

### 目标

- 在前端提供手动 Adapter 测试入口，让 OPENAI_COMPATIBLE / Codex / Claude Code / OpenCode 的可用性、fallback、原始响应和 artifact JSON 解析结果可见
- 降低“真实 Adapter 输出进入 Artifact 链路”后缺少手动验收入口的风险

### 主要变更

- `agenthubApi.ts` 新增 `executeAdapter`
- `agentTypes.ts` 新增 `AdapterExecutionResponse`
- `/agents` 页面新增 Adapter 手动测试面板
  - 可选择 Adapter
  - 可输入测试 Prompt
  - 展示 preferred / actual / status / fallbackUsed
  - 展示 errorMessage / fallback 原因
  - 展示原始响应
  - 前端解析 `assistantMessage + artifacts[]` JSON contract，并展示 artifact title / type / language / summary / content length
- `workspace.css` 增加 Adapter 测试面板样式

### 验证方式

- `cd frontend && npm run build`
- 手动打开 `/agents`
- 选择 `MOCK` 执行 Adapter 测试，确认返回稳定响应
- 选择未配置的 `OPENAI_COMPATIBLE` / CLI Adapter，确认实际 fallback 到 MOCK，且 fallback 原因可见
- 如配置真实 Adapter，确认原始响应和 artifacts[] 解析结果可见

### 静态 / Mock / Placeholder 部分

- 测试面板只是手动验证入口，不代表 Codex / Claude Code / OpenCode 已完成深度真实接入
- 未配置或不可用 Adapter 仍会 fallback 到 MOCK
- JSON 解析在前端用于展示，真实 Artifact 持久化仍以后端 `AdapterArtifactExtractor` 为准

### 遗留问题

- 还没有独立 mock OpenAI-compatible server 用于稳定测试 REAL_ADAPTER 输出
- 还没有把测试结果保存为审计记录或 Artifact
- Adapter 测试入口尚未和 Agent Builder 的 created Agent 直接绑定

### 下一步建议

- 推进 REAL_FIRST 模式，让真实 Adapter Artifact 在配置启用时优先替代静态模板
- 或补充 Adapter test fixture / mock server，让 smoke test 能稳定覆盖真实输出契约

## Phase 57：DeepSeek OpenAI-compatible 配置化接入

### 目标

- 让现有 `OPENAI_COMPATIBLE` Adapter 可以通过环境变量启用并接入 DeepSeek OpenAI-style API
- 参考 OpenAI-compatible API 的通用接入方式：配置 base URL、Bearer token、model，并调用 `/chat/completions`
- 保持真实 API key 不进入仓库，未配置或调用失败时继续 fallback 到 MOCK

### 主要变更

- `application.yml` 中 `agenthub.adapters.openai-compatible.enabled` 改为读取 `AGENTHUB_OPENAI_ENABLED`
- `.env.example` 增加 `AGENTHUB_OPENAI_ENABLED` 和 DeepSeek OpenAI-compatible 示例配置
- `OpenAICompatibleAgentAdapter` 请求体显式设置 `stream=false`，保持当前非流式调用边界
- `scripts/README.md` 增加 DeepSeek / OpenAI-compatible 本地环境变量配置和 Adapter Test Panel 验证说明

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 本轮不在仓库中保存真实 API key
- 如需真实调用验证，需在本机临时设置：
  - `AGENTHUB_OPENAI_ENABLED=true`
  - `AGENTHUB_OPENAI_BASE_URL=https://api.deepseek.com`
  - `AGENTHUB_OPENAI_API_KEY=<your-api-key>`
  - `AGENTHUB_OPENAI_MODEL=deepseek-v4-flash`
  - 然后在 `/agents` Adapter Test Panel 测试 `OPENAI_COMPATIBLE`

### 静态 / Mock / Placeholder 部分

- DeepSeek 接入复用 `OPENAI_COMPATIBLE` 非流式调用，不是单独的新 Adapter
- Codex / Claude Code / OpenCode 仍是 CLI 探测型半真实 Adapter，不代表深度平台接入完成
- 未配置环境变量、外部调用失败或超时时，主链路仍应 fallback 到 MOCK
- 真实 Adapter 输出能否进入 Artifact 取决于模型是否返回符合 artifact JSON contract 的内容

### 遗留问题

- 未实现流式输出
- 未做真实 DeepSeek 调用的自动化测试
- 真实模型输出仍需要更严格的 schema 校验和 fixture 覆盖
- 用户粘贴到聊天中的 API key 应在平台控制台轮换，避免密钥泄露风险

### 下一步建议

- 用户本机用临时环境变量验证 DeepSeek Adapter Test Panel
- 验证通过后再推进 `REAL_FIRST` 模式或增加 OpenAI-compatible mock fixture
- 若要纳入 smoke test，应先提供不依赖公网和真实 key 的 mock OpenAI-compatible 服务

## Phase 58：多 @Agent 自定义 Step、Agent 协作消息协议与 Tool Capability 路由

### 目标

- 将 `mentionedAgentIds` 从“只影响第一个 selectedAgent”推进为“多个被 @ Agent 都能进入 TaskGraph”
- 引入轻量 Agent 协作消息协议，让 MessageStream 能区分 `TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR`
- 将 `toolTags` 从展示标签推进为 Router 可读取的静态 Tool Capability 映射

### 主要变更

- `TaskPlanner` 为额外 mentioned Agent 生成独立 `OrchestratorStepPlan`
  - 第一个 mentioned / selected Agent 仍作为核心 Step 1
  - 后续 mentioned Agent 会追加为 custom collaboration step
  - 追加 step 使用 `MENTIONED_AGENT_GROUP` 进入 TaskGraph
- `OrchestratorService` 在 demo-task 中执行附加 mentioned Agent step
  - 保留 Frontend / Backend / Reviewer 三步和静态 Artifact 主链路
  - 额外 mentioned Agent step 参与 `CompletableFuture` 执行、TaskRun、TaskGraph、DecisionLog 和 MessageStream
- `MessageType` 增加 Agent 协作协议类型
  - `TASK`
  - `RESULT`
  - `REVIEW`
  - `APPROVAL`
  - `REJECTION`
- `MessageApplicationService` 支持追加带协议类型的 Agent 消息
- 新增 `ToolCapabilityRegistry`
  - `code / preview / review / deploy / api` 映射为轻量 tool capabilities
  - `AgentRouter` 将 tool capability summary 注入 selected custom Agent system prompt
  - Router 能解释 selected Agent 是否匹配 step requiredSkill
- 前端 `MessageBubble` 增加协议 badge 展示
- `scripts/smoke-test.mjs` 增加 `TASK / RESULT / REVIEW / APPROVAL` 协作协议消息断言

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- smoke test 已增加协议断言，需在启动前后端后执行：
  - `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 这仍不是完整自由群聊 runtime
- 多 @Agent 目前支持消息开头连续 @，不做自然语言中间 @ 解析
- 额外 mentioned Agent step 进入 TaskGraph，但产物仍可能依赖静态模板或 Mock fallback
- Tool Capability 是静态映射，不是真实工具执行权限系统
- Agent 协作消息协议是 MVP 级消息类型，不是完整 Agent-to-Agent 通信总线

### 遗留问题

- 还没有让每个 mentioned custom Agent 动态决定产物类型
- 还没有把 `toolTags` 绑定到真实 Tool Registry
- Reviewer 的 `REJECTION` / retry 语义还没有形成完整闭环
- 多 Agent 回复仍由 demo-task 驱动，不是任意消息自动触发

### 下一步建议

- 做 step-level Reviewer 审查和失败重试，将 `REJECTION` 协议真正接入执行链路
- 将 `toolTags` 升级为可配置 Tool Registry，并在 Agent Builder 中选择工具能力
- 让 LLM Planner 输出动态 mentioned Agent steps，而不是仅由规则化 planner 追加

## Phase 59：Tool Capability 驱动的默认 Agent 路由

### 目标

- 将 `toolTags` 的静态 Tool Capability 映射从解释信息推进为实际路由策略
- 在没有显式 selectedAgent / mentioned Agent 覆盖某个 step 时，让 Router 根据 `requiredSkill -> capability -> Agent` 选择默认执行 Agent
- 保持 Mock fallback、demo-task、TaskGraph、Agent 协作消息协议和 smoke test 主链路稳定

### 主要变更

- `ToolCapabilityRegistry`
  - 增加 `matchScore(agent, requiredSkill)`
  - 扩展内置 tool tag 映射：`code_editor`、`contract_writer`、`schema_designer`、`review_checker`、`task_planner`、`task_router`
  - 支持 `FRONTEND_ARTIFACT_GENERATION`、`QUALITY_REVIEW`、`API_CONTRACT_DESIGN` 等 requiredSkill 匹配
- `AgentRouter`
  - 注入 `AgentApplicationService`
  - 默认路由时扫描 active Agents
  - 排除 Orchestrator，按 capability score 选择匹配 Agent
  - 同分时优先自定义 Agent，再按更新时间排序
  - 将真实 capability routing reason 写入 `RoutedAgent`
- `OrchestratorService`
  - core step 不再硬编码 Frontend / Backend / Reviewer 的 assigned agent
  - 使用 `frontendRoute`、`backendRoute`、`reviewRoute` 的 agentId / agentName / systemPrompt / routingReason
  - TaskStep 中可以看到 Tool Capability Router 的实际选择结果

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 重启 backend / frontend
- `node scripts/smoke-test.mjs`
  - 结果：通过
  - 覆盖 health、adapter、multi-mention、TaskGraph、Artifact Revision、Apply Diff、Deploy、Preview、Agent 协作协议
- API 级手动验证
  - 创建 `toolTags=["review"]` 的自定义 Agent
  - 不显式 @ 该 Agent，直接运行 demo-task
  - Review Step 被路由到自定义 Agent
  - `routingReason=Tool capability router selected Agent for requiredSkill=QUALITY_REVIEW...`

### 静态 / Mock / Placeholder 部分

- Tool Capability 仍是静态 registry，不是真实工具执行系统
- Router 选择 Agent 后，Adapter 仍可能 fallback 到 MOCK
- Artifact 主链路仍保留 static / hybrid fallback 边界
- 这不是完整动态技能调度或真实工具调用

### 遗留问题

- Tool Capability 还没有前端独立管理页面
- Router 还没有复杂权重，例如历史成功率、Adapter health、任务成本、上下文相关度
- 还没有把 tool capability 变成真实可执行 tool invocation
- smoke test 尚未固化“自定义 Agent capability route”断言

### 下一步建议

- 将 capability route 验证加入 smoke test
- 在 Agent Builder 中把 toolTags 展示为更明确的 Tool Capability 选择器
- 后续可引入 Adapter health / Agent success history 作为 Router 打分因子

## Phase 60：文档 V1.0 同步与课题完成度收口

### 目标

- 将 README、技术设计、Roadmap 和 Demo Checklist 同步到当前 MVP 增强后期状态
- 明确区分真实功能、半真实 Adapter、静态 Demo、Mock fallback 和未完成能力
- 让文档能支撑后续答辩、Demo 录制和继续开发，不再停留在旧骨架描述

### 主要变更

- `README.md`
  - 重写为 V1.0 项目入口
  - 说明当前阶段、已实现能力、静态 / Mock / 半真实边界、启动方式、smoke test、DeepSeek / OPENAI_COMPATIBLE 配置和推荐演示主线
- `docs/technical-design.md`
  - 同步 Orchestrator、TaskGraph、Tool Capability Router、LLM Planner、Adapter、Context / Memory、Approval / Audit、Deploy Preview 架构
  - 明确当前仍不是生产级 DAG、长期记忆、真实部署或深度 Agent 平台接入
- `docs/roadmap.md`
  - 更新为 MVP 增强后期路线
  - 梳理已完成能力、下一阶段 P0/P1/P2 和不建议现在做的事项
- `docs/collaboration/demo-checklist.md`
  - 更新为 V1.0 人工验收清单
  - 覆盖 Workspace、多 `@Agent`、Agent 协作协议、Tool Capability Router、Context / Memory、Adapter Test、REAL_ADAPTER、Diff / Approval / Audit / Deploy / smoke test

### 验证方式

- 文档路径检查：
  - `README.md`
  - `docs/technical-design.md`
  - `docs/roadmap.md`
  - `docs/collaboration/demo-checklist.md`
  - `docs/collaboration/dev-log.md`
- Markdown 内容人工检查：
  - 标题层级正常
  - 表格结构正常
  - 代码块闭合
  - Mock / Static / Placeholder / 半真实边界明确
- 本轮只改文档，不需要重新运行前后端构建

### 静态 / Mock / Placeholder 部分

- 文档明确说明 demo-task 仍是规则化主链路，不是完整自治 Agent runtime
- Codex / Claude Code / OpenCode 仍是 CLI 探测型半真实 Adapter
- Deploy Preview 仍是本地 static demo simulation
- Tool Capability 仍是静态 registry，不是真实 tool invocation
- REAL_ADAPTER Artifact 仍依赖真实 Adapter 成功和输出 contract

### 遗留问题

- `docs/mvp-requirements-alignment.md` 可后续单独同步为最新评分表
- `docs/product-design.md` 和 `docs/demo-scenario.md` 后续仍需按 V1.0 演示口径再收敛
- README 和部分历史文档曾出现编码显示问题，后续提交前需再次人工打开确认
- smoke test 尚未固化“自定义 Agent capability route”断言

### 下一步建议

- 先做仓库卫生与 build / smoke 全量验证
- 然后推进 REAL_FIRST 收敛和 Adapter fixture / mock server
- 再做 Reviewer `REJECTION` 闭环和 Tool Capability UI 化

## Phase 61：P0-6 仓库卫生与 smoke test 验证增强

### 目标

- 确保 TypeScript build cache 不进入仓库
- 为 REAL_ADAPTER Artifact 增加稳定 fixture 合同验证
- 为 Tool Capability Router 增加 API 级 smoke 覆盖
- 对 `REJECTION` 协议做可用则验证、不可用则报告缺口

### 主要变更

- `.gitignore` 明确增加 build cache 段落，并保留 `*.tsbuildinfo` / `**/*.tsbuildinfo`
- `scripts/smoke-test.mjs` 增加本地 REAL_ADAPTER Artifact fixture contract 校验
- `scripts/smoke-test.mjs` 对后端实际产生的 REAL_ADAPTER Artifact 校验 `sourceKind`、`sourceAdapterType`、`sourceTaskStepId`、`generationMode`、`content` 持久化说明
- `scripts/smoke-test.mjs` 新增隔离会话：创建 `toolTags=["review"]` 的自定义 Agent，验证 `QUALITY_REVIEW` step 被 Tool Capability Router 选中，并校验 `routingReason`
- `scripts/smoke-test.mjs` 对 `REJECTION` 消息采用条件断言：如果消息流出现 `messageType=REJECTION`，校验 sender / content；如果没有出现，输出 warning 并记录为当前覆盖缺口
- `scripts/README.md` 同步 smoke test 覆盖范围、REAL_ADAPTER fixture、Tool Capability route 和 REJECTION 条件覆盖说明

### 验证方式

- `git ls-files "*.tsbuildinfo"`：无输出，当前没有 tracked tsbuildinfo
- `Get-ChildItem -Recurse -Force -File -Filter *.tsbuildinfo`：发现本地 build cache 位于 `frontend/tsconfig.app.tsbuildinfo` 和 `frontend/tsconfig.node.tsbuildinfo`，应继续保持 ignored
- `node --check scripts/smoke-test.mjs`
- 启动 backend / frontend 后执行：`node scripts/smoke-test.mjs`
- 如配置真实 Adapter 并期望真实产物：`$env:AGENTHUB_SMOKE_EXPECT_REAL_ADAPTER="true"; node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- REAL_ADAPTER fixture 是本地合同校验，不代表真实外部模型已调用
- Tool Capability route 仍验证静态 `toolTags -> requiredSkill` 映射，不是真实 tool invocation
- 当前 demo-task 主路径没有实际生成 `REJECTION` 消息，smoke test 会报告 warning；Reviewer rejection / retry 闭环仍未完成

### 遗留问题

- 仍缺不依赖公网和真实 API key 的 OpenAI-compatible mock server
- `REJECTION` / retry 语义还没有接入执行链路
- Tool Capability 仍未升级为可执行 Tool Registry

## Phase 62：P1-5 浏览器级 E2E 与 smoke 扩展

### 目标

- 增加轻量浏览器级 E2E，覆盖 Workspace、Preview、Approval Gate 主流程
- 扩展 API smoke，覆盖自动触发 Orchestrator、attachments、Context Retrieval 解释信息、Adapter weighted routing 证据
- 保持变更范围在 `scripts/`、已有 package 测试脚本和本 dev-log 内，不触碰业务代码

### 主要变更

- 新增 `scripts/e2e-browser.mjs`
  - 通过 API seed 浏览器测试会话、消息附件、message-level Orchestrator run、Artifact 和 demo deployment
  - 使用 Playwright 打开 `/workspace`，选择 seed 会话，验证 message stream、Orchestrator explain panel、artifact preview
  - 在浏览器内点击 `Deploy Selected Artifact`，验证 `.approval-gate`，确认 `Approve Deploy` 后验证 deploy status card
  - 打开 `/preview/:artifactId` 风格的静态预览 URL，验证 preview card 和 content 渲染
- `frontend/package.json`
  - 新增 `npm run e2e:browser`，指向 `node ../scripts/e2e-browser.mjs`
  - 不新增根 package，也不引入提交级 Playwright 依赖
- `scripts/smoke-test.mjs`
  - 主消息增加 lightweight attachments，并断言后端持久化 `fileName` / `contentPreview`
  - 如果 `/messages/{messageId}/orchestrator-run` 可用，执行并断言自动触发 Orchestrator 返回 `COMPLETED` 和 routing decision evidence
  - 对 `retrievedContextItems` 增加 `score` 与 `reason` 解释断言
  - 对 Tool Capability Router 的 `routingReason` 增加 weighted evidence 断言：`score`、`capabilityScore`、`adapterHealthScore`、`historyScore`、`fallbackPenalty`、`preferredAdapter`
- `scripts/README.md`
  - 同步 smoke 覆盖范围和浏览器 E2E 运行方式

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- `cd frontend; npm run lint`
- 启动 backend / frontend 后执行：
  - `node scripts/smoke-test.mjs`
  - `cd frontend; npm run e2e:browser`

### 静态 / Mock / Placeholder 部分

- 浏览器 E2E wrapper 需要本地已安装 Playwright；本轮不把 Playwright 加入 committed dependency
- 浏览器 E2E 不负责启动 backend / frontend server
- Deploy Preview 仍是 local static demo simulation，不是外部部署
- Adapter weighted routing 仍验证 routing explanation 和 score evidence，不代表真实 tool invocation

### 遗留风险

- 当前工作区已有大量业务代码与文档未提交改动，本轮只追加限定范围改动，未回滚或清理既有变更
- 如果前端文案或 CSS class 大幅调整，浏览器 E2E 选择器需要同步维护
- 如果 Playwright 未安装，`scripts/e2e-browser.mjs` 会给出安装提示并失败，不能完成浏览器验证

## Phase 63：P1 Agent 协作触发、加权路由、Context 可解释 UI、附件与浏览器 E2E

### 目标

- 补齐 P1-1 到 P1-5：任意消息显式触发 Agent 协作、Adapter health 加权路由、Context Retrieval 可解释 UI、轻量附件模型、浏览器级 E2E。
- 保持现有 demo-task、Artifact Revision、Approval Gate、Deploy Preview、smoke test 主链路稳定。

### 主要变更

- 后端消息模型支持 lightweight attachments，Message DTO / send message / list message 链路保留附件元数据和 content preview。
- 新增 message-level Orchestrator run 入口，支持基于某条消息显式触发 Agent 协作，同时保留原 demo-task 手动入口。
- AgentRouter 引入 Adapter health / history / fallback penalty 参与路由评分，routingReason 输出 capabilityScore、adapterHealthScore、historyScore、fallbackPenalty、preferredAdapter 等证据。
- ContextPanel 展示 Retrieved Context 的 sourceType、score、reason 和注入 TaskStep 线索，避免上下文只停留在静态列表。
- ChatInput / MessageBubble 支持轻量附件展示，不接对象存储和真实上传服务。
- 新增 `scripts/e2e-browser.mjs` 和 `npm run e2e:browser`，使用 Playwright runtime 覆盖 Workspace、Approval Gate、Deploy Status Card、Preview 页面主流程。
- 为浏览器 E2E 增加 `playwright-core` dev dependency，并默认使用本机 Microsoft Edge channel，避免下载 Playwright 浏览器包。
- 补充本地 favicon，修复 ContextPanel 重复 React key 警告，保证浏览器 E2E 控制台质量门通过。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- 启动临时 backend `http://127.0.0.1:18082` 和 frontend `http://127.0.0.1:5173` 后执行：
  - `node scripts/smoke-test.mjs`
  - `cd frontend && npm run e2e:browser`
- `git diff --check`
- `git ls-files "*.tsbuildinfo"`：无输出

### 静态 / Mock / Placeholder 部分

- 任意消息触发 Agent 协作本轮是显式 message-level trigger，不是完全自治后台调度。
- Lightweight attachments 只保存元数据和 content preview，不做真实文件上传、对象存储或图片处理。
- Adapter health history 仍是内存统计，不是持久化运行画像。
- Browser E2E 是轻量 UI 主链路验证，不是完整浏览器自动化测试体系。
- Tool Capability 仍是路由能力，不代表真实 tool invocation 已完成。

### 遗留问题

- 自动从任意任务消息直接触发 Orchestrator 仍需产品策略确认，当前保留显式触发以避免误执行。
- Adapter health 历史未持久化，重启后会丢失。
- 附件没有真实上传、下载、权限和大小限制治理。
- 浏览器 E2E 依赖本机 Edge channel 或用户指定的 Chromium channel。

### 下一步建议

- 将自动触发策略做成可配置确认流：高风险任务先进入 Approval / Review，再触发 Orchestrator。
- 把 Adapter health history 接入持久化或本地 snapshot，提升路由稳定性。
- 做轻量附件上传 API 和 Artifact 附件关联。

## Phase 64：Message-level Orchestrator 自动触发与后端 Approval Gate

### 目标

- 将显式 message-level Orchestrator trigger 产品化为可配置自动触发能力，同时通过后端 ApprovalRequest 避免任务消息被后台误执行。
- 保留现有手动 `/orchestrator-run` 入口和 demo-task 主链路。

### 主要变更

- 新增 `OrchestratorAutoTriggerService`，在用户消息发送后按配置评估是否建议触发 Orchestrator。
- 新增 `OrchestratorAutoTriggerResult`，用于返回 `enabled / mode / requireApproval / matched / reason / matchedKeywords / pendingApproval / taskRun` 等信息。
- `MessageController` 在发送消息后调用自动触发评估；默认配置关闭，不影响现有发送消息行为。
- 扩展 `POST /api/conversations/{conversationId}/messages/{messageId}/orchestrator-run` 请求体，支持可选 `approvalId`。
- 新增 `GET /api/conversations/{conversationId}/messages/{messageId}/orchestrator-trigger-suggestion`，让前端可以查询某条消息是否匹配自动触发策略。
- 审批模式下，命中消息只创建 `ApprovalRequest` 和 `APPROVAL` 系统消息；必须 approve 后携带 `approvalId` 执行，执行成功后消费该 approval。
- 增加 `agenthub.orchestrator.auto-trigger.*` 配置和 `.env.example` 示例。

### 验证方式

- `cd backend && mvn -q -DskipTests package`

### 静态 / Mock / Placeholder 部分

- 自动触发默认关闭，仍不是完全自治 Agent 后台调度。
- `require-approval=true` 时不会自动执行 Orchestrator，只创建待确认审批。
- 审批与触发状态仍使用内存仓储，重启后不会持久保存。
- 本轮只完成后端能力，前端确认 UI 需要后续 worker 接入。

### 遗留问题

- 前端还需要在消息发送后展示 pending approval / trigger suggestion。
- Approval approve 后当前仍需要调用 message-level run 入口携带 `approvalId` 执行，尚未做 approve 即自动执行。
- 自动触发关键词策略仍是轻量规则，不是 LLM intent classifier。

### 下一步建议

- 前端接入 trigger suggestion 和 pending approval 状态，提供“确认运行 Orchestrator / 取消”操作。
- 将 approval 与 trigger execution 做更完整的 UI 状态联动，并补充 smoke test 对审批触发链路的断言。

## Phase 65：Adapter Health Stats 本地持久化

### 目标

- 将 Adapter 路由健康画像从进程内存升级为本地 JSON snapshot，避免 backend 重启后 `historyScore` 和 `fallbackPenalty` 丢失。
- 保持执行主链路、Mock fallback、message trigger 和前端行为不变。

### 主要变更

- 新增 `AgentAdapterStatsRepository`，定义 Adapter route stats 的轻量加载和保存接口。
- 新增 `FileAgentAdapterStatsRepository`，使用本地 JSON 文件保存 `attempts / successes / fallbacks / failures`。
- `AgentAdapterRegistry` 启动时加载历史 stats，Adapter 执行完成后写回完整 snapshot。
- 写入和读取失败只记录 warning，不阻断 Adapter 执行、fallback 或 Orchestrator 路由。
- `application.yml` 增加 `agenthub.adapters.stats.persistence.*` 配置，默认路径为 `./.agenthub/adapter-route-stats.json`。
- `AgentRouter` 继续通过 `AgentExecutorService.routeStats(...)` 使用历史画像参与路由评分，无需改前端。

### 验证方式

- `cd backend && mvn -q -DskipTests package`

### 静态 / Mock / Placeholder 部分

- 该持久化只面向本地 demo，不接 MySQL，不引入外部网络或复杂依赖。
- Snapshot 是完整覆盖写，不是生产级事件日志或多实例一致性方案。
- Adapter stats 仍只统计当前路由执行结果，不代表真实 provider SLA 监控。

### 遗留问题

- 多实例部署需要集中式存储或事件流，本地 JSON 不适用。
- 如后续引入更复杂评分维度，需要扩展 snapshot version 和兼容读取逻辑。

## Phase 66：自动触发确认流产品化与 Adapter Stats 持久化集成

### 目标

- 将 message-level Orchestrator trigger 从显式按钮推进为可配置自动触发建议，并通过 Approval Gate 做确认流。
- 将 Adapter health routing stats 从进程内存升级为本地持久化 snapshot，避免重启后路由画像丢失。
- 保持 demo-task、手动 `Run Demo Task`、Artifact Revision、Deploy Preview 和 Mock fallback 稳定。

### 主要变更

- `OrchestratorAutoTriggerService` 支持 `enabled / require-approval / mode / keywords` 配置。
- 用户消息发送后可按关键词或 `@Agent` 命中自动触发策略；默认关闭，开启后默认要求 Approval。
- `orchestrator-run` 支持 `approvalId`，并在 `require-approval=true` 且消息命中时强制后端校验 approval，避免只靠前端约束。
- Workspace 消息卡片展示 auto-trigger suggestion、pending approval、approved、consumed 等状态。
- 前端确认流按 `approveApprovalRequest(approvalId) -> runOrchestratorFromMessage(..., approvalId)` 执行，并保留手动 demo-task 入口。
- `AgentAdapterRegistry` 启动加载本地 route stats，执行后写回 JSON snapshot。
- `FileAgentAdapterStatsRepository` 使用本地 JSON 保存 `attempts / successes / fallbacks / failures`，读取或写入失败只 warning，不阻断主链路。
- `.env.example` 增加 auto-trigger 和 adapter stats persistence 配置；`.gitignore` 增加 `.agenthub/`。
- `scripts/smoke-test.mjs` 增加可选断言：
  - `$env:AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL="true"`
  - `$env:AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE="true"`
- `scripts/e2e-browser.mjs` 兼容 auto-trigger approval 环境，并可验证消息卡片中的 `.message-auto-trigger`。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- 启动临时 backend：
  - `$env:AGENTHUB_ORCHESTRATOR_AUTO_TRIGGER_ENABLED="true"`
  - `$env:AGENTHUB_ORCHESTRATOR_AUTO_TRIGGER_REQUIRE_APPROVAL="true"`
  - `$env:AGENTHUB_ADAPTER_STATS_PERSISTENCE_ENABLED="true"`
  - `$env:AGENTHUB_ADAPTER_STATS_PERSISTENCE_PATH="backend/target/adapter-route-stats-smoke.json"`
- 启动临时 frontend 后执行：
  - `$env:AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL="true"; $env:AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE="true"; node scripts/smoke-test.mjs`
  - `$env:AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL="true"; cd frontend; npm run e2e:browser`
- `git diff --check`
- `git ls-files "*.tsbuildinfo"`：无输出

### 静态 / Mock / Placeholder 部分

- 自动触发仍是关键词 / mention 规则，不是 LLM intent classifier。
- Approval Gate 是本地内存审批流，未接 RBAC、多用户审批或持久化数据库。
- Adapter stats snapshot 是本地 JSON，不是生产级多实例监控或 SLA 统计。
- E2E 是轻量浏览器主链路验证，不是完整 UI 自动化测试体系。

### 遗留问题

- auto-trigger 默认仍关闭，正式演示时需要显式开启配置。
- ApprovalRequest 本身仍是内存仓储，重启后审批状态会丢失。
- Adapter stats snapshot 不是事件日志，无法审计每次 Adapter 调用细节。
- 自动触发策略还缺更细粒度风险分级和用户偏好配置。

### 下一步建议

- 将 auto-trigger 配置暴露到 Workspace 设置面板，支持用户选择“关闭 / 建议 / 自动但需确认”。
- 将 ApprovalRequest 持久化，与 ActionAuditLog 一起形成完整操作审计链。
- 增加 Adapter route stats 面板，展示各 Adapter 的 attempts、successes、fallbacks、failures 和当前路由权重。

## Phase 67：Multi-agent 课题核对与 Auto-trigger / Stats 稳定性修复

### 目标

- 使用 Codex multi-agent 对课题要求、后端实现和前端验收路径做并行核对。
- 修复 auto-trigger approval、Adapter stats persistence、前端确认交互和文档口径中的关键不一致。
- 保持 demo-task、Artifact、Revision、Deploy Preview、Approval Gate、Audit 和 smoke test 主链路稳定。

### 主要变更

- `FileAgentAdapterStatsRepository` 的持久化写入改为串行保存，并使用唯一临时文件，降低并行 TaskStep 同时写 JSON snapshot 的 Windows 文件占用风险。
- `OrchestratorAutoTriggerService` 在 auto-trigger enabled 且 require-approval=true 时，对用户消息级 Orchestrator run 强制校验 `approvalId`，不再只依赖关键词命中路径。
- `MessageController` 将 auto-trigger 后置副作用隔离为 warning，避免消息已保存后因审批或触发副作用失败导致发送接口整体失败。
- `ApprovalController` / `ActionAuditController` 增加最小 request validation，避免空 action、target、status、summary 进入审批和审计记录。
- `MessageBubble` 和 `WorkspacePage` 将 auto-trigger 确认流调整为两步：先创建确认请求，再批准并运行，并将相关 UI 文案中文化。
- README、technical-design、demo-checklist 同步默认 smoke 与 opt-in extended smoke 的边界，明确 REAL_ADAPTER、REAL_FIRST、REJECTION、auto-trigger approval、Adapter stats persistence 不是默认 smoke 全部强断言。
- dev-log 中的扩展 smoke 命令改为 PowerShell 友好的环境变量写法。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- 启动临时 backend / frontend 后执行扩展 smoke：
  - `$env:AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL="true"`
  - `$env:AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE="true"`
  - `node scripts/smoke-test.mjs`
- 执行浏览器 E2E：
  - `$env:AGENTHUB_E2E_EXPECT_AUTO_TRIGGER_APPROVAL="true"`
  - `cd frontend && npm run e2e:browser`
- `git diff --check`
- `git ls-files "*.tsbuildinfo"`：无输出

### 静态 / Mock / Placeholder 部分

- auto-trigger 仍是规则化关键词 / mention 策略，不是 LLM intent classifier。
- Approval Gate 仍是本地轻量审批，不是完整 RBAC、多用户审批或企业级审批流。
- Adapter stats persistence 是本地 JSON snapshot，不是生产级监控、SLA 统计或多实例一致性方案。
- REJECTION 协议枚举可用，但 reviewer rejection -> retry / revise 的完整闭环仍未完成。

### 遗留问题

- 浏览器 E2E 当前验证 auto-trigger 卡片可见和主链路完成，但仍可进一步细化到真实点击两步确认 UI。
- `POST /messages` 仍只返回 Message，auto-trigger suggestion / pending approval 需要通过后续查询或卡片展示获取。
- `/api/adapters` 仍未直接暴露 route stats 面板数据。
- ApprovalRequest 仍是内存仓储，重启后审批状态不会保留。

### 下一步建议

- 将浏览器 E2E 的 auto-trigger 验证从“卡片可见”增强到“点击创建确认 -> 点击批准并运行 -> TaskRun 完成”。
- 增加 Adapter route stats 可视化面板，展示 attempts、successes、fallbacks、failures 和当前路由权重。
- 继续补 reviewer REJECTION -> retry / revise 的闭环，避免协议只停留在 badge 展示。

## Phase 68：Reviewer REJECTION 与 Retry / Revise 闭环

### 目标

- 将 `REJECTION` 从协议枚举 / 条件展示推进为可验收闭环。
- Reviewer 拒绝时阻塞 TaskRun，生成 REJECTION 协作消息，并创建 retry / revise 修复建议 Artifact。
- 默认 demo 仍走 APPROVAL，不破坏稳定 smoke。

### 主要变更

- 新增 `ReviewDecision` 和 `ReviewDecisionEvaluator`，以结构化判定替代只依赖 `TaskStep` 字符串偶发命中。
- 增加 `agenthub.orchestrator.review.force-rejection-enabled` 和 `agenthub.orchestrator.review.rejection-keywords` 配置。
- Orchestrator 在 Reviewer step 后生成 ReviewDecision：
  - `APPROVED`：保持 TaskRun `COMPLETED` 和 `APPROVAL` 协作消息。
  - `REJECTED`：TaskRun 标记为 `BLOCKED`，Review Report 标记为 `REJECTED`，并追加 Reviewer / Orchestrator `REJECTION` 消息。
- 拒绝时创建 `Reviewer retry / revise advice` Artifact，内容包含 blockers、affected artifacts 和 retry instruction。
- `OrchestratorDecisionLog` 记录 reviewDecision、source、affectedArtifacts、blockers 和 retryInstruction。
- `scripts/smoke-test.mjs` 增加 opt-in REJECTION 断言：
  - `$env:AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION="true"`
  - `node scripts/smoke-test.mjs`
- `.env.example`、`scripts/README.md`、`demo-checklist.md` 同步 REJECTION 可选验收说明。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- 默认 smoke：`node scripts/smoke-test.mjs`
- REJECTION smoke：
  - `$env:AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION="true"`
  - `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- ReviewDecision v1 是规则化关键词判定，不是真实静态分析、测试执行或完整 QA 引擎。
- retry / revise advice 是可见修复建议，不自动修改代码 Artifact。
- 修复仍通过现有 Artifact Revision / Apply Diff / Approval Gate 路径完成。
- 默认 demo 不触发 REJECTION，避免破坏主链路稳定性。

### 遗留问题

- 还没有根据 blocker 自动生成 patch。
- 还没有 Reviewer 二次复审后的真实状态机迁移。
- REJECTION 判定尚未接入真实测试结果、lint 结果或代码分析结果。

### 下一步建议

- 将 Reviewer REJECTION 与真实 line diff / patch apply 结合，支持“根据 blocker 生成候选修复”。
- 增加浏览器 E2E 对 `BLOCKED` TaskRun 和 REJECTION badge 的可选验证。
- 将 ReviewDecision 进一步纳入 Orchestrator explain panel 的结构化展示。

## Phase 69：P1 IM 协作深度五项验收增强

### 目标

- 完善 P1-1 到 P1-5 的可验收性，而不是重做已有主链路。
- 让任意消息触发、Adapter health 加权路由、Context Retrieval 可解释 UI、轻量附件模型和浏览器 E2E 在界面和脚本中更清楚。

### 主要变更

- `/api/adapters` 返回 Adapter route stats：attempts、successes、fallbacks、failures、successRate、fallbackRate。
- Agent List 展示首选 Adapter 的路由画像，用于说明 Adapter health / 历史成功率 / fallback 频率如何影响路由。
- ContextPanel 在 retrieved context 为空时显示显式空状态，并在命中项中补充 source、score、reason、injects into 和 match mode。
- ChatInput 的轻量附件能力从手动文件名扩展为可选择本地文件并提取元数据 / 文本预览；仍不上传真实文件。
- Browser E2E 增加 message attachment card 和 retrieved context item 的 UI 可见性断言。
- `scripts/README.md` 同步 smoke / E2E 覆盖范围。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- 如需完整运行，先启动 backend / frontend，再执行 `node scripts/smoke-test.mjs` 和 `cd frontend && npm run e2e:browser`。

### 静态 / Mock / Placeholder 部分

- auto-trigger 仍是配置化规则触发，不是完整 LLM intent classifier。
- Adapter route stats 是本地轻量画像，不是生产级监控系统。
- 轻量附件只保存 metadata / preview，不做真实上传、对象存储或文件下载。
- Browser E2E 是主流程冒烟，不是完整 UI 自动化测试体系。

### 遗留问题

- Adapter 候选池全局加权执行尚未替代 preferred adapter + fallback 的稳定链路。
- Context Retrieval explain 仍是规则化分数，不含 embedding、向量召回或权限过滤。
- 轻量附件没有真实二进制内容存储和下载链路。
- Browser E2E 还可以继续覆盖 REJECTION、diff apply 和完整 auto-trigger 点击链。

### 下一步建议

- 如果继续补 P1，优先完善 Demo 视频脚本和中文文档编码。
- 后续可做 Adapter route stats 专门面板，展示各 Adapter 路由权重变化。
- 附件模型下一步再考虑最小文件上传接口，不要直接引入复杂对象存储。

## Phase 70：真实动态能力推进第一轮

### 目标

- 将当前“静态 / 半真实 / 可展示”的 MVP 继续推进到更真实的数据链路和动态执行骨架。
- 优先补真实文件附件、Adapter 候选池加权路由、Context Retrieval v3、REAL_FIRST 验证入口、浏览器 E2E 附件覆盖和持久化层规划。

### 主要变更

- 新增 `AttachmentRecord`、`AttachmentRepository`、`InMemoryAttachmentRepository`。
- 新增 `AttachmentStorageService` / `LocalAttachmentStorageService` 和 `AttachmentApplicationService`，默认使用本地文件系统保存上传文件。
- 新增 `AttachmentController`：
  - `POST /api/conversations/{conversationId}/attachments`
  - `GET /api/attachments/{attachmentId}`
  - `GET /api/attachments/{attachmentId}/download`
  - `GET /api/conversations/{conversationId}/attachments`
- `MessageController` 在发送消息时兼容旧 metadata-only attachment，同时会把已上传附件绑定到 message。
- 新增 `AdapterRoutingService` / `AdapterRoutingDecision`，将 Adapter 候选池评分从 AgentRouter 中拆出：health、success rate、fallback penalty、preferred bonus 共同影响首选 Adapter。
- `ContextRetrievalService` 升级到 v3 解释字段：`sourceRank`、`baseScore`、`keywordScore`、`recencyScore`、`importanceScore`、`matchedTokens`、`windowPolicy`。
- 前端 `ChatInput` 支持先上传真实文件再发送 `attachmentId`；`MessageBubble` 展示下载链接。
- `ContextPanel` 展示 Context Retrieval v3 分项得分和 matched tokens。
- `scripts/smoke-test.mjs` 使用真实附件上传 / 下载链路验证消息附件。
- `scripts/e2e-browser.mjs` 在 seed 阶段上传真实轻量附件，而不是只写 metadata。
- 新增 `docs/persistence-plan.md`，规划内存仓储、本地附件、JDBC/MySQL 仓储和附件 metadata / binary 分层。
- `scripts/README.md` 同步真实附件、Context Retrieval v3 和浏览器 E2E 覆盖范围。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 附件存储是本地文件系统，不是 MinIO / S3 / 对象存储。
- Adapter 候选池只选择首选 Adapter，执行失败仍通过现有 Registry fallback 到 MOCK。
- Context Retrieval v3 仍是规则检索，不做 embedding、向量库、权限过滤或跨会话全局检索。
- REAL_FIRST 仍需要显式配置和真实 / fixture Adapter 成功输出；默认环境仍允许静态模板和 Mock fallback。
- 浏览器 E2E 仍是关键 UI 可见性验证，不是完整端到端测试体系。

### 遗留问题

- 附件 metadata 仍是内存仓储，重启后会丢失。
- 本地附件文件没有清理策略、checksum、病毒扫描或权限模型。
- Adapter 候选池还没有独立 UI 面板展示每个候选分数。
- Context Retrieval v3 仍未接入真正语义检索。
- 持久化层仍是规划文档，尚未实现 JDBC/MySQL 仓储。

### 下一步建议

- 补 Adapter Routing Decision 的前端面板，把候选 Adapter 分数、最终选择和 fallback policy 可视化。
- 扩展 smoke test 的 REAL_FIRST fixture 路径，确保无真实 key 时也能稳定验证真实输出契约。
- 如继续推进生产化，优先实现附件 metadata 的持久化仓储，而不是直接上对象存储。

## Phase 71：附件生产化骨架、Adapter 路由面板与 Context Retrieval v4

### 目标

- 借鉴已有项目的生产化经验，继续补齐 AgentHub 的附件安全边界、Adapter 路由可解释性、JDBC 最小持久化切换和 Context Retrieval hybrid explain 字段。

### 主要变更

- `AttachmentRecord` 增加 `storageKey`、`checksumSha256`、`visibility`、`ownerUserId`、`scanStatus`、`deletedAt`。
- 新增 `AttachmentAccessGuard`，下载和读取前校验删除状态、扫描状态和会话归属。
- 新增 `AttachmentScanService` / `NoopAttachmentScanService`，默认本地 no-op 扫描但保留生产化状态字段。
- 新增 `AttachmentCleanupService` / `NoopAttachmentCleanupService`，先保留清理策略扩展点。
- `LocalAttachmentStorageService` 返回 `storageKey`，`AttachmentApplicationService` 上传时计算 SHA-256 并记录 scan result。
- memory repository 增加 `agenthub.persistence.mode=memory` 条件，JDBC repository 通过 `agenthub.persistence.mode=jdbc` 启用。
- `AdapterRoutingDecision.describe()` 输出完整候选池分数。
- `TaskRunPanel` 增加独立 Adapter Routing Scores 面板，展示 health、success rate、fallback penalty、preferred bonus、status、total score 和最终选择。
- `Context Retrieval` 增加 `semanticScore`，并抽出 `ContextSemanticScoringService` / `HeuristicContextSemanticScoringService`，为后续 embedding backend 预留接口。
- `ContextPanel` 展示 semantic score。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 附件扫描当前是 no-op local scan，不代表真实杀毒能力。
- 附件清理当前是 no-op 扩展点，不会自动删除文件。
- JDBC repository 是最小 profile 切换骨架，默认仍使用 memory；未配置 JDBC URL 时不会启用。
- Context Retrieval v4 的 `semanticScore` 当前是 heuristic backend，不是 embedding / vector search。
- Adapter Routing Scores 面板展示候选评分，但执行失败仍由现有 Registry fallback 到 MOCK。

### 遗留问题

- 尚未接入真实 antivirus / malware scanning。
- 尚未实现生产级附件清理调度。
- JDBC 模式需要真实数据库连接后继续做完整回归。
- Context Retrieval 尚未接入 ES / pgvector / embedding service。

### 下一步建议

- 启动 backend / frontend 后跑完整 smoke test，确认附件上传、下载、Context explain 和 Adapter routing 面板端到端正常。
- 如继续推进生产化，下一步优先做 JDBC profile 的本地 MySQL 初始化脚本和 smoke test profile，而不是直接引入对象存储或向量库。

## Phase 72：SSE 实时通道与运行状态快照

### 目标

- 在不引入 WebSocket / Redis / Kafka 的前提下，为 AgentHub Workspace 增加服务端推送能力。
- 借鉴通用 generation state 思路，为 TaskRun 提供可查询的运行状态快照，便于断线后恢复状态。

### 主要变更

- 新增 `RealtimeEvent` / `RealtimeEventPublisher` / `RealtimeEventStore` / `SseConnectionRegistry`。
- 新增 SSE 接口：`GET /api/conversations/{conversationId}/events`。
- 新增运行状态快照：`RealtimeRunState` / `RealtimeRunStateService`。
- 新增状态查询接口：
  - `GET /api/task-runs/{taskRunId}/realtime-state`
  - `GET /api/conversations/{conversationId}/active-realtime-state`
- Message、TaskRun、TaskStep、Artifact、Context、Handoff、Deployment、Approval、ActionAudit 的关键写入点会发布 realtime event。
- Workspace 使用 `EventSource` 连接当前 conversation 的 SSE stream，收到事件后复用现有 REST loader 做轻量刷新。
- 新增 `scripts/sse-smoke-test.mjs`，用于 API 级验证 SSE 事件和 realtime state。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/sse-smoke-test.mjs`
- 手动测试：打开两个 `/workspace` 标签页，在一个标签页发送消息 / 运行 Demo Task / Deploy，另一个标签页应通过 SSE 自动刷新。

### 静态 / Mock / Placeholder 部分

- 本轮只做 SSE server push，不做 WebSocket 双向控制。
- SSE event 只是刷新提示，前端仍以 REST API 返回的数据为权威状态。
- 运行状态快照是内存 TTL 存储，不是 Redis / JDBC / 多节点共享状态。
- 不做真实 LLM token streaming，不做任务取消，不做跨节点 event broker。

### 遗留问题

- WebSocket 控制面仍未实现，后续可用于 `CANCEL_RUN` / `STOP_GENERATION`。
- SSE 当前是单实例内存事件总线，多实例部署需要 Redis pub/sub 或消息 broker。
- TaskRun 仍是同步执行后批量发布事件，不是细粒度 token / step streaming。
- `scripts/sse-smoke-test.mjs` 需要 backend 运行后手动执行，不会自动启动服务。

### 下一步建议

- 如果继续实时化，优先做 WebSocket control plane 的最小取消指令，而不是直接做完整双向聊天。
- 若要接近生产部署，再把 `RealtimeEventStore` 和 `RealtimeRunStateService` 抽到 Redis / JDBC 实现。

## Phase 73：SSE Smoke 验证与 Adapter 输出解析增强

### 目标

- 启动后端并验证 `scripts/sse-smoke-test.mjs`，确认 SSE event 与 realtime state 主链路可用。
- 提升真实 / 半真实 Adapter 输出进入 Artifact 的兼容性，减少模型输出 JSON 结构轻微变化导致解析失败。

### 主要变更

- 已通过 `node scripts/sse-smoke-test.mjs` 验证 SSE 事件流，收到 `CONNECTED`、`MESSAGE_CREATED`、`TASK_RUN_CREATED`、`ARTIFACT_CREATED`、`TASK_RUN_UPDATED`，并成功查询 active realtime state 与 task run realtime state。
- `AdapterArtifactExtractor` 支持更多 Adapter 输出形态：
  - 根对象 `artifacts[]`
  - 单个 `artifact`
  - 根对象直接作为 artifact
  - 字段别名：`fileName` / `filename` / `body` / `text` / `markdown` / `code` / `artifactType` / `kind`
- `AgentBuilderPage` 的 Adapter 测试结果解析逻辑与后端对齐，测试面板可以识别同样的 JSON 输出约定。
- `ArtifactPanel` 的 source metadata 增加 `sourceTaskStepId` 展示，便于追踪真实 Adapter Artifact 来自哪个 TaskStep。

### 验证方式

- `node scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮没有引入真实 token streaming、WebSocket 双向控制或多节点事件总线。
- Adapter 输出解析增强不保证外部模型一定返回高质量产物；无效 JSON 仍会降级为文本 Artifact 或走 Mock fallback。
- JDBC 持久化和 Context Retrieval embedding / vector search 仍是后续增强项。

### 遗留问题

- CODE 类型真实 Adapter Artifact 的内容质量仍取决于模型输出契约，后续可继续减少 metadata wrapper 对代码内容的干扰。
- 运行状态快照仍是单实例内存 TTL，不适合多节点生产部署。
- Context Retrieval v4 当前是规则 / heuristic 语义分，不是真实 embedding 检索。

### 下一步建议

- 继续增强真实 Adapter 输出质量，优先让 `OPENAI_COMPATIBLE` 在 `REAL_FIRST` 模式下稳定输出主 Artifact。
- 如果继续生产化实时能力，再做 WebSocket control plane 的取消 / 停止指令，而不是直接上完整双向聊天。

## Phase 74：JDBC 初始化脚本与 Context Semantic Backend 标识

### 目标

- 为 JDBC profile 提供显式初始化 SQL 和本地验证入口，降低只依赖 repository 自动建表的交付风险。
- 让 Context Retrieval 的 semantic scoring 不只展示分数，也展示当前 semantic backend 类型和 fallback 说明。

### 主要变更

- 新增 `backend/src/main/resources/schema-jdbc.sql`，覆盖当前 JDBC repository 已实现的核心表：Conversation、Message、AttachmentRecord、Artifact、TaskSpec、TaskRun、TaskStep。
- 新增 `scripts/jdbc-smoke-test.mjs`，复用主 API smoke test，并强制开启 JDBC profile 期望标记。
- `application.yml` 增加 `agenthub.context.semantic.backend` 配置，默认 `heuristic`。
- `RetrievedContextItem` 增加 `semanticBackend` / `semanticExplanation`。
- `ContextRetrievalService` 保留现有规则检索，同时把 `ContextSemanticScoringService` 的 backend / explanation 写入 retrieved context。
- `ContextPanel` 展示 semantic backend 和 semantic explanation。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/jdbc-smoke-test.mjs`
- JDBC profile 手动验证：先运行 `schema-jdbc.sql`，再以 `AGENTHUB_PERSISTENCE_MODE=jdbc` 启动 backend，执行 `node scripts/jdbc-smoke-test.mjs`。

### 静态 / Mock / Placeholder 部分

- 默认 persistence 仍是 memory；JDBC 需要用户显式配置数据库连接。
- `AGENTHUB_CONTEXT_SEMANTIC_BACKEND=embedding` 当前只会标识为 `EMBEDDING_DISABLED` 并回退 heuristic，不会调用外部 embedding 服务。
- 本轮没有引入 ES / pgvector / Redis / Kafka / 对象存储。

### 遗留问题

- JDBC profile 仍需接真实数据库做完整端到端回归。
- Context Retrieval 仍是规则检索 + heuristic semantic score，不是真实向量检索。
- ContextSnapshot 本身仍未迁移到 JDBC repository。

### 下一步建议

- 给 JDBC profile 增加 CI 级临时数据库验证，避免 schema 与 repository 字段漂移。
- 如果继续增强 Context Retrieval，下一步做可选 embedding provider adapter，但保持 heuristic fallback。

## Phase 75：Smoke / SSE / REAL_FIRST 验证与文档边界同步

### 目标

- 强化 AgentHub API smoke 和 SSE smoke 的生产化验证边界。
- 让 REAL_FIRST、JDBC profile、附件下载、SSE 状态恢复具备显式 opt-in 验收方式。
- 同步 README、scripts 说明、technical design 和 demo checklist，明确当前未做 WebSocket / token streaming / multi-node / real deploy。

### 主要变更

- `scripts/smoke-test.mjs` 增加 `AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE`，用于在 backend 以 JDBC profile 启动时复用完整 API 主链路做验证。
- `scripts/smoke-test.mjs` 对 Context Retrieval v4 增加 `semanticScore`、score breakdown、`semanticBackend`、`matchedTokens` 断言。
- `scripts/sse-smoke-test.mjs` 解析 SSE `id`，并通过 `Last-Event-ID` 重连验证 retained event replay。
- `scripts/sse-smoke-test.mjs` 验证 realtime state 中的 `lastEventId`，用于断线恢复对齐。
- `scripts/README.md` 补充 REAL_FIRST、JDBC profile、SSE replay / recovery 的运行说明。
- README、technical design、demo checklist 增加真实动态验证边界说明。

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 如 backend 已启动，可运行 `node scripts/sse-smoke-test.mjs` 验证事件、replay 和 realtime state。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实 LLM、真实外部 Agent、真实数据库或真实部署。
- REAL_FIRST 验证需要显式配置真实 / 半真实 Adapter，并开启 `AGENTHUB_SMOKE_EXPECT_REAL_FIRST=true`。
- JDBC profile 验证需要 backend 已用 `AGENTHUB_PERSISTENCE_MODE=jdbc` 和 JDBC 连接环境变量启动。
- SSE 当前仍是单节点 server push 和 REST reload 提示，不是 WebSocket control plane、真实 token streaming 或多节点事件总线。

### 遗留问题

- 尚未提供 CI 级临时数据库自动启动。
- 尚未做 WebSocket 双向 cancel / stop run。
- 尚未做真实 token streaming。
- 尚未做多节点 realtime broker。

### 下一步建议

- 在 JDBC profile 稳定后增加临时数据库自动化验证。
- 如果继续实时化，优先做 WebSocket control plane 的 cancel / stop run，而不是直接上 token streaming。

## Phase 76：真实 Adapter 输出质量闭环与 REAL_FIRST 主产物收敛

### 目标

- 将 `REAL_FIRST / OPENAI_COMPATIBLE / REAL_ADAPTER Artifact` 从可选展示推进为可解释、可验证的真实动态产物链路。
- 明确真实 Adapter 输出何时可成为主 Artifact，何时应回退静态模板。

### 主要变更

- 新增 `AdapterArtifactQualityEvaluator`，对 Adapter Artifact 输出做规则化质量检查。
- `TaskStep` 记录 `realOutputUsed`、`artifactParseStatus`、`artifactQualityStatus`、`artifactQualityReason`。
- `Artifact` 记录 `qualityStatus` / `qualityReason`，Artifact Studio 和 TaskRunPanel 展示质量状态。
- `REAL_FIRST` 只在非 MOCK Adapter 输出合法 JSON Artifact 且质量通过时归档静态模板；不合格输出不会覆盖主产物。
- OpenAI-compatible prompt contract v2 明确 JSON schema、CODE 原始源码要求和 fallback 边界。
- JDBC schema / repository 同步新增 Artifact 与 TaskStep 质量字段。
- smoke test 增加 REAL_ADAPTER quality metadata 与 REAL_FIRST 主产物断言。
- Adapter Test Panel 增加前端侧 artifact parse / quality 摘要，便于手动判断真实 Adapter 响应是否满足 REAL_FIRST contract。
- smoke test 放宽“真实 Adapter step 必须产物化”的断言，只要求已采纳的真实输出生成 REAL_ADAPTER Artifact；被质量拒绝的输出必须记录拒绝原因。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- 默认 memory 模式下运行 `node scripts/smoke-test.mjs`
- 默认 memory 模式下运行 `node scripts/sse-smoke-test.mjs`
- 使用临时端口和 OpenAI fixture 运行 `AGENTHUB_SMOKE_EXPECT_OPENAI_FIXTURE=true` + `AGENTHUB_SMOKE_EXPECT_REAL_FIRST=true` 的 smoke test。

### 静态 / Mock / Placeholder 部分

- 本轮没有接真实外部 LLM，也不要求真实模型调用成功。
- 默认 smoke 仍不依赖真实 API key。
- 质量评估是规则化检查，不是模型质量评测或真实代码执行。
- 不推进 MySQL、WebSocket、token streaming、多节点事件总线或真实部署平台。

### 遗留问题

- 真实 Adapter 输出质量仍取决于外部模型对 JSON contract 的遵循程度。
- 质量评估暂未执行真实编译、测试、lint 或安全扫描。
- 失败路径已可解释，但还没有独立 Adapter output quality dashboard。

### 下一步建议

- 为真实 Adapter Artifact 增加可选的代码 lint / JSON schema 校验。
- 后续可增加独立 Adapter output quality dashboard，并接入更严格的 JSON Schema / lint 验证。

## Phase 77：真实 OpenAI-compatible Adapter 端到端验证入口

### 目标

- 增加一个 opt-in 真实外部 LLM 验证脚本，把 `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact` 从 fixture 验证推进到真实 provider 可验收路径。
- 保持默认 smoke 不依赖 API key，不把 fixture 验证误写成真实 provider 验证。

### 主要变更

- 新增 `scripts/real-adapter-smoke-test.mjs`。
- 脚本要求显式配置 `AGENTHUB_OPENAI_ENABLED`、`AGENTHUB_OPENAI_BASE_URL`、`AGENTHUB_OPENAI_API_KEY`、`AGENTHUB_OPENAI_MODEL` 和 `AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST`。
- 脚本拒绝 `AGENTHUB_OPENAI_FIXTURE_ENABLED=true`，避免把 fixture 当真实 LLM。
- 脚本验证 `/api/adapters`、`POST /api/adapters/OPENAI_COMPATIBLE/execute`、demo-task、`REAL_ADAPTER` 主 Artifact、`qualityStatus=ACCEPTED` 和静态 fallback archived。
- `scripts/README.md` 和 `README.md` 补充真实 provider 验证说明。

### 验证方式

- `node --check scripts/real-adapter-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- 默认环境不运行真实 provider smoke；只有启动 backend 时已配置真实 OpenAI-compatible provider 后再运行 `node scripts/real-adapter-smoke-test.mjs`。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实外部 LLM。
- 本轮没有提交任何 API key，也不要求所有开发者必须有真实 provider。
- 真实 provider smoke 只验证 OpenAI-compatible 链路，不代表 Codex / Claude Code / OpenCode 深度平台接入完成。
- 不推进 MySQL、WebSocket、token streaming、多节点事件总线或真实部署平台。

### 遗留问题

- 真实 provider 输出质量仍依赖模型是否遵守 Artifact JSON contract。
- 脚本只做端到端质量门禁，不做代码编译、lint、安全扫描或真实 UI E2E。
- 真实 provider 验证需要用户本地手动启动 backend 并配置环境变量。

### 下一步建议

- 在真实 provider smoke 稳定后，再做 MySQL 端到端实库验证。
- 若真实 Adapter 输出仍不稳定，优先补 JSON Schema 校验和更强 prompt contract，而不是先做 token streaming。

## Phase 78：自动评审 Retry / REAL_ADAPTER 构建校验与代码质量评分

### 目标

- 继续从半真实 Adapter 输出推进到可解释、可回退的真实动态产物链路。
- 为真实 Adapter 产物增加轻量构建校验和代码质量评分。
- 让 Reviewer 失败路径输出结构化 retry / revise 指令，不伪造自动修复。

### 主要变更

- `AdapterArtifactQualityEvaluator` 增加规则化质量评分、build validation 状态和 retry advice 文案。
- `AgentStepExecutor` 在 `REAL_FIRST` 下拒绝未通过合法 JSON、质量门禁或轻量构建校验的真实产物，保留静态 fallback。
- `ReviewDecisionEvaluator` 输出结构化 `REVISE_AND_RETRY` 指令，明确 `autoFix=false` 和 affected artifacts。
- `OrchestratorService` 保留 Artifact 质量元数据，并为 Reviewer rejection advice artifact 增加结构化 retry plan。
- Artifact Studio / TaskRunPanel 展示真实输出、build validation、quality score、retry/revise 信息。
- smoke 脚本增加可选断言：真实 build validation、真实质量分数、真实质量原因。

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- 默认 memory 模式运行 `node scripts/smoke-test.mjs`
- 默认 memory 模式运行 `node scripts/sse-smoke-test.mjs`
- `node scripts/real-adapter-smoke-test.mjs` 在未配置真实 provider 时保持 opt-in skip，不影响默认验证。

### 静态 / Mock / Placeholder 部分

- 构建校验是轻量规则校验，没有执行真实 `npm build`、lint、unit test 或浏览器渲染。
- 代码质量评分是启发式分数，不是完整静态分析、安全扫描或模型评测。
- Reviewer retry / revise 本轮只生成结构化建议，不自动修改代码 Artifact。
- 默认环境仍允许 MOCK / static fallback，真实 provider 仍需显式配置。

### 遗留问题

- 真实代码质量仍依赖外部模型输出和后续真实构建验证。
- retry / revise 还没有自动触发二次 Agent 修复运行。
- 质量评分尚未沉淀为独立 dashboard 或历史趋势。

### 下一步建议

- 增加可选真实 build/lint 验证脚本，但默认仍不阻塞无 Node 项目结构的 Demo。
- 将 retry / revise advice 接入显式用户确认流，允许用户一键创建修复 TaskRun。
- 后续在真实 provider 链路稳定后再推进持久化实库验证。

## Phase 79：OpenAI-compatible 深度稳定化与 REAL_ADAPTER 观测字段贯通

### 目标

- 优先打磨 OpenAI-compatible 真实输出链路，作为真实 Agent 深度接入的第一阶段。
- 收紧真实 provider 输出的 JSON Artifact contract，增强失败诊断，并把构建校验 / 质量分数贯通到 Artifact、TaskStep 和 JDBC schema。
- 明确本轮不同时铺开 Claude Code / Codex / OpenCode 深度接入。

### 主要变更

- `OpenAICompatibleAgentAdapter` 增强 JSON-only prompt、Artifact contract 校验、provider HTTP 错误解析、超时 / I/O / 非 JSON 响应诊断和敏感信息脱敏。
- 新增可选 `AGENTHUB_OPENAI_JSON_RESPONSE_FORMAT_ENABLED` / `agenthub.adapters.openai-compatible.json-response-format-enabled`，仅显式开启时向兼容 provider 发送 JSON response format。
- `AgentStepExecutor` 将 `buildValidationStatus`、`qualityScore`、`qualityReason` 写入 TaskStep 输出摘要，并在 REAL_FIRST 下保留静态 fallback 的 archived 状态。
- `Artifact` / `TaskStep` 增加构建校验与质量分数字段，前端和 smoke 可直接读取。
- JDBC Artifact / TaskStep repository 与 `schema-jdbc.sql` 同步新增 build validation 和 quality score 字段。
- `real-adapter-smoke-test.mjs` 增加 opt-in 断言：真实执行 JSON contract、REAL_FIRST 主产物、build validation、quality score、quality reason。
- `.env.example` 补充 OpenAI-compatible JSON response format 配置项。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node scripts/real-adapter-smoke-test.mjs` 在未配置真实 provider 时保持 opt-in skip；真实 provider 验证仍需用户本地显式配置。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实外部 LLM。
- 本轮没有提交任何 API key，也不要求真实 provider 必须可用。
- 构建校验仍是轻量规则化校验，没有执行真实 `npm build`、lint、测试或浏览器渲染。
- Codex / Claude Code / OpenCode 仍是 CLI 探测型 Adapter，本轮没有做深度平台接入。
- 不推进 MySQL 实库验证、WebSocket 双向控制、token streaming、多节点事件总线或真实部署平台。

### 遗留问题

- OpenAI-compatible 的真实产物质量仍取决于 provider 对 JSON contract 的遵循程度。
- `response_format=json_object` 并非所有 OpenAI-compatible provider 都支持，因此默认关闭。
- 质量门禁仍是规则化，不是完整 JSON Schema validator、编译器、静态分析器或安全扫描。
- 真实 provider 端到端验证需要本地启动 backend 并配置真实环境变量。

### 下一步建议

- 在真实 provider 验证稳定后，为 OpenAI-compatible 增加更严格 JSON Schema 校验和可选真实 lint/build 验证。
- 再考虑 MySQL 实库验证或 WebSocket control plane；Claude/Codex/OpenCode 深度接入应等 OpenAI-compatible 链路稳定后再做。

## Phase 80：OpenAI-compatible 瞬时失败重试与后续边界确认

### 目标

- 继续优先稳定 OpenAI-compatible 真实 provider 链路，不同时铺开 Claude / Codex / OpenCode 深度接入。
- 为真实 provider 的瞬时失败增加最小可配置 retry，降低 429 / 5xx / timeout / I/O 抖动导致的误 fallback。
- 明确 MySQL/JDBC 验证 sprint 和 WebSocket cancel / stop run 都是后续项，不在本轮扩大实现面。

### 主要变更

- `OpenAICompatibleAgentAdapter` 增加可配置 retry：
  - `agenthub.adapters.openai-compatible.max-retries`
  - `agenthub.adapters.openai-compatible.retry-backoff-millis`
  - 对应环境变量 `AGENTHUB_OPENAI_MAX_RETRIES`、`AGENTHUB_OPENAI_RETRY_BACKOFF_MILLIS`
- retry 只覆盖 transient failure：HTTP 429、HTTP 5xx、`HttpTimeoutException`、`IOException`。
- JSON contract 错误、空 content、缺少 artifact 字段等模型输出质量问题不重试，继续返回明确失败原因并走现有 fallback。
- retry 失败信息包含 attempts 摘要，并继续脱敏 API key / Bearer / api_key。
- `.env.example` 和 `application.yml` 同步新增 retry 配置项。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- 使用真实 OpenAI-compatible provider 临时启动 backend，并运行 `node scripts/real-adapter-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮没有做 Claude / Codex / OpenCode 深度平台接入。
- retry 不保证 provider 一定成功，只减少瞬时失败；最终失败仍由 Adapter Registry fallback 到 MOCK。
- MySQL/JDBC 仍保持 profile 骨架和后续验证 sprint，不切默认持久化。
- SSE 仍是当前 MVP 的实时刷新通道；WebSocket cancel / stop run、token streaming、多节点事件总线仍后置。

### 遗留问题

- OpenAI-compatible 仍需要更严格 JSON Schema validator 和可选真实 lint/build 验证。
- MySQL/JDBC 还缺实库 create/query/update 断言和部分 repository 的 JDBC 覆盖。
- WebSocket cancel / stop run 需要先补 TaskRun 可取消状态机、取消 API、审计和 realtime 事件。

### 下一步建议

- 短期继续围绕 OpenAI-compatible 做真实输出质量和 schema 稳定化。
- 等真实输出链路稳定后，再开 MySQL/JDBC 验证 sprint。
- SSE 足够当前 MVP；WebSocket control plane 可在 TaskRun 取消语义设计完成后推进。

## Phase 81：OpenAI-compatible JSON Schema Validator 与可选真实 CODE 编译验证

### 目标

- 继续稳定 `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact` 链路。
- 将真实 provider 输出从“可解析 JSON”收紧为“必须满足 AgentHub Artifact contract 的 raw JSON”。
- 增加 opt-in 的真实 CODE Artifact TypeScript 编译 smoke，不影响默认 Demo 和无真实 provider 环境。

### 主要变更

- 新增 `AdapterArtifactContractValidator`，统一校验 OpenAI-compatible 输出 contract：
  - root 必须是 JSON object。
  - `assistantMessage` 必须是非空字符串。
  - `artifacts[]` 必须非空。
  - 每个 Artifact 必须包含非空 `title`、`type`、`language`、`content`、`summary`。
  - `type` 必须是 AgentHub 支持的 Artifact 类型。
  - 根响应和 CODE content 都不能使用 Markdown fence。
  - 明显 provider error / exception / unauthorized / rate limit 内容会被拒绝。
- `OpenAICompatibleAgentAdapter` 改为调用统一 validator；schema / contract 错误不 retry，继续返回明确失败原因并走现有 fallback。
- `real-adapter-smoke-test.mjs` 增加 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true`：
  - 将 accepted `REAL_ADAPTER` CODE Artifact 写入 `frontend/.vite/agenthub-real-adapter-smoke/` 临时目录。
  - 生成临时 `tsconfig.json`。
  - 调用 frontend 本地 TypeScript compiler 执行 `tsc --noEmit`。
  - 验证结束后清理临时目录。
- `.env.example` 和 `scripts/README.md` 补充可选 CODE build check 说明。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node scripts/real-adapter-smoke-test.mjs` 在未配置真实 provider 时仍保持 opt-in skip。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实外部 LLM。
- 可选 CODE 编译 smoke 只在显式设置 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true` 时运行。
- CODE 编译只做 TypeScript / TSX 编译检查，不做 ESLint、unit test、Vite full build、浏览器渲染或安全扫描。
- 本轮不推进 Claude / Codex / OpenCode 深度接入，不推进 MySQL 实库验证、WebSocket 双向控制、token streaming、多节点事件总线或真实部署平台。

### 遗留问题

- 真实 provider 生成的代码质量仍受模型输出稳定性影响。
- CODE build check 是脚本级验证，结果不会写回业务数据库或 Artifact 记录。
- 当前 validator 是 Java 代码实现的 contract validator，不是外部 JSON Schema 库。

### 下一步建议

- 使用真实 OpenAI-compatible provider 跑 strict real-adapter smoke，并在需要时开启 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_CODE_BUILD=true`。
- 如果真实 provider 输出不稳定，继续加强 prompt contract 和 artifact quality gate。
- 等真实输出链路稳定后，再推进 MySQL/JDBC 实库验证或 WebSocket cancel / stop run。

## Phase 82：实时 Control Plane MVP 与生产化能力核对

### 目标

- 在现有 SSE 实时刷新能力基础上，补一个最小 WebSocket control plane，为后续 cancel / stop run 打基础。
- 保留 REST fallback，便于 smoke test 和本地验证，不把 WebSocket 作为唯一控制入口。
- 核对 REAL_FIRST、JDBC、Context Retrieval、附件、Adapter stats、E2E 等生产化能力边界，避免把半成品能力包装成完整生产系统。

### 主要变更

- 新增 WebSocket endpoint：`/api/realtime/control`。
- 新增支持命令：
  - `PING`
  - `CANCEL_RUN`
  - `STOP_RUN`
- 新增 REST fallback：
  - `POST /api/task-runs/{taskRunId}/cancel`
  - `POST /api/task-runs/{taskRunId}/stop`
- 新增 `RealtimeControlService`：
  - 校验 TaskRun 是否存在。
  - 终态 TaskRun 拒绝 cancel / stop。
  - 非终态 TaskRun 可标记为 `CANCELLED`。
  - 发布 `CONTROL_COMMAND_RECEIVED` / `CONTROL_COMMAND_REJECTED` 和 `TASK_RUN_UPDATED` realtime event。
  - 更新 `RealtimeRunState`，方便 SSE 恢复状态读取。
- `sse-smoke-test.mjs` 增加 REST fallback 断言：已完成 TaskRun 的 cancel 应被明确拒绝。
- `scripts/README.md` 增加 Realtime Control Plane 使用说明和边界说明。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/sse-smoke-test.mjs`
- 后续可在 backend 启动后运行 `node scripts/sse-smoke-test.mjs` 验证 SSE + control REST fallback。

### 静态 / Mock / Placeholder 部分

- 本轮是 control-plane MVP，不是完整 WebSocket 聊天系统。
- 不做真实 token streaming。
- 不做多节点事件总线。
- 不做真实 in-flight Java 任务线程中断；当前 cancel / stop 是状态控制和事件通知。
- JDBC profile 仍缺 ContextRepository 的 JDBC 实现；Context Retrieval 的 embedding backend 仍是可插拔接口和 heuristic fallback。

### 遗留问题

- WebSocket control 尚未接入前端按钮，也未覆盖真实长任务中断。
- JDBC 模式下 ContextSnapshot / PinnedContext / HandoffSummary 仍需补 JDBC repository。
- Adapter 输出质量统计已有 route stats 和 artifact quality 字段，但还缺独立质量趋势面板。
- 附件 scan / cleanup 仍是接口和 no-op 实现，尚未接真实扫描器或调度策略。
- 浏览器 E2E 已有基础脚本，但还需要持续扩展 auto-trigger、rejection、apply diff、restore 和附件流程。

### 下一步建议

- 优先补 `JdbcContextRepository`，让 JDBC profile 不再混用内存 context。
- 将 WebSocket control plane 接入 Workspace 的 stop/cancel 操作，并记录 ActionAuditLog。
- 为 Adapter artifact parse failure / quality failure 增加独立统计面板。

## Phase 83：JDBC Context、Realtime Control UI 与 Adapter Quality Dashboard

### 目标

- 补齐 JDBC profile 下的 ContextSnapshot / PinnedContext / HandoffSummary 持久化覆盖。
- 将实时 control plane 接入 Workspace，让 TaskRun 可见 Stop / Cancel 控制入口，并通过 ActionAuditLog 记录控制命令。
- 增加 Adapter quality dashboard，集中展示 parse failure、quality failure、build failure、success rate 和 fallback rate。
- 扩展 browser E2E 对 approval、restore、attachment、rejection 的覆盖入口。

### 主要变更

- 新增 `JdbcContextRepository`，并将 `InMemoryContextRepository` 限定为 `agenthub.persistence.mode=memory`。
- `schema-jdbc.sql` 增加 context snapshot、pinned context、handoff summary 表。
- Workspace SSE 监听增加 `CONTROL_COMMAND_RECEIVED` / `CONTROL_COMMAND_REJECTED`，收到 control 事件后刷新任务和审计数据。
- TaskRunPanel 增加 `Stop Run` / `Cancel Run` 按钮；终态 TaskRun 禁用控制并显示提示。
- 新增 `AdapterQualityDashboard`，基于 adapter descriptors 和当前 TaskStep 质量字段展示质量统计。
- `e2e-browser.mjs` 增加 Adapter quality dashboard、Stop / Cancel 控件、approval affected summary、restore approval、ActionAudit panel 和可选 REJECTION 场景断言。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- WebSocket control 仍是 control-plane MVP，不是真实 token streaming 或完整双向聊天。
- Cancel / Stop 当前以状态控制、事件通知和审计为主，不保证中断已经完成的同步任务线程。
- Adapter quality dashboard 展示的是当前 route stats 和 TaskStep 质量信号，不是外部 APM 或长期统计仓库。
- Browser E2E 仍要求前后端已启动，不负责启动服务。

### 遗留问题

- JDBC profile 仍需真实数据库端到端验证。
- WebSocket cancel / stop 仍需接入真正长任务执行器的中断语义。
- Adapter quality trend 目前是当前会话/当前 descriptors 级展示，后续可接持久化统计。
- 附件 scan / cleanup 仍是接口和 no-op 实现，尚未接真实扫描或调度。

### 下一步建议

- 在真实数据库环境跑 JDBC smoke，验证 ContextSnapshot / PinnedContext / HandoffSummary 不再回落内存。
- 为 Adapter quality stats 增加后端聚合 DTO，避免前端只能从当前 TaskRun 派生。
- 如果进入真实长任务执行阶段，再把 WebSocket stop/cancel 连接到执行器 cancellation token。

## Phase 84：Adapter Quality Metrics、JDBC Restart Verify 与执行级 Cancel Token

### 目标

- 继续收敛真实 Adapter 输出质量闭环，让质量统计从前端派生升级为后端聚合指标。
- 补强 JDBC smoke 的重启后查询验证入口，为后续 MySQL 实库 sprint 做准备。
- 将 Stop / Cancel 从 control-plane MVP 推进到执行级 cancellation token 语义。

### 主要变更

- 新增 `AdapterQualityMetricsService`：
  - 记录 adapter attempts、successes、fallbacks、realOutputAccepted。
  - 记录 parse failure、quality failure、build failure。
  - 默认持久化到 `.agenthub/adapter-quality-metrics.json`。
- 新增 `GET /api/adapters/quality-metrics`。
- Workspace `AdapterQualityDashboard` 改为读取后端聚合指标，并继续兼容当前 TaskStep 派生信号。
- 新增 `RunCancellationRegistry`：
  - TaskRun 创建后注册 cancellation token。
  - `CANCEL_RUN` / `STOP_RUN` 接受后写入 token。
  - `AgentStepExecutor` 在 adapter 调用前后检查 token。
  - cancellation 请求后，后续 step 跳过，非流式 adapter 返回结果会被丢弃。
- Orchestrator 在 `TASK_RUN_CREATED` 后立即保存 `RUNNING` TaskRun 快照，让运行中 control command 能命中 taskRunId。
- `scripts/jdbc-smoke-test.mjs` 增加重启验证模式：
  - `AGENTHUB_JDBC_VERIFY_CONVERSATION_ID`
  - `AGENTHUB_JDBC_VERIFY_TASK_RUN_ID`
  - `AGENTHUB_JDBC_VERIFY_ARTIFACT_ID`
- `scripts/sse-smoke-test.mjs` 增加 opt-in active cancel 验证：
  - `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true`
  - 配合 `AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS` 验证运行中 cancel。
- `.env.example` 和 `scripts/README.md` 同步新增配置与验证说明。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/jdbc-smoke-test.mjs`
- `node scripts/smoke-test.mjs`
- `node scripts/sse-smoke-test.mjs`
- `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true node scripts/sse-smoke-test.mjs`，需后端以 `AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS` 启动。
- 手动检查 `GET /api/adapters/quality-metrics`。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实外部 LLM。
- Adapter quality metrics 是本地文件聚合，不是外部 APM 或多节点指标系统。
- JDBC restart verify 仍要求用户自行启动真实 JDBC backend，本轮不默认切换 MySQL。
- Cancel token 能阻止后续 step 并丢弃非流式 adapter 完成后的结果，但不强杀已经在执行中的 Java HTTP 调用线程。
- 本轮仍不做 token streaming、多节点事件总线或真实部署平台。

### 遗留问题

- JDBC 尚未在本轮连接真实 MySQL 跑端到端 create / restart / query。
- Adapter quality metrics 仍是本地文件持久化，后续可迁移到 JDBC。
- Stop 与 Cancel 的语义差异仍偏轻量，未来可让 STOP 保留 partial run，CANCEL 更严格终止。
- 真实 token streaming 和多节点事件广播继续后置。

### 下一步建议

- 先用真实 OpenAI-compatible provider 继续观察 REAL_FIRST 质量指标，确认 parse / quality / build failure 是否下降。
- 再安排 MySQL/JDBC 实库验证 sprint，只验证 schema、repository、create/query/update/restart 主链路。
- 等真实长任务和真实 adapter 稳定后，再评估 token streaming。

## Phase 85：Plan Mode 计划项目化与 docs/plans 拆分

### 目标

- 将之前 Plan Mode 和 `dev-log.md` Phase 40-84 中的路线沉淀为独立计划文档。
- 避免重要计划只留在对话上下文或混在逐轮开发日志里。
- 为后续从半真实能力切到真实动态能力提供更清晰的路线入口。

### 主要变更

- 新增 `docs/plans/index.md`，说明计划目录用途、来源范围、状态约定和文件地图。
- 新增 `docs/plans/active-roadmap.md`，整理当前建议继续推进的真实 Adapter、JDBC、Stop/Cancel、文档同步等活跃任务。
- 新增 `docs/plans/completed-roadmap.md`，归档 Phase 40-84 已完成能力。
- 新增 `docs/plans/deferred-roadmap.md`，明确 token streaming、多节点事件总线、真实部署、多端等后置能力。
- 新增专题计划：
  - `docs/plans/real-adapter-plan.md`
  - `docs/plans/persistence-plan.md`
  - `docs/plans/realtime-plan.md`
  - `docs/plans/orchestrator-plan.md`
  - `docs/plans/productionization-plan.md`

### 验证方式

- 手动检查 `docs/plans/` 文件结构和内容。
- 本轮为文档重组，没有修改后端或前端业务代码。
- 未执行 backend / frontend build；构建不受本轮文档变更影响。

### 静态 / Mock / Placeholder 部分

- 本轮不新增业务能力，只整理路线和边界。
- `docs/plans` 是计划与项目管理文档，不代表所有后置能力已经实现。
- 已完成、活跃、暂缓能力仍以当前代码和验证结果为准。

### 遗留问题

- 后续每轮 Plan Mode 的关键计划仍需要主动写入 `docs/plans` 或对应专题文档。
- 旧文档中的路线表可能仍有少量重复，需要在后续 V1.0 文档维护中继续去重。
- MySQL 实库验证、token streaming、多节点事件总线、真实部署等仍按 `deferred-roadmap.md` 或 `active-roadmap.md` 的优先级推进。

### 下一步建议

- 后续开发前先检查 `docs/plans/active-roadmap.md`。
- 完成新能力后同时更新 `dev-log.md` 和对应专题计划，避免计划再次散落。

## Phase 86：REAL_ADAPTER 输出质量贯通与 REAL_FIRST 主产物规则收敛

### 目标

- 让 `OPENAI_COMPATIBLE -> REAL_FIRST -> REAL_ADAPTER Artifact` 链路的质量状态更可解释。
- 确保真实 Adapter 输出合格时优先成为主 Artifact，静态模板只作为 fallback / archived Artifact 保留。
- 同步计划、spec 和 dev-log，避免真实 / 半真实 / 静态能力边界漂移。

### 主要变更

- 修正 Adapter quality metrics 的分类口径：
  - `FALLBACK_TEXT` / `TEXT_FALLBACK` 不再被误计为 parse failure。
  - build failure 只统计明确的 `FAILED`，不把 `WARN`、`NOT_APPLICABLE`、`NOT_EVALUATED` 或 `SKIPPED` 误计为失败。
- 同步前端 Adapter Quality Dashboard 的统计口径，保持与后端一致。
- ArtifactPanel 增加 fallback reason 展示，用于说明 REAL_FIRST 接受真实产物后静态模板为何被 archived / fallback。
- 更新 `docs/plans/next.md`、`docs/plans/real-adapter-plan.md` 和 `docs/spec/adapter-output-spec.md`。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/real-adapter-smoke-test.mjs`
- 本轮不强制重跑真实外部 provider；真实 provider smoke 仍是 opt-in，避免默认验证依赖外部 API key。

### 静态 / Mock / Placeholder 部分

- `REAL_ADAPTER` 表示通过当前 JSON contract、quality evaluator 和可选 build validation，不代表代码已经达到生产级质量。
- 静态模板仍保留为 fallback / archived Artifact，用于无 key、provider 失败或质量拒绝时保持 demo 稳定。
- Adapter Quality Dashboard 记录的是当前后端聚合指标，不是外部 APM 或多节点指标系统。

### 遗留问题

- 真实 provider 仍需要持续观察 parse failure、quality failure、build failure 和 fallback 分布。
- 真实 Adapter 输出质量仍依赖 prompt contract、schema validator 和模型能力。
- MySQL/JDBC 实库验证、Stop/Cancel 更强执行语义、token streaming 和多节点事件总线继续后置。

### 下一步建议

- 先执行一次默认 build / smoke 验证。
- 再用 opt-in 真实 provider smoke 观察 REAL_FIRST 主产物质量。
- 如真实输出稳定，再进入 JDBC / MySQL 实库验证 sprint。

## Phase 87：JDBC Restart Verify 与 Stop / Cancel 执行语义收敛

### 目标

- 不默认切换 MySQL，但让 JDBC profile 的实库验证脚本覆盖重启后的关键对象查询。
- 将 realtime control plane 从“只改状态”推进为更清晰的执行语义：`STOP_RUN` 与 `CANCEL_RUN` 有不同终态，并影响 Orchestrator step 执行链路。
- 同步计划、spec 和脚本文档，保持 Done / Active / Boundary 清晰。

### 主要变更

- `scripts/jdbc-smoke-test.mjs` 的 restart verify 模式新增：
  - Attachment metadata 查询与 download 验证。
  - PinnedContext 查询。
  - Conversation / TaskRun 级 ContextSnapshot 查询。
  - HandoffSummary 查询。
- `TaskRunStatus` 增加 `STOPPED`。
- `RealtimeControlService` 区分控制命令：
  - `CANCEL_RUN` -> `CANCELLED`
  - `STOP_RUN` -> `STOPPED`
- `AgentStepExecutor` 在 step delay 前后、adapter 执行前后检查 control token；如果控制命令已到达，则跳过 step 或丢弃 adapter 返回结果。
- `TaskGraph` batch status 可反映 `CANCELLED` / `SKIPPED` / `PARTIAL`，避免把 skipped control path 统一误标为 failed。
- `scripts/sse-smoke-test.mjs` 新增 opt-in `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP=true`，并加强 active cancel / stop 对 skipped/discarded step 的断言。
- 前端状态展示补充 `STOPPED` 标签。
- 更新 `scripts/README.md`、`docs/plans/next.md`、`docs/plans/persistence-plan.md`、`docs/plans/realtime-plan.md`、`docs/spec/approval-audit-spec.md`。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/jdbc-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- 本轮未连接真实 MySQL 执行端到端实库验证；需要提供 JDBC 连接后按 `scripts/README.md` 运行 create / restart verify。
- active cancel / stop 需要后端以 `AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS` 启动后 opt-in 运行，本轮只完成脚本和代码路径。

### 静态 / Mock / Placeholder 部分

- 默认 persistence mode 仍是 `memory`，本轮不把 MySQL 设为默认。
- JDBC restart verify 是实库验证入口，不是完整生产 migration system。
- Stop / Cancel 不能强杀已经在执行中的非流式 Java HTTP 调用线程，但会在 adapter 返回后丢弃结果并阻止后续 step。
- SSE / WebSocket control plane 仍不是 token streaming，也不是多节点事件总线。

### 遗留问题

- 仍需在真实 MySQL-compatible 数据库上跑一次 `schema-jdbc.sql` + `jdbc-smoke-test.mjs` create/restart verify。
- Stop 与 Cancel 的真实长任务行为还需要用人工 step delay 或真实慢 adapter 做端到端验证。
- TaskGraph / TaskRun 的控制语义已收敛，但未来如引入 token streaming，需要重新定义中途停止的 chunk 聚合策略。

### 下一步建议

- 有 MySQL 环境后优先跑 JDBC 实库验证 sprint，不默认切换生产配置。
- 用 `AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS` 启动后端，分别跑 active cancel 与 active stop smoke。
- 若上述两项通过，再继续推进真实 Adapter 输出观察或 MySQL 仓储覆盖率补强。

## Phase 88：Step-delay SSE Active Control 验证与 MySQL 实库阻塞记录

### 目标

- 在真实运行中的 demo-task 上验证 active `CANCEL_RUN` 和 active `STOP_RUN`。
- 尝试推进 JDBC / MySQL 实库验证前置检查，确认当前机器是否具备 MySQL 环境。
- 同步计划文档，避免把未执行的 MySQL 实库验证写成已完成。

### 主要变更

- 使用独立 backend 端口和 `AGENTHUB_ORCHESTRATOR_STEP_DELAY_MILLIS=3000` 启动后端。
- 运行 `scripts/sse-smoke-test.mjs` 的两个 opt-in 路径：
  - `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true`
  - `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP=true`
- 验证结束后停止临时 backend，并清理临时日志。
- 检查 MySQL / JDBC 本地环境：
  - `AGENTHUB_JDBC_URL` / `AGENTHUB_JDBC_USERNAME` / `AGENTHUB_JDBC_PASSWORD` 未设置。
  - 未找到 `mysql` 客户端。
  - Docker CLI 存在，但 Docker daemon 未运行，无法临时启动 MySQL 容器。
- 更新 `docs/plans/next.md`、`docs/plans/persistence-plan.md`、`docs/plans/realtime-plan.md`。

### 验证方式

- `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true node scripts/sse-smoke-test.mjs`
  - 通过：active `CANCEL_RUN` 被接受，TaskRun 最终为 `CANCELLED`，3 个 step 被 skipped / discarded。
- `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP=true node scripts/sse-smoke-test.mjs`
  - 通过：active `STOP_RUN` 被接受，TaskRun 最终为 `STOPPED`，3 个 step 被 skipped / discarded。
- MySQL / JDBC 实库验证未执行：当前机器没有可用 JDBC env、mysql client 或运行中的 Docker daemon。

### 静态 / Mock / Placeholder 部分

- Active control 验证使用本地 step delay 模拟慢任务，不是真实慢外部 Adapter。
- Stop / Cancel 仍不能强杀已经在执行中的非流式 Java HTTP 调用线程，只能在返回后丢弃结果并阻止后续 step。
- JDBC / MySQL 实库验证仍是 Active / Blocked，不是 Done。
- 默认 persistence mode 仍是 `memory`。

### 遗留问题

- 需要提供真实 MySQL-compatible 数据库连接后，运行 `schema-jdbc.sql` 和 `scripts/jdbc-smoke-test.mjs` create / restart verify。
- 需要在真实慢 Adapter 场景下继续观察 Stop / Cancel 的结果丢弃语义。
- 如果未来引入 token streaming，需要重新定义 stop / cancel 对 streaming chunk 和最终 Artifact contract 的影响。

### 下一步建议

- 准备 MySQL 环境变量后优先完成 JDBC 实库验证。
- 若暂不推进 MySQL，则继续真实 Adapter 输出质量观察或补 JDBC 仓储覆盖率。

## Phase 89：MySQL JDBC 实库 Create / Restart Verify

### 目标

- 在不默认切换 MySQL 的前提下，使用本机 MySQL-compatible 服务验证 JDBC profile 的真实 create / query / restart 主链路。
- 确认 Conversation、Message、Attachment、Artifact、TaskRun、ContextSnapshot、PinnedContext、HandoffSummary 在 backend 重启后仍可查询。
- 同步计划文档，避免继续把 MySQL 实库验证标记为 blocked。

### 主要变更

- 初始化独立验证库并执行 `backend/src/main/resources/schema-jdbc.sql`。
- 使用 `AGENTHUB_PERSISTENCE_MODE=jdbc` 在独立端口启动 backend。
- 运行 `scripts/jdbc-smoke-test.mjs` create-mode 主链路。
- 重启同一 JDBC profile backend 后，运行 `scripts/jdbc-smoke-test.mjs` restart verify。
- 清理本轮临时 backend / frontend 进程、临时启动脚本、日志和上传目录。
- 更新 `docs/plans/next.md` 与 `docs/plans/persistence-plan.md`。
- 顺手修正 `docs/plans/realtime-plan.md` 的编码可读性，并保留 Stop / Cancel 当前边界。

### 验证方式

- `node scripts/jdbc-smoke-test.mjs`
  - 通过：create-mode 完成 Conversation、Attachment upload/download、Message、Pin Context、Memory、Demo Task、Artifact、Approval、Deploy、Preview 等 JDBC profile 主链路。
- `node scripts/jdbc-smoke-test.mjs` restart verify
  - 通过：重启 backend 后 Conversation、Message、Attachment download、PinnedContext、Artifact、TaskRun、ContextSnapshot、HandoffSummary 均可查询。
- 已复用上一轮验证结果：
  - `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true node scripts/sse-smoke-test.mjs`
  - `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP=true node scripts/sse-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 默认 persistence mode 仍是 `memory`，本轮不把 MySQL 设为默认。
- 本轮验证的是 schema 与 lightweight JDBC repositories，不是完整生产 migration system。
- Attachment binary 仍使用本地文件系统，数据库保存 metadata / storage key。
- Stop / Cancel 仍不能强杀已经在执行中的非流式 Java HTTP 调用线程，只能在返回后丢弃结果并阻止后续 step。

### 遗留问题

- JDBC schema 仍缺生产级 migration 体系，后续如频繁改 schema 需要引入迁移方案。
- MySQL profile 仍是 opt-in，不覆盖所有生产级数据治理需求。
- Token streaming、多节点事件总线和真实部署平台继续后置。

### 下一步建议

- 保持 memory 默认稳定，后续仅在需要验证持久化时启用 JDBC profile。
- 若继续推进生产化，优先补真实 Adapter 输出质量指标的长期趋势和真实慢 Adapter 下的 Stop / Cancel 观察。

## Phase 90：Context Search v1 与 DB-backed Agentic Search

### 目标

- 将 Context Retrieval 从直接拉取仓储列表后内存筛选，整理为 List / Grep / Read 三段式 DB-backed Agentic Search。
- 保留现有 RetrievedContextItem explain 输出，继续支持 heuristic semantic scoring 和可插拔 embedding 边界。

### 主要变更

- 新增 ContextSearchService、ContextSearchCandidate、ContextSearchResult、ContextSearchSourceType。
- ContextRetrievalService 改为消费 ContextSearchService 结果，再做 base / keyword / recency / importance / semantic 评分。
- Message、Artifact、Attachment、TaskRun repository 增加 recent/search 默认方法。
- JDBC repository 覆盖 recent/search 方法，使用 conversation filter + LIKE + LIMIT 下推候选过滤和关键词搜索。
- Context Search 覆盖 pinned context、MemoryItem、recent Message、Artifact、Attachment contentPreview、previous TaskRun summary。
- application.yml、.env.example、scripts/README.md 增加 Context Search 配置说明。
- 重写 docs/spec/context-memory-spec.md，明确当前是 DB-backed Agentic Search，不是向量数据库 RAG。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/jdbc-smoke-test.mjs`
- `node scripts/smoke-test.mjs`
  - 后端主链路通过到 Deploy / Approval / Context Retrieval / Artifact / Audit。
  - 最终失败在 frontend preview reachability：`http://127.0.0.1:5173/preview/...` 不可访问，原因是本轮未启动 frontend dev server。
- JDBC create / restart verify 本轮未重新执行；本次变更保留 memory 默认路径，并为 JDBC profile 增加搜索下推方法。

### 静态 / Mock / Placeholder 部分

- 本轮不引入 ES / OpenSearch / pgvector / Milvus。
- 本轮不实现真实 embedding provider。
- `AGENTHUB_CONTEXT_SEMANTIC_BACKEND=embedding` 仍表示 embedding backend 边界存在，但当前构建 fallback 到 heuristic 并报告 `EMBEDDING_DISABLED`。
- MySQL 是业务权威数据源，不是专业向量数据库。

### 遗留问题

- 需要在真实 JDBC profile 下补跑包含 retrieved context 的 smoke / restart verify。
- 如果数据量增大，可评估 MySQL FULLTEXT；当前 v1 只使用 LIKE + scoped window。
- ContextPanel 可以后续进一步展示 List / Grep / Read 阶段摘要，但现有 sourceType、score breakdown、matchedTokens、windowPolicy 已可解释。

### 下一步建议

- 启动 frontend 后重新运行默认 smoke，确认 preview reachability 也通过。
- 如需更细验证，可在 JDBC profile 下重新跑 `scripts/jdbc-smoke-test.mjs`，确认 retrieved context 持久化和 DB-backed search 行为。
- 若继续推进检索能力，优先做 MySQL FULLTEXT opt-in 验证，而不是直接引入重型向量库。

## Phase 91：FULLTEXT Opt-in、Context Search UI 与 Embedding 存储骨架

### 目标

- 在不替代默认 LIKE 检索的前提下，为 JDBC search 增加 MySQL FULLTEXT opt-in。
- 让 ContextPanel 更明确展示 List / Grep / Read 检索阶段。
- 增加 embedding provider 接口和 `embeddingJson` 存储骨架，但不接真实 embedding 服务。

### 主要变更

- JDBC Message / Artifact / Attachment / TaskRun search 支持 `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true` 时使用 `MATCH ... AGAINST`。
- `schema-jdbc.sql` 增加可选 FULLTEXT index，并保留默认 LIKE 路径。
- ContextPanel 增加 `List -> Grep -> Read`、`List -> Read fallback`、`Search stage unknown` 展示。
- 新增 EmbeddingProvider / DisabledEmbeddingProvider。
- MemoryItem 增加 `embeddingJson` 字段，InMemoryMemoryRepository 持久化该字段。
- 新增 JdbcMemoryRepository 和 `agenthub_memory_items.embedding_json` schema。
- application.yml、.env.example、scripts README、context-memory spec、next plan 同步配置和边界。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `git diff --check`
- 本轮未重启 backend，因此没有用当前代码重新跑 `node scripts/smoke-test.mjs`；上一轮 smoke 失败点是 frontend preview server 未启动。

### 静态 / Mock / Placeholder 部分

- FULLTEXT 是 opt-in；默认仍是 scoped LIKE + LIMIT。
- FULLTEXT 中文效果取决于 MySQL parser，不代表完整中文搜索生产方案。
- Embedding provider 当前为 disabled skeleton，不调用外部服务。
- `embeddingJson` 是存储边界，不代表已实现向量召回或 cosine ranking。

### 遗留问题

- 需要在真实 MySQL profile 下单独验证 FULLTEXT enabled 的 MATCH AGAINST 路径。
- 需要启动前后端后重跑默认 smoke，确认 ContextPanel 与 preview reachability。
- 真实 embedding provider、向量相似度、MySQL FULLTEXT parser 优化继续后置。

### 下一步建议

- 如果继续推进检索生产化，先做 MySQL FULLTEXT opt-in 的实库验证脚本，再考虑真实 embedding provider。

## Phase 92：JDBC / Stop-Cancel / Browser E2E 验证收敛

### 目标

对当前半生产能力做并行验证收敛：JDBC/MySQL create + restart verify、Stop / Cancel 慢任务执行语义、Browser E2E 核心 UI 流程，并修复验证过程中发现的阻塞问题。

### 主要变更

- 修复 DisabledEmbeddingProvider 默认 Bean 未注册的问题，确保非默认端口、JDBC profile、延迟后端都能启动。
- 修复 `scripts/smoke-test.mjs` 的 REJECTION opt-in 断言：默认 MOCK / 静态路径下，retry / revise 闭环应由 ReviewDecision、REJECTION 消息和 advice Artifact 表达，不强制要求 real Adapter quality rejection。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node scripts/smoke-test.mjs`
- `AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION=true node scripts/smoke-test.mjs`
- `node scripts/sse-smoke-test.mjs`
- MySQL `agenthub_jdbc_verify` 初始化 schema。
- JDBC profile create/query/update smoke：通过。
- JDBC profile restart verify：通过，确认 Conversation、Message、Attachment download、Artifact、TaskRun、PinnedContext、ContextSnapshot、HandoffSummary 重启后仍可查询。
- Delayed backend active cancel smoke：通过，`CANCEL_RUN` 进入 `CANCELLED`，并跳过 / 丢弃后续 step。
- Delayed backend active stop smoke：通过，`STOP_RUN` 进入 `STOPPED`，并跳过 / 丢弃后续 step。
- Browser E2E 基础流：通过。
- Browser E2E rejection opt-in：通过。

### 静态 / Mock / Placeholder 部分

- JDBC/MySQL 仍不是默认运行模式；默认仍保持 memory profile。
- Stop / Cancel 对非流式 HTTP 调用不做线程级硬中断；控制 token 生效后会停止后续 step 或丢弃 late result。
- Browser E2E 只覆盖本地核心 UI 流程，不代表完整跨浏览器兼容矩阵。
- REJECTION v1 仍是规则化 / opt-in 验证，不是真实静态分析或完整 QA 引擎。

### 遗留问题

- MySQL 仍缺 migration 体系和生产级连接池治理验证。
- FULLTEXT opt-in 已有代码与 schema，但本轮未单独开启 `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true` 跑专项验证。
- WebSocket 仍是 control-plane MVP，不包含 token streaming 或多节点事件总线。

### 下一步建议

- 单独验证 MySQL FULLTEXT opt-in 的 MATCH AGAINST 路径。
- 继续收敛真实 OpenAI-compatible provider 的 REAL_FIRST 输出质量样本。
- 视需要补浏览器 E2E 的 trace / screenshot failure artifact，但默认不要留下临时文件。

## Phase 93：Real Adapter Smoke 流式事件可选校验

### 目标

- 在不改变默认行为的前提下，让 real adapter smoke 脚本支持可选流式事件校验。
- 同步 `.env.example` 与 `scripts/README.md` 的脚本行为边界文档。

### 主要变更

- `scripts/real-adapter-smoke-test.mjs` 增加 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING` 读取。
- 该开关开启时，脚本在 `TASK_RUN_CREATED` / `TASK_RUN_UPDATED` 外额外等待并校验 `ADAPTER_STREAM_CHUNK` SSE 事件。
- 校验函数要求 `ADAPTER_STREAM_CHUNK` 有非空 chunk 且对应本次 `taskRunId`，且默认不强制 `AGENTHUB_OPENAI_STREAMING_ENABLED`，仍以 opt-in 为准。
- `run()` 日志新增 streaming 断言状态和当前 `AGENTHUB_OPENAI_STREAMING_ENABLED` 输出。
- `.env.example` 增加 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING=false`。
- `scripts/README.md` 补充：
  - `AGENTHUB_OPENAI_STREAMING_ENABLED` 与 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING` 的用途与默认值。
  - 开启流式校验后需观察 `ADAPTER_STREAM_CHUNK` 的 opt-in 行为说明。

### 验证方式

- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`（确认现有 SSE 工具链语法）
- 未在本次任务内执行真实 provider / fixture streaming 端到端跑通。

### static / mock / placeholder 部分

- 默认不开启 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING`，不会因为缺少流式输出而失败。
- 脚本仍受 `AGENTHUB_REAL_ADAPTER_SMOKE_STRICT` 与 `AGENTHUB_OPENAI_FIXTURE_ENABLED` 跳过规则约束。
- 流式校验只覆盖返回层面的 SSE event 可见性，不改变默认 Adapter fallback 语义。

### 下一步遗留

- 若 `AGENTHUB_OPENAI_STREAMING_ENABLED=true` 后仍无 chunk 事件，需结合 provider / fixture SSE 能力定位。
- 若后续在真实 provider 上接入 token streaming，确认最终 Artifact contract 与流式统计边界保持一致。

## Phase 94：OpenAI-compatible 流式 HTTP 调用 v1

### 目标

- 在不改变默认非流式路径的前提下，为 `OPENAI_COMPATIBLE` 增加 opt-in 流式 HTTP 调用。
- 让流式 chunk 通过现有 Realtime SSE 推送到 Workspace，同时最终输出仍回到 JSON contract validator / quality evaluator / REAL_ADAPTER Artifact 链路。

### 主要变更

- `OpenAICompatibleAgentAdapter` 增加 `AGENTHUB_OPENAI_STREAMING_ENABLED` 配置，默认 `false`。
- 流式模式下请求 OpenAI-compatible `/chat/completions` 时发送 `stream=true`，消费 provider SSE `data:` chunk，并累计完整 JSON 输出。
- 每个有效 chunk 发布 `ADAPTER_STREAM_CHUNK` realtime event，payload 包含 `taskRunId`、`taskStepId`、`adapterType`、`chunk`、`accumulatedLength`。
- fixture 模式也支持按 chunk 发布事件，用于无真实 key 环境的流式事件验证。
- Stop / Cancel 检查接入流式 chunk 发布路径；控制 token 生效后不再发布 late chunks，最终结果仍由执行层控制是否落 Artifact。
- Workspace 订阅 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK`，在 MessageStream 和 TaskRunPanel 显示“生成中 / 流式预览”。
- `scripts/real-adapter-smoke-test.mjs` 增加 `AGENTHUB_REAL_ADAPTER_SMOKE_EXPECT_STREAMING` opt-in 校验。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node scripts/smoke-test.mjs`
- `node scripts/sse-smoke-test.mjs`
- 本地独立端口 `18091` 启动 fixture + `AGENTHUB_OPENAI_STREAMING_ENABLED=true` 后，用临时内联 Node 验证：
  - 收到 `ADAPTER_STREAM_CHUNK`：7 条。
  - 最终生成 `REAL_ADAPTER / REAL_FIRST` Artifact：2 个。

### 静态 / Mock / Placeholder 部分

- 默认仍是非流式调用，不影响无真实 API key 的主链路。
- 本轮不是全平台 token streaming；只覆盖 `OPENAI_COMPATIBLE` v1。
- 流式 chunk 只用于执行体验和预览，不能绕过最终 Artifact JSON contract、quality evaluator、build validation 与 fallback。
- 本轮未强制跑真实外部 provider streaming；已用 fixture 验证事件与最终 Artifact 闭环。
- 多节点事件总线、跨 provider streaming、token 级持久化仍后置。

### 遗留问题

- 真实 provider 的 SSE 分片差异仍需继续采样；非标准事件会回退到当前非流式 / fallback 语义。
- MessageStream 当前展示最新流式预览，不是完整多并发 step 的精确消息绑定视图。
- 非流式 HTTP 调用仍不支持线程级硬中断；控制 token 生效后以丢弃 late result 为主。

### 下一步建议

- 用真实 OpenAI-compatible provider 开启 `AGENTHUB_OPENAI_STREAMING_ENABLED=true` 跑一次 opt-in streaming smoke。
- 如果真实 provider 分片稳定，再补 Adapter streaming 质量指标，如 chunk count、stream duration、stream fallback reason。
- 在真实输出质量稳定后，再评估是否需要真正 token streaming UI，而不是现在扩展到多 provider。

## Phase 95：Claude Code Artifact-only Headless Adapter v1

### 目标

- 将 `CLAUDE_CODE` 从通用 CLI 探测型 Adapter 推进为 Artifact-only、可流式、可验证、可 fallback 的 headless Adapter v1。
- 保持默认 demo 不依赖本机 Claude Code CLI，不允许 Claude Code 直接写 AgentHub workspace。

### 主要变更

- `ClaudeCodeAgentAdapter` 改为专用实现，不再依赖通用 `CliAgentAdapterSupport` 执行路径。
- 支持 Claude Code CLI `-p` headless 模式：
  - 非流式：`--output-format json`
  - 流式：`--output-format stream-json`
  - prompt 通过 stdin 传入，并在 `.agenthub/claude-code-runs/{requestId}/prompt.txt` 留本地运行记录。
- 默认 Artifact-only：
  - `allowedTools=Read,Grep,Glob`
  - `disallowedTools=Edit,MultiEdit,Write,NotebookEdit,Bash`
  - 不使用 `--dangerously-skip-permissions`
  - 不在 repo 根目录执行。
- Claude Code 输出必须通过 AgentHub Artifact JSON contract validator；普通文本、缺失 `result`、invalid JSON、Markdown fenced CODE 均会失败并由 AdapterRegistry fallback。
- 流式模式发布 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK`，最终完整输出仍走 contract validation、quality evaluator、build validation、REAL_FIRST。
- Adapter routing 增强：显式非 MOCK preferred adapter 且 AVAILABLE 时先尝试该 adapter，再由 Registry fallback，避免历史 fallback 统计让 MOCK 抢走显式选择。
- 新增 `scripts/claude-code-smoke-test.mjs`，覆盖 Adapter execute、demo-task REAL_FIRST Artifact、可选 streaming chunk。
- `.env.example`、`scripts/README.md`、`docs/plans/next.md` 同步 Claude Code 配置和边界。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/claude-code-smoke-test.mjs`
- 以 `AGENTHUB_CLAUDE_CODE_ENABLED=true`、`AGENTHUB_CLAUDE_CODE_FIXTURE_ENABLED=true`、`AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED=true`、`AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST` 启动临时后端端口 `18092`。
- `AGENTHUB_API_BASE_URL=http://127.0.0.1:18092 AGENTHUB_CLAUDE_CODE_SMOKE_EXPECT_STREAMING=true node scripts/claude-code-smoke-test.mjs`
  - 通过：`ADAPTER_STREAM_CHUNK` 12 条。
  - 通过：`CLAUDE_CODE REAL_ADAPTER` Artifact 3 个。
- 以默认配置启动临时后端端口 `18093`。
- `AGENTHUB_API_BASE_URL=http://127.0.0.1:18093 node scripts/smoke-test.mjs`
- `AGENTHUB_API_BASE_URL=http://127.0.0.1:18093 node scripts/sse-smoke-test.mjs`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- fixture 模式只验证 Claude Code Adapter contract，不代表真实 Claude Code provider 输出。
- 真实 Claude Code CLI 仍需本机安装和登录；本轮未强制真实 CLI 验证。
- v1 不接 Claude Code TypeScript SDK，不做交互式终端，不做 workspace-write，不做 Claude 直接 patch apply。
- 默认 `CLAUDE_CODE` 仍为 disabled，不影响无 Claude 环境。

### 遗留问题

- 真实 Claude Code CLI 的 `json` / `stream-json` 输出差异仍需在本机安装并登录后继续采样。
- 当前 Artifact-only 模式无法利用 Claude Code 的真实编辑工具链；这是刻意安全边界。
- 如果未来启用 workspace-write，需要 Snapshot、Approval、Audit、沙箱和回滚策略先行。

### 下一步建议

- 在已登录 Claude Code CLI 的机器上跑 `scripts/claude-code-smoke-test.mjs` 的真实模式。
- 如果真实输出稳定，再把 Adapter quality dashboard 增加 Claude Code parse / quality / stream 指标趋势。
- 暂不同时深接 Codex / OpenCode，避免多平台接入面过大。

## Phase 96：真实 Claude Code CLI 验证与 Windows 执行兼容修复

### 目标

- 使用本机真实 Claude Code CLI 验证 `CLAUDE_CODE -> REAL_FIRST -> REAL_ADAPTER Artifact` 链路。
- 修复真实 Windows 环境下 CLI shim、`stream-json` 参数和 Artifact contract 误判问题。

### 主要变更

- `ClaudeCodeAgentAdapter` 在 Windows 下优先解析 `.cmd/.exe/.bat`，避免 Java `ProcessBuilder` 命中 npm 的无扩展 shim 后报 `CreateProcess error=193`。
- Claude Code `stream-json` 模式补充 `--verbose`，符合本机 Claude Code 2.1.143 的 CLI 要求。
- Claude Code streaming 最终输出如果未通过 Artifact contract，会回退非流式执行；取消状态仍不会接受 late result。
- `AdapterArtifactContractValidator` 收紧 provider error 判定，避免合法代码或评审正文里出现 `exception` 等词时被误判为 provider error。
- `docs/plans/next.md` 同步真实 Claude Code CLI 验证结果和边界。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- 非沙箱 PowerShell 验证：`claude --version` 返回 `2.1.143 (Claude Code)`。
- 直接运行 Claude Code `stream-json`，确认 `--output-format stream-json` 需要 `--verbose`。
- 以 `AGENTHUB_CLAUDE_CODE_ENABLED=true`、`AGENTHUB_CLAUDE_CODE_FIXTURE_ENABLED=false`、`AGENTHUB_CLAUDE_CODE_STREAMING_ENABLED=true`、`AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST` 启动临时后端端口 `18094`。
- `AGENTHUB_API_BASE_URL=http://127.0.0.1:18094 AGENTHUB_CLAUDE_CODE_SMOKE_EXPECT_STREAMING=true node scripts/claude-code-smoke-test.mjs`
  - 通过：`CLAUDE_CODE` adapter available。
  - 通过：adapter execute returned artifact JSON。
  - 通过：demo task completed。
  - 通过：observed `ADAPTER_STREAM_CHUNK`。
  - 通过：created `CLAUDE_CODE / REAL_ADAPTER` Artifact。

### 静态 / Mock / Placeholder 部分

- 本轮验证使用本机真实 Claude Code CLI，但仍保持默认 `CLAUDE_CODE` disabled，不影响无 Claude 环境。
- v1 仍是 Artifact-only headless 模式，不允许 Claude Code 直接修改 AgentHub workspace。
- streaming chunk 只用于执行体验；最终 Artifact 仍必须通过 JSON contract、quality evaluator、build validation 和 REAL_FIRST 规则。
- 不代表 Codex / OpenCode 也已深度接入。

### 遗留问题

- 真实 Claude Code 输出质量仍会随模型和本机登录状态波动，必须继续保留 MOCK fallback。
- Claude Code workspace-write、真实 patch apply by Claude Code、交互式终端均未实现。
- Claude Code 真实流式成本、chunk 质量和 parse failure 趋势仍需后续纳入 Adapter quality dashboard。

### 下一步建议

- 保持 `CLAUDE_CODE` Artifact-only v1，优先继续观察真实输出质量和 fallback pattern。
- 暂不同时推进 Codex / OpenCode 深度接入，避免多平台生产化面过大。
- 后续如做 workspace-write，需要先完成更严格的 Snapshot、Approval、Audit、沙箱和回滚策略。

## Phase 97：Token Streaming 产品化展示与 Stop / Cancel Partial 语义

### 目标

- 将现有 Adapter streaming chunk 从“调试预览”升级为 Workspace 中可理解的产品体验。
- 在 MessageStream 和 TaskRunPanel 显示增量生成状态，并在 Stop / Cancel 后明确标记 partial output 为 discarded / partial。

### 主要变更

- 前端新增 `StreamingPreviewState`，记录 `taskRunId`、`taskStepId`、`adapterType`、`content`、`chunkCount`、`status`、`finishReason`。
- `WorkspacePage` 不再只保存 stepId 到纯字符串的映射，而是维护 `STREAMING / PARTIAL / DISCARDED` 状态。
- 收到 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK` 时追加到内存态 streaming preview，不持久化 token。
- 收到 `CONTROL_COMMAND_RECEIVED` 或 REST reload 后，如果 TaskRun / TaskStep 已 stop、cancel、skip、fail，则将已有 partial preview 标记为 discarded 或 partial。
- `MessageStream` 增加类似消息气泡的实时生成卡片，展示 chunk 数、Adapter、状态和“最终 Artifact 校验前不会持久化”的边界。
- `TaskRunPanel` 在 TaskStep 内展示 streaming 状态、partial/discarded 说明和 chunk 计数。

### 验证方式

- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 部分

- 本轮不做 token 级持久化；streaming chunk 只保存在前端内存态。
- 最终消息、Artifact 和 run event summary 仍由后端 REST / SSE 主链路决定。
- Stop / Cancel 对已在途的非流式 HTTP 调用仍不是硬中断；前端只把 late / partial preview 标记为 discarded，不把它当最终结果。
- 本轮不是多 provider 完整 token streaming，也不是多节点事件总线。

### 遗留问题

- 当前 streaming preview 与具体 Agent bubble 的绑定仍是 TaskStep 级，不是完整 token-by-token 消息对象。
- 切换页面或刷新后不会恢复 token 级 partial 内容，这是刻意边界。
- 浏览器级 E2E 尚未覆盖 streaming UI 的视觉状态。

### 下一步建议

- 扩展 `scripts/e2e-browser.mjs` 覆盖 streaming preview、Stop / Cancel 后 discarded 状态。
- 如果真实 provider streaming 稳定，再把 stream duration、chunk count、fallback reason 纳入 Adapter quality dashboard。

## Phase 98：Codex Adapter v1 Smoke 与文档入口

### 目标

- 为生产化 Codex Adapter v1 补充 opt-in 验证脚本和配置文档。
- 明确 Codex 接入目标是 headless / Artifact-only，不是 Codex Desktop GUI 自动化。

### 主要变更

- 新增 `scripts/codex-smoke-test.mjs`，验证 `CODEX=AVAILABLE`、`POST /api/adapters/CODEX/execute`、Codex custom Agent、demo-task、`REAL_FIRST`、`REAL_ADAPTER`、`sourceAdapterType=CODEX` 和 `qualityStatus=ACCEPTED`。
- `codex-smoke-test.mjs` 支持 `AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING=true`，在后端支持时断言 `ADAPTER_STREAM_CHUNK`。
- `.env.example` 补充 Codex Artifact-only、streaming、work dir、fixture 和 smoke 相关环境变量。
- `scripts/README.md` 增加 Codex Adapter Smoke Test 运行说明。
- `docs/plans/next.md` 将 Codex Adapter v1 标记为当前 Active 生产化任务，并写明边界。

### 验证方式

- `node --check scripts/codex-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮只补 Codex 验证脚本和文档入口，不修改后端业务实现。
- 默认 smoke 不依赖 Codex。
- Codex smoke 是 opt-in，只有后端实际暴露 `CODEX=AVAILABLE` 且产出通过 Artifact contract / quality gate 时才通过。
- 本轮不代表 Codex Desktop GUI、workspace-write、真实 patch apply 或 OpenCode 深度接入已完成。

### 遗留问题

- Codex 专用后端 Adapter、runner、prompt builder、stream parser 由实现 worker 负责，本轮只定义验证入口和文档边界。
- 真实 Codex CLI 能力、命令形态、streaming 支持和认证状态仍需在本机 PowerShell 环境实测。
- Codex fixture 不能被当作真实 provider 验证。

### 下一步建议

- 完成 `CodexAgentAdapter` / `CodexCommandRunner` / `CodexArtifactPromptBuilder` 后，用 `node scripts/codex-smoke-test.mjs` 做 opt-in 验收。
- 如果 Codex CLI 支持 streaming，再开启 `AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING=true` 验证 chunk 到 SSE 的链路。

## Phase 99：Codex Artifact-only Headless Adapter v1

### 目标

- 将 `CODEX` 从通用 CLI args-template 探测升级为专用 Artifact-only headless Adapter v1。
- 复用现有 REAL_FIRST、Artifact JSON contract、quality evaluator、Mock fallback 和 SSE streaming preview 链路。

### 主要变更

- 本机 PowerShell 能力探测确认 `codex-cli 0.134.0` 可用，`codex exec` 支持 stdin、`--cd`、`--sandbox read-only`、`--json`、`--output-schema`、`--output-last-message`。
- 新增 `CodexAgentAdapter`，直接实现 `AgentAdapter`，不再依赖通用 `CliAgentAdapterSupport` 执行模板。
- 新增 `CodexCommandRunner`，使用 `ProcessBuilder` 调用 `codex exec`，prompt 通过 stdin 传入，request 工作目录隔离到 `.agenthub/codex-runs/{requestId}`。
- `CodexCommandRunner` 在执行结束后 best-effort 清理 request 目录，避免 prompt / schema / final-message 临时文件长期留在仓库工作区。
- 新增 `CodexArtifactPromptBuilder`，统一构造 AgentHub Artifact JSON contract prompt 和 JSON Schema 文件。
- Codex 输出成功前必须通过 `AdapterArtifactContractValidator`；失败、超时、非 0 exit、contract invalid 均返回 failed，由 `AgentAdapterRegistry` 继续 fallback 到 MOCK。
- 支持 `AGENTHUB_CODEX_FIXTURE_ENABLED=true` 的本地 contract fixture，不伪装为真实 Codex provider。
- 支持 `AGENTHUB_CODEX_STREAMING_ENABLED=true` 时解析 `codex exec --json` 事件并发布 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK`，最终 Artifact 仍来自完整输出文件并通过 contract 校验。
- `application.yml`、`.env.example`、`scripts/README.md`、`docs/plans/next.md` 同步 Codex v1 配置和 opt-in smoke 说明。
- 自检时移除 Codex v1 不再使用的 `args-template` 配置，避免把 Codex v1 误解为旧的通用 CLI template wrapper。

### 验证方式

- `codex --version`
- `codex --help`
- `codex exec --help`
- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/codex-smoke-test.mjs`
- `git diff --check`
- Codex fixture smoke：临时 backend 端口 `18095`，`AGENTHUB_CODEX_FIXTURE_ENABLED=true`，`node scripts/codex-smoke-test.mjs` 通过。
- 真实 Codex CLI smoke：临时 backend 端口 `18096`，`AGENTHUB_CODEX_FIXTURE_ENABLED=false`，`AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST`，`node scripts/codex-smoke-test.mjs` 通过。
- 真实 Codex streaming smoke：临时 backend 端口 `18100`，`AGENTHUB_CODEX_STREAMING_ENABLED=true`，`AGENTHUB_CODEX_SMOKE_EXPECT_STREAMING=true`，观察到 `ADAPTER_STREAM_CHUNK`，并生成 `CODEX / REAL_ADAPTER / REAL_FIRST` Artifact。

### 静态 / Mock / Placeholder 部分

- Codex Adapter v1 默认关闭，默认 smoke 不依赖 Codex。
- Fixture 模式只验证本地 contract，不代表真实 Codex provider 输出。
- 本轮不是 Codex Desktop GUI 自动化，不做 workspace-write，不做真实 patch apply。
- Streaming chunk 只用于实时预览；最终 REAL_ADAPTER Artifact 仍必须通过完整 JSON contract、quality evaluator 和 REAL_FIRST 链路。

### 遗留问题

- 真实 Codex 输出质量和 fallback pattern 仍需在更多任务类型下继续观察。
- 真实 Codex streaming 已通过 opt-in smoke，但 chunk 结构仍需在更多任务类型下继续观察。
- OpenCode 仍是通用 CLI 探测型 Adapter，未做深度接入。

### 下一步建议

- 用 `AGENTHUB_CODEX_ENABLED=true`、`AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST` 启动 backend 后运行 `node scripts/codex-smoke-test.mjs`。
- 后续把 Codex streaming 的 chunk count、duration、fallback pattern 纳入 Adapter quality dashboard 观察。

## Phase 100：Reviewer REJECTION 与 Revision Recovery 验证闭环

### 目标

- 将 Reviewer `REJECTION` 从协议展示能力推进到可控、可回归的 retry / revise 验证闭环。
- 确认拒绝后执行 Artifact Revision 能回到 `COMPLETED` / accepted review 路径。

### 主要变更

- `ReviewDecisionEvaluator` 增加稳定的内置拒绝触发词兜底，覆盖 `force reject`、`不通过`、`拒绝`、`阻塞` 等显式测试输入。
- 保持现有配置化 rejection keywords，不移除 `AGENTHUB_REVIEW_REJECTION_KEYWORDS`。
- `scripts/smoke-test.mjs` 的 opt-in REJECTION 路径新增 revision recovery 断言：拒绝后执行 `demo-revision`，revision TaskRun 必须 `COMPLETED`，revision Review Report 必须 `ACCEPTED`。
- `docs/plans/next.md` 记录 Reviewer REJECTION retry / revise loop 的 Done 与 Boundary。

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION=true node scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- REJECTION 判定仍是规则化关键词触发，不是真实静态分析、真实 QA 引擎或完整 Reviewer 智能体。
- retry / revise 指令只生成修复建议和可见闭环，不自动伪造代码修复。
- Revision recovery 使用现有静态 demo revision 路径验证回到 accepted review，不代表真实代码修复已经自动完成。

### 遗留问题

- Reviewer 不会基于真实 lint/build/test 自动生成 rejection。
- 失败后自动选择最小修复 patch、自动重新运行完整 Reviewer 的闭环仍未完成。
- Browser E2E 尚未覆盖 REJECTION badge 和 recovery path。

### 下一步建议

- 后续把真实 lint/build/test 结果接入 `ReviewDecisionEvaluator`，让 rejection 不只依赖 prompt 关键词。
- 扩展 browser E2E 覆盖 `REJECTION -> Revision -> APPROVAL` 的可视化路径。

## Phase 101：生产级核心闭环收敛 Sprint

### 目标

- 并行推进真实 Adapter 输出稳定化、Reviewer 质量门禁、JDBC/MySQL 验证收敛和 Context Search 生产化 v2。
- 保持默认 memory + mock/static fallback 主链路稳定，同时让真实能力通过 opt-in 验证可回归。

### 主要变更

- Adapter 输出质量链路补强：真实 Adapter 输出未能落为 Artifact 时，TaskStep 明确记录 `PARSE_FAILED` 或 `FALLBACK`，并保留 adapter status、actual adapter 和 fallback reason。
- `real-adapter-smoke-test.mjs`、`claude-code-smoke-test.mjs`、`codex-smoke-test.mjs` 增加 `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK` 分类输出和断言，减少真实 provider 验证时的模糊失败。
- Reviewer 质量门禁增强：`ReviewDecisionEvaluator` 除关键词外，也能根据 adapter/artifact 的 parse failure、quality failure、build failure、fallback-blocking、invalid-code evidence 触发 `REJECTED`。
- `OrchestratorService` 将当前 TaskRun 产物传入 Reviewer decision evaluator，使 artifact quality/build metadata 能影响 `BLOCKED` 决策。
- `scripts/smoke-test.mjs` 增加 `AGENTHUB_SMOKE_EXPECT_REVIEW_QUALITY_REJECTION=true` opt-in 路径，验证 quality gate rejection、REJECTION protocol messages、retry/revise advice 和 revision recovery。
- JDBC/MySQL 验证收敛：补充 Agent、ApprovalRequest、ActionAuditLog 的 JDBC repository 和 schema；memory repositories 保持 memory profile 默认行为。
- `jdbc-smoke-test.mjs` 扩展 restart verify，覆盖 Conversation、Message、Agent、Artifact、TaskRun、TaskStep、ContextSnapshot、PinnedContext、Memory、Approval、Audit、Attachment 和 HandoffSummary。
- Context Search v2 补齐：Memory 支持 Grep 检索；`RetrievedContextItem` 增加 `searchStage`；Context ranking 优先保留不同 source 的代表项，避免单一 source 挤掉 TaskRun summary。
- ContextPanel 优先展示后端 `searchStage`，ContextSnapshot / JDBC 持久化同步保存和恢复该字段。

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `node --check scripts/jdbc-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- 默认 API smoke：临时 backend 端口 `18103`、frontend 端口 `5175`，`node scripts/smoke-test.mjs` 通过。
- Reviewer quality gate smoke：临时 backend 端口 `18104`、frontend 端口 `5176`，`AGENTHUB_SMOKE_EXPECT_REVIEW_QUALITY_REJECTION=true node scripts/smoke-test.mjs` 通过。
- JDBC/MySQL worker 验证：本机 MySQL 8.4.9 临时库 `agenthub_jdbc_smoke` 完成 create smoke 与 restart verify；重启后 agents、messages、attachments、artifacts、task runs、task steps、memories、approval requests、action audits、context snapshots 和 handoff summaries 可查询。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实 LLM、Codex、Claude Code、MySQL 或真实部署。
- Adapter fixture / smoke 分类不能等同于真实 provider 质量保证；真实 provider 验证仍需 opt-in 配置。
- Reviewer quality gate 使用现有 build/quality metadata 和可控 smoke trigger，不是完整 lint/test/static-analysis 平台。
- MySQL/JDBC 已验证主链路，但默认 runtime 仍是 memory，未引入 migration system 或生产级数据库治理。
- Context Search 仍是 DB-backed Agentic Search + heuristic scoring；embedding backend 仍是可插拔边界，不是默认向量检索。

### 遗留问题

- 真实 provider 输出质量还需要更多任务类型和失败样本持续观察。
- Deployment 和 ArtifactSnapshot 仍未纳入 JDBC restart verify 的核心覆盖列表。
- Reviewer 还没有接入真实 ESLint、TypeScript project build、unit test 或安全扫描报告。
- Browser E2E 尚未覆盖 quality-gate rejection、Context Search source coverage 和 JDBC profile。

### 下一步建议

- 将真实 lint/build/test 报告结构化写入 TaskStep / Artifact quality metadata，减少 smoke trigger 依赖。
- 单独补 JDBC restart verify 对 Deployment 和 ArtifactSnapshot 的覆盖。
- 扩展 browser E2E 覆盖 approval、restore、attachment、rejection、preview 和 Context Search explain。

## Phase 102：消息流自动协作产品化 Smoke 收敛

### 目标

- 让 `AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL=true` 专门验证消息级 Orchestrator suggestion -> approval -> run 链路。
- 保持默认 API smoke 不主动依赖 message-level auto-trigger run。

### 主要变更

- `scripts/smoke-test.mjs` 在默认模式下只读取 auto-trigger suggestion 配置状态，不再主动调用 `/messages/{messageId}/orchestrator-run` 创建额外 TaskRun。
- opt-in 模式会要求发送任务消息后产生 `ORCHESTRATOR_RUN / MESSAGE / PENDING` approval，再 approve 并用该 approvalId 创建 TaskRun。

### 验证方式

- `node --check scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不要求启用 auto-trigger。
- opt-in smoke 仍使用现有后端配置和 MOCK fallback，不代表真实 LLM 协作质量。

### 遗留问题

- Browser E2E 尚未覆盖用户点击消息流 suggestion 后的视觉状态变化。

## Phase 103：Stop / Cancel 执行语义同步补强

### 目标

- 确保运行中 Stop / Cancel 的控制状态能同步到 RealtimeRunState、TaskRun 和 ActionAuditLog。
- 扩展 active cancel / stop opt-in smoke，对状态同步和审计记录做断言。

### 主要变更

- `RealtimeRunStateService.complete` 在控制命令未传 sourceMessageId 时沿用已有 run-state 的 sourceMessageId，避免控制瞬间丢失恢复上下文。
- `RealtimeControlService` 对控制拒绝通知和审计记录失败输出 SLF4J warning，不再静默吞掉异常。
- `scripts/sse-smoke-test.mjs` 的 active cancel / stop 路径新增 RealtimeRunState 与 ACCEPTED ActionAuditLog 断言。

### 验证方式

- `node --check scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `node scripts/sse-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 非流式 Java HTTP 调用已在途时不会被硬中断；控制 token 被观察到后，结果会被丢弃并阻止后续 adapter 执行。
- active cancel / stop opt-in 仍要求后端以人工 step delay 启动，否则本地 demo task 可能在控制命令发出前结束。

## Phase 104：Artifact 编辑可信度增强

### 目标

- 让 Artifact revision / diff / apply / force apply / snapshot restore 更接近真实开发确认闭环。
- 用户在应用 Diff、遇到冲突、强制应用和恢复快照时能看到改动统计、风险说明和可见回滚结果。

### 主要变更

- `apply-diff` 冲突响应现在保留 added / removed / unchanged / changed 行级统计，并用包含 latest accepted Artifact ID 和版本的 `conflictReason` 解释阻塞原因。
- force apply 在确实绕过冲突保护时返回 `conflictBypassed=true`、冲突绕过原因、latest applied Artifact ID 和 pre-apply snapshot ID。
- Workspace force apply / conflict 提示展示新增、删除行数和冲突绕过说明。
- 默认 API smoke 的 Artifact 编辑段新增 diff affectedItems 摘要、apply / conflict / force apply 行级统计断言、force apply conflict bypass 断言、restore 后 Artifact 列表可见性断言，以及缺失 approvalId 的 force apply 拒绝断言。

### 验证方式

- `node --check scripts/smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- Diff 仍是轻量行级 LCS 统计，不是语义级代码理解、AST diff 或自动三方合并。
- force apply 只表示用户显式批准后绕过最新 Artifact 冲突保护，不代表冲突已被智能解决。

## Phase 105：Browser E2E 主链路覆盖

### 目标

- 用一条浏览器 E2E 覆盖 Workspace 主链路，降低多 Agent 消息、附件、TaskRun、Artifact 审批和 Preview 的 UI 回归风险。

### 主要变更

- `scripts/e2e-browser.mjs` 从 API 预置改为 UI-first：打开 Workspace、创建会话、上传附件、发送多 `@Agent` 消息，并通过 UI 触发手动 Demo Task 或可用的自动协作确认。
- 脚本新增清晰 step 包装、API 状态轮询和临时附件清理，并覆盖 TaskRun / Agent protocol、Context snapshot、CODE Artifact 选择、revision、Apply Diff approval、Deploy approval、Restore approval、Action Audit 和 Preview 页面。
- 可选 rejection 场景继续保留在 `AGENTHUB_E2E_EXPECT_REJECTION=true` 后执行，不影响默认主链路。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- Browser E2E 仍要求本地 backend / frontend 预先启动，不负责启动或停止服务。
- 默认路径仍可使用 MOCK fallback 和静态 preview；Preview 不是真实 Vercel / Netlify / Docker / Kubernetes 部署。

## Phase 106：默认 IM-first 协作体验收敛

### 目标

- 弱化 `Run Demo Task` 的产品主路径感，让 Workspace 默认体验变成“发送任务消息 -> 用户确认 -> Agent 协作启动”。
- 保留手动运行入口作为本地验证和调试兜底，不破坏 smoke / demo-task 主链路。

### 主要变更

- Workspace 消息流工具栏新增基于最新用户任务消息的主 CTA，直接复用现有 Orchestrator trigger suggestion / ApprovalRequest / run 链路。
- 后端消息级 Orchestrator auto-trigger 默认改为 enabled + require approval；命中任务关键词时只创建确认请求，不自动执行。
- 主 CTA 根据当前确认状态展示“创建协作确认 / 批准并启动协作 / 已批准，启动协作”等状态化文案。
- 原 `Run Demo Task` 按钮改为低优先级 `调试：手动运行`，并通过 title 明确它是本地验证和调试用的手动兜底入口。
- MessageBubble 中用户消息的重新运行操作改为“从此消息重新运行”，避免继续把 Demo Task 暴露为主产品语言。
- Workspace 新增主流程导引：发送任务消息 -> 确认协作 -> Orchestrator 执行 -> 查看 Artifact / 审批 / Preview。
- 样式新增 `workspace-main__collaboration-actions` 和 quiet secondary button，保持三栏布局不变。

### 验证方式

- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- 本轮不新增后端 API；后端消息级 auto-trigger 默认配置调整为 enabled + require approval，用于支撑 IM-first 主路径。
- 手动 demo-task API 仍保留，用于 smoke test、调试和 fallback 验证。
- 消息触发协作仍复用现有规则化 Orchestrator、Approval、MOCK fallback 和静态兜底能力；不代表真实自主 Agent 调度已完全生产化。

### 遗留问题

- 默认 API smoke 尚未改成端到端点击主 CTA 的浏览器级验证。
- Browser E2E 仍需继续覆盖“发送消息后点击主 CTA 创建确认并启动协作”的视觉主路径。
- 自动触发策略仍是可配置和规则化，不是完整自然语言意图识别系统。

### 下一步建议

- 扩展 browser E2E，覆盖默认主 CTA 的 create approval / approve / run 状态变化。
- 后续可以在 ChatInput 附近增加轻量提示，解释“发送任务消息后由 Orchestrator 建议协作”的默认流程。

## Phase 107：生产增强验证覆盖收敛

### 目标

- 将 Browser E2E 常态化方向对齐到 IM-first 主路径，优先验证 Workspace 协作主 CTA，而不是继续默认点击手动 demo-task。
- 补齐 MySQL/JDBC profile 对 Deployment 和 ArtifactSnapshot 的持久化验证覆盖。
- 保持 Codex / Claude Code headless Adapter 的独立 smoke 作为更深 Agent 接入的验收入口。

### 主要变更

- `scripts/e2e-browser.mjs` 新增 Workspace 主协作 CTA 点击路径：必须通过消息触发协作主按钮创建/批准确认并等待 TaskRun，不再把手动调试入口作为产品主路径 fallback。
- Browser E2E 增加主流程导引条可见性断言，覆盖 workspace、multi-agent message、attachment、context、approval、diff、deploy preview、restore 和 optional rejection 的产品路径。
- 新增 `JdbcArtifactSnapshotRepository`，在 JDBC profile 下持久化 Artifact revision / apply diff / deploy / restore 前后的安全快照。
- 新增 `JdbcDeploymentRepository`，在 JDBC profile 下持久化静态部署记录和 Preview URL。
- memory 版 ArtifactSnapshot / Deployment repository 增加 `agenthub.persistence.mode=memory` 条件，避免 JDBC profile 下双 repository 冲突。
- `schema-jdbc.sql` 补充 `agenthub_artifact_snapshots` 和 `agenthub_deployments` 初始化表。
- `/api/health` 增加 `persistenceMode`，JDBC smoke 在 `AGENTHUB_SMOKE_EXPECT_JDBC_PROFILE=true` 时会拒绝 memory-mode 误判。
- `scripts/jdbc-smoke-test.mjs` 的 restart verify 增加 ArtifactSnapshot 操作历史和 Deployment preview 记录断言。
- TaskStep / Artifact 增加派生 `realAdapterOutcome`，前端统一展示 `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`，减少真实 Adapter 输出质量状态分散在多个字段里的理解成本。
- 后端 CORS allowed origins 改为 `AGENTHUB_CORS_ALLOWED_ORIGINS` 可配置，避免 Browser E2E 或本地前端临时端口被硬编码 5173 限制阻断。
- `scripts/README.md` 同步 Browser E2E 和 JDBC restart verify 的生产增强覆盖范围。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `node --check scripts/jdbc-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/real-adapter-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- MySQL/JDBC 实库验证：临时 backend `18121`、frontend `5179`、MySQL 临时库 `agenthub_jdbc_verify_*`，`node scripts/jdbc-smoke-test.mjs` create 与 restart verify 通过；重启后 Conversation、Message、Attachment、Artifact、ArtifactSnapshot、Deployment、TaskRun、TaskStep、ContextSnapshot、PinnedContext、Memory、ApprovalRequest、ActionAuditLog、HandoffSummary 可查询。
- Browser E2E：临时 backend `18122`、frontend dev server `5180`，`node scripts/e2e-browser.mjs` 通过；覆盖 Workspace 主协作 CTA、附件、TaskRun、Agent protocol、ContextPanel、Artifact revision、Apply Diff approval、Deploy preview、Restore、Action Audit、Preview 页面和 optional REJECTION。

### 静态 / Mock / Placeholder 部分

- Browser E2E 仍要求本地 backend / frontend 预先启动，不负责启动服务。
- Deployment 持久化覆盖的是当前 static preview deployment，不是真实 Vercel / Netlify / Docker / Kubernetes 发布。
- MySQL/JDBC profile 仍是 opt-in 验证路径，默认 runtime 继续使用 memory。
- Codex / Claude Code 仍是 headless Artifact-only Adapter；默认 smoke 不依赖本机 CLI 或真实外部 Agent。

### 遗留问题

- OpenCode 深度接入仍后置。
- 本轮没有执行 OpenAI-compatible / Codex / Claude Code 真实 Adapter smoke；这些仍保持 opt-in 验证入口。

### 下一步建议

- 将 `node scripts/e2e-browser.mjs` 纳入后续大改后的常态 UI 回归。
- 下次真实 Adapter Sprint 分别跑 OpenAI-compatible、Codex、Claude Code smoke，继续观察 `realAdapterOutcome` 分类和 fallback reason。

## Phase 108：P1 产品可信度增强

### 目标

- 在不重写主链路的前提下，增强 Stop / Cancel、Adapter Quality、Context Search 和 Artifact 编辑的产品可解释性。
- 让用户和后续 Agent 更容易判断真实、半真实、fallback 和静态能力边界。

### 主要变更

- Adapter Quality 后端聚合视图新增 real acceptance rate、parse failure rate、quality failure rate、build failure rate、total failure rate 和 health label。
- Adapter Quality Dashboard 改为优先展示后端长期聚合指标，同时保留 route attempts / observed quality attempts 的对照。
- ContextPanel 为每条 Retrieved Context 增加 List / Grep / Read pipeline 展示，明确候选列举、关键词命中和读取窗口。
- Diff Summary 增加应用前可信度检查，说明 Approval Gate、冲突风险、行级影响和 Snapshot / Restore 安全边界。
- TaskRunPanel 增加 Stop / Cancel 语义提示，明确 Stop 跳过后续 step，Cancel 丢弃 late adapter output，terminal run 拒绝控制命令。
- `docs/plans/next.md` 同步 P1 产品可信度增强状态。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/smoke-test.mjs`
- 临时当前源码后端 `18131`：`node scripts/smoke-test.mjs` 通过。
- 临时当前源码后端 `18132`：`node scripts/sse-smoke-test.mjs` 通过。
- 临时当前源码后端 `18133` + `agenthub.orchestrator.step-delay-millis=1800`：`AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_CANCEL=true` 和 `AGENTHUB_SSE_SMOKE_EXPECT_ACTIVE_STOP=true` 通过。

### 静态 / Mock / Placeholder 部分

- Stop / Cancel 仍不能硬中断已经在途的非流式 Java HTTP 调用；结果在 token 被观察后丢弃。
- Adapter Quality Dashboard 是后端聚合指标，不代表真实 provider 永远稳定产出高质量代码。
- Context Search 仍以 DB-backed Agentic Search 和 heuristic scoring 为主，embedding / vector search 未默认启用。
- Diff trust check 是轻量行级 patch 风险说明，不是语义级 merge 或完整冲突自动修复。

### 遗留问题

- 仍需在真实慢任务 / 真实 adapter 场景下持续跑 active Stop / Cancel opt-in 验证。
- Browser E2E 尚未专门断言本轮新增的 Dashboard rate、Context pipeline 和 Diff trust check。
- Adapter Quality 聚合仍是本地 snapshot 文件，不是多节点长期指标系统。

### 下一步建议

- 将本轮新增 UI 信号纳入 browser E2E 断言。
- 继续用真实 OpenAI-compatible / Codex / Claude Code smoke 观察 Adapter quality metrics 的长期趋势。

## Phase 109：真实 Agent 输出稳定性 Spec 对齐

### 目标

- 按 `real-agent-output-stability-spec.md` 对齐真实 Adapter 输出质量链路。
- 让 build validation failure 的原因成为结构化字段，而不是只混在 `qualityReason` 文本中。

### 主要变更

- `TaskStep` 新增 `artifactBuildValidationReason`，并继续兼容旧 `qualityReason` 中的 build lint reason。
- `Artifact` 新增 `buildValidationReason`，REAL_ADAPTER Artifact、archived static fallback 和 JDBC 映射都会保留该字段。
- `AgentStepExecutor` 在执行摘要、TaskStep、Artifact、REAL_FIRST fallback 路径中写入 build validation reason。
- `JdbcTaskRepository`、`JdbcArtifactRepository` 和 `schema-jdbc.sql` 增加 build validation reason 列；已有 JDBC 表会在 init 时安全补列。
- `TaskRunPanel`、`ArtifactPanel`、`ArtifactCard` 展示独立 build validation reason，并在质量门禁行动建议中优先使用该字段。
- `real-adapter-smoke-test.mjs` 在开启 build validation 断言时同时校验 TaskStep 和 Artifact 的 build validation reason。
- `ReviewDecisionEvaluator` 将 build validation reason 纳入 REJECTION evidence 和 blocker 文案。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `node --check scripts/real-adapter-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮没有强跑真实外部 provider、Claude Code 或 Codex CLI smoke；这些仍是 opt-in 验证。
- 默认 demo 仍允许 memory + MOCK/static fallback，不依赖真实 LLM。
- build validation 仍是当前轻量规则和 opt-in TypeScript smoke，不是完整 ESLint/test/static-analysis 平台。

### 遗留问题

- API smoke 临时启动遇到本机 PowerShell 子进程启动限制，未完成本轮完整 API smoke。
- 后续需要在真实 provider smoke 中重新确认 `buildValidationReason` 返回和展示。

### 下一步建议

- 以真实 OpenAI-compatible provider 跑一次 strict real-adapter smoke，确认 `artifactBuildValidationReason` 和 `buildValidationReason` 在真实输出链路中稳定返回。
- 将 build validation reason 加入后续 Browser E2E 的 UI 可见性断言。

## Phase 110：默认 IM-first 协作入口产品化

### 目标

- 将 `/workspace` 默认体验从手动 `Run Demo Task` 调整为“发送任务消息 -> 确认协作 -> Orchestrator 执行”的 IM-first 主路径。
- 保留手动运行能力，但明确定位为 smoke / local debugging fallback。

### 主要变更

- Workspace 主工具栏保留协作确认主 CTA，并将手动运行入口折叠到 `Debug / Advanced` 区域。
- Message-level collaboration card 增加 task summary、expected agents、expected artifacts、context sources、Start / Edit / Cancel 操作。
- Cancel confirmation 会刷新 ApprovalRequest 和 ActionAuditLog，避免消息卡片停留在旧状态。
- MessageStream 空状态增加任务示例，引导用户通过消息启动协作。
- ChatInput、TaskRunPanel、ArtifactPanel 的空状态和提示文案改为围绕 message-triggered collaboration，而不是 Demo Task。
- `docs/plans/next.md` 同步默认 IM-first 协作入口的完成状态。

### 验证方式

- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- 本轮没有改变 Orchestrator 后端执行逻辑，也没有删除 demo-task API。
- 确认卡片仍基于现有规则化 trigger suggestion，不是完整自然语言 intent engine。
- 手动 debug run 仍保留给 smoke、fallback 验证和本地调试。

### 遗留问题

- Browser E2E 尚未在本轮重新完整跑 UI 主链路。
- Message card 的 expected agents / expected artifacts 是轻量规则提示，最终执行仍以后端 Orchestrator plan 为准。

### 下一步建议

- 将新增 confirmation card 详情和 debug panel 折叠状态纳入 Browser E2E 断言。
- 继续减少用户对 TaskRunPanel 的理解成本，让 MessageStream 本身能解释协作进度。

## Phase 111：MySQL Profile 工程化 Spec

### 目标

- 将 MySQL/JDBC profile 从“已验证可用”整理为稳定规格。
- 明确 memory 默认路径、jdbc opt-in 验证路径、初始化规则、Repository 覆盖和生产边界。

### 主要变更

- 新增 `docs/spec/mysql-profile-spec.md`。
- Spec 覆盖 persistence mode、JDBC 配置、持久化对象、初始化规则、create/query/update/restart verify 流程。
- Spec 明确 MySQL profile 不默认启用，不引入 migration framework，不提交真实数据库密码。
- `docs/plans/next.md` 同步 MySQL/JDBC profile spec 已完成。

### 验证方式

- Docs-only change，未执行 backend / frontend build。

### 静态 / Mock / Placeholder 部分

- 本轮没有新增 JDBC 代码，也没有重新跑真实 MySQL。
- 当前 MySQL profile 仍是 opt-in 半生产验证路径，不是默认生产 runtime。
- 当前没有完整 migration system、连接池调优、备份恢复或生产数据库治理。

### 遗留问题

- 后续仍需补更友好的初始化脚本体验。
- 进入完整生产化前，需要评估 Flyway / Liquibase、数据库权限分层和备份策略。

### 下一步建议

- 为 `jdbc-smoke-test.mjs` 增加更明确的 init / create / restart verify 操作说明。
- 在需要真实持久化演示时单独跑 MySQL create / restart verify，而不是默认切换 runtime。

## Phase 112：MySQL Profile 初始化脚本体验

### 目标

- 将 MySQL/JDBC profile 从文档规格推进到更可执行的本地初始化体验。
- 保持 MySQL 为 opt-in 验证路径，不影响默认 memory runtime。

### 主要变更

- 新增 `scripts/mysql-init-profile.mjs`，使用本机 `mysql` CLI 创建数据库并应用 `backend/src/main/resources/schema-jdbc.sql`。
- 初始化脚本支持 `AGENTHUB_MYSQL_*` 配置，也可从 `AGENTHUB_JDBC_URL` 推导 host / port / database。
- `.env.example` 增加 MySQL 初始化相关变量占位，不包含真实密码。
- `scripts/README.md` 增加 MySQL 初始化、JDBC env 和 restart verify 说明。
- `scripts/AGENTS.md`、`docs/spec/mysql-profile-spec.md`、`docs/plans/next.md` 同步 MySQL profile init 脚本边界。

### 验证方式

- `node --check scripts/mysql-init-profile.mjs`
- `node scripts/mysql-init-profile.mjs`，连接本机 MySQL 并初始化 `agenthub_jdbc_verify`
- `cd backend && mvn -q -DskipTests package`
- 以 JDBC profile 启动 backend，运行 `node scripts/jdbc-smoke-test.mjs` create 路径
- 重启 backend 后运行 `node scripts/jdbc-smoke-test.mjs` verify 路径
- verify 覆盖 Conversation、Message、Attachment、Artifact、ArtifactSnapshot、Deployment、TaskRun、TaskStep、ContextSnapshot、PinnedContext、HandoffSummary、Memory、ApprovalRequest、ActionAuditLog

### 静态 / Mock / Placeholder 部分

- 本轮已连接本机 MySQL 执行初始化和 JDBC create / restart verify。
- 脚本是本地验证辅助，不是生产 migration system。
- MySQL profile 仍是 opt-in，不作为默认 runtime。

### 遗留问题

- 进入完整生产化前仍需评估 Flyway / Liquibase、备份恢复、连接池和数据库权限策略。
- 仍需把本机验证流程收敛成更稳定的一键 release checklist，而不是依赖临时 PowerShell 编排。

### 下一步建议

- 后续每次修改 JDBC schema / repository 后重复执行 MySQL init + JDBC create / restart verify。
- 若初始化脚本在不同 MySQL/MariaDB 版本上出现兼容问题，优先收敛 schema，而不是绕过 smoke 断言。

## Phase 113：Browser E2E 常态化质量门禁

### 目标

- 将 Browser E2E 从偶发验证升级为每次大改后的固定 UI 回归门禁。
- 覆盖 `/workspace` 的 IM-first 产品主路径，而不是依赖手动 Demo Task 调试入口。

### 主要变更

- Workspace、ChatInput、MessageStream、MessageBubble、TaskRunPanel、ContextPanel、ArtifactPanel、DiffSummary、ActionAuditTimeline 增加关键 `data-testid`。
- `scripts/e2e-browser.mjs` 改用稳定测试入口覆盖核心路径，并在失败时输出当前 URL、截图和 console/page error 摘要。
- 新增 `scripts/verify-local.mjs`，顺序运行 API smoke、SSE smoke、Browser E2E。
- `scripts/README.md` 明确 Browser E2E 主链路、前置服务、失败诊断和质量门禁边界。
- `scripts/AGENTS.md` 和 `docs/plans/next.md` 同步 Browser E2E 必跑策略。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `node --check scripts/verify-local.mjs`
- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 部分

- Browser E2E 仍不调用真实 LLM、真实外部 Agent、真实部署平台或 MySQL。
- `verify-local.mjs` 是本地顺序验证入口，不负责启动或停止 backend / frontend。
- Browser E2E 是 UI 回归门禁，不替代 API smoke、SSE smoke、JDBC/MySQL smoke 或真实 Adapter smoke。

### 遗留问题

- 本轮未启动完整 backend / frontend 执行浏览器点击流；需要在大改验收时跑 `node scripts/e2e-browser.mjs`。
- 后续可继续增加 REJECTION、attachment download、Context Retrieval explain 的更细粒度 DOM 断言。

### 下一步建议

- 每次修改 Workspace、MessageStream、ArtifactPanel、Approval、Restore、Deploy Preview 或 PreviewPage 后，将 `node scripts/e2e-browser.mjs` 作为必跑项。
- 若后续接 CI，可把 Browser E2E 作为可选 UI regression job，默认本地仍保留手动执行路径。

## Phase 114：Context Search 增强 Spec

### 目标

- 将 Context Search 从实现细节整理为稳定规格。
- 明确 AgentHub 默认采用 DB-backed Agentic Search，并保留 MySQL FULLTEXT 与 embedding 的可插拔边界。

### 主要变更

- 新增 `docs/spec/context-search-spec.md`。
- Spec 覆盖 `List / Grep / Read` 检索流程、ContextSearchCandidate、ContextSearchResult、RetrievedContextItem、ranking 规则、read window、FULLTEXT opt-in 和 embedding storage boundary。
- `docs/plans/next.md` 同步 Context Search spec 已完成。

### 验证方式

- Docs-only change，未执行 backend / frontend build。

### 静态 / Mock / Placeholder 部分

- 本轮没有新增检索代码。
- 当前默认仍是 DB-backed Agentic Search + heuristic scoring。
- FULLTEXT 是 opt-in，不替代 LIKE 默认路径。
- embedding provider 仍是边界和存储骨架，不是默认向量检索能力。

### 遗留问题

- 后续如果调整 ranking / FULLTEXT / read window，需要同步更新该 spec。
- 真正 embedding provider、向量索引和大规模知识库检索仍后置。

### 下一步建议

- 若继续做 Context Search 增强，优先补 ranking 调参和 Browser E2E 可见性断言，而不是直接引入重型向量数据库。

## Phase 115：真实 Agent 输出稳定性 Spec 落地

### 目标

- 将真实 Agent 输出稳定性规则从计划收敛为可读 spec 和可验证代码路径。
- 明确 `OpenAI-compatible / Claude Code / Codex -> REAL_FIRST -> REAL_ADAPTER Artifact` 的 contract、quality、build、fallback 边界。

### 主要变更

- 重写 `docs/spec/real-agent-output-stability-spec.md`，修复原文编码乱码，并固化目标、范围、非目标、Current behavior、核心模型、关键流程、验收标准和 fallback / boundary。
- 调整 `AgentStepExecutor`，让 `REAL_FIRST` 下无效 contract 或 fallback text promotion 明确归类为 `PARSE_FAILED`，避免混入 generic `QUALITY_FAILED`。
- 新增 `AdapterArtifactContractValidatorTest`，覆盖合法 JSON contract、Markdown fence、缺字段、非法 type、CODE fence、provider error 文本等 contract 规则。
- 新增 `AdapterArtifactQualityEvaluatorTest`，覆盖 CODE 质量、build validation、fallback text extraction 和 outcome 归类行为。
- 更新 `docs/plans/next.md`，把真实 Agent 输出稳定性 spec 和 `PARSE_FAILED` 分类规则标记为已完成。

### 验证方式

- `cd backend && mvn -q -Dtest=AdapterArtifactContractValidatorTest,AdapterArtifactQualityEvaluatorTest test`
- `cd backend && mvn -q -DskipTests package`

### 静态 / Mock / Placeholder 部分

- 本轮默认链路仍保持 `memory + MOCK/static fallback` 可运行。
- 本轮验证重点是 contract / quality / build 规则，不强制真实外部 provider。
- Fixture smoke 仍只能证明 contract 路径，不代表真实 provider 输出质量。
- `REAL_ADAPTER` 只代表通过当前 gate，不代表生成代码达到生产可上线质量。

### 遗留问题

- 仍需持续观察真实 provider 的 parse failure、quality failure、build failure 和 fallback 分布。
- 真实外部 OpenAI-compatible、Claude Code、Codex smoke 仍是 opt-in，不进入默认验证链路。
- 后续如扩展 streaming 或新 Adapter，必须继续复用同一 contract validator 和 outcome taxonomy。

### 下一步建议

- 继续围绕真实 Adapter 输出质量 dashboard 做长期聚合观察。
- 对更多任务类型运行 opt-in real adapter smoke，扩大 `REAL_FIRST` 质量样本。

## Phase 116：Claude / Codex Headless Adapter 深接 Spec

### 目标

- 固化 Claude Code 与 Codex 的生产化 v1 接入边界。
- 明确当前深接优先稳定 headless Artifact-only，而不是桌面端 GUI 自动化或 workspace-write 模式。

### 主要变更

- 新增 `docs/spec/claude-codex-headless-adapter-spec.md`。
- Spec 覆盖 Claude Code / Codex Adapter 的目标、范围、非目标、Current behavior、Artifact contract、CLI 执行规则、配置、验收标准、深接前置条件和 fallback / boundary。
- `docs/plans/next.md` 同步 Claude Code / Codex headless Adapter spec 已完成。

### 验证方式

- Docs-only change，未执行 backend / frontend build。

### 静态 / Mock / Placeholder 部分

- 本轮没有新增 Adapter 代码。
- Claude Code / Codex 默认仍是 opt-in 验证，不进入默认 smoke 强依赖。
- Fixture mode 仍只能证明 contract，不代表真实 CLI provider 输出。
- 当前深接仍是 Artifact-only，不允许外部 Agent 直接写 AgentHub 工作区。

### 遗留问题

- 后续若继续深接，需要先扩大真实 CLI smoke 样本，并观察 parse / quality / build / fallback 指标。
- OpenCode 仍未进入同等级专用 headless Adapter 深接。
- 更完整的 CLI capability discovery、tool allowlist / denylist 和 lint/test gate 仍可继续增强。

### 下一步建议

- 继续保持 OpenAI-compatible / Claude Code / Codex 共用同一 Artifact contract validator 和 quality evaluator。
- 若要推进更深平台能力，先补更稳定的 CLI capability discovery 和长期 Adapter quality metrics，而不是接桌面端 GUI 自动化。

## Phase 117：Claude / Codex Headless Adapter 可观测性增强

### 目标

- 将 Claude Code / Codex 深接计划中的 P1 可信度增强落到可观测字段。
- 保持当前接入边界为 headless Artifact-only，不推进桌面端 GUI 自动化或 workspace-write。

### 主要变更

- `AgentAdapterDescriptor` 增加 `supportedModes`、`safetyPolicies`、`capabilityDetails`，兼容旧构造方式。
- `CLAUDE_CODE` descriptor 暴露 headless、artifact-only、json / stream-json、tool policy、安全边界和非侵入式 version/help probe 结果。
- `CODEX` descriptor 暴露 headless exec、json schema、read-only sandbox、streaming、安全边界和非侵入式 version / exec help probe 结果。
- `AdapterQualityDashboard` 增加 modes 和 policy 列，展示 Adapter 当前能力模式和 workspace-write 禁用状态。
- `docs/spec/claude-codex-headless-adapter-spec.md` 修复编码并补充 capability discovery 规则。
- `docs/plans/next.md` 同步 Claude Code / Codex capability metadata 已完成。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 部分

- capability discovery 只运行 `--version` / `--help` 等非侵入式探测，不触发真实模型执行。
- 认证状态仍必须通过 direct execute 或 smoke 验证，descriptor 中标记为 `NOT_PROBED_EXECUTE_SMOKE_REQUIRED`。
- Claude Code / Codex 默认仍是 opt-in，不进入默认 smoke 强依赖。
- 本轮没有实现桌面端 GUI 自动化、workspace-write 或完整外部 Agent session 托管。

### 遗留问题

- version/help probe 失败不等于真实执行失败；真实能力仍需 opt-in smoke 覆盖。
- OpenCode 还没有同等级专用 Artifact-only headless Adapter。
- 更深 tool allowlist / denylist 和 lint/test gate 仍可继续增强。

### 下一步建议

- 继续扩大 Claude Code / Codex real CLI smoke 样本，观察 Adapter Quality Dashboard 的长期趋势。
- 后续若做 OpenCode 深接，应复用同一 descriptor metadata、Artifact contract 和 fallback 规则。

## Phase 118：真实 Claude / Codex CLI 运行稳定性与 Smoke 强化

### 目标

- 提升真实 Claude Code / Codex CLI 接入的诊断能力和 smoke 稳定性。
- 防止 fixture mode 被误判为真实 CLI 验证。

### 主要变更

- Claude Code / Codex Adapter 失败诊断增加 `failureType`、`commandMode`、`timeoutSeconds`、`cliPath`。
- 失败类型覆盖 `NOT_INSTALLED / NOT_AUTHENTICATED / PERMISSION_DENIED / TIMEOUT / CONTRACT_INVALID / CANCELLED / FAILED`，quality / build / fallback 仍由 TaskStep 和 smoke 继续归类。
- `CliAgentCommandRunner` 和 `CodexCommandRunner` 增加 command path resolution 与非侵入式 probe helper。
- `claude-code-smoke-test.mjs` 增加 descriptor capability metadata 检查和 `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true`。
- `codex-smoke-test.mjs` 增加 descriptor capability metadata 检查和 `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true`。
- `.env.example` 与 `scripts/README.md` 增加 real CLI smoke guard 和 failure classification 说明。
- `docs/spec/claude-codex-headless-adapter-spec.md` 和 `docs/plans/next.md` 同步真实 CLI 诊断边界。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮未强制运行真实 Claude Code / Codex CLI smoke。
- capability discovery 仍是非侵入式版本 / help 级别探测，不触发模型执行。
- 认证状态仍必须通过 direct execute 或 opt-in smoke 验证。
- 当前仍不做桌面端 GUI 自动化、workspace-write 或完整交互终端托管。

### 遗留问题

- `failureType` 目前作为诊断文本暴露，尚未升级为独立 DTO 字段。
- Claude Code / Codex 的真实 smoke 样本仍需要在已安装、已认证机器上持续积累。
- 更深 tool policy、lint/test gate、OpenCode 专用 headless Adapter 仍后置。

### 下一步建议

- 在本机真实 CLI 环境下分别运行 require-real smoke，记录 failure 分类是否足够准确。
- 如果后续 UI 需要更结构化展示，再把 `failureType` 从诊断文本提升为正式 response 字段。

## Phase 119：Claude / Codex Prompt Contract 与输出质量拒绝原因收敛

### 目标

- 收敛 Claude Code / Codex headless Adapter 的输出契约，避免真实 CLI 输出普通文本、Markdown fence、wrapper metadata 或 CLI logs 时被误采纳为 `REAL_ADAPTER`。
- 让 parse / quality / build 失败原因更明确，保留静态 fallback 作为稳定兜底。

### 主要变更

- `CodexArtifactPromptBuilder` 强化 Artifact-only prompt：要求单个 JSON object、根输出首尾为 `{}`、禁止 Markdown fence、CLI logs、wrapper metadata、stdout/stderr 和 usage stats。
- `ClaudeCodeAgentAdapter` 内置 prompt 同步强化同一 contract。
- Claude Code / Codex contract validation failure 统一在 adapter error 中标记 `PARSE_FAILED`。
- `AdapterArtifactContractValidator` 扩展拒绝规则：artifact content 中的 Markdown fence、CLI wrapper metadata、stdout/stderr 类日志不再通过 contract。
- `AdapterArtifactQualityEvaluator` 的 quality reason 增加 `outcome=QUALITY_FAILED / BUILD_FAILED / ACCEPTED`，便于 UI、smoke 和 Reviewer gate 解释失败层级。
- 补充 validator / quality evaluator 单元测试，覆盖普通文本、Markdown fenced artifact content、CLI wrapper metadata、QUALITY_FAILED 和 BUILD_FAILED。
- `docs/spec/claude-codex-headless-adapter-spec.md` 与 `docs/plans/next.md` 同步最新 prompt contract 和失败分类边界。

### 验证方式

- `cd backend && mvn -q -Dtest=AdapterArtifactContractValidatorTest,AdapterArtifactQualityEvaluatorTest test`
- `cd backend && mvn -q -DskipTests package`

### 静态 / Mock / Placeholder 部分

- 本轮没有强制运行真实 Claude Code / Codex CLI smoke。
- `BUILD_FAILED` 仍基于当前轻量 build heuristic，不是完整 ESLint / TypeScript / unit test 平台。
- 静态 fallback 仍保留，避免真实 CLI 输出异常时破坏默认 demo。

### 遗留问题

- 真实 CLI 输出质量仍需要持续积累 smoke 样本。
- `failureType` 仍主要通过诊断文本和 TaskStep / Artifact metadata 暴露，尚未升级为完整独立 DTO。
- 更严格的真实 TypeScript build / lint / test 仍作为 opt-in 后续增强。

### 下一步建议

- 在真实 Claude Code / Codex CLI 环境下分别跑 require-real smoke，确认 prompt contract 对不同任务类型的约束稳定性。
- 若真实输出仍频繁 PARSE_FAILED，继续微调 provider-specific prompt 或使用更强 schema 输出能力。

## Phase 120：Claude / Codex Streaming Stop-Cancel 语义与运维文档同步

### 目标

- 固化 Claude Code / Codex streaming chunk 的产品边界：只做预览，不持久化 token。
- 强化 Stop / Cancel 后 late chunks 与 late result 的丢弃语义。
- 补齐新机器上检查 CLI、启动 backend、运行 fixture / real CLI smoke 的运维说明。

### 主要变更

- `ClaudeCodeAgentAdapter` 在 stream-json 读取过程中观察到 cancellation 时会强制清理 CLI 进程，避免中途取消后遗留进程继续输出。
- `CodexAgentAdapter` fixture streaming 现在也发布 `ADAPTER_STREAM_CHUNK` / `TASK_STEP_STREAM_CHUNK`，与真实 Codex streaming 事件类型保持一致。
- Codex / Claude streaming 继续只通过 realtime event 做预览；最终 Artifact 仍必须走完整 contract validator、quality evaluator、build validation 和 REAL_FIRST gate。
- `.env.example` 增加 fixture / real CLI smoke guard 与 preview-only streaming 说明。
- `scripts/README.md` 补充 Windows PowerShell 下 `claude --version`、`codex --version`、fixture smoke、real CLI smoke、streaming smoke、常见失败原因和排查方式。
- `docs/spec/claude-codex-headless-adapter-spec.md` 增加 Streaming / Stop / Cancel 规则。
- `docs/plans/next.md` 同步 Claude / Codex streaming 与 cancellation 已收敛的当前状态。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮没有强制运行真实 Claude Code / Codex CLI streaming smoke。
- Fixture streaming 只验证事件和 contract，不代表真实 CLI token streaming 质量。
- 目前仍不持久化 token-level chunk，也不做多节点 event bus。

### 遗留问题

- 非流式 Java / CLI 调用已经在途时仍不做硬线程中断；返回后通过 cancellation token 丢弃结果。
- 真实 CLI cancellation 仍需要在已认证机器上持续跑 opt-in smoke 样本。
- WebSocket 当前仍是 stop / cancel control plane，不是完整双向聊天系统。

### 下一步建议

- 在真实 Claude Code / Codex streaming 环境下分别运行 opt-in smoke，确认 cancellation 后没有 `REAL_ADAPTER` Artifact 落库。
- 如需更强保证，可增加专门的 slow fixture / cancellation smoke 覆盖真实 late-result discard。

## Phase 121：Workspace 中文化与 Command Center 视觉 P0

### 目标

- 将 `/workspace` 默认体验继续收敛为中文优先的 IM-first 协作工作台。
- 按 technical command center + premium collaboration studio 方向提升视觉层级，但不改变三栏核心结构。
- 强化 MessageStream、TaskRunPanel、ArtifactPanel 中协作状态、流式状态、质量门禁和修复路径的可读性。

### 主要变更

- 确认前端源码为 UTF-8，终端乱码来自 PowerShell 输出编码；页面文案继续按中文优先收敛。
- `MessageStream` 空状态、streaming preview 状态和 chunk 说明改为中文。
- `MessageBubble` 协作确认卡、任务摘要、预计 Agent、预计产物、上下文来源、编辑 / 取消 / 下载等主路径文案改为中文。
- `WorkspacePage` 主 CTA、Debug / Advanced、手动调试 fallback 文案改为中文，继续弱化手动 demo-task 入口。
- `TaskRunPanel` Stop / Cancel 说明、质量门禁失败原因、修复路径、真实输出 / 解析 / 质量 / 构建状态等改为中文。
- `ArtifactPanel` 部署审批、fallback 原因、质量 / 构建说明、Approval Gate、Deploy Status、Safety Snapshot 等主路径文案改为中文。
- `AdapterRoutingPanel` 与 `AdapterQualityDashboard` 关键说明改为中文。
- `PreviewPage` 预览模式、详情字段、版本切换和错误 / loading 状态改为中文。
- `global.css` 增加 command center 设计 token；`workspace.css` 增加 command center P0 视觉覆盖层，强化背景、面板、状态 badge、Agent protocol card、streaming 状态、质量门禁和 PreviewPage 的视觉层级。
- `docs/plans/next.md` 同步本轮 P0 视觉收敛状态。

### 验证方式

- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 部分

- 本轮只做前端视觉与文案收敛，不改变后端 Orchestrator、Adapter、Artifact、Approval、Deploy 或 Realtime 业务语义。
- Deploy Preview 仍是本地静态预览，不是真实云部署。
- Streaming 文案仍明确为预览状态，最终 Artifact 仍以后端校验和持久化结果为准。

### 遗留问题

- 本轮未跑 Browser E2E；如继续改 Workspace、MessageStream、ArtifactPanel 或 PreviewPage，应运行 `node scripts/e2e-browser.mjs`。
- `WorkspacePage.tsx` 仍然偏大，后续应继续拆分 feature-level 组件。
- 部分深层技术字段仍保留英文枚举值，例如 `REAL_ADAPTER`、`REAL_FIRST`、`PARSE_FAILED`，这是为了与后端状态和 smoke 断言保持一致。

### 下一步建议

- 继续做 P1：ContextPanel 的 List / Grep / Read pipeline 可视化、Adapter Dashboard 指标卡化、ArtifactPanel cockpit 化和 PreviewPage polish。

## Phase 122：Context Search Pipeline 与 Adapter Quality 指标卡

### 目标

- 增强 ContextPanel 的 List / Grep / Read 检索解释，让用户能直接看懂上下文是如何被召回、命中、读取并注入 TaskStep 的。
- 将 Adapter Quality Dashboard 从表格型数据展示升级为顶部指标卡 + 明细表的观测面板。

### 主要变更

- `ContextPanel` 增加 snapshot 级检索流水线概览，展示召回上下文数、关键词命中数、窗口回退数、matched tokens、已注入 Step 数和主要来源类型。
- `ContextPanel` 单条 retrieved context 增加综合分进度条，并保留 source rank、base / keyword / recency / importance / semantic score、matchedTokens、read window、semantic backend 和注入 Step 说明。
- `AdapterQualityDashboard` 增加 KPI 指标卡：观测范围、平均成功率、平均 fallback、真实产物采纳、失败分类、最高风险 Adapter。
- `workspace.css` 补充 Context Search overview、score meter、Adapter KPI cards 的 command center 风格样式和响应式布局。
- `docs/plans/next.md` 同步本轮 P1 可解释 UI 状态。

### 验证方式

- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 部分

- 本轮只增强前端解释 UI，不改变后端 Context Retrieval、Adapter metrics、REAL_FIRST 或 fallback 语义。
- Context Search 仍是 DB-backed Agentic Search + heuristic scoring；embedding/vector search 仍是可插拔后置能力。
- Adapter 指标卡展示的是现有后端聚合指标和当前 TaskStep 观测，不代表所有真实外部 Agent 的长期生产质量。

### 遗留问题

- 本轮未运行 Browser E2E；若继续修改 Workspace 主链路，应运行 `node scripts/e2e-browser.mjs`。
- Adapter Dashboard 仍可继续增强趋势图、时间窗口和 adapter-specific drilldown。
- ContextPanel 后续可继续做 source filter、source preview 和注入链路跳转。

## Phase 123：Artifact Cockpit 与 Preview Studio 产品化

### 目标

- 将 ArtifactPanel 从信息堆叠继续收敛为可读的产物 cockpit，让用户快速判断来源、质量、构建、安全快照和部署预览状态。
- 将 `/preview/:artifactId` 从基础内容页继续打磨为独立 Preview Studio，明确展示本地静态预览边界、版本链和门禁状态。
- 补充轻量 motion 与窄屏响应式规则，并跑 Browser E2E 做 UI 回归验证。

### 主要变更

- `ArtifactPanel` 增加 `Artifact Cockpit` 摘要区，聚合展示真实 / fallback 来源、REAL_ADAPTER outcome、质量门禁、构建校验、内容体量、安全快照数量和部署记录。
- `PreviewPage` 增加 `Preview Studio` 区块和内容预览 toolbar，展示 trust status、sourceKind、sourceAdapterType、quality/build 状态、版本链数量和预览模式。
- `workspace.css` 增加 cockpit / studio 的 command center 样式、状态色、入场动效和 720px 窄屏堆叠规则。
- `docs/plans/next.md` 同步 Artifact cockpit、Preview studio 和 motion / responsive polish 的完成状态。

### 验证方式

- `cd frontend && npm run build`
- `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- Preview Studio 仍展示本地静态 Artifact 内容，不代表真实云部署或公网发布。
- Artifact Cockpit 展示的是当前后端已有的 contract / quality / build / fallback metadata，不新增真实静态分析平台。

### 遗留问题

- 还没有做完整移动端视觉 QA；当前只是窄屏布局保护。
- ArtifactPanel 仍可继续拆分为更小的 cockpit / revision / deploy / snapshot 子组件，降低组件体积。

### 下一步建议

- 将 Browser E2E 继续作为 Workspace / ArtifactPanel / PreviewPage 大改后的固定 UI 回归门禁。

### 下一步建议

- 继续做 ArtifactPanel cockpit 化与 PreviewPage 独立预览工作台 polish。

## Phase 124：Artifact Cockpit Handoff 与 Preview Studio Polish 验证

### 目标

- 继续增强 ArtifactPanel cockpit 化，让产物来源、质量门禁、构建校验、快照、部署和下一步动作更容易理解。
- 继续打磨 `/preview/:artifactId` 为独立预览工作台，明确本地静态 Preview 的边界。
- 用 Browser E2E 验证 Workspace / Artifact / Approval / Restore / Deploy / Preview 主路径没有回归。

### 主要变更

- `ArtifactPanel` 在 Artifact Cockpit 中新增“下一步建议”和“交付路径”区域，展示真实输出、质量门禁、构建校验、预览发布的当前状态。
- `PreviewPage` 将标题收敛为“Artifact 预览工作台”，新增交付边界说明，并把元数据与版本切换组织成更像独立工作台的双栏区域。
- `workspace.css` 补充 cockpit handoff、delivery flow、Preview boundary、Preview workbench 的 command-center 样式、轻量动效和窄屏堆叠规则。

### 验证方式

- `cd frontend && npm.cmd run build`
- 启动本地 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- Preview Studio 仍是本地静态 Artifact 预览，不是真实云部署或公网发布。
- Artifact Cockpit 继续展示现有 contract / quality / build / fallback metadata，不新增真实静态分析平台。
- 本轮没有修改后端业务语义、Artifact 生成、审批、部署或 Adapter 执行逻辑。

### 遗留问题

- ArtifactPanel 组件仍偏大，后续可以拆分为 cockpit、revision、deploy、snapshot、diff 子组件。
- 当前 responsive polish 是窄屏布局保护，不是完整移动端适配。

### 下一步建议

- 继续把 Browser E2E 作为 Workspace、ArtifactPanel、PreviewPage 大改后的固定 UI 回归门禁。

## Phase 125：Workspace 主路径产品化与 IM 协作视觉增强

### 目标

- 按 IM-first 主路径继续弱化调试面板感，让“发送任务 -> 确认协作 -> 多 Agent 回复 -> Artifact”成为更自然的默认体验。
- 增强 MessageStream 中 Agent 协作消息的协议视觉，区分 Orchestrator 与 Specialist Agent。
- 让 Conversation / Agent 侧栏更像 IM 联系人与群聊成员列表，突出 status、capability 和 adapter health。

### 主要变更

- `MessageBubble` 重写为中文可读文案，并新增协议卡片层：`TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR` 均有说明与行动提示。
- `MessageBubble` 增加 Orchestrator / Specialist lane class，视觉上区分协调消息和专家 Agent 消息。
- `MessageStream` 空状态、loading、streaming preview 文案改为中文，并将 streaming chunk / partial / discarded 展示为轻量状态条。
- `AgentList` 调整为 IM 联系人样式，增加 presence dot、在线 / fallback 状态、adapter health、能力 / 工具数量摘要。
- `ConversationList` 调整会话卡片文案和 IM 协作会话提示。
- `WorkspacePage` 将当前参与 Agent 标题改为“当前群聊成员”，并把 Audit / Realtime 文案中文化。
- `workspace.css` 增加协议卡片、streaming 状态条、IM Agent 联系人、会话卡片、参与者高亮与窄屏保护样式。

### 验证方式

- `cd frontend && npm.cmd run build`
- 启动本地 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮只修改前端展示和主路径信息架构，不改变 Orchestrator、Adapter、Artifact、Approval、Deploy 或 Realtime 的后端语义。
- Streaming 状态条仍是预览态；最终 Artifact 仍以后端 contract / quality / build 校验结果为准。
- Agent 联系人显示 adapter health 和 fallback 状态，不代表所有外部 Agent 都真实可用。

### 遗留问题

- `WorkspacePage` 和部分 feature 组件仍然偏大，后续应继续拆分以降低维护成本。
- 当前是 Web 端响应式保护，不是完整移动端产品化。

### 下一步建议

- 继续用 Browser E2E 作为 Workspace / MessageStream / AgentList 大改后的固定 UI 回归门禁。

## Phase 126：Artifact Studio 交付工作台视觉升级

### 目标

- 将 ArtifactPanel 从卡片堆叠继续收敛为“产物交付工作台”，让用户快速判断来源、质量、构建、Diff 风险、快照和发布预览状态。
- 强化 Apply Diff、Restore Snapshot、Deploy Preview 前的风险和边界说明。
- 保持现有 Artifact、Approval、Snapshot、Deploy、Preview 业务语义不变，只升级前端信息架构和视觉表达。

### 主要变更

- `ArtifactPanel` 新增 Delivery Workbench 区块，集中展示 Source / Quality / Build 三类解释型 badge。
- 新增可展开 Diagnostic Panel，展示 sourceAdapter、generationMode、TaskStep、quality reason、build reason 和 fallback reason。
- 新增操作风险摘要卡，分别解释 Diff 风险、Snapshot / Restore 安全策略和 Deploy Preview 本地静态边界。
- Deploy Status Card 升级为 release panel，展示 target、status、artifact version、audit 说明、preview URL 和本地静态预览边界。
- Snapshot 列表升级为 safety checkpoint timeline，强调 Restore 会经过 Approval Gate 并生成新版本。
- `workspace.css` 补充 delivery workbench、diagnostic panel、risk card、snapshot timeline、release panel 的 command-center 样式、轻量动效和窄屏堆叠规则。

### 验证方式

- `cd frontend && npm.cmd run build`
- 启动本地 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮不新增真实云部署；Deploy Preview 仍是本地静态预览。
- Diagnostic Panel 展示的是当前后端已有 metadata，不新增真实静态分析、真实构建平台或真实安全扫描。
- Snapshot / Restore 继续依赖现有 Approval Gate 和后端 snapshot 语义，不实现 Git 级 checkout 或复杂 merge UI。

### 遗留问题

- ArtifactPanel 组件仍偏大，后续可拆分为 cockpit、diagnostics、revision、deploy、snapshot、diff 子组件。
- 当前 responsive polish 是窄屏布局保护，不是完整移动端产品化。

### 下一步建议

- 若继续做 Artifact Studio 产品化，优先拆分组件并增加更稳定的 `data-testid` 覆盖 diagnostic / release / snapshot timeline。

## Phase 127：UI Audit 固化与前端大组件拆分起步

### 目标

- 将此前 taste-skill 设计审计从阶段性 dev-log 记录中抽出，形成独立 UI audit 文档。
- 开始拆分过大的 `ArtifactPanel` 和 `WorkspacePage`，降低后续视觉和产品化迭代的维护成本。
- 保持现有 Workspace、Artifact、Approval、Restore、Deploy Preview 和 Browser E2E 主路径不回归。

### 主要变更

- 新增 `docs/ui-audit.md`，记录 AgentHub 当前 UI 方向、保留项、各区域完成度、边界和下一步 UI 建议。
- 新增 `ArtifactDeliveryWorkbench`，承接 Artifact Cockpit、Source / Quality / Build badge、Diagnostic Panel、Diff / Snapshot / Deploy 风险摘要。
- 新增 `ArtifactDeployPanel`，承接 Deploy Status / Release Panel 展示和 Preview URL 操作。
- 新增 `ArtifactSnapshotTimeline`，承接 Safety Checkpoint timeline 和 Restore 入口展示。
- 新增 `WorkspaceHeader`，承接当前会话标题、群聊成员、Action Audit 和 Realtime 状态条。
- 新增 `WorkspaceCollaborationToolbar`，承接 IM-first 协作主 CTA、Debug / Advanced fallback 和主路径 flow guide。
- `ArtifactPanel` 保留状态、审批、Apply Diff、Restore、Deploy 的业务处理函数；`WorkspacePage` 保留数据加载、事件处理和主布局编排。

### 验证方式

- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是前端结构拆分与 UI audit 固化，不新增真实部署、真实静态分析、真实杀毒、真实移动端或新的后端能力。
- 拆分后的子组件仍展示现有 metadata 和状态，不改变 Orchestrator、Adapter、Approval、Artifact 或 Realtime 语义。

### 遗留问题

- `WorkspacePage` 仍然偏大，后续可继续拆分 selected agent banner、right panel layout、SSE wiring 和 action handlers。
- `ArtifactPanel` 仍可继续拆分 revision box、approval gate、diff apply 和 content preview。
- `docs/ui-audit.md` 是当前审计基线，后续大规模 UI 改动应同步更新。

### 下一步建议

- 优先继续拆分 `WorkspacePage` 的数据加载 / realtime / action handlers，或拆分 `ArtifactPanel` 的 revision / approval / content preview 子组件。

## Phase 128：Context / Orchestrator Explain 与 Preview Studio 产品化

### 目标

- 将 ContextPanel 的检索解释收敛为更清晰的 `List / Grep / Read -> Scoring -> Injected Step` 三段链路。
- 让 Orchestrator Explain 面板突出 `Planner / Router / Executor / Aggregator / Fallback / Approval / Audit` 的决策顺序。
- 将 Adapter Quality Dashboard 从普通表格增强为指标驾驶舱。
- 将 `/preview/:artifactId` 继续打磨为独立 Artifact Preview Studio，并补充前端设计 token。

### 主要变更

- `ContextPanel` 为每个 retrieved context 增加三段式 explain chain，展示召回方式、score breakdown 和注入到哪个 TaskStep。
- `TaskRunPanel` 的 Orchestrator Explain 增加 decision rail，集中展示 Planner、Router、Executor、Aggregator、Fallback、Approval / Audit。
- `AdapterQualityDashboard` 增加 Quality Command strip 和 per-adapter success meter，用于突出 success、fallback、risk adapter 和质量门禁。
- `PreviewPage` 增加 metadata bar、release-style version switcher、presentation mode 文案，并区分 CODE / MARKDOWN / WEB_PREVIEW 等展示模式。
- `global.css` 增加 AgentHub design tokens：colors、elevation、radius、spacing、status 和 motion timing。
- `workspace.css` 增加 explain rail、quality cockpit、preview metadata、version release 和窄屏堆叠样式。

### 验证方式

- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是前端可解释性和视觉产品化，不新增真实检索算法、真实静态分析、真实部署平台或新的后端决策字段。
- Context explain 仍展示后端已返回的 heuristic / DB-backed Agentic Search metadata，不代表默认启用 embedding 或向量检索。
- PreviewPage 仍是本地静态 Artifact 预览页，不代表真实云部署。

### 遗留问题

- `WorkspacePage`、`TaskRunPanel`、`ContextPanel` 仍可继续拆分子组件。
- Adapter Quality Dashboard 展示后端聚合和当前 TaskStep 数据，但不是完整 APM / observability 系统。
- PreviewPage 已有产品化结构，但移动端仍只是响应式保护，不是独立移动端体验。

### 下一步建议

- 继续拆分 `TaskRunPanel` 的 Orchestrator Explain 和 Adapter Routing 子组件，降低后续决策面板迭代成本。

## Phase 129：页面背景与字体可见性优化

### 目标

- 优化 AgentHub 前端页面背景层次和字体可见性，让 Workspace / Preview 的 command-center 视觉更稳定、更易读。
- 保持当前中文产品界面、IM-first 主路径、Artifact Studio、Preview Studio 和 E2E 主链路不变。

### 主要变更

- `global.css` 调整全局视觉 token：提高 `text-muted`、`text-soft`、border、shadow 和 page background 的对比度。
- `global.css` 强化 body 和 app header 背景，降低浅灰背景导致的文字发虚问题。
- `workspace.css` 增加 Workspace 背景网格、主工作区浅色 surface、右侧 Artifact 区背景和暗色 sidebar 对比优化。
- `workspace.css` 强化弱文本、消息卡片、Context / Orchestrator / Adapter / Preview 相关区域的字体可见性。
- `workspace.css` 强化 PreviewPage 暗色背景和顶部文字对比，保持本地静态预览边界说明。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 额外使用 Playwright 生成 desktop / mobile 截图，并确认 console error / pageerror 为空。

### 静态 / Mock / Placeholder 部分

- 本轮只调整视觉样式，不修改后端、Orchestrator、Adapter、Artifact、Approval、Realtime 或真实部署能力。
- 截图验证只覆盖当前主视口和一个窄屏视口，不代表完整移动端产品化。

### 遗留问题

- 仍可继续做细粒度视觉 QA，例如真实 Adapter 各种失败状态、极端长文本、超多 Artifact 和更多浏览器矩阵。

### 下一步建议

- 若继续前端产品化，优先结合真实数据量做高密度状态下的视觉 QA，而不是继续泛化改背景。

## Phase 130：IM-first 多 Agent Workspace UI 产品化

### 目标

- 将 Workspace 进一步优化为类 IM 聊天的多 Agent 协作平台界面。
- 强化左侧会话列表、Agent 联系人、中央协作消息流和主路径引导的产品感。
- 保持现有 Conversation、Message、Orchestrator、Artifact、Approval、Deploy Preview 和 E2E 主链路不变。

### 主要变更

- `ConversationList` 增加本地搜索、最近活跃排序、群聊 / 单聊头像和会话能力标签。
- `AgentList` 增加本地搜索，按 Agent 名称、描述、角色、Adapter、能力和工具标签过滤。
- `WorkspaceHeader` 增加 IM-first workspace hero、当前协作模式卡片和文本 / 附件 / Diff / 部署 / Pin 上下文能力条。
- `WorkspaceCollaborationToolbar` 调整主路径文案，强调“发送任务 -> 确认协作 -> 多 Agent 回复 -> Artifact / Diff / Deploy”。
- `workspace.css` 增加 IM 搜索框、联系人卡片、会话头像、暗色侧栏 active 状态、主会话 header、能力条和聊天气泡层级样式。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 额外使用 Playwright 生成 desktop / mobile 截图，并确认 console error / pageerror 为空。

### 静态 / Mock / Placeholder 部分

- 本轮是前端 UI 与本地搜索增强，不新增后端置顶、归档、服务端搜索或真实多窗口能力。
- Conversation / Agent 搜索是当前前端数据内的本地过滤，不代表完整 IM 搜索系统。
- 仍保留调试入口和 mock / fallback 主链路边界。

### 遗留问题

- 对话置顶、归档、服务端搜索、未读计数和完整消息操作仍可继续产品化。
- 当前 responsive polish 是窄屏保护，不是移动端完整产品。

### 下一步建议

- 若继续按课题 IM 核心体验推进，优先做 Conversation 置顶 / 归档 / 搜索的真实后端模型与 UI 闭环。

## Phase 131：IM Workspace 视觉再设计与运行回归验证

### 目标

- 继续降低 Workspace 的“后台面板感”，强化类 IM 多 Agent 协作产品的第一印象。
- 修复顶部导航中文乱码，提升中文界面的演示可信度。
- 在不改业务逻辑的前提下，优化 App shell、消息舞台、协作提示和 Artifact 工作台的视觉层级。

### 主要变更

- `AppLayout` 修复导航中文乱码，并将顶部区域升级为深色 command bar，增加品牌标识、能力状态和更清晰的主导航。
- `global.css` 增加 IM product shell polish：强化全局背景、顶部导航、品牌 mark、能力状态 chip 和窄屏导航适配。
- `workspace.css` 增加 IM redesign v2：强化 Workspace 背景网格、主会话舞台、消息气泡、协作提示、ChatInput、Artifact 区和交互 hover 状态。
- 保留 `ConversationList` / `AgentList` 的本地搜索与 IM 联系人样式，不改变现有 API 或 Orchestrator 主链路。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 额外生成 `/workspace` desktop 截图，并确认 console error 为空。

### 静态 / Mock / Placeholder 部分

- 本轮仍是前端视觉产品化，不新增后端业务能力。
- 本地搜索仍是前端过滤，不代表服务端 IM 搜索、置顶、归档或未读计数。
- 截图验证覆盖当前主视口，不代表完整移动端产品完成。

### 遗留问题

- 真实 IM 能力仍缺服务端置顶 / 归档 / 搜索 / 未读计数。
- 极窄屏和大量真实数据下的视觉 QA 仍可继续补充。
- `WorkspacePage` 和 `ArtifactPanel` 仍可继续拆分以降低维护成本。

### 下一步建议

- 若继续按“IM 聊天式交互”评分项推进，下一步优先做 Conversation 置顶 / 归档 / 服务端搜索 / 最近活跃排序的真实模型和 UI 闭环。

## Phase 132：Workspace IM 空状态与 Artifact 工作台观感优化

### 目标

- 继续优化 `/workspace` 的第一屏观感，减少空白面板和普通后台卡片感。
- 让用户在没有会话或没有产物时，也能理解主路径：发送任务、确认协作、多 Agent 回复、产物交付。
- 保持已有业务链路、API、Orchestrator、Artifact、Approval 和 Deploy Preview 不变。

### 主要变更

- `MessageStream` 的空状态增加 IM 标识、协作流程步骤和任务示例，让空会话更像产品引导而不是空白面板。
- `ArtifactPanel` 的产物列表和详情空状态升级为交付工作台占位，展示 CODE / MARKDOWN / REVIEW、质量、Diff、审批、预览等交付语义。
- `workspace.css` 增加空状态 visual treatment、orb / checkpoint / chip 样式、Artifact empty workbench surface 和 hover / depth polish。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 额外生成 `/workspace` desktop 截图，并确认 console error 为空。

### 静态 / Mock / Placeholder 部分

- 本轮是 UI 和空状态体验优化，不新增后端置顶、归档、服务端搜索、未读计数或真实移动端能力。
- 产物空状态中的交付能力说明基于当前已实现的 Artifact / Diff / Approval / Preview 链路，不代表真实云部署。

### 遗留问题

- 对话列表仍缺真实置顶、归档、服务端搜索和未读计数。
- 极窄屏、超多 Agent、超多 Artifact 和真实 Adapter 失败矩阵仍需继续做视觉 QA。

### 下一步建议

- 若继续提升 IM 产品感，优先做 Conversation 置顶 / 归档 / 最近活跃排序 / 服务端搜索，而不是继续只改静态视觉。

## Phase 133：Conversation 管理后端与 Workspace 闭环

### 目标

- 补齐课题 IM 对话列表中的最小产品化能力：置顶、归档、服务端搜索、未读计数和最近活跃排序。
- 保持现有 Workspace、MessageStream、Orchestrator、Artifact、Approval、Deploy Preview 主链路不变。

### 主要变更

- `Conversation` 增加 `pinned`、`archived`、`unreadCount`、`lastReadAt`、`lastMessageAt` 字段。
- Conversation API 增加 `query` / `includeArchived` 列表参数，以及 pin / unpin / archive / unarchive / read 操作。
- Message 写入后会更新会话最近消息时间；Agent / System 消息会增加未读计数，用户选中会话后可标记已读。
- JDBC schema 和 repository 同步新增字段，并保留 memory profile 默认行为。
- Workspace 会话侧栏增加服务端搜索、显示归档、置顶 / 归档 / 恢复操作、未读 badge 和活动时间展示。
- `scripts/smoke-test.mjs` 增加会话置顶、消息内容搜索、归档可见性和已读重置断言。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/smoke-test.mjs`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 服务端搜索 v1 使用会话标题、类型、ID、参与 Agent 和消息内容的轻量匹配，不是完整 IM 全文检索系统。
- 未读计数是当前单用户工作台语义，不是多用户、多设备、推送级 unread 系统。
- 归档是工作台列表过滤，不是企业级权限、保留策略或数据生命周期管理。

### 遗留问题

- 置顶 / 归档 / 未读尚未接入多用户身份模型。
- 搜索还没有高亮、服务端分页或复杂排序权重。
- 极大量会话下仍需要分页和索引策略。

### 下一步建议

- 若继续推进 IM 产品化，可做服务端分页、搜索高亮和未读状态的多设备语义；否则优先回到真实 Agent 输出质量、MySQL profile 或 Browser E2E 常态化。

## Phase 134：Build Web Apps 视觉重设计与 IM Command Center 收敛

### 目标

- 重新设计 AgentHub 前端观感，让 `/workspace` 更像中文优先的类 IM 多 Agent 协作平台。
- 保留当前业务能力、测试选择器、Workspace 主路径、Artifact、Approval、Preview 和 Adapter 可观测性。
- 改善页面背景、字体可见性、消息流层级、Artifact 工作台和 Preview Studio 的整体一致性。

### 主要变更

- 使用 Build Web Apps 前端设计流程生成了一版主屏设计参考，方向为 `premium technical command center + IM collaboration studio`。
- `global.css` 增加深色 command-center shell token、全局背景、顶部导航、品牌 mark 和状态 chip 的重设计。
- `workspace.css` 增加 Workspace 三栏深色玻璃面板体系，强化会话/Agent 联系人、协作确认、MessageStream、ChatInput、Artifact 工作台、Adapter / Context / Audit 面板和 PreviewPage。
- 修复重设计后残留的白色输入区、低对比 flow guide、Artifact 空状态标题等可见性问题。
- 不引入 UI 组件库，不改 API，不改 Orchestrator / Adapter / Artifact 业务逻辑。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 使用 Playwright 临时截图检查 `/workspace` 1440x900 视口，并在检查后清理临时截图。

### 静态 / Mock / Placeholder 部分

- 本轮是前端视觉和信息层级重设计，不新增真实部署、真实多端或真实外部 Agent 能力。
- UI 中的静态 Preview、Mock fallback、fixture、半真实 Adapter 边界保持不变。
- 视觉检查覆盖当前桌面主视口和 E2E 主路径，不代表完整移动端设计定稿。

### 遗留问题

- 仍可继续做极窄屏、超大数据量、所有真实 Adapter 输出组合下的视觉 QA。
- 当前重设计主要通过 CSS 覆盖实现，后续可继续拆分 Workspace / ArtifactPanel 的大组件来降低维护成本。

### 下一步建议

- 若继续产品化前端，建议做一次窄屏 QA 和组件拆分；若回到生产能力，优先继续真实 Agent 输出稳定性或 MySQL/JDBC 验证。

## Phase 135：参考图 1:1 Workspace 视觉复刻与主路径回归

### 目标

- 按用户提供的 AgentHub IM 协作截图继续收敛 `/workspace`，让页面更接近深色类 IM 多 Agent 协作产品。
- 保持现有消息触发协作、附件、Approval、Artifact、Preview、E2E 选择器和业务链路不变。

### 主要变更

- 顶部栏增加当前协作任务、运行状态、计时、Agent 头像组、邀请 Agent 和更多操作入口的视觉结构。
- Workspace 三栏改为更贴近截图的无间距深色布局：左侧会话/Agent 联系人，中间协作消息流，右侧产物工作台。
- Sidebar、MessageStream、Agent 协议卡、ChatInput、Conversation participants、Artifact 面板继续统一为 command-center 暗色视觉。
- 将附件输入区压缩为紧凑工具区，保留上传/手动附件能力，避免抢占消息流主视图。
- 修复 1280px 视口下三栏过早折叠导致主协作按钮不可见的问题。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 使用 Playwright 临时截图检查 `/workspace` 1600x1000 视口，并在检查后清理临时截图。

### 静态 / Mock / Placeholder 部分

- 本轮是视觉复刻和产品主路径可见性优化，不新增真实部署、真实多端、真实 token streaming 或多节点事件总线。
- 顶部计时和 Agent 头像组是当前工作台视觉状态表达，不代表新增多用户实时会议系统。
- 静态 Preview、Mock fallback、fixture 和半真实 Adapter 边界保持不变。

### 遗留问题

- 与参考图仍存在数据内容差异，因为页面使用当前真实组件和运行时数据，而不是硬编码静态截图。
- 极窄屏、超长会话、超多 Artifact 和所有真实 Adapter 输出组合仍可继续做视觉 QA。

### 下一步建议

- 若继续做 UI，可把当前 CSS 覆盖逐步沉淀为更小的 Workspace / Artifact 子组件；若回到生产能力，优先继续真实 Agent 输出稳定性和 MySQL/JDBC 验证。

## Phase 136：Workspace 密度、IM 消息流与 Artifact Inspector 继续收敛

### 目标

- 继续按参考图优化 `/workspace`：提高信息密度、强化聊天产品感、增强右侧 Artifact inspector，并补齐顶部窗口控制氛围。
- 保持消息触发协作、附件上传、Approval、Diff、Restore、Deploy Preview 和 Browser E2E 主链路不变。

### 主要变更

- 顶部栏增加窗口控制视觉元素，并进一步压缩任务标题、运行状态、Agent 头像和操作入口的间距。
- Workspace Header 隐藏重复的审计 / 实时状态行，保留更紧凑的会话参与 Agent 展示和状态 strip。
- MessageStream 降低消息卡、协议 pill、操作按钮、协作确认卡和输入区高度，使中间区域更接近 IM 协作流。
- ChatInput 保留附件上传和手动附件能力，但压缩为更紧凑的工具区，减少对消息流的遮挡。
- ArtifactPanel 增加 inspector tabs，并压缩 Cockpit、Diagnostic、Diff、Snapshot、Deploy 面板的垂直空间，让右侧更像一体化产物 inspector。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 使用 Playwright 临时截图检查 `/workspace` 1600x1000 视口，并在检查后清理临时截图。

### 静态 / Mock / Placeholder 部分

- 本轮仍是前端视觉和交互密度优化，不新增真实部署、真实多端、真实 token streaming 或多节点事件总线。
- 顶部窗口控制是 Web 产品视觉语义，不代表新增桌面客户端能力。
- 右侧 inspector tabs 是信息组织增强，不改变 Artifact 数据模型或后端 API。

### 遗留问题

- 当前仍通过 CSS 覆盖完成较多视觉收敛，后续若继续 UI 工程化，建议拆分 Workspace 和 ArtifactPanel 的大组件。
- 极窄屏和超长真实 Agent 输出组合仍需专项视觉 QA。

### 下一步建议

- 若继续视觉方向，优先做窄屏 QA 和组件拆分；若回到生产化能力，优先做真实 Agent 输出稳定性、MySQL/JDBC 验证或 Stop/Cancel 长任务验证。

## Phase 137：Conversation IM 管理增强与 E2E 覆盖

### 目标

- 将会话列表从 Demo 列表推进为更接近 IM 的会话管理入口。
- 支持用户在 `/workspace` 内完成服务端搜索、全部 / 未读 / 置顶 / 归档过滤、置顶、归档、恢复和已读清零主流程。

### 主要变更

- `ConversationList` 增加 IM 风格 filter tabs：全部、未读、置顶、归档，并保留服务端搜索输入。
- 搜索框增加清空操作，减少用户手动删除关键词的成本。
- Workspace 按当前 filter 调用 `GET /api/conversations?query=&includeArchived=`，归档视图只在需要时包含 archived 会话。
- SSE 刷新时同步刷新 conversation index，让非当前会话的未读与最近活跃状态更及时。
- 修复 `loadConversationIndex` 独立调用后 loading 状态不复位的问题。
- Browser E2E 增加会话搜索、置顶、归档和恢复路径验证。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`
- `cd backend && mvn -q -DskipTests package`
- 启动临时 backend / frontend 后运行 `node scripts/smoke-test.mjs`
- 启动临时 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 部分

- 本轮是会话管理产品化增强，不新增真实部署、真实多端、真实 token streaming 或多节点事件总线。
- 未读计数仍依赖当前后端会话状态和 realtime refresh，不是跨设备推送系统。
- 归档 / 置顶是当前内存或 JDBC profile 下的会话状态能力，默认 demo 仍可使用 memory profile。

### 遗留问题

- Browser E2E 已覆盖搜索、置顶、归档和恢复；未读 badge 的跨会话实时场景仍主要由 API smoke 覆盖。
- 会话列表仍未做服务端分页，超大量会话时需要后续补分页或游标。

### 下一步建议

- 若继续推进 IM 产品化，建议补会话服务端分页、未读跨会话 E2E 场景和更细的会话操作菜单。

## Phase 138：Message Action Bar 与消息类型分层产品化

### 目标

- 将 MessageStream 从普通消息展示推进为更像 IM 协作产品的消息中心。
- 统一每条消息上的复制、引用、回复、pin、记忆、重跑和 Agent 回复再生成入口。
- 让文本、附件、Artifact、Diff、Deploy Status、Preview 和 Agent protocol 消息的类型边界更清晰。

### 主要变更

- `MessageBubble` 增加统一 `Message Action Bar`，并为 copy / quote / reply / pin / memory / rerun / regenerate 增加稳定 `data-testid`。
- 消息卡增加 type ribbon，展示 Text / Attachment / Artifact / Diff / Deploy Status / Preview 等类型语义和当前操作状态。
- 附件卡片增加图片、PPT、文本、通用文件分类，明确图片不做编辑 / OCR、PPT 不做在线渲染。
- Artifact 消息卡从裸 artifactId 升级为 title、type、sourceKind、quality、language、select 和 preview 入口。
- 引用卡增加定位入口和更清晰的关联 / 再生成来源表达；thread indicator 保持内联轻量模式。
- Browser E2E 增加 Message Action Bar、引用、回复、pin、memory 和 Agent 回复再生成路径验证。
- 新增 `docs/spec/message-interaction-spec.md` 固化消息类型、操作、thread 和弱媒体边界。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- 图片仍按附件预览处理，不做图片编辑、OCR 或视觉理解。
- PPT 仍按附件 metadata / download 处理，不做在线幻灯片渲染。
- Deploy Preview 仍是本地静态预览，不是真实云部署。
- 本轮不改 Orchestrator 主链路，不新增后端消息协议 API。

### 遗留问题

- 完整 Slack 式 thread 侧栏未实现。
- Diff / Deploy 消息的深度卡片仍主要由 ArtifactPanel 和 Deploy Status Card 承接。
- 图片缩略图、PDF / PPT 轻量预览可作为后续增强。

### 下一步建议

- 若继续推进消息产品化，建议补完整 thread 侧栏、图片缩略图和更强的 Diff / Deploy 消息内联卡片。

## Phase 139：Agent 选择、Tool Capability 与路由预览产品化

### 目标

- 将 `selectedAgent / targetAgentId / mentionedAgentIds` 从技术字段推进为用户可理解的 Agent 协作入口。
- 让自建 Agent 的 System Prompt、tool capability 和 preferredAdapter 更清楚地影响 Workspace 路由表达。

### 主要变更

- ChatInput 增加发送前路由预览，区分 `To: @Agent`、多 Agent 协作和 Orchestrator 自动分派。
- Agent 联系人列表修复中文显示，并展示 capability、preferredAdapter、Adapter health、success rate 和 fallback rate。
- MessageBubble 中用户消息的目标 Agent 展示升级为路由目标说明，区分 `targetAgentId` 与多 Agent `mentionedAgentIds`。
- TaskRunPanel 从 `routingReason` 提取 requiredSkill、matched capability、selected Agent、selected Adapter 等可读 evidence chips。
- Agent Builder 增加创建流程提示，明确基本信息、System Prompt、Tool Capability、Preferred Adapter 和 Workspace `@Agent` 使用关系。
- 同步 `multi-agent-chat-spec.md`、`adapter-output-spec.md` 和 `docs/plans/next.md`。

### 验证方式

- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- 本轮不新增真实工具调用系统，tool capability 仍是路由用的轻量能力标签。
- preferredAdapter 不绕过现有 AdapterRegistry、fallback、Artifact contract validator、quality evaluator 或 Approval / Audit。
- MOCK fallback 仍是默认稳定演示边界。

### 遗留问题

- 自然语言式 Agent 创建未实现。
- 更完整的 Router 决策 DTO 仍可后续由后端直接结构化输出，减少前端解析 `routingReason`。
- Browser E2E 尚未新增完整 Agent Builder 创建自定义 Agent 的 UI 路径。

### 下一步建议

- 增加 Browser E2E：创建自定义 Agent、选择 capability、在 Workspace 中 `@Agent`、确认 routing preview 和 Agent 回复。

## Phase 140：自定义 Agent 创建到路由验证 E2E

### 目标

- 将“创建自定义 Agent -> 在 Workspace 中 @Agent -> 验证路由”纳入浏览器级回归。
- 确认 Agent Builder、ChatInput routing preview、MessageStream 目标展示和 TaskRun 路由证据是同一条可验证链路。

### 主要变更

- Agent Builder 表单增加稳定 `data-testid`：名称、System Prompt、能力标签、tool capability、preferredAdapter 和提交按钮。
- Browser E2E 新增 UI 创建自定义 review Agent 的步骤，并强制选择 `review` tool capability 与 `MOCK` preferredAdapter。
- Browser E2E 在 Workspace 中发送 `@CustomAgent @OtherAgent` 消息，验证 routing preview 展示自定义 Agent。
- Browser E2E 在 Orchestrator 执行后检查自定义 Agent 进入 TaskRun step，并验证 Router evidence chips 可见。
- `docs/plans/next.md` 同步标记该路径已纳入 UI 回归。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd frontend && npm.cmd run lint`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- E2E 使用 `MOCK` preferredAdapter，验证的是自定义 Agent 路由链路，不依赖真实外部 LLM。
- Tool capability 仍是轻量路由标签，不是真实工具执行系统。

### 遗留问题

- Browser E2E 仍未覆盖自然语言式 Agent 创建。
- Router 决策证据仍部分来自 `routingReason` 文本解析，后续可升级为后端结构化 DTO。

### 下一步建议

- 若继续增强 Agent Builder，可增加“创建后直接跳回 Workspace 并自动填充 @Agent”的快捷操作。

## Phase 141：文档 V1.0 产品设计与技术设计整理

### 目标

- 将 AgentHub 当前产品能力、技术架构、验证入口和真实 / 半真实 / 静态边界整理成中文 V1.0 文档。
- 修复核心产品设计和技术设计文档中的编码损坏问题，避免后续 Agent 读取失真内容。

### 主要变更

- 重写 `docs/product-design.md`，覆盖产品定位、阶段判断、用户主路径、Conversation、Agent、自建 Agent、多 Agent 协作、消息操作、Context、Artifact Studio、Approval / Audit、Deploy Preview、Realtime 和未完成边界。
- 重写 `docs/technical-design.md`，覆盖前后端架构、后端分层、Orchestrator、Adapter、REAL_FIRST、Claude Code / Codex headless 接入、Context Search、Artifact lifecycle、Approval / Audit、Realtime、JDBC / MySQL profile、Attachment 和验证命令。
- 新增 `docs/spec/index.md`，作为稳定 spec 入口，集中指向 multi-agent、message、artifact、adapter、context、approval、MySQL profile 等规格文档。
- 更新 `docs/README.md`，把 docs 目录入口调整为中文 V1.0 文档索引。
- 更新 `docs/plans/next.md`，标记 V1.0 产品设计、技术设计、spec index 和 docs index 已完成。

### 验证方式

- `git diff --check`

### 静态 / Mock / Placeholder 部分

- 文档明确保留当前边界：默认仍支持 memory + mock/static fallback；真实 Provider、MySQL、Claude Code、Codex、streaming 和 JDBC profile 都是 opt-in 验证路径。
- Deploy Preview 仍是本地静态预览，不是真实 Vercel / Netlify / Docker / Kubernetes 部署。
- Context Search 默认仍是 DB-backed Agentic Search + heuristic scoring，不是默认 embedding / vector search。

### 遗留问题

- README 根目录尚未做完整 V1.0 改写，本轮只整理 docs 目录内产品设计、技术设计和 spec 入口。
- Demo 视频脚本仍未进入当前优先级。
- 多端、真实云部署、多节点事件总线和生产级权限体系仍未完成。

### 下一步建议

- 若继续文档收敛，下一轮可整理 root `README.md`、`docs/collaboration/demo-checklist.md` 和 spec 之间的交叉引用，形成完整交付包。

## Phase 142：Browser E2E 边缘状态与 Adapter 质量 Outcome 收敛

### 目标

- 将 Browser E2E 从主路径验证扩展到关键边缘状态：Reviewer REJECTION 修复后再评审、真实 Adapter fallback、Context Search 命中不同 source。
- 将 OpenAI-compatible、Claude Code、Codex 的真实输出质量指标收敛为统一 outcome taxonomy，避免 UI 只看到零散 parse / quality / build 字段。

### 主要变更

- `scripts/e2e-browser.mjs` 新增 Context Search source diversity 验证，要求已 seed 的主链路能检索到多个上下文来源。
- `scripts/e2e-browser.mjs` 新增真实 Adapter fallback edge 验证：当存在不可用的非 MOCK Adapter 时，创建 preferredAdapter Agent 并确认 fallback 被 TaskStep 和 quality metrics 记录；如果本机所有非 MOCK Adapter 都可用，则明确跳过该边缘断言。
- `scripts/e2e-browser.mjs` 扩展 REJECTION 场景：触发 `BLOCKED / REJECTION` 后执行 Artifact Revision，并验证 re-review 回到 `COMPLETED / ACCEPTED`。
- `AdapterQualityMetricsService` 增加统一 `lastOutcome / outcomeSummary`，覆盖 `ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`。
- `AdapterQualityDashboard` 增加 Outcome 列，展示统一 outcome、accepted / fallback / failed 数量和最近 parse / build 状态。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- 启动隔离 backend/frontend 后运行 `node scripts/e2e-browser.mjs`
  - 通过：REJECTION -> Revision -> accepted re-review
  - 通过：真实 Adapter fallback edge 分类，本机验证路径为 `CLAUDE_CODE -> MOCK`
  - 通过：Context Search 命中 `PINNED_MESSAGE / MEMORY / ATTACHMENT / RECENT_MESSAGE`

### 静态 / Mock / Placeholder 部分

- Browser E2E 中的 fallback edge 是条件验证：只有本机存在不可用的非 MOCK Adapter 时才强制跑 fallback 分支。
- REJECTION 修复后再评审仍使用现有 demo revision / reviewer gate，不代表完整自动代码修复系统。
- Context Search source diversity 验证的是 DB-backed Agentic Search + heuristic scoring，不是 embedding / vector search。

### 遗留问题

- Adapter quality metrics 已统一 outcome 展示，但长期趋势仍是当前聚合口径，不是独立时序指标系统。
- Browser E2E 已覆盖本轮新增边缘状态，但仍不替代真实 OpenAI-compatible、Claude Code、Codex 的 opt-in provider smoke。

### 下一步建议

- 若继续推进真实输出质量，可把 outcome taxonomy 进一步接入真实 Adapter smoke 报告汇总。
- 若继续推进 UI 质量门禁，可把本轮 Browser E2E 边缘状态加入 `scripts/verify-local.mjs` 的常规报告摘要。

## Phase 143：Claude / Codex CLI 诊断与消息级主路径验证收敛

### 目标

- 让 Claude Code / Codex CLI headless Adapter 更接近生产级可诊断接入：descriptor、smoke、spec 对齐同一套能力发现和失败分类。
- 将 Browser E2E 主路径从 Workspace toolbar fallback 收敛到消息级协作确认卡，贴合 IM-first 产品路径。

### 主要变更

- Claude Code `/api/adapters` capability details 增加 help probe、auth probe、`supportsOutputSchema=false` 和 `schemaMode=prompt-contract-only`。
- Codex `/api/adapters` capability details 增加 help probe、auth probe、`supportsOutputLastMessage`、`supportsOutputSchema`、JSON event 和 sandbox 能力描述。
- `claude-code-smoke-test.mjs` 在 `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true` 时强制检查 help probe、print/json/tool-policy 能力，streaming smoke 额外要求 `stream-json`。
- `codex-smoke-test.mjs` 在 `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true` 时强制检查 help probe、`exec`、`--output-schema`、`--output-last-message`、read-only sandbox，streaming smoke 额外要求 JSON event。
- `e2e-browser.mjs` 默认要求消息级协作确认卡触发 TaskRun；只有显式设置 `AGENTHUB_E2E_REQUIRE_MESSAGE_TRIGGER=false` 才允许 Workspace toolbar fallback。
- `real-agent-output-stability-spec.md` 新增 operational failure taxonomy，区分 `NOT_INSTALLED / NOT_AUTHENTICATED / PERMISSION_DENIED / TIMEOUT / CANCELLED / CONTRACT_INVALID` 和 Artifact outcome。
- `.env.example` 与 `scripts/README.md` 补充真实 Adapter / Browser E2E 相关 opt-in 验证 flags。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 部分

- 本轮增强的是 capability discovery 与 smoke gate，不要求默认环境必须安装、登录 Claude Code 或 Codex。
- Claude Code v1 仍是 prompt-contract-only，不提供强 output schema 参数能力。
- Codex / Claude Code 仍是 Artifact-only headless 接入，不做桌面 GUI 自动化或 workspace-write。

### 遗留问题

- Direct execute 的失败结果尚未单独写入长期 Adapter quality metrics；当前长期聚合仍主要来自 TaskStep / Artifact 链路。
- Streaming cancel 的独立 fixture smoke 仍可后续补充，用于验证 late chunks / late result 不落最终 Artifact。

### 下一步建议

- 若继续收敛生产级真实 Adapter，可补 direct execute failure metrics 和 Claude/Codex streaming cancel fixture smoke。
- 若继续收敛产品主路径，可把 message-level trigger 的截图/DOM 证据加入 Browser E2E 失败诊断摘要。

## Phase 144：Direct Execute 指标与 Streaming Cancel Fixture 验证

### 目标

- 按顺序复查真实 Claude Code / Codex CLI smoke 的当前机器状态。
- 让 `POST /api/adapters/{type}/execute` 的结果也进入 Adapter Quality Dashboard 后端聚合指标。
- 增加 streaming cancel fixture smoke，验证流式预览中取消后不会落最终真实产物。

### 主要变更

- `AgentAdapterApplicationService` 在 direct execute 后记录 Adapter quality observation，覆盖 accepted contract、fallback、parse / contract failure 等 outcome。
- direct execute metrics 跳过 `MOCK` 自身，避免 mock 文本污染真实 Adapter 质量统计。
- Claude Code / Codex descriptor 现在会把 version/help capability probe 失败提前标记为 `MISCONFIGURED`，避免 CLI 文件存在但不可执行时仍显示 `AVAILABLE`。
- CLI 失败分类补充 `CreateProcess error=5` / `拒绝访问` 到 `PERMISSION_DENIED`，用于 WindowsApps wrapper 等本机权限问题。
- Claude Code / Codex fixture streaming 增加可配置 chunk delay，便于在 `ADAPTER_STREAM_CHUNK` 后稳定触发 cancel。
- `sse-smoke-test.mjs` 新增 `AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL=true`，会创建 fixture Agent、等待首个 stream chunk、发送 `CANCEL_RUN`，并验证 TaskRun / Audit / Artifact 结果。
- `.env.example` 和 `scripts/README.md` 增加 fixture stream delay 与 streaming cancel smoke 说明。
- `docs/plans/next.md` 记录 direct execute metrics 和 streaming cancel fixture smoke 状态，并保留当前真实 CLI 环境诊断结果。

### 验证方式

- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- 启动 CODEX fixture streaming backend 后运行 `AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL=true node scripts/sse-smoke-test.mjs`
  - 通过：收到首个 `CODEX` stream chunk。
  - 通过：`CANCEL_RUN` 被接受，最终 TaskRun 为 `CANCELLED`。
  - 通过：未持久化 `CODEX / REAL_ADAPTER` late Artifact。
- 启动 CODEX fixture backend 后调用 `POST /api/adapters/CODEX/execute`，并通过 `GET /api/adapters/quality-metrics` 验证 direct execute accepted outcome 被记录。
- 使用当前 WindowsApps Codex wrapper 启动 backend，验证 `/api/adapters` 已在 descriptor 阶段返回 `CODEX / MISCONFIGURED / PERMISSION_DENIED`。

### 静态 / Mock / Placeholder 部分

- 本轮 streaming cancel 使用 fixture adapter 验证取消语义，不代表真实外部 CLI 长任务一定能被操作系统级硬中断。
- Claude Code / Codex 真实 CLI smoke 当前按环境事实输出失败分类：Claude 在本次后端 PowerShell 环境中不可解析为 PATH 命令；Codex 由 Windows app wrapper 返回 `PERMISSION_DENIED`。
- Fixture smoke 仍不能当作真实 provider / 真实 CLI 成功。

### 遗留问题

- 需要在用户交互终端可用的同一 PATH / 命令上下文下重新提供 Claude Code 命令，才能完成真实 Claude Code CLI smoke。
- 需要提供可由 backend `ProcessBuilder` 直接执行的 Codex CLI 路径或修复 Windows app wrapper 权限，才能完成真实 Codex CLI smoke。

### 下一步建议

- 先修复本机 Claude / Codex CLI 的后端进程可执行路径，再重跑 `*_SMOKE_REQUIRE_REAL_CLI=true`。
- 若继续增强 cancel 语义，可补真实 CLI slow-output 场景，确认 late process result discard 与 fixture 行为一致。

## Phase 145：真实 Claude Code / Codex Headless Smoke 复验

### 目标

- 使用本机真实 CLI 和非沙箱 backend 进程复验 Claude Code / Codex 的 headless Artifact-only 接入。
- 调整 smoke 语义：demo-task 可以因为 Reviewer / quality gate 进入 `BLOCKED`，但真实 Adapter smoke 必须仍证明 direct execute、TaskStep、Artifact 和质量元数据可解释。

### 主要变更

- `claude-code-smoke-test.mjs` 和 `codex-smoke-test.mjs` 不再把 `BLOCKED` 直接等同于 Adapter 接入失败；脚本继续强制要求真实 Adapter step、`REAL_ADAPTER` Artifact 和 `qualityStatus=ACCEPTED`。
- 保留真实 CLI descriptor 严格检查：require real CLI 时必须通过 version/help probe，并验证 headless / artifact-only / safe policy capability。

### 验证方式

- 非沙箱执行 `claude --version`：通过，返回 `2.1.143 (Claude Code)`。
- 非沙箱执行 `codex --version`：通过，返回 `codex-cli 0.134.0`。
- Claude Code real CLI non-stream smoke：
  - backend 使用 `AGENTHUB_CLAUDE_CODE_COMMAND=C:\Users\shens\AppData\Roaming\npm\claude.cmd`。
  - 通过：descriptor available、direct execute 返回 Artifact JSON、demo-task 产生 `CLAUDE_CODE / REAL_ADAPTER` Artifact。
  - 观察：TaskRun 因 Reviewer / quality gate 进入 `BLOCKED`，但真实 Artifact 接入链路通过。
- Codex real CLI non-stream smoke：
  - 通过：descriptor available、direct execute 返回 Artifact JSON、demo-task 产生 `CODEX / REAL_ADAPTER` Artifact。
  - 观察：一次 TaskRun 因 Reviewer / quality gate 进入 `BLOCKED`，但真实 Artifact 接入链路通过。
- Codex real CLI streaming smoke：
  - 通过：观察到 `ADAPTER_STREAM_CHUNK`，最终产生 `CODEX / REAL_ADAPTER / REAL_FIRST` Artifact，TaskRun `COMPLETED`。
- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`

### 静态 / Mock / Placeholder 部分

- Claude Code streaming smoke 本轮未完成通过；上一次 stream-json 尝试超过本地 smoke timeout，需要单独做 timeout / stream parser 稳定性验证。
- 本轮真实 CLI 验证要求非沙箱执行；沙箱内的 WindowsApps / npm shim 行为会导致误判。

### 遗留问题

- 需要把 Claude Code `.cmd` 路径配置经验同步到本机启动说明，避免后端解析到无扩展 npm shim。
- Claude Code streaming 仍需独立验证，不应在文档中标记为本机真实通过。

### 下一步建议

- 优先修 Claude Code streaming timeout：缩短 prompt、限制 max turns、增加 smoke timeout 或在 stream-json parser 中更早识别最终 result。
- 继续保持默认 smoke 不依赖真实 CLI；真实 CLI smoke 仍作为 opt-in 质量门禁。

## Phase 146：Claude Code Stream-JSON Timeout 与真实 Streaming Smoke 收敛

### 目标

- 继续收敛 Claude Code real streaming smoke，解决上轮 `stream-json` 路径超过本地 smoke timeout 的问题。
- 保持 Claude Code v1 的 Artifact-only、安全执行、真实输出 contract 和 fallback 边界不变。

### 主要变更

- `ClaudeCodeAgentAdapter` 的 `stream-json` stdout 消费改为 timeout-bound `CompletableFuture`，避免先阻塞读取 stdout、后执行 `waitFor(timeout)` 导致 timeout 保护失效。
- Claude Code stream 读取超时会销毁 CLI 进程并返回明确 timeout 诊断，而不是让 smoke 无界等待。
- Claude Code adapter 增加最小兼容：仅剥离最外层 ````json ... ``` 包裹，再交给统一 Artifact contract validator；普通文本、CLI log、artifact content 内 Markdown fence 仍会被拒绝。
- 真实 streaming 验证将 `maxTurns` 调整为真实任务更稳定的轮次数，避免 Reviewer step 因轮次过低触发 `error_max_turns`。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/claude-code-smoke-test.mjs`
- 非沙箱启动隔离 backend 后运行真实 Claude Code streaming smoke：
  - 通过：`CLAUDE_CODE` descriptor available。
  - 通过：direct execute 返回 Artifact JSON。
  - 通过：demo-task 观察到 `ADAPTER_STREAM_CHUNK`。
  - 通过：产生 `CLAUDE_CODE / REAL_ADAPTER` Artifact。
  - 观察：TaskRun 可因 Reviewer / quality gate 进入 `BLOCKED`，但真实 Adapter streaming 接入链路通过。

### 静态 / Mock / Placeholder 部分

- 默认 smoke 仍不依赖真实 Claude Code CLI。
- 真实 Claude Code streaming smoke 仍是 opt-in，需要本机安装、登录并配置可由 backend 进程直接执行的 CLI 命令。
- 这仍是 Artifact-only headless 接入，不允许 Claude Code 直接修改 AgentHub workspace。

### 遗留问题

- Claude Code stream chunk 仍只作为实时预览，不持久化 token 级输出。
- 更复杂的 Claude Code 多轮 session、workspace-write、真实 patch apply by Claude Code 继续后置。

### 下一步建议

- 后续如继续增强真实 CLI 质量，可补真实 streaming cancel 场景，验证 Stop / Cancel 后 late chunks 和 late result 均不落最终 Artifact。
- 继续保持 Claude Code、Codex、OpenAI-compatible 的输出质量指标在 Adapter Quality Dashboard 中统一展示。

## Phase 147：真实 Claude / Codex Streaming Cancel Smoke 闭环

### 目标

- 将 streaming cancel 从 fixture 验证推进到真实 CLI 验证，覆盖 Claude Code 与 Codex 的 realtime、cancel、Artifact 落库边界。
- 保持默认 smoke 不依赖真实 CLI；真实 cancel 仍作为 opt-in 质量门禁。

### 主要变更

- `sse-smoke-test.mjs` 增加 `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL=true`，会通过 `/api/adapters` 强制确认目标 Adapter 不是 fixture、状态为 `AVAILABLE`、streaming 已开启，并具备对应 stream 能力。
- `sse-smoke-test.mjs` 增加 `AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_TIMEOUT_MS`，用于真实 CLI 首个 stream chunk 和取消状态等待，避免真实 CLI 场景被 fixture 级 10 秒 timeout 误杀。
- streaming cancel 触发后会 abort 客户端 demo-task 请求，并等待 TaskRun 进入 `CANCELLED`；如果取消发生在 TaskStep 结果落库前，允许 steps 为空，但仍强制验证无 late `REAL_ADAPTER` Artifact。
- `.env.example` 和 `scripts/README.md` 增加真实 streaming cancel smoke 的 opt-in 环境变量和 PowerShell 使用说明。

### 验证方式

- `node --check scripts/sse-smoke-test.mjs`
- `cd backend && mvn -q -DskipTests package`
- 非沙箱启动 Codex streaming backend 后运行：
  - `AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL=true`
  - `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL=true`
  - `AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER=CODEX`
  - 通过：收到 `CODEX` 的 `ADAPTER_STREAM_CHUNK`。
  - 通过：`CANCEL_RUN` accepted。
  - 通过：TaskRun `CANCELLED`，且未持久化 `CODEX / REAL_ADAPTER` late Artifact。
- 非沙箱启动 Claude Code streaming backend 后运行：
  - `AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL=true`
  - `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL=true`
  - `AGENTHUB_SSE_SMOKE_STREAMING_CANCEL_ADAPTER=CLAUDE_CODE`
  - 通过：收到 `CLAUDE_CODE` 的 `ADAPTER_STREAM_CHUNK`。
  - 通过：`CANCEL_RUN` accepted。
  - 通过：TaskRun `CANCELLED`，且未持久化 `CLAUDE_CODE / REAL_ADAPTER` late Artifact。

### 静态 / Mock / Placeholder 部分

- 默认 SSE smoke 仍不要求真实 CLI，也不会默认启用真实 streaming cancel。
- 真实 streaming cancel smoke 需要本机安装、登录并配置可由 backend 进程直接执行的 Claude Code / Codex CLI。
- 该验证确认 late result discard 和 no late Artifact persistence；不代表非流式 HTTP / CLI 调用可被操作系统级硬中断。

### 遗留问题

- Token 级 streaming 仍不持久化；当前只持久化最终消息、TaskRun、Audit、Realtime state 和 Artifact 结果。
- 多节点事件总线仍未做；当前 realtime 仍是单进程 SSE / control plane。

### 下一步建议

- 继续观察真实 CLI cancel 后的 Adapter quality metrics 和 ActionAuditLog 是否足够解释用户侧失败/取消体验。
- 若进入生产化下一阶段，可补一条 Browser E2E 可见性验证：取消后 MessageStream 显示 partial / discarded 状态。

## Phase 148：Streaming Stop Smoke 与 Adapter Quality Matrix

### 目标

- 将 streaming control 验证从 `CANCEL_RUN` 扩展到 `STOP_RUN`，覆盖 fixture 与真实 Claude Code / Codex CLI。
- 为真实 Adapter 输出质量增加一个任务类型矩阵脚本，便于持续观察 `PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK` 模式。

### 主要变更

- `sse-smoke-test.mjs` 新增 `AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_STOP=true`。
- `sse-smoke-test.mjs` 将 streaming cancel 逻辑抽象为 streaming control smoke，统一验证首个 `ADAPTER_STREAM_CHUNK`、控制命令 accepted、最终状态、ActionAuditLog 和 no late `REAL_ADAPTER` persistence。
- 新增 `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CONTROL=true`，用于 cancel / stop 两类真实 CLI streaming control 验证；旧 `AGENTHUB_SSE_SMOKE_REQUIRE_REAL_STREAMING_CANCEL=true` 继续兼容。
- 新增 `scripts/adapter-quality-matrix-smoke.mjs`，默认按 `OPENAI_COMPATIBLE / CLAUDE_CODE / CODEX` 和 `frontend / api / review / markdown` 任务类型调用 direct execute，并输出 outcome 汇总。
- `.env.example`、`scripts/README.md`、`scripts/AGENTS.md` 和 `docs/plans/next.md` 已同步新增环境变量、脚本和验证边界。

### 验证方式

- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/adapter-quality-matrix-smoke.mjs`
- `cd backend && mvn -q -DskipTests package`
- fixture backend 验证：
  - 通过：`AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_CANCEL=true`
  - 通过：`AGENTHUB_SSE_SMOKE_EXPECT_STREAMING_STOP=true`
  - 结果：Codex fixture 首个 chunk 后 cancel / stop 均不持久化 late `REAL_ADAPTER` Artifact。
- Adapter quality matrix fixture 验证：
  - 通过：`OPENAI_COMPATIBLE / CLAUDE_CODE / CODEX` 在 `frontend / api` 任务上均返回 `ACCEPTED`。
- 真实 Codex CLI streaming stop 验证：
  - 初次使用 WindowsApps 内部 exe 路径失败，分类为 `PERMISSION_DENIED`。
  - 改用 `AGENTHUB_CODEX_COMMAND=codex` 后通过：收到 `CODEX` chunk，`STOP_RUN` accepted，TaskRun `STOPPED`，无 late `CODEX / REAL_ADAPTER` Artifact。
- 真实 Claude Code CLI streaming stop 验证：
  - 初次使用 extensionless npm shim 失败，分类为 `NOT_INSTALLED` / Win32 shim 不可执行。
  - 改用 `C:\Users\shens\AppData\Roaming\npm\claude.cmd` 后通过：收到 `CLAUDE_CODE` chunk，`STOP_RUN` accepted，TaskRun `STOPPED`，无 late `CLAUDE_CODE / REAL_ADAPTER` Artifact。

### 静态 / Mock / Placeholder 部分

- Adapter quality matrix 默认是监控脚本，不强制真实 provider；`REQUIRE_REAL=true` 时才禁止 fixture。
- Streaming stop / cancel 仍是 opt-in；默认 SSE smoke 不依赖真实 CLI。
- Streaming chunk 仍只作为实时预览，不持久化 token 级历史。
- 当前验证确认 late result 不落最终 Artifact；不代表所有非流式外部进程都能被操作系统级硬中断。

### 遗留问题

- Browser E2E 未在本轮执行，因为没有修改 Workspace / MessageStream / ArtifactPanel 等前端渲染代码。
- Adapter quality matrix 目前验证 direct execute contract，不替代 full demo-task / REAL_FIRST Artifact smoke。

### 下一步建议

- 若继续生产化 Adapter 质量，可把 quality matrix 的汇总接入长期指标或本地报告。
- 若继续增强 realtime 产品体验，可补 UI 可见性验证：Stop 后 MessageStream 显示 partial / discarded 状态。

## Phase 149：AgentHub 托管的 Claude / Codex 多轮 Session Context

### 目标

- 让同一个 Conversation / Agent 能复用历史上下文、上次 Artifact、Review 结果和前序 TaskRun summary。
- 支持用户对同一个 Artifact 继续说“继续修改 / 再优化 / 按刚才建议修”时，Claude Code / Codex headless Adapter 能收到前序摘要。
- 保持边界：先由 AgentHub 自己管理 session context，不依赖外部 CLI 原生 session。

### 主要变更

- 新增 `ConversationSessionContextBuilder`。
- Orchestrator 每个 `StepExecutionCommand` 自动注入 AgentHub-managed multi-turn session context。
- 注入内容包括：
  - 最近消息摘要。
  - 最近 Artifact 摘要。
  - Review Report 结果摘要。
  - 近期 TaskRun summary。
  - 当前 Agent continuity 说明。
- Claude Code / Codex 已有 prompt contract 会读取 `contextItems` 和 `artifactSummaries`，因此无需打开 workspace-write 或外部 CLI native session。
- `scripts/smoke-test.mjs` 新增断言：首个 TaskStep `inputContext` 必须包含 AgentHub-managed multi-turn session context。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 边界

- 本轮不实现 Claude Code / Codex 原生 session 复用。
- 本轮不允许 CLI 直接修改 AgentHub workspace。
- Session context 是摘要注入，不是长期向量记忆或 token 级历史持久化。
- 默认 demo 仍可走 Mock / static fallback，真实 CLI 仍是 opt-in。

### 下一步建议

- 用真实 Claude Code / Codex CLI 跑一次“继续修改 / 按刚才建议修”的 REAL_FIRST smoke，观察是否能稳定生成新 Revision。
- 若上下文过长，再增加按 Artifact / Review / Agent 的优先级裁剪策略。

## Phase 150：REAL_ADAPTER Revision 主产物与 Reviewer Gate 闭环增强

### 目标

- 继续收敛真实 Adapter 输出质量、multi-turn session context、Reviewer gate、Artifact revision 四条主链路。
- 让 Artifact Revision 不再只返回静态 revised Artifact；当 revision worker 产出合格 `REAL_ADAPTER` CODE Artifact 时，将其提升为本次 Revision 主版本。
- Revision 后继续执行 Reviewer gate，使 build / quality / parse failure 能阻塞本次 revision TaskRun，并给出 retry / revise 指引。

### 主要变更

- `createAgentExecutedStep` 也接入 AgentHub-managed multi-turn session context，覆盖 Artifact Revision 的 frontend / reviewer step。
- 新增 REAL_ADAPTER revision promotion：
  - 只接受 `sourceKind=REAL_ADAPTER`。
  - 只接受 CODE Artifact。
  - 拒绝 build failed / quality rejected 的候选产物。
  - 提升后保留 `parentArtifactId`、`revisionInstruction`、version、sourceAdapterType、generationMode、quality/build metadata。
- Revision review report 会记录本轮 revision source、adapter、quality 状态。
- Revision 后复用 `ReviewDecisionEvaluator`：
  - 通过时 TaskRun 保持 `COMPLETED`。
  - 拒绝时 TaskRun 标记 `BLOCKED`。
  - 拒绝时创建 retry advice Artifact，并追加 Reviewer / Orchestrator `REJECTION` 协作消息。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `node --check scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 边界

- 若真实 Adapter 没有合格 CODE 输出，Revision 仍回落到现有静态 revised Artifact。
- Reviewer gate 仍是规则化质量门禁，不是完整 ESLint / unit test / static analysis 平台。
- 本轮没有强跑真实 Claude / Codex CLI revision smoke；真实 CLI 仍需要 opt-in 环境。

### 下一步建议

- 补一个 opt-in real CLI revision smoke：先生成 Artifact，再用“按刚才建议修 / 继续优化”触发 Revision，断言主 revised Artifact 为 `REAL_ADAPTER`。
- 若要进一步产品化，可在 ArtifactPanel 中突出“Revision 主产物来自真实 Adapter / 静态 fallback”的差异。

## Phase 151：主流 Adapter 深接可见性与对话式创建 Agent

### 目标

- 除 OpenCode 外，继续把 OpenAI-compatible、Claude Code、Codex 的主流 Agent 平台接入从“技术可用”推进到“用户可理解”。
- 把自建 Agent 从纯表单配置推进到轻量对话式创建：用户描述想要的协作成员，系统生成可检查草案，再确认创建。

### 主要变更

- Agent Builder 新增“对话式创建 Agent”区域：
  - 用户输入自然语言描述。
  - 前端规则解析出 Agent 名称、System Prompt、capabilityTags、toolTags、preferredAdapterType。
  - 用户可把草案填入表单继续编辑，或直接确认创建 Agent。
- Agent Builder 和 Agent 联系人卡新增主流 Adapter 深接标识：
  - `OPENAI_COMPATIBLE / CLAUDE_CODE / CODEX` 标为深接 v1。
  - `OPEN_CODE` 明确标为 probe-only，不作为本轮深接目标。
- 保持现有 createAgent API、Router、TaskGraph、Mock fallback 和 AdapterRegistry 不变。

### 验证方式

- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 边界

- 对话式创建 v1 是规则解析草案，不调用真实 LLM 创建 Agent。
- 本轮不做完整自然语言 Agent Builder，不做工具运行时系统。
- OpenCode 仍是探测型接入，不包装成深度平台接入。

## Phase 152：Workspace 内联对话式创建 Agent

### 目标

- 继续推进用户自建 Agent 和主流 Agent 平台接入的产品化程度。
- 让用户不离开 `/workspace`，通过聊天消息触发“创建 Agent”草案，并在消息流内确认创建。

### 主要变更

- 新增 `conversationalAgentDraft` 前端模型与规则解析器。
- Workspace 发送包含“创建 / 新建 / 生成 + Agent / 智能体 / 协作成员”的用户消息后，会在该消息下方显示 Agent 创建确认卡片。
- 确认后复用现有 `createAgent` API 创建 Agent，刷新左侧 Agent 联系人列表，并把新 Agent 设为当前 selectedAgent。
- MessageStream / MessageBubble 增加 Agent creation draft 展示与确认 / 取消操作。
- 保持 Claude Code、Codex、OpenAI-compatible 深接 v1 标识；OpenCode 继续显示为 probe-only。

### 验证方式

- `cd frontend && npm run build`

### 静态 / Mock / Placeholder 边界

- 这是规则解析的对话式创建 MVP，不是完整 LLM Agent Builder。
- 创建后的执行仍走现有 Router、AdapterRegistry、REAL_FIRST、quality gate 与 fallback 链路。
- 本轮不推进 OpenCode 深度接入。

## Phase 153：后端自然语言 Agent Draft API

### 目标

- 把“对话式创建 Agent”从前端规则草案推进到后端统一能力。
- 支持用户用自然语言设定自建 Agent 的 System Prompt、工具能力、preferred Adapter 和路由标签。
- 默认环境仍可用，不强依赖真实 LLM。

### 主要变更

- 新增 `NaturalLanguageAgentDraftService`。
- 新增 `POST /api/agents/draft`：
  - 优先使用 `OPENAI_COMPATIBLE` 生成结构化 Agent draft。
  - LLM 输出必须是 JSON 草案：`name / avatarUrl / systemPrompt / capabilityTags / toolTags / preferredAdapterType / reasoning`。
  - 自动过滤不支持的 toolTags，禁止生成 `OPEN_CODE` 作为深接目标。
  - 当 OpenAI-compatible 不可用、fallback、异常或 JSON 无效时，回退到确定性解析，并返回 `draftSource=RULE_BASED_FALLBACK` 与 fallback reason。
- `/agents` Agent Builder 改为调用后端 draft API。
- Workspace 内联 Agent 创建卡片也改为调用后端 draft API；API 不可达时才用前端 fallback。
- `scripts/smoke-test.mjs` 新增默认断言：
  - 自然语言 Agent draft 可生成。
  - draft 包含 `systemPrompt` 和 `review` tool capability。
  - draft 可被持久化为 custom Agent。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node --check scripts/smoke-test.mjs`

### 静态 / Mock / Placeholder 边界

- OpenAI-compatible 真实自然语言创建是 opt-in；无真实 provider 时会稳定 fallback。
- 这不是完整多轮 Agent Builder 对话状态机，仍是单轮自然语言 draft。
- OpenCode 仍不推进深度接入。

## Phase 154：聊天内创建 Agent 主链路 E2E 验证

### 目标

- 用完整 API smoke 和 Browser E2E 验证“聊天内创建 Agent -> 确认创建 -> 联系人刷新 -> @Agent 路由”主链路。
- 保持 Browser E2E 作为 Workspace / MessageStream / Agent Builder 改动后的 UI 回归门禁。

### 主要变更

- `scripts/e2e-browser.mjs` 增加聊天内创建 Agent 覆盖：
  - 在 `/workspace` 发送创建 Agent 请求。
  - 等待内联 Agent 创建确认卡片。
  - 点击确认创建。
  - 校验新 Agent 出现在 API 和左侧联系人列表中。
  - 继续走 @Agent 多 Agent 协作、Artifact、Approval、Preview 主链路。
- 修正 REJECTION recovery E2E 指令，避免恢复步骤继续包含 `rejection / blocker` 等规则化拒绝触发词，导致恢复场景被再次判定为 `BLOCKED`。
- 清理本轮 Browser E2E 失败诊断截图和日志，避免临时文件留在仓库。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- 默认端口启动 backend / frontend 后：
  - `node scripts/smoke-test.mjs`
  - `node scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 边界

- Browser E2E 使用默认 memory + MOCK fallback 环境，不等同于真实外部 Adapter 验证。
- 真实 OpenAI-compatible / Claude Code / Codex provider 仍通过各自 opt-in smoke 验证。
- 聊天内创建 Agent 仍是单轮 draft + 确认创建，不是完整多轮 Agent Builder 状态机。

## Phase 155：Agent Builder 暗色 IM Command Center 视觉统一

### 目标

- 将 `/agents` Agent Builder 页面从亮色表单页改造成与 `/workspace` 一致的暗色 IM 协作控制台风格。
- 保持所有 Agent 创建、对话式草案、Adapter 测试和 E2E selectors 不变。

### 主要变更

- 对 `agent-builder-page` 追加 scoped CSS 覆盖：
  - 暗色 grid 背景和窗口化顶部状态条。
  - Agent Builder hero、流程条、对话式创建卡片、表单、预览联系人卡、Adapter Test 面板统一为 command-center surface。
  - Tool Capability、Adapter 深接状态、路由能力映射、联系人预览改为高密度暗色卡片。
  - 修复旧样式覆盖导致的白色 Adapter 状态卡和路由能力映射区域。
- 没有改动 Agent Builder 业务逻辑、API client、Router 或 AdapterRegistry。

### 验证方式

- `cd frontend && npm run build`
- `git diff --check`
- 默认端口启动 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 使用 Playwright 截图检查 `/agents` 渲染效果。

### 静态 / Mock / Placeholder 边界

- 本轮是视觉统一，不改变 Claude Code / Codex / OpenAI-compatible 的真实接入能力。
- Adapter 不可用、Mock fallback、OpenCode probe-only 等边界仍按现有状态展示。

## Phase 156：Agent Builder 三栏接入工作台重构

### 目标

- 继续优化 `/agents` 页面，让自建 Agent 从“配置表单”更像“IM 协作成员接入工作台”。
- 对齐 Workspace 的 technical command center 风格，同时保留现有 Agent 创建、对话式草案、Adapter Test 和 E2E 选择器。

### 主要变更

- 在 Agent Builder 页面新增左侧接入矩阵：
  - 展示 Adapter 可用数量。
  - 展示 OpenAI-compatible / Claude Code / Codex 深接 v1、OpenCode probe-only、MOCK fallback 边界。
  - 展示当前 Tool Capability 选择状态。
- 中间区域收敛为主要创建流程：
  - 对话式创建 Agent。
  - 表单式精修 System Prompt、Capability、preferredAdapter。
- 新增右侧 Agent Inspector：
  - 联系人预览。
  - Adapter 诊断。
  - 路由证据。
  - 质量边界说明。
- CSS 使用 scoped Agent Builder 覆盖，不改 Workspace / Orchestrator / Adapter 后端逻辑。

### 验证方式

- `cd frontend && npm run build`
- `git diff --check`
- 默认端口启动 backend / frontend 后运行 `node scripts/e2e-browser.mjs`
- 使用 Playwright 截图检查 `/agents` 三栏工作台渲染效果。

### 静态 / Mock / Placeholder 边界

- 本轮仍是前端信息架构和视觉重构，不改变真实 Claude Code / Codex / OpenAI-compatible 接入能力。
- OpenCode 继续明确为 probe-only，不包装成主流深接平台。
- MOCK fallback 仍是默认稳定演示安全网。

## Phase 157：Agent Builder IM 协作流视觉增强

### 目标

- 继续按参考图收敛 `/agents` 页面，让它更像“构建 Agent 的 IM 协作流”，而不是独立配置表单。
- 保持 Agent Builder 的现有 API、表单字段、对话式创建、Adapter Test 和 E2E 主链路不变。

### 主要变更

- 左侧 rail 增加 IM 化元素：
  - 新建对话按钮、搜索框、会话筛选标签。
  - 我的 Agent 联系人列表，展示 Orchestrator、Frontend、Reviewer、Claude Code、Codex。
- 中间主区域增加消息式协作流：
  - “建议创建自定义 Agent”确认卡。
  - Orchestrator / Agent Builder / Reviewer 协议消息。
  - 规划步骤 strip 和评审结果 grid。
- 右侧 inspector 增加产品化信息层：
  - 概览 / 能力 / Adapter / 路由 / 测试 tabs。
  - 接入状态总览。
  - Adapter 状态列表。
- CSS 继续 scoped 到 Agent Builder 页面，不影响 Workspace 默认主链路。

### 验证方式

- `cd frontend && npm run build`
- `git diff --check`

### 静态 / Mock / Placeholder 边界

- 新增的 IM 化视觉信息是 Agent Builder 的产品引导，不改变后端 Adapter 可用性。
- Claude Code / Codex / OpenAI-compatible 的真实验证仍以各自 smoke 为准。
- OpenCode 继续保持 probe-only 边界。

## Phase 158：Agent Builder 参考图级布局收敛

### 目标

- 继续按暗色 IM 协作参考图压缩 `/agents` 信息密度。
- 让第一屏直接进入“建议创建 Agent -> 协作消息 -> Agent Builder -> 右侧 Inspector”的产品主路径。

### 主要变更

- 隐藏原独立 hero 和流程条，避免页面显得像表单说明页。
- 左侧 rail、中心消息流、右侧 Inspector 从首屏开始对齐，接近 Workspace 的三栏 IM 布局。
- 中心区域新增 IM 输入框视觉，用于表达“发送消息 / @Agent / 描述需求”的主交互心智。
- 对对话式创建面板、表单、Inspector、Adapter Test 继续压缩圆角、间距和高度，提高桌面应用信息密度。

### 验证方式

- `cd frontend && npm run build`
- `git diff --check`

### 静态 / Mock / Placeholder 边界

- 本轮仍是 UI 信息架构和视觉收敛，不改变 Agent 创建、Adapter 执行、Orchestrator 或真实 CLI 接入能力。
- 输入框为 Agent Builder 页面上的产品化视觉表达，不替代 Workspace 的真实聊天输入链路。

## Phase 159：Workspace / Artifact Inspector 视觉系统收敛

### 目标

- 继续把 `/workspace` 收敛成“IM 协作流 + 右侧产物 Inspector”的主屏体验。
- 让 ArtifactPanel 更像统一的产物工作台，而不是分散的卡片堆叠。

### 主要变更

- Workspace 右栏新增产物工作台 header，明确 Inspector、Preview、审批和快照边界。
- ArtifactPanel 增加 `Source / Quality / Build / Run` 四个指标卡，统一展示来源、质量门禁、构建校验和运行状态。
- ArtifactPanel 将 Preview 小窗前置到右侧 Inspector 顶部，同时保留 `/preview/:artifactId` 独立预览页。
- 追加 command-center CSS token、暗色 panel、协议消息、协作确认卡、Adapter/Context/Artifact 面板、PreviewPage 和响应式覆盖。

### 验证方式

- `cd frontend && npm run build`
- `git diff --check`
- 如涉及主路径 UI 回归，继续运行 `node scripts/e2e-browser.mjs`。

### 静态 / Mock / Placeholder 边界

- 本轮只调整前端视觉系统和 Inspector 信息架构。
- 不改变 Orchestrator、AdapterRegistry、Artifact contract、审批、部署或 Mock fallback 行为。
- `/preview/:artifactId` 仍是本地静态预览，不是真实云部署。

## Phase 160：Workspace 参考图级信息密度补强

### 目标

- 继续按暗色 IM 协作参考图收敛 `/workspace` 首屏。
- 解决“只学风格、没有结构复刻”的问题，让无数据状态也更像产品主屏，而不是说明页。

### 主要变更

- Conversation 空状态改为 IM 会话样例列表：
  - 多 Agent 协作示例。
  - 未读、置顶、归档示例。
  - 明确标注样例不会创建真实会话。
- MessageStream 空状态改为参考图式协作骨架：
  - 建议启动多 Agent 协作卡。
  - 任务目标、参与 Agent、预计产物、上下文来源。
  - Orchestrator TASK、Frontend RESULT、Reviewer REVIEW 示例卡。
- CSS 继续压缩 Workspace 信息密度：
  - 左侧 Agent 联系人卡更接近 IM 联系人行。
  - 中间协作空状态更接近真实消息流。
  - 右侧 Artifact 空状态和 Inspector 面板间距更紧凑。
- 无会话时隐藏原来的大 Hero 说明区，避免首屏像引导页；主路径改由会话样例、协作确认骨架和输入框承载。
- Artifact 无数据状态升级为右侧 Inspector scaffold：
  - 示例 LoginPage.tsx。
  - 来源 / 质量 / 构建 / 运行指标。
  - 诊断信息列表。
  - 本地静态部署预览小窗。
  - 明确示例不写入后端，真实产物仍由 Orchestrator / Adapter 链路生成。

### 验证方式

- `cd frontend && npm.cmd run build`

### 静态 / Mock / Placeholder 边界

- 本轮只调整前端首屏视觉和空状态信息架构。
- 空状态中的会话、消息和产物为产品化示例，不会写入后端，也不会伪装成真实 TaskRun。
- 不改变 Orchestrator、Adapter、Artifact、Approval、Deploy 或 Mock fallback 行为。

## Phase 161：IM 消息中心交互视觉收敛

### 目标

- 继续优化 `/workspace` 的 IM 聊天式核心体验。
- 让 MessageStream 更像“多 Agent 协作消息中心”，而不是工作流卡片和按钮堆叠。

### 主要变更

- 调整消息气泡视觉层级：
  - 消息正文优先展示。
  - 类型 ribbon 压缩为轻量状态标签。
  - Message Action Bar 下沉为低噪声底部工具条。
- 统一消息操作入口：
  - 复制、引用、回复、pin、保存记忆、重跑、Agent 回复再生成继续保留。
  - 操作状态通过 active / disabled / hover / focus 样式表达。
- 优化消息类型表达：
  - 文本消息保持 IM 气泡阅读感。
  - 附件消息展示文件名、类型、大小、预览摘要和下载入口。
  - Artifact 消息展示 title、type、source、quality、select / preview。
  - TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR 保留协议视觉，但更贴近聊天流。
- 压缩 ChatInput：
  - 路由预览、附件输入和发送按钮更紧凑。
  - 保留单聊、多 @Agent、Orchestrator 自动分派的发送前提示。

### 验证方式

- `cd frontend && npm.cmd run build`
- `git diff --check`
- 如涉及主路径回归，继续运行 `node scripts/e2e-browser.mjs`。

### 静态 / Mock / Placeholder 边界

- 本轮只修改前端 CSS 和视觉组织，不改变 API、Orchestrator、Adapter、Artifact、Approval、Deploy 或实时链路。
- 图片和 PPT 仍作为文件附件展示 metadata / download，不做完整在线渲染、OCR 或编辑。
- 不新增 UI 组件库，不引入 Redux / Zustand / axios。

## Phase 162：真实 Adapter 质量矩阵任务族扩展

### 目标

- 将 `next.md` 中唯一的 Active 项从“待办”收敛为可重复执行的质量监控入口。
- 覆盖更多真实 Agent 输出类型，减少只验证单一代码生成任务导致的误判。

### 主要变更

- 扩展 `scripts/adapter-quality-matrix-smoke.mjs` 的任务矩阵：
  - frontend code。
  - API contract。
  - review report。
  - docs / markdown。
  - web preview。
  - data model。
  - deploy handoff。
  - revision。
- 更新 `docs/plans/next.md`：
  - 将原 Active 项标记为已落地的矩阵验证入口。
  - 明确真实 provider 质量监控仍是持续运营实践，不是一次性完成后永远稳定。

### 验证方式

- `node --check scripts/adapter-quality-matrix-smoke.mjs`
- `git diff --check`

### 静态 / Mock / Placeholder 边界

- 质量矩阵不强制真实 provider 默认可用。
- 未配置真实 Adapter 时脚本仍可按现有策略跳过或分类失败。
- `REAL_ADAPTER` 仍只代表通过当前 contract / quality / build gate，不等同于生产级代码质量保证。

## Phase 163：Workspace 单聊 / 群聊生产状态摘要

### 目标

- 将 Web IM 工作台、对话列表、单聊 Agent 和群聊协作从“功能可用”推进到“用户可理解、可验证”的生产端表达。
- 不改变 Orchestrator、Adapter、Message、Conversation API，只增强主路径信息架构。

### 主要变更

- 新增 `WorkspaceSessionSummary`：
  - 显示当前协作模式：单聊优先、群聊协作、Orchestrator 自动分派或等待选择会话。
  - 展示参与 Agent 头像组、当前路由目标、上下文连续状态、最近 TaskRun 和 Adapter 状态。
  - 将 pinned context、Memory、消息数量和 Artifact 数量作为上下文连续指标展示。
- ConversationList 增加生产状态摘要：
  - 当前可见会话数量。
  - 服务端搜索状态。
  - 最近活跃排序 / 归档视图状态。
- CSS 补充 command-center 风格样式：
  - Session summary 使用紧凑指标卡，避免增加表单感。
  - Conversation list 状态条融入左侧 IM rail。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 静态 / Mock / Placeholder 边界

- 本轮不引入分页、服务端复杂会话管理或完整长期 Agent session。
- 单聊优先仍基于 `selectedAgent / targetAgentId` 路由语义；群聊仍基于 participants、多 @Agent 和 Orchestrator TaskGraph。
- 不改变默认 memory / mock / static fallback 安全边界。

## Phase 164：长期单聊 Session 表达与图片 / PPT 附件预览

### 目标

- 将已存在的 AgentHub-managed session context 明确纳入产品体验：单聊不是一次性请求，而是复用最近消息、产物、Review 和 TaskRun 摘要的连续协作。
- 将图片 / PPT 从普通附件卡片推进到可识别的弱富媒体展示，补齐课题中图片、文件附件和富媒体消息的可见边界。

### 主要变更

- 保留现有 `ConversationSessionContextBuilder` 后端能力，不新增重复 session 模型。
- MessageStream 附件卡片增强：
  - 真实上传图片在存在后端下载 URL 时展示可点击缩略图。
  - PPT / PPTX 展示演示文稿预览壳、metadata、摘要和下载入口。
  - 明确标注 PPT 在线渲染、图片编辑和 OCR 后置，不伪装成完整富媒体编辑能力。
- 补充 Workspace CSS，使图片和 PPT 附件卡片与当前暗色 IM command-center 风格一致。
- 更新 `docs/plans/next.md`，记录图片缩略预览和 PPT 弱能力边界已落地。

### 验证方式

- `cd frontend && npm.cmd run build`
- `git diff --check`
- 如后续修改 MessageStream 主路径，继续跑 `node scripts/e2e-browser.mjs`。

### 静态 / Mock / Placeholder 边界

- 长期单聊 Session v1 由 AgentHub 管理上下文摘要，不依赖 Claude / Codex 原生 session。
- 图片附件仅做缩略预览和下载，不做图片编辑、OCR 或视觉理解。
- PPT 附件仅做文件级预览壳和下载，不做在线幻灯片渲染。
- 本轮不改变 Orchestrator、Adapter、Artifact、Approval、Deploy 或 realtime 主链路。

## Phase 165：Claude / Codex 外部 CLI Session Bridge

### 目标

- 结合外部 CLI session 方向，进一步完善多 Agent 接入、自建 Agent 路由和 Agent 联系人展示。
- 在不开放 workspace-write、不托管桌面 GUI 的前提下，让 Claude Code / Codex 能按 Conversation + Agent 维度复用 AgentHub 管理的长期上下文。

### 主要变更

- AgentStepExecutor 为 Adapter 请求写入稳定 session metadata：
  - `externalCliSessionKey=agenthub:{conversationId}:{agentId}`。
  - `externalCliSessionScope=CONVERSATION_AGENT`。
  - `externalCliSessionMode=AGENTHUB_CONTEXT_BRIDGE`。
- ConversationSessionContextBuilder 不再描述为“无外部 CLI session”，改为明确 AgentHub 使用最近消息、Artifact、Review 和 TaskRun 摘要作为 durable session context。
- Claude Code / Codex prompt contract 增加 External CLI session bridge 区块：
  - 指示 CLI 使用 session key 理解连续上下文。
  - 强调仍是 Artifact-only，不依赖 workspace mutation 或桌面 GUI 状态。
- Claude Code / Codex descriptor 增强：
  - `supportedModes` 增加 `agenthub-session-bridge`。
  - `safetyPolicies` 增加 `agenthub-managed-session-context`。
  - `capabilityDetails` 暴露 `externalCliSessionSupport`、mode、scope、persistence 边界。
- Agent 联系人卡增加 `CLI Session Bridge` 标识，使自建 Agent 的 preferredAdapter 能力和长期上下文边界更可见。
- 更新 `docs/spec/claude-codex-headless-adapter-spec.md` 和 `docs/plans/next.md`。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `git diff --check`

### 静态 / Mock / Placeholder 边界

- 本轮不是 Claude Desktop / Codex Desktop GUI 自动化。
- 本轮不允许外部 CLI 直接写 AgentHub workspace。
- 外部 CLI session bridge v1 是 AgentHub-managed context injection，不承诺兼容 CLI 私有 session 文件格式。
- 真实 CLI 仍需本机安装、登录和 opt-in smoke 验证；默认 demo 继续保留 MOCK/static fallback。

## Phase 166：真实本机 CLI Session Bridge 验证

### 目标

- 验证 Claude Code / Codex 的 AgentHub-managed external CLI session bridge 不只停留在 descriptor 展示，而能进入真实本机 CLI smoke 验收路径。
- 保持 Artifact-only、安全隔离、REAL_FIRST 和 fallback 边界不变。

### 主要变更

- `scripts/claude-code-smoke-test.mjs` 增加 session bridge descriptor 断言：
  - `supportedModes` 必须包含 `agenthub-session-bridge`。
  - `safetyPolicies` 必须包含 `agenthub-managed-session-context`。
  - `capabilityDetails.externalCliSessionSupport=true`。
  - `externalCliSessionMode=AGENTHUB_CONTEXT_BRIDGE`。
- `scripts/codex-smoke-test.mjs` 增加同样的 session bridge descriptor 断言。
- 使用本机真实 CLI 路径启动隔离 backend 验证：
  - `AGENTHUB_CLAUDE_CODE_COMMAND=C:\Users\shens\AppData\Roaming\npm\claude.cmd`。
  - `AGENTHUB_CODEX_COMMAND=C:\Users\shens\AppData\Roaming\npm\codex.cmd`。
  - `AGENTHUB_ARTIFACT_GENERATION_MODE=REAL_FIRST`。
  - fixture 显式关闭，real CLI smoke 显式要求真实 CLI。

### 验证方式

- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- 隔离端口启动 backend 后运行：
  - `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true node scripts/claude-code-smoke-test.mjs`
  - `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true node scripts/codex-smoke-test.mjs`

### 静态 / Mock / Placeholder 边界

- 本轮验证的是 AgentHub-managed session context bridge，不是 Claude / Codex 原生私有 session 文件托管。
- 本轮不开放 workspace-write，不做桌面 GUI 自动化，不持久化 token。
- smoke 验证仍是 opt-in；默认 smoke 不依赖真实 Claude Code / Codex CLI。

## Phase 167：对话式 Agent Builder 轻量多轮 refinement

### 目标

- 将自建 Agent 从单轮自然语言 draft 推进到轻量多轮创建体验。
- 让用户生成草案后，可以继续用自然语言补充能力、切换 Adapter、追加 System Prompt 要求，再填入表单或确认创建。

### 主要变更

- `conversationalAgentDraft.ts` 新增 `refineAgentCreationDraft(...)`：
  - 合并新增 capability tags。
  - 合并新增 tool capabilities。
  - 支持按追问调整 `preferredAdapterType` 到 `MOCK`、`OPENAI_COMPATIBLE`、`CLAUDE_CODE` 或 `CODEX`。
  - 将追问写入 System Prompt 的补充要求，保留可解释 reasoning。
- `/agents` Agent Builder 增加“继续追问修改草案”输入区和“更新草案”操作。
- Browser E2E 的 Agent Builder 创建路径改为先生成自然语言草案，再执行一次 refinement，再填入表单创建可路由 Agent。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd frontend && npm.cmd run build`
- 后续 UI 主链路继续通过 `node scripts/e2e-browser.mjs` 验证。

### 静态 / Mock / Placeholder 边界

- 这是客户端 deterministic refinement，不是完整 LLM 多轮 Agent Builder 状态机。
- Workspace 聊天内创建 Agent 仍是单轮 draft + 确认创建；更完整的多轮编辑入口在 `/agents`。
- 不改变 AdapterRegistry、Orchestrator、REAL_FIRST 或 fallback 主链路。

## Phase 168：本机真实 Claude / Codex CLI smoke 复验

### 目标

- 直接使用本机 `claude.cmd` 和 `codex.cmd` 验证 Claude Code / Codex headless Artifact-only 接入。
- 修正 real CLI smoke 中把登录页任务误判为未认证的诊断问题。
- 保持 fixture 关闭、REAL_FIRST、Artifact contract、quality gate 和 fallback 边界。

### 主要变更

- `scripts/claude-code-smoke-test.mjs` 和 `scripts/codex-smoke-test.mjs` 去除 `login` 关键词的认证失败误判，避免“login page”任务被归类为 `NOT_AUTHENTICATED`。
- 两个 real CLI smoke 的 TaskStep 诊断现在同时输出 `artifactQualityReason` 和 `adapterErrorMessage`，方便区分质量失败、构建失败和 CLI 运行失败。
- 使用隔离端口 backend 验证本机真实 CLI：
  - Claude Code direct execute 返回合法 AgentHub Artifact JSON。
  - Claude Code demo-task 产生 `CLAUDE_CODE / REAL_ADAPTER / REAL_FIRST` 且质量通过。
  - Codex direct execute 返回合法 AgentHub Artifact JSON。
  - Codex demo-task 产生 `CODEX / REAL_ADAPTER / REAL_FIRST` 且质量通过；Reviewer gate 可将 TaskRun 标为 `BLOCKED`，但真实产物链路仍通过。

### 验证方式

- `node --check scripts/claude-code-smoke-test.mjs`
- `node --check scripts/codex-smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- `cd backend && mvn -q -DskipTests package`
- 隔离端口启动 backend 后运行：
  - `AGENTHUB_CLAUDE_CODE_SMOKE_REQUIRE_REAL_CLI=true node scripts/claude-code-smoke-test.mjs`
  - `AGENTHUB_CODEX_SMOKE_REQUIRE_REAL_CLI=true node scripts/codex-smoke-test.mjs`

### 静态 / Mock / Placeholder 边界

- 本轮验证非流式真实 CLI smoke；streaming cancel 的真实 CLI 专项验证仍可后续单独跑。
- Claude / Codex 仍是 AgentHub-managed context bridge，不是 workspace-write 或桌面 GUI 自动化。
- 默认 smoke 仍不依赖真实 Claude Code / Codex CLI。

## Phase 169：Reviewer Gate 与 TaskGraph DAG 可视化增强

### 目标

- 将 Reviewer gate 从通用质量字段推进到更明确的 build / lint / test / typecheck 证据门禁。
- 让 Orchestrator Explain 不只显示决策文字，还能展示 TaskGraph DAG、batch 依赖和 retry/revise 策略。

### 主要变更

- `ReviewDecisionEvaluator` 新增显式验证证据识别：
  - `LINT_FAILED`、`ESLINT_FAILED`、`lint failed`。
  - `TEST_FAILED`、`VITEST_FAILED`、`JEST_FAILED`、`npm test failed`。
  - `TYPECHECK_FAILED`、`TSC_FAILED`、`typecheck failed`。
- Reviewer retry instruction 从 `rerunQualityChecks` 扩展为：
  - `rerunBuildValidation`
  - `rerunLint`
  - `rerunTests`
  - `rerunReviewer`
- Review Decision markdown 明确：阻塞证据未清理前不得 approve。
- `TaskRunPanel` 新增 `TaskGraphDAGPanel`：
  - 展示 batch key、execution mode、status、duration、failure policy、dependsOn 和 step chips。
  - 被 quality gate 阻塞的 step 会在 DAG 中标记。
- `TaskRunPanel` 新增 `ReviewerGateRetryPanel`：
  - 展示 Reviewer gate 的失败原因、fallback decision 和修复顺序。
  - 对 `BLOCKED` run 或 step quality/build/parse failure 提供 retry/revise 路径。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `git diff --check`
- 隔离 backend 运行 `node scripts/smoke-test.mjs`：API 主链路执行到 Deploy/Preview；由于本轮没有保持前端 dev server 可用，Preview URL 访问检查失败，失败原因是 frontend 未启动，不是后端 Orchestrator 回归。

### 静态 / Mock / Placeholder 边界

- Reviewer gate 仍是规则化质量门禁，不是完整 ESLint/Vitest/tsc 执行平台。
- DAG 可视化基于已有 TaskGraph / ExecutionBatch DTO，不是可编辑 Workflow Canvas。
- Retry strategy 只提供修复路径和复验要求，不自动生成修复补丁。

## Phase 170：Taste-skill 前端视觉系统收敛

### 目标

- 将 4 张参考设计图中的布局比例、视觉 token 和组件规范落到现有前端，不改变 Workspace / Orchestrator / Artifact / Approval 主链路。
- 避免继续在旧 CSS 中零散追加风格，改为追加一个清晰的 final polish 覆盖层，便于后续继续收敛或回退。

### 主要变更

- `workspace.css` 新增 `Taste-skill final polish` 覆盖层：
  - 统一 `--ah-bg-app`、`--ah-bg-shell`、`--ah-surface-*`、`--ah-border-*`、`--ah-accent-blue`、`--ah-accepted-green`、`--ah-rejection-red`、`--ah-warning-yellow` 等顶层视觉 token。
  - Workspace 三栏收敛为 `292px / minmax(680px, 1fr) / clamp(400px, 29vw, 460px)`，减少面板间距，让中间消息流成为主视觉中心。
  - MessageStream 收敛为更紧凑的 IM 协作流：协议消息卡、Message Action Bar、Artifact / Attachment card、Streaming strip、REJECTION 状态统一暗色 command-center 语言。
  - 右侧 Artifact Inspector 使用统一 `Source / Quality / Build / Run` 指标卡视觉，并与 Artifact Cockpit、Diff、Snapshot、Deploy 面板对齐。
  - Agent Builder 和 PreviewPage 共享同一套深色 shell、metric card、tab、border、radius 和响应式规则。

### 验证方式

- `cd frontend && npm.cmd run build`
- 临时启动 Spring Boot jar 后运行 `node scripts/e2e-browser.mjs`

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖：
  - Agent Builder 创建自定义 Agent。
  - IM-first 消息触发协作。
  - Message Action Bar。
  - 附件、Context Search、多 Agent 路由、Adapter fallback。
  - Approval、Apply Diff、Restore、Deploy Preview。
  - Preview 页面。
  - 可选 REJECTION -> Revision -> recovery 路径。

### 静态 / Mock / Placeholder 边界

- 本轮只做视觉系统和布局收敛，不新增业务能力。
- 不改变 AdapterRegistry、REAL_FIRST、Approval、Artifact mutation 或 Orchestrator 主链路。
- Browser E2E 是 UI 回归门禁，不替代 API smoke、SSE smoke、JDBC/MySQL smoke 或真实 Adapter smoke。

## Phase 171：Artifact 内容编辑与局部 Revision 体验

### 目标

- 将 ArtifactPanel 从“只能填写 Revision 指令”推进到“可编辑内容草稿、选中片段、生成 Draft Revision、再通过 Diff / Approval Gate 应用”的局部修改体验。
- 不引入 Monaco / CodeMirror，不改变后端 Artifact mutation 主链路。

### 主要变更

- ArtifactPanel 新增内容编辑模式：
  - textarea 展示当前 Artifact content。
  - 本地修改不会直接覆盖当前 Artifact。
  - 支持选中 textarea 中的代码片段并记录行号范围。
  - 支持填写局部修改说明。
- 新增 Draft Diff Preview：
  - 展示本地草稿是否变化、增删行估算、首个变化行。
  - 明确生成 Draft Revision 后仍需通过 Diff Summary 和 Approval Gate 应用。
- 生成 Draft Revision 时，会把 Artifact 标题、版本、选区行号、选中片段、局部说明和编辑后草稿内容打包成 revision instruction，并复用现有 `onCreateRevision` 链路。
- Browser E2E 的 Artifact revision 流改为优先使用内容编辑器生成 Draft Revision，再走 Apply Diff 审批。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node --check scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 边界

- 本轮仍不是完整在线 IDE；没有引入 Monaco / CodeMirror。
- 本地 textarea 编辑只生成 Revision，不直接覆盖 Artifact。
- Apply / Force Apply 仍依赖现有后端 ApprovalRequest、Diff Summary、Snapshot 和 Audit 链路。

## Phase 172：Artifact 选区同步到聊天框的局部修改闭环

### 目标

- 完成“选中代码片段 -> 聊天框自动带引用 -> 发送修改请求 -> 生成 Revision”的真实 IM-first 局部修改体验。
- 让局部修改不再只停留在 ArtifactPanel 内部说明，而是进入聊天消息流并保留用户请求记录。

### 主要变更

- 新增 `ArtifactSelectionReference`，统一描述 Artifact ID、标题、版本、类型、语言、行号范围和选中片段。
- ArtifactPanel 内容编辑模式新增“带选区到聊天框修改”：
  - 捕获 textarea 选区和行号范围。
  - 如果浏览器没有稳定触发选区事件，则退化为当前草稿全文行范围，避免按钮卡死。
  - 将选区引用同步到 WorkspacePage。
- ChatInput 新增 Artifact 局部修改引用卡：
  - 展示 Artifact 标题、版本、行号范围、语言和片段摘要。
  - 支持取消选区引用。
- WorkspacePage 在发送带 Artifact 选区引用的聊天消息时：
  - 先写入用户消息。
  - 再基于用户修改请求、选中片段、行号范围和来源 messageId 生成 Draft Revision。
  - 自动选中新的 revision Artifact，后续仍通过 Diff Summary 和 Approval Gate 应用。
- Browser E2E 已切换到该主路径：选区同步到 ChatInput -> 发送修改请求 -> Revision -> Apply Diff 审批。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node --check scripts/e2e-browser.mjs`
- 隔离端口启动 backend / frontend 后运行 `node scripts/e2e-browser.mjs`

### 验证结果

- 前端构建通过。
- Browser E2E 通过，并覆盖：
  - Artifact 内容编辑器。
  - Draft Diff Preview。
  - Artifact 选区引用同步到 ChatInput。
  - 聊天消息触发 Draft Revision。
  - Apply Diff Approval Gate。
  - Deploy / Restore / Preview 主链路。

### 静态 / Mock / Placeholder 边界

- 本轮仍不是 Monaco / CodeMirror 在线 IDE。
- 选区引用由 AgentHub 管理，不依赖外部 CLI 原生编辑 session。
- Revision 生成后仍必须通过现有 Diff / Approval / Snapshot / Audit 链路应用。

## Phase 173：聊天触发部署与 Artifact Bundle 下载

### 目标

- 将部署发布从 ArtifactPanel 手动入口推进到 IM 主路径：发送部署消息 -> 确认 -> 审批 -> 生成本地静态 Preview URL。
- 补齐“源码打包下载”的 MVP：下载 AgentHub Artifact 内容 zip，不读取真实工作区源码目录。

### 主要变更

- Backend 新增 Artifact Bundle zip 服务和接口：
  - `GET /api/conversations/{conversationId}/artifact-bundle/download?artifactIds=&includeRelated=`
  - 返回 `application/zip` 和 `X-AgentHub-Artifact-Count`。
  - `includeRelated=true` 时包含同 TaskRun 和 revision lineage 的相关 Artifact。
- Workspace 新增部署意图识别：
  - 识别“部署 / 发布 / 生成预览 / preview url / open preview”。
  - MessageStream 渲染 Deploy 确认卡。
  - 确认后创建 `DEMO_DEPLOY / ARTIFACT` ApprovalRequest。
  - 审批后调用现有 `demo-deploy` API，继续生成 DeploymentRecord、DEPLOY_STATUS、Snapshot、Audit 和 Preview URL。
- Artifact Deploy Panel 和 Deploy 确认卡增加“下载源码包”入口。
- Smoke / E2E 脚本同步：
  - API smoke 验证部署意图消息持久化和 Artifact Bundle zip 下载。
  - Browser E2E 的 deploy 路径改为从聊天部署确认卡触发。
- 新增 `docs/spec/deployment-publish-spec.md` 并同步 spec index、next plan、scripts README。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`

### 静态 / Mock / Placeholder 边界

- Deploy 仍是本地静态 Preview，不是真实 Vercel / Netlify / Docker / Kubernetes 部署。
- Artifact Bundle 是 Artifact 内容包，不是完整项目源码包，不包含依赖目录、构建产物或容器配置。
- Deploy 仍必须走后端 ApprovalRequest；本轮没有绕过审批。

## Phase 174：Web 主端响应式收敛与 ChatInput 中文修复

### 目标

- 将 Web 端继续固定为 AgentHub 的主力端，确保 `/workspace` 在 1536px、1366px 和平板宽度下仍可完成 IM-first 主链路。
- 修复 ChatInput 主路径上可见中文乱码，降低演示时的可信度风险。

### 主要变更

- ChatInput 路由预览、引用、Artifact 选区引用、附件、输入框和发送提示文案改为正常中文。
- Workspace CSS 追加 Web 主端响应式硬化层：
  - 桌面保持三栏：会话 / 消息流 / Artifact Inspector。
  - 1366px 下压缩侧栏与 Inspector，ArtifactPanel 自动改为单列详情。
  - 平板宽度下改为两列加 Inspector 跨列，窄屏下退化为单列。
  - 对消息流、Artifact 编辑器、Preview 代码块补充 `min-width: 0` 和断行保护，避免横向溢出。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Playwright 响应式只读检查：1536px、1366px、1024px

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖 Agent Builder、聊天内创建 Agent、消息触发协作、Artifact Revision、Apply Diff、Deploy、Restore、Preview 和 REJECTION recovery。
- 响应式检查通过：
  - 1536px：横向溢出 0px。
  - 1366px：横向溢出 0px。
  - 1024px：横向溢出 0px。

### 边界

- 本轮不做独立桌面端或移动端。
- 平板 / 窄屏是 Web 响应式支持，不是完整移动 App。

## Phase 175：可选 Tauri 桌面壳能力骨架

### 目标

- 直接推进桌面端规划中的三类核心能力：本地文件访问、系统通知、Agent 进程管理。
- 保持 Web 端仍是主力端，桌面端作为可选 Tauri 壳，不影响默认 smoke / E2E。

### 主要变更

- 新增 `desktop/` Tauri v2 scaffold：
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/capabilities/default.json`
  - Rust commands for desktop environment, directory listing, text preview, CLI probing, notification, backend process start/stop, and managed process listing.
- 新增前端 desktop bridge：
  - `frontend/src/features/desktop/desktopBridge.ts`
  - `frontend/src/features/desktop/DesktopCapabilityPanel.tsx`
  - 普通浏览器下安全降级，Tauri 环境下通过 invoke 调用本地能力。
- Workspace 增加桌面能力面板：
  - 本地目录 / 文件预览。
  - Claude Code / Codex CLI 探测。
  - 系统通知测试。
  - 本地 backend Java 进程启动 / 停止。
- 新增 `docs/spec/desktop-support-spec.md`，并同步 spec index 与 next plan。
- `.gitignore` 增加 Tauri / desktop 构建产物忽略规则。

### 验证方式

- `cd frontend && npm.cmd run build`

### 验证结果

- 前端构建通过，普通 Web 运行不依赖 Tauri。
- Rust / Cargo / MSVC Build Tools / WebView2 环境已补齐并通过 Tauri 环境诊断的关键项。
- `cargo check` 通过。
- `npm run dev` 已启动 Tauri 桌面壳并生成 `agenthub-desktop.exe` 运行进程；验证后已停止相关进程。
- `npm run build` 已完成 frontend build 和 Rust release 编译，生成 `desktop/src-tauri/target/release/agenthub-desktop.exe`；MSI bundle 阶段因 WiX 下载被网络/权限拦截失败。
- `npm run build -- --no-bundle` 通过，可稳定生成桌面端 release exe。

### 边界

- 本轮是可选桌面壳骨架，不是完整桌面生产发行包。
- 未默认启用 workspace-write，不允许外部 Agent 直接修改 AgentHub 仓库。
- 进程管理只管理由 Tauri shell 启动的进程，不接管系统中已有服务。
- Tauri 原生构建需要本机安装依赖后单独验证，不能等同于 Web build。

## Phase 176：Desktop Console UI 产品化

### 目标

- 将桌面端从“技术按钮面板”升级为可演示的本地能力中心。
- 覆盖本地文件访问、系统通知、Agent CLI 状态和 backend 进程管理四个桌面端核心能力。

### 主要变更

- 重写 `DesktopCapabilityPanel` 为 `Desktop Console` 结构：
  - 顶部环境状态和关键指标。
  - 四个能力页签：本地文件、通知中心、Agent 进程、Backend 管理。
  - Web 模式下清晰提示 Tauri 能力不可用，不影响 Web 主路径。
- 本地文件访问 UI 产品化：
  - 目录读取、文件列表、文本预览。
  - 文件类型、大小、截断状态显示。
  - “标记为上下文候选”的本地候选列表。
  - 图片 / PPT / 未知二进制文件显示 metadata / preview shell，不再按文本强行读取。
- 系统通知 UI 产品化：
  - 通知规则说明。
  - 测试通知。
  - 最近通知日志。
- Agent / Backend 管理 UI 产品化：
  - Claude Code / Codex / OpenCode CLI 探测卡片。
  - 本地 backend jar 启动表单。
  - Tauri 托管进程列表和停止操作。
- Workspace CSS 增加 Desktop Console 视觉系统，保持暗色 IM 协作控制台风格。

### 验证方式

- `cd frontend && npm.cmd run build`
- `cd desktop/src-tauri && cargo check`

### 验证结果

- 前端构建通过。
- Tauri Rust 侧 `cargo check` 通过。

### 边界

- 本轮只优化桌面端 UI，不新增 Tauri 原生权限范围。
- “上下文候选”当前是桌面面板内的本地状态，后续可接入 Attachment / Context Retrieval。
- Tauri 原生构建仍需 Rust / Cargo 环境后单独验证。

## Phase 177：Desktop Console 系统通知与 Agent 进程闭环

### 目标

- 将桌面端系统通知从手动测试按钮推进到真实业务事件触发。
- 将 Agent 进程管理从“command 可用”推进到 runtime cards 和 backend 日志摘要。

### 主要变更

- Workspace SSE / Realtime 事件接入 Tauri 系统通知：
  - TaskRun completed / blocked / failed。
  - Approval pending。
  - Deployment created。
  - Adapter fallback / quality failure。
- Desktop Console 通知中心新增 realtime 通知历史，保留 Web 安全降级。
- `desktopBridge.ts` 新增 `notifyDesktopRealtimeEvent`：
  - 普通 Web 模式直接 no-op。
  - Tauri 模式发送系统通知并派发 `agenthub:desktop-notification` 事件。
- Tauri CLI probe 增强：
  - executable path。
  - version。
  - help probe。
  - auth probe status。
  - stream support。
  - schema support。
  - sandbox policy。
  - tool policy。
- Backend 管理增强：
  - 启动 backend 时采集 stdout / stderr。
  - 记录临时 log path。
  - Desktop Console 显示 pid、startedAt、running、log path、最近输出摘要。
- `.cmd` / `.bat` 命令通过 Windows `cmd /C` 执行，避免 Tauri/Rust 直接执行 npm shim 失败。

### 验证方式

- `cd frontend && npm.cmd run build`
- `cd desktop/src-tauri && cargo check`
- `cd desktop && npm run build -- --no-bundle`

### 验证结果

- 前端构建通过。
- Tauri Rust 侧 `cargo check` 通过。
- Tauri `--no-bundle` release build 通过，生成 `agenthub-desktop.exe`。

### 边界

- 系统通知是桌面增强，不是任务状态的唯一来源；REST / SSE 仍是权威状态。
- auth probe 仍是非侵入式状态，不执行真实模型任务。
- backend 进程管理只管理由 Tauri shell 启动的进程。
- MSI installer bundling 仍受 WiX 下载可用性影响。

## Phase 178：Desktop 本地文件接入 Attachment / Context Retrieval

### 目标

- 将 Desktop Console 的“本地上下文候选”从面板内状态推进到真实 AgentHub Attachment 链路。
- 保持 Web 模式安全降级，不让 Tauri 能力成为默认演示前置条件。

### 主要变更

- Tauri 新增 `read_file_for_attachment` command：
  - 读取本地文件内容。
  - 推断基础 `contentType`。
  - 生成 `contentPreview`。
  - 以 base64 payload 交给前端桥接层。
  - 单文件限制 5MB。
- `desktopBridge.ts` 新增 `readDesktopFileForAttachment`。
- `DesktopCapabilityPanel` 支持把当前预览文件上传为当前消息附件：
  - 无 conversation 时仍可保留本地候选状态。
  - 有 conversation 时复用 Workspace 的 attachment upload callback。
  - 上传成功后显示 Attachment ID 和状态。
- Workspace 复用现有 `uploadConversationAttachment`，将桌面本地文件追加到 ChatInput 附件草稿。
- 用户发送消息后，该文件成为 Message attachment，可进入后续 Attachment / Context Retrieval 链路。

### 验证方式

- `cd frontend && npm.cmd run build`
- `cd desktop/src-tauri && cargo check`
- `cd desktop && npm run build -- --no-bundle`

### 验证结果

- 前端构建通过。
- Tauri Rust 侧 `cargo check` 通过。
- Tauri `--no-bundle` release build 通过，生成 `agenthub-desktop.exe`。

### 边界

- 本轮不做 workspace-write。
- 图片 / PPT 仍是 metadata / preview shell，不做完整渲染或编辑。
- 文件上传进入当前 ChatInput 草稿，仍需要用户发送消息后才成为聊天历史和 Context Retrieval 输入。
- MSI installer bundling 仍受 WiX 下载可用性影响。

## Phase 179：Desktop Context / Notification / Runtime 生产化补强

### 目标

- 继续补齐桌面端剩余生产化缺口：
  - 本地文件一键进入 Context / Memory。
  - 系统通知支持规则开关和点击定位。
  - Agent / Backend runtime 增加健康轮询、端口诊断和配置持久化。

### 主要变更

- 后端新增 Attachment 直达上下文接口：
  - `POST /api/conversations/{conversationId}/attachments/{attachmentId}/pin`
  - `POST /api/conversations/{conversationId}/attachments/{attachmentId}/memory`
- `ContextApplicationService` 支持生成 `PinnedContext(sourceType=ATTACHMENT)`。
- `MemoryApplicationService` 支持生成 `MemoryItem(sourceType=ATTACHMENT)`。
- 前端 API client 增加 `pinAttachmentAsContext` 和 `saveAttachmentAsMemory`。
- Desktop Console 上传本地文件为 Attachment 后，可直接执行：
  - 固定到 Context。
  - 保存为 Memory。
- Tauri 新增桌面配置和端口诊断能力：
  - `load_desktop_config`
  - `save_desktop_config`
  - `check_tcp_port`
- Desktop Console 支持：
  - 最近目录、CLI command、backend jar path、工作目录持久化。
  - 通知规则开关持久化。
  - 托管 backend 进程定时刷新。
  - `127.0.0.1:8080` 端口诊断。
  - 通知历史点击定位到 TaskRun。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `cd desktop/src-tauri && cargo check`
- `cd desktop && npm run build -- --no-bundle`

### 验证结果

- 后端构建通过。
- 前端构建通过。
- Tauri Rust 侧 `cargo check` 通过。
- Tauri `--no-bundle` release build 通过，生成 `agenthub-desktop.exe`。

### 边界

- 通知点击定位当前优先支持 TaskRun；Approval / Deployment 先保留目标提示，不做复杂跨面板定位。
- 进程管理仍只管理 Tauri 启动的 backend。
- 端口诊断只是本地可达性检查，不替代完整 health endpoint。
- MSI installer bundling 仍受 WiX 下载可用性影响。

## Phase 180：Workspace UI 可见性与重叠修复

### 目标

- 修复 `/workspace` 首屏组件堆叠、横向溢出和局部可读性差的问题。
- 保持现有 IM 主路径、Artifact Inspector、消息操作、E2E 主链路不破。

### 主要变更

- 重写 `WorkspaceHeader`、`WorkspaceCollaborationToolbar`、`WorkspaceSessionSummary` 的静态中文文案和信息层级。
- 将顶部区域收敛为：会话标题、运行状态、协作启动入口、轻量会话摘要。
- 未选择 Agent 时不再展示占位 selected-agent banner，减少首屏噪音。
- 在 `workspace.css` 末尾增加 UI repair 覆盖层：
  - 修复 `workspace-main__content` 横向 flex 排布导致的超宽消息流。
  - 固定 Header / Toolbar / Summary / MessageStream 的文档流关系，避免重叠。
  - 统一参与者 pill、会话摘要、协作入口的暗色对比。
  - 优化 1292px / 1366px 宽度下三栏可见性。

### 验证方式

- `cd frontend && npm.cmd run build`
- 使用本地 Playwright / Edge 打开 `http://127.0.0.1:5173/workspace` 截图检查。
- `node scripts/e2e-browser.mjs`

### 验证结果

- 前端构建通过。
- 浏览器截图确认：无 Header / Toolbar / Summary / MessageStream 重叠；中栏无横向溢出。
- Browser E2E 全链路通过，覆盖消息触发协作、Agent 创建、附件、Context Search、Adapter fallback、Revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。

### 边界

- 本轮是 Workspace 可见性修复和信息层级收敛，不是完整视觉系统重写。
- 右侧 Artifact Inspector、Agent Builder、Preview Studio 仍沿用现有组件结构。

## Phase 181：Workspace IM 主路径收敛与真实 Adapter 验收

### 目标

- 继续修复 `/workspace` 组件堆叠、输入框不可见、信息过杂的问题。
- 保持现有功能不破，并用 API smoke、Browser E2E、真实 OpenAI-compatible provider、本机 Claude Code / Codex CLI 做验收。

### 主要变更

- `workspace.css` 增加产品化收敛覆盖层：
  - 三栏比例调整为更稳定的 IM 协作布局。
  - 顶部 Header / Toolbar / Flow Guide / Session Summary 压缩，减少重复状态信息。
  - 中栏主路径重排为 MessageStream 优先、ChatInput 紧随其后，Adapter / TaskRun / Context / Desktop / Audit 面板后置为诊断区。
  - ChatInput 的 routing preview 和附件区改为紧凑 IM 工具条，避免默认展示大表单。
  - MessageStream、ChatInput、右侧 Artifact Inspector 均约束在首屏内，避免横向溢出和组件互相覆盖。
- 修复 `AdapterArtifactQualityEvaluator` 的误杀规则：
  - 原规则只要真实 CODE Artifact 内容包含 `error:` 就判定为错误文本。
  - 新规则改为仅拦截以错误、鉴权、限流等 provider failure 开头或明显错误消息，避免误拒绝正常 React 表单代码中的 `error:` 字段。

### 验证方式

- `cd frontend && npm.cmd run build`
- `cd backend && mvn -q -DskipTests compile`
- `node scripts/smoke-test.mjs`
- `node scripts/e2e-browser.mjs`
- DeepSeek OpenAI-compatible `real-adapter-smoke-test.mjs`
- 本机 Claude Code `claude-code-smoke-test.mjs`
- 本机 Codex `codex-smoke-test.mjs`

### 验证结果

- 前端构建通过。
- 后端 compile 通过。
- API smoke 通过。
- Browser E2E 通过，覆盖聊天内创建 Agent、会话搜索/置顶/归档/恢复、附件、消息操作、消息触发协作、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- DeepSeek OpenAI-compatible 真实验证通过：
  - `OPENAI_COMPATIBLE=AVAILABLE`
  - direct execute 返回合法 Artifact JSON。
  - `REAL_FIRST` 下主产物为 `REAL_ADAPTER`。
  - build validation `PASSED`，quality score `100`。
- Claude Code 本机 CLI 真实验证通过：
  - descriptor capability 通过。
  - direct execute 返回 Artifact JSON。
  - demo task 生成 `CLAUDE_CODE / REAL_ADAPTER` Artifact。
- Codex 本机 CLI 真实验证通过：
  - descriptor capability 通过。
  - direct execute 返回 Artifact JSON。
  - demo task 生成 `CODEX / REAL_ADAPTER` Artifact。

### 边界

- 本轮没有把 Claude Code / Codex 切到 workspace-write；仍是 headless Artifact-only。
- 本轮未做全平台 token streaming、token 级持久化或多节点事件总线。
- `mvn package` 在 8080 常驻后端占用 jar 时无法执行 repackage，本轮后端改动用 `mvn compile` 和临时 `spring-boot:run` 验证。
- Browser 插件本轮连接本地页超时，渲染检查使用项目 Playwright / Edge 路径完成。

## Phase 182：Workspace IM 协作产品视觉收敛

### 目标

- 继续把 `/workspace` 从“功能面板堆叠”收敛为更清晰的 IM 协作产品。
- 解决中间消息流视觉权重不足、ChatInput 表单感、右侧 Artifact 状态块可见性差、左侧会话密度偏高的问题。

### 主要变更

- `workspace.css` 增加 IM collaboration product pass：
  - 三栏比例调整为中间消息流优先，右侧 Inspector 更轻量。
  - MessageBubble 分层为用户气泡、Agent 协议卡、REJECTION / APPROVAL 状态卡、Artifact / Deploy / Attachment 卡。
  - Message Action Bar 统一为低噪音 hover 操作区，保留复制、引用、回复、pin、memory、rerun、regenerate 等入口。
  - ChatInput 改为底部 IM composer：更大的输入区、底部工具栏、routing preview 默认压缩、hover / focus 时展开。
  - Artifact Inspector 的白色 pill / metric 块改为深色状态 badge，并用绿色 / 黄色 / 红色边框表达质量状态。
  - 左侧 Conversation / Agent card 进一步压缩，减少后台表单感。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖 Agent Builder、会话搜索 / 置顶 / 归档 / 恢复、消息操作、附件、消息触发协作、TaskRun、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- `git diff --check` 无新增空白错误，仅保留 Windows CRLF 提示。

### 边界

- 本轮只做 UI 视觉与布局收敛，不改变 Orchestrator、Adapter、Approval、Artifact、Realtime 等业务语义。
- `workspace.css` 仍是追加式覆盖层，后续若继续大规模视觉迭代，应单独做 CSS 分层整理，拆成 token / shell / message / inspector 规则。

## Phase 183：Workspace 三栏职责重排与诊断抽屉

### 目标

- 按新的工作台设计稿重排 `/workspace`，解决中间列组件重叠、ChatInput 覆盖消息流、右侧 Artifact Inspector 详情与列表混杂的问题。
- 保留现有功能入口，不改 Orchestrator、Adapter、Approval、Artifact、Context、Audit 业务链路。

### 主要变更

- `WorkspacePage` 中栏结构调整为：
  - `workspace-chat-lane`：只承载 MessageStream 和 ChatInput。
  - `workspace-diagnostics`：承载 TaskRun、Context、Adapter、Audit、Local desktop capability 等诊断面板。
- 诊断面板从主消息流同级大块堆叠改为底部诊断抽屉，避免打断 IM 协作主路径。
- 右侧 Artifact Inspector 改为单列单滚动职责：
  - Artifact detail 排在 Artifact list 前面，首屏优先展示当前产物状态。
  - 长 metadata / quality gate 文案做截断或局部滚动，避免撑爆右栏。
  - Artifact list 下沉为辅助导航。
- 左侧会话 / Agent 卡片进一步压缩，减少无关 badge 和说明文字。

### 验证方式

- 使用本地浏览器渲染检查 `http://127.0.0.1:5173/workspace`：
  - MessageStream 与 ChatInput 不重叠。
  - ChatInput 与 Diagnostics 不重叠。
  - ChatInput 完整落在 1600x900 首屏内。
  - Artifact detail 排在 Artifact list 前。
  - 主体和右栏无横向溢出。
- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖 Agent Builder、会话搜索 / 置顶 / 归档 / 恢复、消息操作、附件、消息触发协作、TaskRun、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- `git diff --check` 无新增空白错误，仅保留 Windows CRLF 提示。

### 边界

- 本轮是 Workspace 页面结构和 CSS 布局重排，不是功能新增。
- 诊断抽屉为了保留 E2E 和答辩解释能力，仍会渲染 TaskRun / Context / Adapter / Audit / Local 面板；只是从主聊天路径下沉到诊断区。
- 右侧 Artifact Inspector 仍使用现有 `ArtifactPanel` 组件，后续可继续拆分为真正的 tab 子组件。

## Phase 184：Workspace CSS 模块化拆分

### 目标

- 将 `/workspace` 的最终视觉覆盖层从单个超大 `workspace.css` 中拆出，降低后续 UI 迭代时的选择器漂移和重复覆盖风险。
- 保持当前 IM 协作主屏、诊断抽屉、Artifact Inspector 行为不变。

### 主要变更

- 新增 `frontend/src/styles/workspace/` 模块目录：
  - `tokens.css`：统一 Workspace 设计 token。
  - `shell.css`：三栏 shell、顶部信息、左侧会话 / Agent 密度。
  - `message.css`：MessageStream、协议消息卡、Action Bar、ChatInput。
  - `inspector.css`：右侧 Artifact Inspector、metric、badge、诊断块。
  - `diagnostics.css`：底部 TaskRun / Context / Adapter / Audit 诊断抽屉。
- `WorkspacePage` 按 `legacy workspace.css -> tokens -> shell -> message -> inspector -> diagnostics` 顺序导入样式。
- `workspace.css` 保留为 legacy 基础样式，移除尾部重复的 Workspace v2 覆盖块，最终覆盖规则由模块文件承载。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 使用 Playwright / Edge 检查 `http://127.0.0.1:5173/workspace`：
  - MessageStream 与 ChatInput 不重叠。
  - ChatInput 与 Diagnostics 不重叠。
  - ChatInput 完整落在 1600x900 首屏内。
  - 主体和右侧 Inspector 无横向溢出。

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖 Agent Builder、会话管理、消息操作、消息触发协作、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- 渲染指标检查通过：中栏消息流、输入框、诊断抽屉顺序布局；右侧 Inspector 无横向溢出；控制台无错误。

### 边界

- 本轮只拆分 CSS 结构，不改变业务组件、API、Orchestrator、Adapter、Artifact 或 Approval 语义。
- `workspace.css` 仍包含历史基础规则；后续可单独做 legacy CSS 瘦身，但不应和本轮模块化混在一起。

## Phase 185：Workspace 可用性收敛与折叠诊断抽屉

### 目标

- 减少 `/workspace` 首屏噪音，强化“发送任务消息 -> 确认协作 -> 多 Agent 回复”的聊天主路径。
- 将复杂诊断信息默认收进可展开抽屉，避免 TaskRun / Context / Adapter / Audit 面板挤占消息流。

### 主要变更

- `WorkspacePage` 增加诊断抽屉 tab 状态：
  - 默认只显示一行 TaskRun / Context / Adapter / Audit / Local tabs。
  - 点击 tab 后只展开对应诊断面板。
  - TaskRun / Context / Adapter / Audit 保持可见入口，Local 在窄屏作为次级入口隐藏。
- `message.css` 收敛聊天主路径：
  - MessageStream 改为明确高度的 IM feed，不再和输入框抢布局。
  - ChatInput 压缩为 IM composer，附件按钮和发送按钮固定在底部工具栏。
  - routing preview 默认只保留一行，hover / focus 后展开细节。
  - Message Action Bar 默认低噪音，hover / focus 后突出。
  - 协议消息增加 lane / protocol 视觉区分，REJECTION / APPROVAL 更清晰。
- `scripts/e2e-browser.mjs` 适配折叠诊断抽屉，验证 TaskRun / Context / Adapter / Audit 前先打开对应 tab。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 使用 Playwright / Edge 检查 `http://127.0.0.1:5173/workspace` 1600x900 首屏：
  - MessageStream 与 ChatInput 不重叠。
  - ChatInput 与 Diagnostics tabs 不重叠。
  - ChatInput 完整落在首屏内。
  - Diagnostics tabs 默认折叠且在首屏内。
  - 主体和右侧 Inspector 无横向溢出。

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖会话管理、聊天内 Agent 创建、附件、消息触发协作、TaskRun、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- 渲染指标检查通过：消息流、输入框、诊断 tabs 三段无覆盖；输入框和诊断 tabs 均在 1600x900 首屏内；控制台无错误。

### 边界

- 本轮不新增业务功能，只调整 Workspace 主路径可用性和诊断信息展开方式。
- 诊断面板没有删除，只是默认折叠，仍可用于答辩解释和 E2E 验证。
- 右侧 Artifact Inspector 仍未做折叠右栏，本轮优先解决中栏主路径和消息流噪音。

## Phase 186：Artifact Inspector 减重与 MessageStream IM 化

### 目标

- 将右侧 Artifact Inspector 从信息堆叠面板收敛为默认 Overview 的产物检查器。
- 继续强化中栏 MessageStream 的 IM 协作体验，让用户能从聊天流理解 Orchestrator、Specialist、Reviewer 的协作过程。

### 主要变更

- `ArtifactPanel` 增加右栏内部 tabs：
  - 默认展示 Overview：标题、类型、来源、质量、构建、运行、Preview。
  - Diff / Versions / Snapshots / Deploy / Audit / Related 收进对应 tab。
  - 选中新的 Artifact 后自动回到 Overview，避免首屏继续展开历史诊断信息。
- `WorkspacePage` 增加 Artifact Inspector 折叠状态：
  - 右栏可折叠为窄 rail，让中间聊天流临时扩展。
  - 右栏 body 独立为单一滚动上下文，减少组件堆叠。
- `MessageBubble` 和 `message.css` 继续 IM 化：
  - 用户消息右侧气泡化。
  - Agent 消息按 Orchestrator / Specialist / Reviewer 协议卡区分。
  - Artifact 附件卡压缩为一行摘要 + 预览 / 选择 / 下载操作。
  - REJECTION 增加“查看阻塞 / 生成 Revision / 重新评审”操作区。
- `scripts/e2e-browser.mjs` 适配右栏 tabs：
  - Apply Diff 前打开 Diff tab。
  - Restore 前打开 Snapshots tab。
  - Deploy 后打开 Deploy tab 验证部署状态卡和 Preview URL。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖 Agent Builder、会话管理、聊天内 Agent 创建、附件、消息触发协作、TaskRun、Context Search、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- `git diff --check` 无空白错误，仅有 Windows CRLF 提示。

### 边界

- 本轮不删除 Diff / Snapshot / Deploy / Audit 能力，只把它们从首屏堆叠改为右栏 tab。
- 右栏折叠是前端展示状态，不改变 Artifact、Approval、Deploy、Audit 后端语义。
- Browser plugin 在本轮环境未暴露可调用工具，UI 回归使用仓库 Playwright E2E 路径完成。

## Phase 187：ChatInput IM 化与视觉 QA 固化

### 目标

- 将 ChatInput 从表单式输入区收敛为 IM composer，同时保留附件、引用、选区修改、多 Agent 路由。
- 固化 1600x900、1536x864、1366x768 三个视口的布局指标检查，防止再次出现组件重叠和横向溢出。

### 主要变更

- `ChatInput` 重构为三段式 composer：
  - 默认主区域只展示消息输入框。
  - 引用消息、Artifact 选区、附件草稿改为紧凑 context chips。
  - 底部工具栏保留附件、@Agent、代码、路由详情 disclosure、发送按钮。
- 路由预览从大块说明卡改为工具栏内的 `路由详情` disclosure：
  - 默认只展示目标摘要。
  - 展开后显示 routing reason、目标 Agents、Adapter、capability chips。
  - 保留 `chat-routing-preview` test id，继续支持 E2E 和路由可解释。
- 附件上传主路径改为工具栏 `附件` 按钮：
  - 文件上传能力和附件草稿 chips 保留。
  - 手动附件录入不再占用默认首屏，减少表单感。
- `message.css` 增加 Composer v2 覆盖样式：
  - 控制 textarea、context chips、routing disclosure、toolbar、send button 的密度和对比度。
  - 修复窄视口下路由详情和附件 disclosure 的垂直重叠。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Browser 插件实际打开 `/workspace`，检查 ChatInput、MessageStream、Diagnostics 的首屏布局。
- 使用 Playwright Core + Edge 固定验证：
  - 1600x900
  - 1536x864
  - 1366x768

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖会话管理、聊天内 Agent 创建、附件上传、引用/回复、Artifact 选区 Revision、消息触发协作、Apply Diff、Deploy、Restore、Preview、REJECTION 恢复。
- 三视口布局指标通过：
  - `documentX=false`
  - `mainX=false`
  - `artifactBodyX=false`
  - `streamComposerOverlap=false`
  - `composerDiagnosticsOverlap=false`
  - `routingSendOverlap=false`
  - `rightOverflow=false`
- Browser 实测当前窄视口无 console error / warning，ChatInput 与消息流、诊断抽屉不重叠。

### 边界

- 本轮只做 ChatInput 交互和视觉收敛，不改变消息发送、附件上传、Orchestrator 路由或 Artifact revision 后端语义。
- 右侧 Inspector、Agent Builder、Preview Studio 不在本轮继续改造。

## Phase 188：Workspace 可用性与视觉一致性收敛

### 目标

- 继续把 `/workspace` 从信息堆叠面板收敛为 IM-first 多 Agent 协作工作台。
- 右侧 Artifact Inspector 默认只保留 Overview，复杂能力进入 tab。
- MessageStream 更接近聊天流，用户消息、Agent 协议消息、Artifact 附件卡层级更稳定。
- 左侧会话列表减少 badge 噪音，保留会话识别、未读、置顶 / 群聊核心信息。

### 主要变更

- `inspector.css` 增加 Overview 减重规则：
  - 默认隐藏 Artifact Delivery Workbench、Revision、Approval Gate、诊断长文本。
  - 保留 Artifact 标题、类型、四个信任指标和预览区。
  - Diff、版本、快照、部署、审计、关联仍通过右栏 tab 访问。
- `message.css` 继续 IM 化：
  - 用户消息更像右侧聊天气泡。
  - Orchestrator / Specialist / Reviewer 的协议卡高度、间距、badge 样式统一。
  - Artifact 消息压缩为附件式摘要卡，保留选择产物和打开 Preview 操作。
  - 修复旧 absolute toolbar 样式导致引用 chip 的“移除”按钮被路由 summary 覆盖的问题。
- `shell.css` 压缩左栏：
  - 隐藏会话列表非必要 chips。
  - 会话卡片只保留标题、摘要、时间、未读、置顶 / 群聊核心信息。
  - 会话操作按钮保持可用，但视觉权重降低。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Playwright Core + Edge 固定视口布局检查：
  - 1600x900
  - 1536x864
  - 1366x768

### 验证结果

- 前端构建通过。
- Browser E2E 通过，覆盖会话搜索 / 置顶 / 归档 / 恢复、聊天内 Agent 创建、附件上传、Message Action Bar、消息触发协作、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery。
- 三视口布局指标通过：
  - 无 document 横向滚动。
  - 无 Workspace main 横向溢出。
  - 无 Artifact body 横向溢出。
  - 无 ChatInput / Diagnostics / routing / send 按钮重叠。
  - 右侧 Inspector 未越界。

### 边界

- 本轮只调整前端展示密度和布局，不改变后端 Orchestrator、Artifact、Approval、Deploy、Context、Adapter 语义。
- Browser 插件在本轮仍未暴露可调用 JS 执行入口，实际浏览器验证使用仓库 Playwright E2E 和固定视口指标完成。

## Phase 189：Workspace 交互闭环与视觉门禁

### 目标

- 强化 REJECTION 消息的可操作闭环，避免只是红色状态。
- 让 Artifact 选区修改在 ChatInput 中明确显示 artifact 和行号范围。
- 让 Deploy intent 更像聊天内确认流，而不是引导用户去右侧手动找按钮。
- 给 Browser E2E 增加 1366px 布局指标和截图证据，防止后续再次出现组件重叠。

### 主要变更

- `MessageBubble`：
  - REJECTION 卡新增“查看阻塞项 / 生成修复 Revision / 重新评审”三段 CTA。
  - REJECTION 消息内联显示阻塞项摘要，并支持跳转定位。
  - Deploy intent 卡新增“确认产物 -> Approval Gate -> 生成 Preview URL”的流程条。
- `ChatInput`：
  - Artifact 选区 chip 从普通“选区”升级为“正在局部修改”提示。
  - 明确展示正在修改的 artifact、版本和行号范围。
- `message.css`：
  - 补充 REJECTION 操作区、阻塞项摘要、选区 chip、Deploy intent flow 的暗色 IM 样式。
- `scripts/e2e-browser.mjs`：
  - 新增 1366x768 Workspace 布局门禁。
  - 保存 `.agenthub/e2e-browser/workspace-layout-metrics-latest.json` 和 `workspace-layout-1366-latest.png`。
  - 断言无横向溢出、MessageStream / ChatInput 不重叠、ChatInput / Diagnostics 不重叠、Artifact Inspector 不越界。

### 验证方式

- `node --check scripts/e2e-browser.mjs`
- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Browser 插件打开 `http://127.0.0.1:5173/workspace` 做页面身份和可见性确认。
- `git diff --check`

### 验证结果

- E2E 完整通过，覆盖会话管理、聊天内 Agent 创建、多 Agent 消息、附件、Message Action Bar、消息触发协作、TaskRun、Context、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery。
- 1366px 布局门禁通过：
  - `horizontalOverflow=false`
  - `messageStreamChatInput=false`
  - `chatInputDiagnostics=false`
  - `artifactInspectorRight=false`
- 前端构建通过。
- `git diff --check` 无 whitespace error，仅 Windows CRLF 提示。

### 边界

- 本轮只做前端交互闭环和质量门禁，不改变后端部署、审批、Revision、Reviewer 评审语义。
- Browser E2E 的截图和布局 JSON 是本地 QA 证据，不作为业务数据。

## Phase 190：Workspace 首屏减负与 IM 主路径收敛

### 目标

- 让 Workspace 首屏回到“会话 -> 消息 -> 输入”的 IM 主路径。
- 压缩顶部协作建议、底部诊断条和左侧会话卡片，避免 1366x768 下出现组件堆叠。
- 右侧 Artifact Inspector 默认保持 Overview，不让 Diff / Snapshot / Deploy / Audit 抢占首屏。
- 消息流继续产品化：用户消息更像 IM 气泡，Agent / Artifact / Deploy / REJECTION 作为协作消息和附件卡呈现。

### 主要变更

- `shell.css`：
  - 调整 Workspace 三栏比例，中栏继续作为主视觉中心。
  - 压缩 header、协作 toolbar、flow guide、左侧会话卡片。
  - 1366px 下隐藏中栏 session summary，避免挤压消息流和输入区。
- `message.css`：
  - 增大 MessageStream 可用高度。
  - 压缩消息卡、协议卡、Artifact 附件卡和 streaming strip。
  - Action Bar 默认低可见但保持可点击，hover / focus 后完整显示。
  - 修复引用 / 回复 chip 与 ChatInput textarea 的点击覆盖问题。
- `inspector.css`：
  - 右栏继续作为轻量 Artifact Inspector。
  - 保留 Overview / Diff / 版本 / 快照 / 部署核心 tabs；窄屏只收起低优先级详情。
  - 指标卡、preview dock、操作按钮进一步压缩。
- `diagnostics.css`：
  - 诊断抽屉默认压成一行 tabs，只有点击 TaskRun / Context / Adapter / Audit / Local 才展开。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Browser / Playwright 1366x768 布局截图：
  - `.agenthub/e2e-browser/workspace-layout-1366-latest.png`
  - `.agenthub/e2e-browser/workspace-layout-metrics-latest.json`

### 验证结果

- 前端构建通过。
- Browser E2E 完整通过。
- 1366px Workspace 布局门禁通过：
  - 无横向滚动。
  - MessageStream / ChatInput 不重叠。
  - ChatInput / Diagnostics 不重叠。
  - Artifact Inspector 不越界。
- E2E 覆盖仍包含会话搜索 / 置顶 / 归档 / 恢复、聊天内 Agent 创建、附件、Message Action Bar、消息触发协作、TaskRun、Context、Adapter fallback、Artifact revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery。

### 边界

- 本轮只做 Workspace 前端可用性和视觉收敛，不改变后端 Orchestrator、Artifact、Approval、Deploy、Context、Adapter 语义。
- 右侧 Inspector 仍保留完整功能入口，只是默认隐藏低优先级详情。

## Phase 191：Workspace 组件系统清理与布局保护

### 目标

- 继续把 Workspace 从单体样式和超大组件中拆出来，降低后续 UI 回归风险。
- 保留模块化样式入口，减少旧 `workspace.css` 对新布局的覆盖。
- 建立更稳定的组件 token，为 badge / button / card / metric / tab 后续统一做准备。

### 主要变更

- 新增 `WorkspaceDiagnosticsDrawer`：
  - 从 `WorkspacePage` 拆出底部 TaskRun / Context / Adapter / Audit / Local 诊断抽屉壳层。
  - `WorkspacePage` 只负责传入 sections 和 active panel 状态。
- 新增 `ArtifactInspectorTabs`：
  - 从 `ArtifactPanel` 拆出右侧 Inspector tab 渲染逻辑。
  - 保持原有 tab key、计数和 `data-testid` 不变，避免破坏 E2E。
- `workspace.css`：
  - 删除顶部旧三栏布局规则和浅色 streaming 状态规则，避免与模块化文件冲突。
- `tokens.css`：
  - 增加 card / badge / button / tab / status 背景 token。
- `layout-guard.css`：
  - 新增最终三栏布局保护文件，并在 Workspace imports 最后加载。
  - 修复旧 `workspace.css` 响应式规则把 1366px Workspace 打成单列的问题。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Browser / Playwright 1366x768 截图：
  - `.agenthub/e2e-browser/workspace-layout-1366-latest.png`

### 验证结果

- 前端构建通过。
- Browser E2E 完整通过。
- 1366px 布局截图确认恢复三栏：
  - 左栏会话。
  - 中栏消息流 / 输入框。
  - 右栏 Artifact Inspector。
- 布局门禁继续通过：无横向滚动、无 MessageStream / ChatInput / Diagnostics 重叠、右侧 Inspector 不越界。

### 边界

- 本轮没有重写业务组件逻辑，只拆壳层和 tab 渲染。
- 旧 `workspace.css` 仍未完全清空，后续应逐段迁移到模块化文件，而不是一次性删除。

## Phase 192：Workspace 基础组件样式迁移

### 目标

- 继续逐段迁移旧 `workspace.css`，避免一次性删除造成大面积回归。
- 先处理高频基础样式：button、badge、card、tab。
- 让后续新增 UI 优先复用模块化样式，而不是继续写临时 one-off 规则。

### 主要变更

- 新增 `frontend/src/styles/workspace/components.css`：
  - 统一 `primary-button` / `secondary-button` / `ghost-button` / `message-action-button` / `conversation-action-button` 等按钮基础样式。
  - 统一 `status-pill` / `adapter-health-pill` / `message-protocol-pill` / `artifact-*badge` / `version-badge` / `revision-badge` 等 badge 基础样式。
  - 统一 `conversation-item` / `agent-item` / `artifact-card` / `adapter-routing-card` / metric card 等卡片基础样式。
  - 统一 `conversation-filter-tab` / `artifact-inspector-tabs__item` tab 基础样式。
- `WorkspacePage` 引入 `components.css`，加载顺序为：
  - legacy `workspace.css`
  - `tokens.css`
  - `components.css`
  - feature modules
  - `layout-guard.css`
- 从旧 `workspace.css` 顶部删除第一段按钮和基础卡片定义，减少浅色后台样式对当前暗色 IM 工作台的干扰。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Browser / Playwright 1366x768 截图：
  - `.agenthub/e2e-browser/workspace-layout-1366-latest.png`

### 验证结果

- 前端构建通过。
- Browser E2E 完整通过。
- 1366px 布局门禁通过，三栏保持稳定。

### 边界

- 旧 `workspace.css` 中仍有多段历史重复样式，后续继续按模块逐段迁移。
- 本轮不改变业务 JSX 和后端语义，只迁移基础视觉 primitives。

## Phase 193：Adapter 诊断样式迁移与 Workspace 展示壳拆分

### 目标

- 继续逐段迁移旧 `workspace.css`，优先处理会污染暗色 IM 工作台的 adapter-routing / adapter-quality 样式。
- 拆分 Workspace 大组件中的稳定展示壳，降低后续 UI 回归风险。
- 保持 `/workspace` 主路径、Artifact Inspector、Browser E2E 和 1366px 布局门禁不破。

### 主要变更

- `diagnostics.css`：
  - 接管 `adapter-routing-panel` / `adapter-quality-dashboard` / `adapter-quality-table` / `adapter-routing-table` 等诊断面板样式。
  - 将浅色表格、白色 chip、后台卡片感改成暗色诊断抽屉风格。
- `workspace.css`：
  - 删除文件头旧 adapter routing / quality 浅色样式块，减少 legacy 覆盖。
- 新增 `WorkspaceSidebar`：
  - 从 `WorkspacePage` 拆出左栏会话列表和 Agent 联系人展示。
  - 保留会话搜索、置顶、归档、恢复、Agent 选择等回调。
- 新增 `WorkspaceArtifactInspectorShell`：
  - 从 `WorkspacePage` 拆出右侧 Artifact Inspector shell 和折叠按钮。
  - `WorkspacePage` 只负责传入 `ArtifactPanel` 和折叠状态。
- 新增 `ArtifactInspectorMetrics`：
  - 从 `ArtifactPanel` 拆出 Source / Quality / Build / Run 四个指标卡渲染。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`

### 验证结果

- 前端构建通过。
- Browser E2E 完整通过。
- 1366px Workspace 布局门禁通过：无横向滚动、无中栏/右栏重叠。

### 边界

- 本轮没有改变 API、Orchestrator、Approval、Artifact mutation 或 Adapter 业务语义。
- `ArtifactInspectorMeta` 和 `ArtifactScaffoldEmptyState` 尚未拆出；旧文件中部分 scaffold 文案存在编码显示问题，后续应先处理编码再迁移，避免误删 JSX。

## Phase 194：Artifact Inspector 浅色残留与堆叠修复

### 目标

- 修复右侧 Artifact Inspector 中仍出现的浅色背景块。
- 降低 Overview 首屏组件堆叠，确保右栏只作为轻量产物检查器。

### 主要变更

- `inspector.css`：
  - 禁用 legacy `artifact-preview__meta::before` / `quality-gate-action::before` 伪元素，避免旧蓝色侧边条和浅色块穿透右栏。
  - 将 `artifact-preview`、`artifact-cockpit`、`artifact-delivery-workbench`、badge、diff、snapshot、deploy、approval 等右栏 surface 统一覆盖为暗色。
  - 取消右栏 tabs 的 sticky 行为，避免 tab 在单滚动容器内压住 meta 内容。
  - Overview 默认隐藏重复的 `artifact-cockpit` / delivery workbench，只保留标题、四个 trust metrics 和 Preview。
  - 覆盖 `artifact-preview__actions` 容器旧白底，消除“复制内容 / 下载文件”外层白色 pill。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 查看 `.agenthub/e2e-browser/workspace-layout-1366-latest.png`

### 验证结果

- 前端构建通过。
- Browser E2E 完整通过。
- 1366px 布局门禁通过。
- 截图确认右侧 Inspector 不再出现明显浅色 action 容器或重复 cockpit 堆叠。

### 边界

- 本轮只做 Workspace 右栏 UI 修复，不改变 Artifact、Approval、Deploy、Preview 的业务链路。
## Phase 194：Artifact Inspector 右栏浅色残留与堆叠修复

### 目标

- 修复右侧 Artifact Inspector 中旧浅色框、白色 action 容器和 cockpit 重复堆叠问题。
- 保持右栏作为轻量产物检查器，Overview 只展示标题、指标、Preview 和核心操作。

### 主要变更

- `inspector.css` 增加 right-rail hardening 覆盖层，统一右栏 surface / card / badge / action 的暗色样式。
- 禁用 legacy `workspace.css` 中影响右栏的 `artifact-preview__meta::before`、quality gate pseudo rail 等伪元素。
- 取消右栏 tab sticky 覆盖，避免滚动时压住 meta / preview 内容。
- Overview 隐藏重复 `artifact-cockpit`，避免与上方指标卡重复堆叠。
- 覆盖 `artifact-preview__actions` 的旧浅色容器和浅色按钮样式。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 查看 `.agenthub/e2e-browser/workspace-layout-1366-latest.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 通过。
- 1366px layout gate 通过。
- 右栏无浅色 action 容器，无 cockpit 重复堆叠。

## Phase 195：Workspace 可用性减负与中栏拆分

### 目标

- 让 Workspace 首屏继续向“会话 -> 消息流 -> IM 输入框”收敛。
- 减少中栏诊断和输入区对消息流的挤占。
- 继续把旧 `workspace.css` 高频样式迁移到模块化 CSS，降低浅色残留和 `!important` 回归风险。

### 主要变更

- 新增 `WorkspaceChatLane`，将中栏的 MessageStream、ChatInput、Diagnostics Drawer 作为明确区域承载，降低 `WorkspacePage` 布局膨胀。
- `message.css` 追加可用性收敛层：
  - MessageStream 继续作为主视觉中心。
  - ChatInput 默认更紧凑。
  - Message Action Bar 默认收起，仅 hover / focus 展开。
- `diagnostics.css` 压缩默认诊断抽屉高度，展开后仍保留 TaskRun / Context / Adapter / Audit / Local 能力。
- `components.css` 迁移 conversation / adapter / artifact 高频基础样式，统一暗色输入、badge、表格和状态单元。
- `inspector.css` 继续减重右侧 Artifact Inspector，同时修复过度隐藏 Artifact 列表导致 CODE Artifact 不可选择的问题。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`
- 查看 `.agenthub/e2e-browser/workspace-layout-metrics-latest.json`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366px layout gate 通过：无横向溢出，无 MessageStream / ChatInput / Diagnostics / Artifact Inspector 重叠。
- E2E 覆盖 Artifact 选择、Revision、Apply Diff、Deploy、Restore、REJECTION recovery 和 Preview。

## Phase 196：MessageStream IM 化与三视口视觉门禁

### 目标

- 继续把中栏消息流从“后台面板堆叠”收敛为 IM 协作流。
- 让用户消息、Orchestrator、Specialist、Reviewer 有稳定可辨识的消息模板。
- 固化 1366x768、1536x864、1600x900 三个视口的布局回归检查。

### 主要变更

- `MessageBubble` 增加 Reviewer lane 与 protocol class，支持 Orchestrator / Specialist / Reviewer 的固定视觉模板。
- `message.css` 增加 IM collaboration polish：
  - 用户消息右侧气泡化。
  - Orchestrator 使用规划卡视觉。
  - Specialist 使用结果卡视觉。
  - Reviewer / APPROVAL / REJECTION 使用评审与阻塞状态视觉。
  - Message Action Bar 默认收起，hover / focus 后出现。
  - Artifact / Deploy 继续以消息附件或状态卡呈现。
- 修复 hover-only Action Bar 与 E2E 点击模型的冲突，测试会先 hover 再执行消息操作。
- `workspace.css` 增加最终布局门禁覆盖，强制中栏采用“消息流 + 输入框 + 诊断条”的非重叠布局。
- `scripts/e2e-browser.mjs` 扩展 Workspace visual layout gate：
  - 1366x768
  - 1536x864
  - 1600x900
  - 每个视口保存 metrics 与 screenshot。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 三个视口布局门禁均通过：无横向溢出、无 MessageStream / ChatInput / Diagnostics / Artifact Inspector 重叠。
- `git diff --check` 通过，仅有 Windows CRLF 提示。

## Phase 197：扣子式低噪声 Workspace 设计收敛

### 目标

- 借鉴扣子类 Agent 工作台的低门槛表达：能力分组、任务启动清晰、右侧 Inspector 降噪。
- 保留 AgentHub 暗色 IM 协作控制台风格，不复制外部品牌，不移除既有功能。
- 继续解决组件堆叠、浅色残留、右侧信息过重和协作建议卡可读性问题。

### 主要变更

- 通过 Creative Production style intake 固化本轮方向：三栏但中栏优先、深色低噪声、发送消息后确认协作、右侧 Inspector 降噪。
- `workspace.css` 追加 Coze-inspired product pass：
  - Workspace shell 改为更轻的深色低噪声背景。
  - Header / Collaboration toolbar / Flow guide 降低视觉权重。
  - MessageStream 增加 sticky section title 和更柔和的 feed 背景。
  - 协作建议卡改为更像任务启动卡，任务摘要横跨两列并采用两行截断。
  - 会话操作不再 display none，改为低透明度，避免破坏搜索 / 置顶 / 归档 / 恢复 E2E。
  - Artifact Inspector badge、tabs、metrics、preview dock 统一暗色底和状态色边框，避免白色 pill 和浅色框回流。
- `ArtifactPanel` 移除遗留 duplicated inspector tabs，只保留当前统一 `ArtifactInspectorTabs`。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`
- 查看 `.agenthub/e2e-browser/workspace-layout-1366x768.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 会话搜索 / 置顶 / 归档 / 恢复、消息触发协作、Artifact Revision、Deploy、Restore、REJECTION recovery 等主链路均未破坏。
- `git diff --check` 通过，仅有 Windows CRLF 提示。

## Phase 198：Workspace 扁平化 UI 重设计

### 目标

- 在满足课题功能要求的前提下，将 Workspace 从高装饰深色控制台调整为更扁平、低噪声、可读性更稳定的 IM 协作界面。
- 保留三栏结构、消息触发协作、Artifact Inspector、Approval / Deploy / Restore、Context / Adapter / Audit 等既有功能。
- 避免组件重叠、浅色 pill 回流和过重阴影导致的视觉杂乱。

### 主要变更

- `workspace.css` 新增 flat workspace token：
  - `--flat-bg`
  - `--flat-shell`
  - `--flat-panel`
  - `--flat-line`
  - `--flat-blue / green / red / yellow`
- 统一 Workspace shell、MessageStream、ChatInput、Artifact Inspector 的扁平背景、边框和文字层级。
- 移除主要区域的大面积渐变、阴影和伪立体效果，改为 flat dark surface + 状态色边框。
- 统一按钮、badge、conversation item、message card、artifact metric card 的暗色样式。
- 保留用户消息、Orchestrator、Specialist、Reviewer 的角色区分，但降低卡片装饰强度。
- 右侧 Artifact Inspector 继续保持 Overview 优先，Diff / Snapshot / Deploy / Audit 仍由 tab 承载。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`
- 查看 `.agenthub/e2e-browser/workspace-layout-1366x768.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 会话管理、聊天内创建 Agent、消息触发协作、附件、Artifact Revision、Apply Diff、Deploy、Restore、REJECTION recovery、Preview 主链路均未破坏。
- `git diff --check` 通过，仅有 Windows CRLF 提示。

## Phase 199：Coze 风格浅色 Workspace 复刻与布局门禁修复

### 目标

- 按扣子类 IM Agent 产品的浅色、低噪声、扁平化方向重构 Workspace 视觉表达。
- 保留 AgentHub 三栏功能：左侧会话与 Agent 联系人，中栏 IM 协作消息流，右侧 Artifact Inspector。
- 修复 1366 / 1536 / 1600 视口下的组件重叠、Artifact Inspector 溢出、旧深色样式回流和可见性问题。

### 主要变更

- 新增 `frontend/src/styles/workspace/coze-light.css` 作为最后导入的浅色主题覆盖层，不删除既有业务样式。
- 将 Workspace shell、顶部栏、会话列表、MessageStream、ChatInput、Artifact Inspector 切换为浅色 IM 协作界面。
- 修复 `AppLayout` 与 `WorkspaceHeader` 的中文展示问题，替换遗留乱码文案。
- 右侧 Artifact Inspector 收敛为固定宽度浅色检查器，并压制旧深色 Artifact list / preview 背景外露。
- 1366 窄屏下隐藏会话状态摘要并压缩输入区，把首屏高度还给消息流。
- Message Action Bar、message type ribbon、Artifact badge 统一为浅色 badge / button，不再混用旧暗色块。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`
- 查看 `.agenthub/e2e-browser/workspace-layout-1366x768.png`
- 查看 `.agenthub/e2e-browser/workspace-layout-1536x864.png`
- 查看 `.agenthub/e2e-browser/workspace-layout-1600x900.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 会话搜索 / 置顶 / 归档 / 恢复、聊天内创建 Agent、消息触发协作、附件、消息操作、TaskRun、Context Search、Adapter fallback、Artifact Revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery 主链路均未破坏。
- `git diff --check` 通过，仅有 Windows CRLF 提示。

## Phase 200：Coze 结构复刻与 IM 首屏减负

### 目标

- 继续按扣子类浅色 IM 产品结构重构 Workspace，而不是仅做颜色替换。
- 将旧的顶部工作台导航改为左侧窄图标 rail，让中栏聊天画布成为视觉中心。
- 压缩 TaskRun / Context / Adapter / Audit 诊断入口，避免首屏像后台面板堆叠。
- 修复输入区、Artifact Inspector 和消息操作中的深色残留、乱码与层叠点击问题。

### 主要变更

- `AppLayout` 在 Workspace 路由下通过浅色主题覆盖为左侧 60px 应用 rail，隐藏旧顶部 mission/status/window 控制信息。
- `Workspace` 布局改为左侧会话列表、宽中栏 IM 画布、轻量右侧 Artifact Inspector。
- `workspace-flow-guide` 保留给 E2E 和主路径语义，但视觉压缩为细分隔线，不再占用首屏。
- `ChatInput` 可见中文文案修复，并统一为 Coze 式浮动 IM composer。
- Message Action Bar 改为低透明常驻、hover 高亮的静态区域，修复 E2E 点击时被 MessageStream 拦截的问题。
- 右侧 Artifact Inspector、Artifact list、diagnostics tabs、composer route chips 统一为浅色扁平样式。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Chrome 插件打开 `http://127.0.0.1:5173/workspace` 进行当前视口截图核对。

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 会话管理、聊天内创建 Agent、消息触发协作、附件、消息操作、TaskRun、Context Search、Adapter fallback、Artifact Revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery 主链路均未破坏。
- Chrome 扩展可连接，已在真实 Chrome 中打开本地 Workspace 并完成截图核对。

## Phase 201：Coze 浅色左栏与 Composer 可用性精修

### 目标

- 修复左侧会话栏搜索、筛选和会话卡片的可见度问题。
- 修复中下 ChatInput / 引用 chip / 诊断 tabs 的层叠和点击冲突。
- 继续保持 Coze 类浅色 IM 视觉，不回退到深色 command center。

### 主要变更

- 修复 `WorkspaceSidebar`、`ConversationList`、`ChatInput` 中残留的可见乱码文案。
- 左侧会话列表改为更轻的浅色搜索框、四段筛选 pills、低噪声状态 chips 和更清晰的未读 badge。
- 会话卡片压缩为头像、标题、摘要、时间、未读、置顶/归档操作，减少多余 badge 对首屏的占用。
- ChatInput 明确分成 context chips、textarea、toolbar 三段，避免引用 / 回复 / 附件 chip 被 textarea 覆盖。
- 诊断入口继续保持一行 tabs，只有展开后展示 TaskRun / Context / Adapter / Audit / Local 详情。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- Chrome 插件打开 `http://127.0.0.1:5173/workspace`，检查控制台和布局指标。

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 三视口 layout gate 均通过。
- Chrome 控制台无 error / warn。
- DOM 布局指标显示左栏搜索、会话卡、消息流、ChatInput、诊断条无重叠。

## Phase 202：Coze 中栏与 Artifact Inspector 可用性收敛

### 目标

- 继续按扣子类浅色 IM 产品结构优化 Workspace 中栏和右侧栏。
- 修复中栏协作卡 / 消息流 / ChatInput 的重叠与可操作性问题。
- 将右侧 Artifact Inspector 降噪为轻量产物检查器，避免双列挤压和旧深色样式残留。

### 主要变更

- `workspace-main` 从旧 grid 自动行切换为纵向 flex，修复协作建议卡与消息流重叠。
- 中栏消息流、协作建议卡、flow guide、ChatInput 统一限制到约 800px 居中宽度，贴近扣子对话画布。
- `message-row` 与 `message-bubble` 同步居中宽度并增加 scroll margin / scroll padding，避免 sticky header、输入框、诊断抽屉遮挡消息操作。
- 右侧 `ArtifactPanel` 强制单列布局，修复旧双列导致 detail 区过窄的问题。
- Artifact Inspector 改为浅色 drawer：tabs、metric card、preview dock、badge 均收敛为低噪声浅色样式。
- Flow guide 降噪为细分隔提示，ChatInput 高度继续压缩，并为底部诊断 tabs 留出间距，避免 1600x900 首屏出现裁切和拥挤。
- 右侧 Artifact Inspector 增加拖拽调整宽度能力，中栏通过 CSS grid 变量自动适配剩余空间。
- 继续清理浅色 Coze UI 下的深色残留：左栏搜索容器、右栏 metric / preview / cockpit / code 区统一为浅色 surface。
- Browser E2E 改为按钮级消息再生成交互，并在 TaskRun / Context 诊断验证后自动折叠抽屉，符合“诊断临时查看、不遮挡聊天”的产品语义。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node --check scripts/e2e-browser.mjs`
- `node scripts/e2e-browser.mjs`

### 验证结果

- Frontend build 通过。
- `node --check scripts/e2e-browser.mjs` 通过。
- Browser E2E 完整通过，新增覆盖 Workspace 弹窗创建自定义 Agent、联系人刷新、@Agent 多 Agent 消息、TaskRun / TaskStep 路由验证。
- 旧 `/agents` 页面仍作为高级配置 / Adapter 测试入口保留，不再是自建 Agent 的默认主路径。
- Chrome 打开 `http://127.0.0.1:5173/workspace` 检查 title、console 和布局指标。
- Chrome/Playwright Core 检查右侧 Inspector 拖拽宽度与中栏自适应。

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- Chrome 控制台无 error / warn。
- Chrome/Playwright Core 检查显示：页面、搜索框、主栏、右栏均为浅色背景；右栏拖拽从 340px 增加到 417px 后，中栏从 928px 自适应到 851px。
- 会话管理、聊天内创建 Agent、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、Adapter fallback、Artifact Revision、Apply Diff、Deploy、Restore、Preview、REJECTION recovery 主链路均未破坏。

## Phase 203：Workspace 中栏与产物工作台扁平化收敛

### 目标

- 继续优化 Workspace 中间聊天栏和右侧产物工作台，减少组件堆叠、深色残留和信息噪音。
- 修复右侧 Artifact Inspector 在窄栏宽度下列表与详情互相覆盖、点击被拦截的问题。
- 保持现有 IM 主链路、Artifact Revision、Apply Diff、Deploy、Restore 和 Preview 功能不破。

### 主要变更

- `WorkspaceCollaborationToolbar` 清理可见中文乱码，协作入口文案收敛为“发送任务消息 -> 确认启动 -> 多 Agent 回复”的主路径说明。
- 中栏消息流继续扁平化：消息宽度居中、用户消息更接近 IM 气泡，协作确认卡和 ChatInput 降低表单感。
- 右侧 Artifact Inspector 强制单列布局：artifact 列表固定在详情上方，详情区从列表下方开始，避免旧双列和旧 `order` 样式导致覆盖。
- 产物预览和代码块限制在自身滚动容器内，禁止横向溢出和 pointer event 透明遮罩拦截。
- 右栏按钮、badge、metric card 改为浅色扁平样式，去掉大面积深色背景和白色 pill 的割裂感。
- 保留右侧拖拽宽度能力，中栏可随右栏宽度动态自适应。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node --check scripts/e2e-browser.mjs`
- `node scripts/e2e-browser.mjs`
- 检查 `.agenthub/e2e-browser/workspace-layout-1366x768.png`
- 检查 `.agenthub/e2e-browser/workspace-layout-1600x900.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- E2E 覆盖：会话搜索/置顶/归档/恢复、聊天内创建 Agent、消息触发协作、附件、消息操作、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- 修复了右侧 artifact 详情覆盖 artifact 卡片、artifact 列表覆盖“编辑内容”按钮的交互问题。

## Phase 204：Coze 式新建 Agent 入口与 Agent Builder 浅色化

### 目标

- 让 Workspace 左侧全局加号具备 Coze 式“新建”浮层，而不是直接跳转或隐藏在复杂页面中。
- 在 Workspace 内点击“新建 Agent”后展示“接入本地 Agent”轻量弹窗，再进入 Agent Builder。
- 将 Agent Builder 视觉同步到当前浅色 IM 工作台风格，避免和 Workspace 形成两套产品语言。

### 主要变更

- `AppLayout` 增加全局新建按钮、Coze 式新建菜单、本地 Agent 接入弹窗。
- 新建菜单包含新建项目、新建编程项目、新建视频项目和新建 Agent，其中新建 Agent 进入本地 Agent 接入流程。
- 本地 Agent 弹窗展示三步状态、连接命令、复制命令、执行提示和“我已执行”入口。
- Agent Builder 改为浅色三栏工作台：左侧 Agent / Adapter 导航，中间对话式创建流程，右侧 Agent 接入 Inspector。
- Browser E2E 的自建 Agent 流程改为先从 Workspace 新建菜单进入，确认新入口可用。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`

## Phase 205：Workspace 内自建 Agent 弹窗主路径

### 目标

- 将 `/agents` 的核心自建 Agent 能力前移到 Workspace 左侧 `+` 弹窗。
- 新用户不离开工作台即可完成：新建 Agent -> 描述需求 -> 生成草案 -> 选择能力 / Adapter -> 确认创建 -> 联系人列表可见 -> 聊天中 @ 使用。
- 保留“接入本地 Agent”三步流程，但与“创建自定义 Agent”分成独立入口。

### 主要变更

- 新增 `AgentCreateDialog`，提供“创建自定义 Agent”和“接入本地 Agent”两条轻量路径。
- `AppLayout` 的全局新建菜单只保留课题核心入口，隐藏项目 / 视频 / 编程项目等非当前主路径。
- Workspace 监听 `agenthub:agent-created` 事件，创建成功后立即刷新 Agent 联系人并选中新 Agent。
- Browser E2E 自建 Agent 流程切换为 Workspace 弹窗路径，不再依赖 `/agents` 页面作为主路径。
- 新弹窗复用现有 `draftAgentFromNaturalLanguage`、`createAgent`、Tool Capability、preferredAdapter 和 MOCK fallback。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node --check scripts/e2e-browser.mjs`
- `node scripts/e2e-browser.mjs`

## Phase 206：Workspace Product Design Brief UI 收敛

### 目标

- 根据 Product Design brief 将 Workspace 从深色控制台残留继续收敛为浅色、扁平、轻量的 IM 协作产品界面。
- 保持中栏作为主视觉中心，只突出协作建议、消息流和 IM 输入框。
- 降低右侧 Artifact Inspector 信息负担，默认聚焦 Overview，复杂信息继续由 tabs / 折叠区承载。
- 不新增功能，不破坏会话、消息触发协作、自建 Agent、Artifact、Approval、Deploy、Restore、REJECTION recovery 等主链路。

### 主要变更

- `coze-light.css` 增加 Product Design brief 覆盖层，统一浅色背景、surface、border、badge、button、message、composer、inspector、dialog 的视觉规则。
- Workspace 顶部和协作说明继续减重，减少装饰信息，突出会话标题、运行状态和参与 Agent。
- MessageStream 进一步 IM 化：用户消息右侧气泡化，Agent / protocol 消息减少后台面板感，Action Bar 默认隐藏并在 hover / focus 时出现。
- ChatInput 改为更轻量的 composer：输入框、附件、`@Agent`、发送为默认主路径；引用、选区、附件草稿、路由详情使用 chip / disclosure 表达。
- Artifact Inspector 改为浅色单一滚动上下文，Overview 指标卡更紧凑，Preview / 下载等操作保留但降低视觉噪音。
- Agent 创建弹窗同步浅色扁平风格，减少表单和大面板感。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 检查 `.agenthub/e2e-browser/workspace-layout-1366x768.png`
- 检查 `.agenthub/e2e-browser/workspace-layout-1600x900.png`
- `git diff --check`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- E2E 覆盖：Workspace 弹窗创建 Agent、会话搜索/置顶/归档/恢复、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- `git diff --check` 通过，仅提示 Windows CRLF 转换。

## Phase 207：Workspace UI 深度优化与 IM 主路径减负

### 目标

- 执行 UI 深度优化计划，把 Workspace 继续从“功能堆叠可用”收敛为“轻量、清晰、稳定的 IM 多 Agent 协作产品”。
- 不新增业务功能，只优化信息层级、消息视觉、Composer、Artifact Inspector、左栏会话密度和 Agent 创建弹窗。
- 保持现有 Orchestrator、Artifact、Approval、Deploy、Context、Adapter fallback 和 E2E 主链路不破。

### 主要变更

- ChatInput 移除重复的“选择文件”按钮，保留“附件”作为唯一文件入口，降低 composer 噪音。
- `coze-light.css` 追加 Phase 207 收敛层，统一浅色扁平 token，并减少旧深色样式和白色 pill 回流。
- 中栏首屏继续减负：协作建议、流程条、消息流和输入框宽度统一，诊断条保持默认压缩。
- MessageStream 继续 IM 化：用户消息右侧气泡、Agent 消息使用轻量协议卡，Action Bar 默认隐藏并在 hover / focus 时显示。
- Artifact Inspector 继续减重：右栏默认 Overview 更紧凑，metric card、tabs、preview、下载按钮保持浅色一体化。
- 左栏会话卡压缩，只保留 IM 会话必要信息，减少多余 chip 和按钮露出。
- Agent 创建弹窗同步浅色扁平样式，减少大表单和重面板感。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 检查 `.agenthub/e2e-browser/workspace-layout-1366x768.png`
- 检查 `.agenthub/e2e-browser/workspace-layout-1536x864.png`
- 检查 `.agenthub/e2e-browser/workspace-layout-1600x900.png`
- `git diff --check`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 截图人工复查未见横向溢出、组件重叠、输入框遮挡或右栏明显溢出。
- E2E 覆盖：Workspace 弹窗创建 Agent、会话搜索/置顶/归档/恢复、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- Chrome 插件运行时未暴露预期 tabs/user 控制 API，本轮使用仓库 Playwright Browser E2E 作为渲染验证依据。

## Phase 208：Workspace 高频样式模块迁移与布局守卫修复

### 目标

- 继续将 Workspace 高频样式从 `coze-light.css` 迁移到模块化 CSS，减少旧样式层对新 UI 的污染。
- 优先迁移 MessageStream、ChatInput、Artifact Inspector、Conversation / Agent list、共享 badge / button / card / tab 样式。
- 修复 1366px 视口下右侧 Artifact Inspector 固定宽度导致的视觉 layout gate 失败。

### 主要变更

- 调整 Workspace CSS import 顺序，让 `coze-light.css` 作为浅色主题兼容层，`components.css`、`message.css`、`inspector.css` 和 `layout-guard.css` 作为最终组件层。
- 将消息流、协议卡、Action Bar、Artifact / Deploy 附件卡、ChatInput composer 等高频规则迁入 `message.css`。
- 将 Artifact Inspector header/body、Artifact list、overview metrics、preview dock、操作按钮和窄屏规则迁入 `inspector.css`。
- 将会话卡、Agent 联系人、过滤器、共享 chip / badge / button / adapter metric 样式迁入 `components.css`。
- 删除 `coze-light.css` 中已迁移的重复 message / composer / conversation / artifact final block，避免后续继续叠加临时 one-off 样式。
- 在 `WorkspacePage.tsx` 增加右侧 Inspector 宽度的 viewport clamp，避免 React inline CSS 变量和响应式 CSS 互相覆盖。
- 在 `layout-guard.css` 补齐 1600 / 1536 / 1368 断点下 `.workspace-artifacts` 自身宽度守卫，修复 1366px 下右栏右边界溢出。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- `git diff --check`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- 最新 1366x768 metrics：documentWidth=1366，artifactInspector width=278，right=1366，horizontalOverflow=false，artifactInspectorRight=false。
- `git diff --check` 通过，仅提示 Windows CRLF 转换。
- `coze-light.css` 的 `!important` 保持在 2056；新增高频样式进入模块文件，旧层仍需后续逐组迁移清理。

## Phase 209：Workspace 三层体验与 IM 主路径可用性收敛

### 目标

- 按“左栏找会话 / 找 Agent，中栏聊天协作主路径，右栏当前产物 Inspector”的三层体验继续收敛 Workspace。
- 减少首屏解释、面板堆叠和重复状态；复杂信息默认折叠，保留完整功能入口。
- 保持会话管理、消息操作、Agent 创建、Artifact、Approval、Deploy、Restore、Context 和 E2E 主链路不破。

### 主要变更

- ChatInput 继续简化为 IM composer：默认只保留附件、`@Agent`、路由详情 disclosure 和发送按钮，移除重复的代码插入入口。
- MessageStream 继续 IM 化：用户消息右侧气泡，Orchestrator / Specialist / Reviewer 保持角色化协议卡，Artifact / Deploy / Attachment 作为紧凑附件卡展示。
- Message Action Bar 默认收起，hover / focus 时展开，保留复制、引用、回复、Pin、记忆、重跑 / 重新生成能力。
- Artifact Inspector 继续减重：右栏默认 Overview，Artifact 列表、metric、preview dock、操作按钮和 tab 内容更紧凑。
- 左栏会话和 Agent 联系人进一步压缩：会话卡只保留标题、类型摘要、时间、未读和必要操作；Agent 联系人保留头像、名称、状态和少量能力标签。
- 修复会话卡压缩导致的 `restore` 按钮点击被主会话按钮覆盖问题，操作区改为独立点击层。
- 修复 ChatInput 仍残留深色 composer 的视觉问题，统一为浅色扁平输入区，并提高路由详情 chip 文本对比度。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 人工检查 `.agenthub/e2e-browser/workspace-layout-1366x768.png`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- E2E 覆盖：Workspace 弹窗创建 Agent、会话搜索/置顶/归档/恢复、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- 首次 E2E 发现会话 restore 按钮被压缩布局覆盖；已修复后重跑通过。

## Phase 210：P4 CSS 清理与 Artifact Inspector 模块接管

### 目标

- 继续把旧 `coze-light.css` / `workspace.css` 中的高频旧样式迁移到模块化 CSS。
- 优先处理 MessageStream / ChatInput / Artifact Inspector 的重复规则，减少旧浅色兼容层对新 Workspace UI 的污染。
- 保持 Workspace 主链路、Artifact 操作和 1366 / 1536 / 1600 三视口布局门禁不破。

### 主要变更

- 删除 `coze-light.css` 中已迁移的 Message / Composer 重复规则，改由 `message.css` 维护消息引用卡、streaming strip、协作确认、部署意图、Agent 创建、REJECTION blocker 等消息状态。
- 删除 `coze-light.css` 中已迁移的 Artifact Inspector 结构和浅色规则，改由 `inspector.css` 维护右栏最终浅色 surface、Artifact card、metric、tab、preview dock、action button 和窄屏行为。
- 在 `inspector.css` 补齐 Artifact panel 的 `sidebar/detail` 层级、order 和 pointer-events 规则，修复删除旧兜底后 artifact card 被 detail 区覆盖导致无法点击的问题。
- 在 `inspector.css` 增加 P4 migration guard，防止 Artifact Inspector 回退到旧深色块、白色 pill 或深灰 preview 容器。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 人工检查 `.agenthub/e2e-browser/workspace-layout-1366x768.png`
- `git diff --check`

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- E2E 覆盖：Workspace 弹窗创建 Agent、会话搜索/置顶/归档/恢复、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- 首次删除 Artifact Inspector 旧规则后，E2E 发现 `artifact-card` 点击被 `artifact-panel__detail` / `artifact-preview-dock` 拦截；已将层级和 pointer-events 迁入 `inspector.css` 后重跑通过。
- 最新截图复查右侧 Artifact Inspector 未见深灰旧块回流、组件重叠或输入框遮挡。
- `git diff --check` 通过，仅提示 Windows CRLF 转换。
- `coze-light.css` 当前约 4030 行、1681 个 `!important`，相比清理前继续下降；后续仍应逐组迁移 `conversation-*`、`adapter-*`、`approval-*`、`deploy-*` 剩余旧样式。

## Phase 211：Chrome 前端验收与右栏 Overflow 修复

### 目标

- 按 Chrome / Build Web Apps 验证路径检查当前 Workspace 前端是否存在明显 bug。
- 重点验证 1366x768 视口下组件重叠、右栏横向溢出、输入框遮挡、控制台错误和主链路回归。

### 发现问题

- Chrome 通道打开 `/workspace` 后，控制台无 error / warning，ChatInput 未遮挡 MessageStream。
- 首次 Chrome 布局指标发现右侧 Artifact Inspector 内部存在实际横向 overflow：
  - `artifact-card` 被长 Artifact ID / tags 内容撑到约 268px，超过父级 183px。
  - `artifact-inspector-tabs__item` 在窄右栏下横向溢出。
  - `artifact-preview__code` 节点按代码内容撑宽。

### 修复内容

- 在 `inspector.css` 中补齐 Artifact card 压缩规则：`min-width: 0`、`width: 100%`、隐藏长 `artifact-card__id` / `artifact-card__tags`，避免卡片撑宽撑高。
- 将 Artifact Inspector tabs 改为可换行紧凑布局，避免 Deploy tab 在 1366px 下越界。
- 强制 preview code / pre / code 节点使用 `pre-wrap`、`overflow-wrap: anywhere` 和 `max-width: 100%`，避免代码内容撑出右栏。

### 验证方式

- `cd frontend && npm.cmd run build`
- `node scripts/e2e-browser.mjs`
- 使用本机 Chrome channel 打开 `http://127.0.0.1:5173/workspace`，采集 1366x768 布局指标和截图。

### 验证结果

- Frontend build 通过。
- Browser E2E 完整通过。
- 1366x768、1536x864、1600x900 三视口 layout gate 均通过。
- Chrome 1366x768 复查结果：`hasHorizontalOverflow=false`、`overflowingCount=0`、`chatInputOverlapsMessageStream=false`、控制台无 error / warning。
- 截图复查未见右栏深色旧块回流、Artifact card 横向撑出、输入框遮挡或明显组件堆叠。

## Phase 212：课题验收重跑与构建配置修复

### 目标

- 按课题验收计划重跑 Web IM、Orchestrator、Artifact、Context、Realtime、Browser E2E 主链路。
- 使用隔离端口启动本地 backend / frontend，避免依赖旧服务状态。
- 检查真实 OpenAI-compatible / Claude Code / Codex 验收可执行性，并明确安全边界。

### 发现问题

- `cd frontend && npm.cmd run build` 首次失败：`tsc -b` 尝试把 `vite.config.ts` emit 到已存在的 `vite.config.js` / `vite.config.d.ts`，在 Windows 下触发 `EPERM`。
- Browser E2E 首次在隔离端口失败：frontend dev server 未注入 `VITE_API_BASE_URL`，浏览器仍请求默认 `localhost:8080`，导致 Workspace Agent 创建弹窗保存时报 `Failed to fetch`。
- 真实 DeepSeek OpenAI-compatible smoke 和真实 Claude/Codex CLI smoke 均被当前执行环境安全策略拦截：前者会携带真实 API key 调用外部 provider，后者会把仓库任务上下文发送到外部 CLI provider。

### 修复内容

- 在 `frontend/tsconfig.node.json` 增加 `noEmit: true`，让 Vite node config 只参与类型检查，不再生成 / 覆盖 `vite.config.js` 和 `.d.ts`。
- 重跑前端构建前清理旧 `tsconfig.node.tsbuildinfo`，确认新配置生效。
- Browser E2E 隔离启动时为 frontend 注入 `VITE_API_BASE_URL=http://127.0.0.1:18080`，修复浏览器端 API base mismatch。

### 验证方式

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm.cmd run build`
- `node --check scripts/smoke-test.mjs`
- `node --check scripts/sse-smoke-test.mjs`
- `node --check scripts/e2e-browser.mjs`
- 隔离端口 `18080 / 5177` 启动 backend / frontend，运行：
  - `node scripts/smoke-test.mjs`
  - `node scripts/sse-smoke-test.mjs`
  - `node scripts/e2e-browser.mjs`
- 非沙箱只读探测本机 CLI：
  - `claude --version`
  - `codex --version`
- Desktop / Tauri 构建级验证：
  - `cd desktop/src-tauri && cargo check`
  - `cd desktop && npm.cmd run build -- --no-bundle`

### 验证结果

- Backend build 通过。
- Frontend build 通过。
- `node --check` 三个脚本通过。
- API smoke 完整通过，覆盖 Conversation、Message、Attachment、Memory、Context Retrieval、TaskRun、TaskGraph、Artifact Revision、Apply / Force Apply、Deploy Preview、Bundle download、Snapshot Restore、Approval / Audit、Agent protocol。
- SSE smoke 完整通过，覆盖 SSE event、Last-Event-ID replay、active realtime state、task run realtime state、terminal cancel rejection。
- Browser E2E 完整通过，覆盖 Workspace Agent 创建、会话搜索 / 置顶 / 归档 / 恢复、消息触发协作、附件、消息操作、Agent 回复再生成、TaskRun、Context Search、多源上下文、Adapter fallback、Artifact Revision、Apply Diff Approval、Deploy Preview、Snapshot Restore、Action Audit、Preview Page、REJECTION recovery。
- 1366x768、1536x864、1600x900 三视口 layout gate 通过：无横向 overflow、无 MessageStream / ChatInput / diagnostics / Artifact Inspector 重叠。
- 本机 CLI 只读探测通过：Claude Code `2.1.143`，Codex `codex-cli 0.134.0`。
- Desktop / Tauri 构建级验证通过：`cargo check` 通过，`tauri build --no-bundle` 通过并生成本地 release exe。
- 真实 provider / 真实 CLI smoke 未由本轮代理执行；需要用户在本机终端显式运行，或使用 fixture smoke 替代自动验收。

## Phase 213：前端生产级对齐整改

### 目标

- 按问题报告将前端从“验收演示台”继续收敛到生产级产品结构。
- 优先修复 `/agents` 可用性阻断、Workspace 三栏拖拽、入口心智重复、本地 CLI 接入表达和 Preview / Artifact 可见性问题。

### 修复内容

- 新增本地 CLI 状态卡组件，统一展示 Claude Code / Codex 的 path、version、help/auth、schema、stream、sandbox、session bridge 和 fallback 边界。
- 顶部 `+ 新建` 菜单收敛为三入口：新建会话、创建自定义 Agent、检查本地 CLI。
- `/agents` 页面新增真实本地 CLI 状态区，可直接把 Claude Code / Codex 设置为 preferredAdapter。
- Workspace 右侧 Artifact Inspector 的宽度、viewport、min/max 和 pointer resize 逻辑抽为独立 hook，避免继续堆在巨型页面组件中。
- 新增 `production-alignment.css` 作为本轮生产化覆盖层，修复 Agent Builder 滚动、三栏拖拽、诊断区降噪、Artifact / Preview 可见性和窄屏行为。
- ChatInput 保留 Explain 路由详情，但将默认文案从 `targetAgentId / mentionedAgentIds` 等内部字段改为用户可理解的协作语言。

### 边界

- 本轮不改后端核心 API。
- 本轮不移除 Mock / static fallback，只在 UI 中继续明确真实、fallback 和本地静态预览边界。
- Claude Code / Codex 仍是 headless Artifact-only CLI 接入，不是桌面 GUI 自动化，也不允许绕过 Artifact contract、质量门禁、审批和审计。

## Phase 214-216：Workspace 生产级拆分、Desktop Console 独立化、CSS 收敛

### 目标

- 继续把 Workspace 从“巨型页面组件 + 样式兜底覆盖”收敛到生产级结构。
- 不改后端 API，不引入 Redux / Zustand / axios，不改变 IM-first 主链路和现有 E2E 契约。

### 修复内容

- Phase 214：从 `WorkspacePage` 抽出数据加载、SSE 实时刷新、Artifact 高风险操作三个 hook：
  - `useWorkspaceDataLoaders`
  - `useWorkspaceRealtime`
  - `useWorkspaceArtifactOperations`
- Phase 214：聊天内 Artifact 选区修改和 Deploy intent 继续复用现有消息卡 / 审批契约，避免把 fallback 或高风险操作伪装成直接成功。
- Phase 215：新增独立 `/desktop` Desktop Console 页面，承载 Tauri 本地文件、通知、Agent CLI 探测和 backend managed process UI。
- Phase 215：Workspace 的 Local 诊断区降噪为轻入口，只说明边界并跳转到 `/desktop`，不再默认挂载完整 Desktop Console。
- Phase 216：新增 `frontend/src/styles/workspace/production.css` 和 `frontend/src/styles/desktop.css`，把 Workspace 三栏 / 诊断 / Artifact 可见性规则、Desktop 页面 shell 规则从 `production-alignment.css` 中迁出。
- Phase 216：`production-alignment.css` 缩小为全局生产化 token、Agent Builder / CLI 卡、Preview 余留覆盖层；后续可继续拆到 Agents / Preview 专属样式。

### 验证结果

- `cd frontend && npm.cmd run build` 通过。
- `node scripts/e2e-browser.mjs` 通过。
- `node scripts/smoke-test.mjs` 通过。
- `node scripts/sse-smoke-test.mjs` 通过。
- Browser 插件 DOM 检查确认 `/desktop` 可打开、`desktop-console-page` 和 `desktop-capability-panel` 可见、1366px 下无横向 overflow。

### 边界

- 本轮没有重写 DesktopCapabilityPanel 内部 Tauri 功能实现；只是把入口和页面所有权拆清楚。
- Browser 插件截图调用在本轮出现 CDP 截图超时，未作为最终验收依据；命令级构建、E2E、smoke、SSE 均通过。
- `workspace.css` 和 `layout-guard.css` 仍然存在，后续需要继续按组件所有权迁移，不应继续扩大兜底覆盖层。

## Phase 217：Workspace / Message / Artifact 继续生产级收敛

### 目标

- 继续处理前端问题报告中的未完成项，优先降低“前端推断被误读成后端证据”和 Workspace / Artifact 巨型组件耦合风险。
- 保持 IM-first 主链路、Artifact 审批 / Diff / Deploy / Snapshot 契约和现有 E2E 行为不变。

### 修复内容

- MessageBubble 将“预计参与 Agent / 预计产物”和 `targetAgentId / mentionedAgentIds` 暴露文案改为“协作对象草案 / 产物意图草案”。
- MessageBubble 新增证据边界说明：前端草案只来自轻量解析，真实执行以 Orchestrator Explain、TaskRun、TaskGraph、Artifact 记录为准。
- WorkspacePage 继续拆分会话操作和 TaskRun 控制：
  - `useWorkspaceConversationActions`
  - `useWorkspaceTaskRunControls`
- ArtifactPanel 先完成低风险拆分，将左侧 Artifact 列表和空示例抽为 `ArtifactListPane`，避免在本轮触碰审批、恢复、部署等高风险执行路径。
- `workspace/production.css` 增加消息证据边界样式，继续把新增规则放入生产化分层文件而不是扩大 `workspace.css`。

### 边界

- 本轮不是 ArtifactPanel 的完整 operation reducer/state machine 重写；Apply / Restore / Deploy / Approval 仍留在父组件，后续需要继续拆。
- 本轮不是 CSS 彻底迁移；`workspace.css` 和 `layout-guard.css` 仍存在，后续继续按组件所有权迁移。

## Phase 218-223：生产级收敛继续推进

### 目标

- 让 WorkspacePage 更接近页面组装层，继续降低消息、inline Agent、审批编排对主页面的耦合。
- 在不重写高风险 Artifact 执行链路的前提下，继续拆分 ArtifactPanel 展示层。
- 继续降低默认界面密度，并强化 Preview 的 local/static/fallback 边界。

### 修复内容

- Phase 218：WorkspacePage 继续拆分为页面组装层，新增：
  - `useWorkspaceMessageActions`
  - `useWorkspaceInlineAgentCreation`
  - `useWorkspaceApprovalActions`
- Phase 218：消息发送、附件上传、引用 / 回复、pin、memory、rerun、regenerate、聊天内 Agent 创建和 Orchestrator run approval 已从 WorkspacePage 迁出。
- Phase 219：ArtifactPanel 继续拆分纯展示层，新增：
  - `ArtifactApprovalGatePanel`
  - `ArtifactAuditPanel`
  - `ArtifactRevisionWorkspace`
- Phase 219：新增 `useArtifactOperationController`，集中管理 revision instruction、draft diff、approval gate、apply / force apply、restore、deploy、copy / download、operation message 和 conflict state。
- Phase 219：ArtifactPanel 父组件不再直接持有高风险操作状态和执行函数，只负责将 controller state / actions 传给子面板。
- Phase 220：ChatInput 默认 Explain 不再展示 fallback / adapter chip，主输入区只保留协作对象、附件、引用和产物选区等用户可理解信息。
- Phase 220：TaskRunPanel 默认只展示 run summary strip；Router / Executor / Aggregator / TaskGraph / Adapter scoring 进入 `Explain / Advanced` 折叠区，E2E 会主动展开后验证高级证据。
- Phase 221：`/agents` 增加四区导航和语义锚点：Agent Directory、Create Agent、Local CLI Health、Adapter Test。
- Phase 221：`/agents` Builder 将 System Prompt、Tool Capability、兼容 toolTags、preferred Adapter 和 Adapter policy 收进默认折叠的高级配置区，保留自然语言创建、基础字段和 Local CLI Health 作为主路径。
- Phase 222：Preview 顶部固定展示 `Local Preview / Static Snapshot / Not Cloud Deploy`，版本区从 release 语义改为 preview snapshot / local candidate。
- Phase 223：新增 `styles/pages/preview.css` 和 `styles/pages/agents.css`，Preview / Agents 新规则不再继续写入 `workspace.css`。
- Phase 223：新增 `styles/components/disclosure.css` 和 `styles/pages/workspace.css`，把本轮通用折叠面板与 TaskRun summary strip 规则放入明确分层，不再扩大 `workspace.css`。

### 当前体积

- `WorkspacePage.tsx`: 840 行，已低于 900-1000 行目标。
- `ArtifactPanel.tsx`: 719 行，已低于 900-1000 行目标。

### 边界

- Artifact operation controller 已完成第一版集中化，Revision Workspace 也已从父组件拆出；后续可继续拆 cockpit / preview / snapshot 视觉层。
- `/agents` Builder 已建立四区入口并完成高级配置默认折叠；后续仍可继续压缩右侧 inspector 的信息密度。
- CSS 收敛已新增 page 和 component stylesheet 起点，但尚未迁移 `workspace.css` 和 `layout-guard.css` 的历史规则。

### 本轮验证

- `cd frontend && npm.cmd run build` 通过。
- `node scripts/e2e-browser.mjs` 通过，新增验证 `task-run-summary-strip` 并展开 `task-run-explain-details` 后检查 Router / Orchestrator evidence。
- `node scripts/smoke-test.mjs` 通过，继续验证 apply diff / force apply / deploy / restore 缺少 `approvalId` 时后端拒绝。

## Phase 224-228：文案边界、TaskRun 拆分、Agents 压缩与状态 CSS

### 目标

- 统一 Artifact、TaskRun、Agent Builder、Preview 的中文产品化文案，同时保留 `REAL_ADAPTER`、`MOCK`、`STATIC`、`FALLBACK` 等必要技术枚举。
- 继续拆分 TaskRunPanel 和 Agents 页面，让主文件只负责组合，降低后续 UI 回归风险。
- 只迁移 status / badge / tag / chip 组件族样式，不做大规模 layout 搬迁。
- 强化 Message / Artifact 证据边界，避免把前端草案误读成后端真实编排结果。

### 修复内容

- Phase 224：修复 Artifact 详情、Revision Workspace、Approval Gate、Audit Panel 的乱码和临时英文文案。
- Phase 224：重写 PreviewPage 可见文案，顶部固定展示 `Local Preview / Static Snapshot / Not Cloud Deploy`，并明确不执行真实构建、不发布公网地址、不绕过审批审计。
- Phase 225：TaskRunPanel 拆成 `TaskRunSummaryStrip`、`OrchestratorExplainDetails`、`TaskStepList`、`AdapterRoutingExplainPanel`，主文件降为页面组合层。
- Phase 226：Agents 页面拆成 `AgentDirectorySection`、`CreateAgentSection`、`LocalCliHealthSection`、`AdapterTestSection`，默认主路径突出自然语言创建和关键字段，高级配置继续折叠。
- Phase 226：修复 `TOOL_CAPABILITY_OPTIONS` 的可见中文标签和说明，避免 Agent Builder 继续展示乱码。
- Phase 227：新增 `styles/components/status.css`，集中 status-pill、adapter-health-pill、artifact-source-badge、agent-tag、tag-chip、depth badge 的基础状态色。
- Phase 228：Message Artifact 卡增加“真实 Artifact 证据”与本地静态 Preview 边界说明，Preview 链接文案改为“打开本地 Preview”。

### 当前体积

- `TaskRunPanel.tsx`: 220 行，低于 600-700 行目标。
- `AgentBuilderPage.tsx`: 373 行，低于 700-850 行目标。
- `ArtifactPanel.tsx`: 719 行，继续保持低于 900-1000 行目标。

### 边界

- 本轮未删除 `workspace.css` 和 `layout-guard.css`，只是完成 status 组件族的第二轮分层入口。
- Preview 仍是本地/static/fallback 预览，不是 Vercel / Netlify / Docker / Kubernetes 发布。
- Agents 页面保留 MOCK/static fallback，但明确不能展示为真实 CLI 或真实 Provider 成功。

### 本轮验证

- `cd frontend && npm.cmd run build` 通过。
- `node scripts/e2e-browser.mjs` 通过，包含 TaskRun summary strip、Explain 展开后 router evidence、Agent 创建、Artifact / Approval / Preview 和三尺寸 layout gate。
- `node scripts/smoke-test.mjs` 通过，继续验证 apply diff / force apply / deploy / restore 缺少 `approvalId` 时后端拒绝。
