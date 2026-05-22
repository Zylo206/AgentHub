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
