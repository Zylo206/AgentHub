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
