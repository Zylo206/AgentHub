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
