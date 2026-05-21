# AgentHub 产品设计文档 V0.5

## 1. 项目背景

AgentHub 面向 AI 全栈挑战赛，目标不是做一个普通聊天机器人，而是构建一个以 IM 聊天为核心交互范式的人与 AI 协作平台。用户通过会话、消息、单聊、群聊、后续 `@Agent` 指定等方式与不同 Agent 协作，由主 Agent Orchestrator 负责理解任务、拆解任务、路由执行、上下文交接和结果聚合。

比赛明确要求平台围绕多 Agent 协作和 Artifact 迭代展开，因此 AgentHub 的产品主线不是“回答问题”，而是“组织协作并围绕产物持续推进任务”。

## 2. 产品定位

一句话定位：

> AgentHub 是一个基于 IM Workspace 的多 Agent 协作平台，用户通过聊天发起复杂任务，由 Orchestrator 协调多个专业 Agent 完成任务，并围绕代码、文档、网页预览等 Artifact 持续迭代。

产品定位边界：

- 不是普通 Chatbot
- 不是 Workflow Canvas 优先产品
- 是聊天优先、协作优先、Artifact 优先的平台

## 3. 目标用户

### 3.1 比赛评审

关注点：

- AI 协作能力是否可见
- 产品主线是否清晰
- 技术实现是否可解释
- Demo 是否稳定

### 3.2 开发型用户

典型任务：

- 生成页面
- 生成 README
- 输出 API Contract
- 检查代码质量
- 基于已有产物继续修改

### 3.3 任务发起者

希望：

- 一句话发起复杂任务
- 不需要自己手动串接多个工具
- 能直接基于已有产物继续迭代

## 4. 核心痛点

### 4.1 单 Agent 模式难以处理复杂任务

复杂任务通常包含页面生成、文档补充、接口设计、质量检查等多个步骤，单 Agent 模式难以同时兼顾角色分工、执行可见性和后续协作。

### 4.2 多 Agent 协作中的上下文容易混乱

如果没有明确的 ContextSnapshot 和 HandoffSummary，前一个 Agent 的输出很难稳定地传给后一个 Agent。

### 4.3 纯问答模式无法围绕产物持续推进

如果系统只返回一段文本，用户很难把代码、文档、页面预览当成可继续修改的工作对象。

### 4.4 协作过程不可见

如果界面里看不到 TaskSpec、TaskRun、TaskStep、Routing、Handoff、Review，评审很难认可平台具备真正的 AI 协作能力。

## 5. 产品目标

### 5.1 比赛目标

通过稳定的 Web Demo 证明：

- 多 Agent 协作链路成立
- Orchestrator 具备清晰的任务编排职责
- Artifact-centered iteration 可以被看见和解释
- Spec / Skill / Rules / Collaboration Protocol 已形成可提交资产

### 5.2 MVP 目标

当前 MVP 聚焦：

- 三栏 IM Workspace
- 静态 demo-task 主链路
- 静态 Artifact revision 链路
- Context / Handoff 展示
- Adapter fallback 展示
- 自定义 Agent 创建与展示

## 6. 核心使用场景

### 6.1 多步骤任务生成

用户输入一个复杂需求，系统生成 TaskSpec，拆分为 Frontend Builder、Backend Worker、Reviewer 三个执行步骤，并在聊天流和右侧面板中展示产物。

### 6.2 基于已有 Artifact 的二次修改

用户选中 `LoginPage.tsx`，输入 revision 指令，系统生成 revision TaskRun、`LoginPage.tsx v2`、新的 Review Report，并展示版本关系和修改摘要。

### 6.3 自定义 Agent 创建

用户在 `/agents` 页面配置自定义 Agent 的名称、Prompt、标签和 preferredAdapterType，创建后回到 Workspace 可在 Agent List 中看到该 Agent。

## 7. 当前产品形态

当前仓库中的产品已经不是单纯骨架，而是具备可演示主链路的 Web 原型：

- `/workspace` 提供三栏 IM 工作台
- `/agents` 提供最小 Agent Builder 表单
- 后端提供静态任务生成、revision、context、handoff、adapter placeholder 支持

但当前版本仍是比赛导向的静态 Demo，不应误写成真实多 Agent 生产系统。

## 8. 页面结构

### 8.1 `/workspace`

三栏布局：

- 左侧
  - Conversation List
  - Agent List
- 中间
  - 当前会话标题
  - Message Stream
  - TaskRunPanel
  - ContextPanel
  - ChatInput
- 右侧
  - ArtifactPanel
  - Version History
  - Diff Summary
  - Revision 输入区

### 8.2 `/agents`

最小 Agent Builder 页面：

- Agent Name
- Avatar URL
- System Prompt
- Capability Tags
- Tool Tags
- Preferred Adapter
- Create Agent 按钮
- Created Agent Summary

## 9. 用户流程

### 9.1 主流程

1. 用户进入 `/workspace`
2. 创建 Demo Conversation
3. 发送复杂任务
4. 运行 `Run Demo Task`
5. 系统展示 TaskSpec、TaskRun、TaskStep
6. 系统展示 Artifact、ContextSnapshot、HandoffSummary
7. 用户选中一个 Artifact
8. 用户发起 revision
9. 系统生成新版本产物和新的 Review Report

### 9.2 自定义 Agent 流程

1. 用户进入 `/agents`
2. 填写名称、Prompt、标签和 preferredAdapterType
3. 点击 `Create Agent`
4. 页面展示创建成功
5. 返回 `/workspace`
6. Agent List 中出现新建 Agent

## 10. IM 聊天设计

当前设计强调：

- 聊天是主入口
- Task 信息和执行信息内联在聊天场景中理解
- 右侧面板用于集中查看 Artifact，而不是把聊天和产物完全割裂

当前已实现：

- 对话列表
- 消息流
- 发送消息
- 运行 Demo Task

当前未完成：

- 消息回复、引用、重新生成
- 完整消息操作体系
- 多会话并行交互打磨

## 11. 单聊 / 群聊 / @Agent 设计

当前仓库状态：

- 已具备“多 Agent 参与一个 TaskRun”的展示形态
- 已具备 Agent List 和多角色 TaskStep 展示

当前未完成：

- 真正的单聊模式切换
- 真正的群聊成员视图
- 完整 `@Agent` 指定执行链路

因此 V0.5 文档中应将“单聊 / 群聊 / @Agent”写为赛题硬要求和下一阶段目标，而不是写成当前已完整实现。

## 12. Agent 联系人设计

Agent 在当前产品中以联系人列表形式展示，包含：

- avatarUrl 或首字母占位
- name
- role
- status
- preferredAdapterType
- capabilityTags
- toolTags

这满足了“Agent 作为联系人”的最小产品感要求。

## 13. 用户自建 Agent 设计

当前已实现的最小闭环：

- 支持创建 `CUSTOM` 角色 Agent
- 支持配置 `preferredAdapterType`
- 支持配置 `systemPrompt`
- 支持配置 `capabilityTags`
- 支持配置 `toolTags`
- 支持配置 `avatarUrl`

当前未完成：

- Agent 编辑
- Agent 删除
- 自定义 Agent 真实进入执行链路
- 自定义 Agent 的会话级选择和 `@Agent`

## 14. Orchestrator 协作设计

产品设计目标：

- Orchestrator 作为 PM / PMO 式协调器
- 理解任务
- 拆解任务
- 分派给 Specialist Agent
- 聚合结果
- 处理失败降级

当前实现状态：

- 后端已抽离 `OrchestratorService`
- 但 demo-task 仍是静态编排，不是真实动态规划
- 任务拆解逻辑主要服务于 Demo 展示

## 15. Artifact 预览与编辑设计

当前已实现：

- Artifact 列表
- 详情预览
- CODE / MARKDOWN / REVIEW_REPORT / API_CONTRACT / DATA_MODEL 展示
- revision 输入区
- 基于选中 Artifact 的二次修改链路

当前未完成：

- 真正代码编辑器
- 网页 iframe 真实预览链路完善
- 文件附件上传与处理
- 文档段落引用后交给 Agent 处理

## 16. Version History / Diff Summary 设计

当前已实现：

- 基于当前会话 Artifact 数据的轻量 Version History
- `v1 -> v2` 的 lineage 展示
- Revision 来源提示
- 静态 Diff Summary

当前未完成：

- 真实代码 diff
- 后端版 artifact lineage service
- 多轮 revision 图谱

## 17. Context / Handoff 展示设计

当前已实现：

- ContextPanel
- ContextSnapshot 展示
- HandoffSummary 展示
- TaskSpec、Acceptance Criteria、Agent 间交接信息可见化

当前未完成：

- 真实长期 memory system
- 复杂上下文压缩策略
- 基于多轮对话的自动上下文裁剪

## 18. P0 / P1 / P2 功能范围

### 18.1 P0

- 三栏 IM Workspace
- 会话列表
- 消息流
- 静态 demo-task
- TaskRun / TaskStep 展示
- ContextSnapshot / HandoffSummary 展示
- ArtifactPanel
- Artifact revision
- Adapter fallback 展示
- Agent Builder 最小闭环

### 18.2 P1

- Selected Agent / `@Agent` 最小链路
- 自定义 Agent 接入执行路径
- 更明确的 Orchestrator 路由说明
- SSE / WebSocket 流式状态

### 18.3 P2

- 部署发布
- 部署状态卡片
- 预览 URL
- 多端支持
- 多人协作与冲突处理

## 19. 非目标范围 Non-goals

当前版本不包含：

- 真实 Codex / Claude Code / OpenCode 接入完成
- 真实多人协作
- MySQL 持久化
- WebSocket / SSE 流式执行完成
- 完整部署系统
- Workflow Canvas 主入口

## 20. 评分点对应关系

| 评分维度 | 当前设计对应 |
|---|---|
| AI 协作能力 30% | Spec / Skill / Rules / Collaboration Protocol + Context / Handoff + Adapter 路由展示 |
| 功能完整度 25% | IM Workspace、TaskRun、Artifact、revision、自定义 Agent |
| 生成效果质量 20% | 三栏工作台、Version History、Diff Summary、Artifact 展示 |
| 代码理解度 15% | 明确的领域模型、服务分层、Adapter Layer、OrchestratorService |
| 创新与产品感 10% | Artifact-centered iteration、自定义 Agent、fallback 可视化 |

## 21. 当前已实现与未实现对照表

| 能力 | 当前状态 |
|---|---|
| 三栏 IM Workspace | 已实现 |
| Conversation List | 已实现 |
| Agent List | 已实现 |
| TaskRun / TaskStep 展示 | 已实现 |
| ContextSnapshot / HandoffSummary | 已实现 |
| Artifact 预览 | 已实现 |
| Artifact revision | 已实现 |
| Version History | 已实现 |
| Diff Summary | 已实现，静态摘要 |
| 用户自建 Agent 最小闭环 | 已实现 |
| Agent Adapter Layer | 已实现第一版骨架 |
| 至少两个主流 Agent 平台真实接入 | 未完成 |
| 真实动态 Orchestrator | 未完成 |
| 完整 `@Agent` | 未完成 |
| WebSocket / SSE | 未完成 |
| Deploy Status Card | 未完成 |
| 多端支持 | 未完成 |
