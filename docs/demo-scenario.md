# AgentHub Demo 场景文档

## 1. Demo 目标

本次 Demo 的目标不是证明“模型很强”，而是证明以下闭环已经成立：

- IM Workspace 是主入口
- 用户可以选择或 `@Agent`
- Orchestrator 可以生成可见 TaskRun / TaskStep
- Adapter fallback 是显式可见的
- ContextSnapshot / HandoffSummary 是可见的
- Artifact 可以进入 revision 和版本演进
- 仓库中存在完整 AI 协作开发记录

## 2. Demo 前置条件

### 后端

- backend 已启动
- 地址为 `http://localhost:8080`

### 前端

- frontend 已启动
- `/workspace` 与 `/agents` 可访问

### 数据准备

- 若要演示自定义 Agent，需先在 `/agents` 页面创建一个 `My Frontend Agent`

## 3. 启动方式

### 后端

```powershell
cd backend
mvn spring-boot:run
```

### 前端

```powershell
cd frontend
npm install
npm run dev
```

## 4. 3 分钟时间分配

### 0:00 - 0:20

- 说明产品定位
- 展示三栏 IM Workspace

### 0:20 - 0:45

- 打开 `/agents`
- 创建一个自定义 Agent

### 0:45 - 1:20

- 回到 `/workspace`
- 发送带 `@Agent` 的消息
- 展示 `To: @Agent`

### 1:20 - 2:05

- 运行 Demo Task
- 展示 TaskRun / TaskStep / assigned Agent / adapter fallback
- 展示 ContextSnapshot / HandoffSummary

### 2:05 - 2:40

- 展示 Artifact
- 执行 revision
- 展示 `v1 -> v2`
- 展示 Diff Summary

### 2:40 - 3:00

- 展示 `docs/collaboration`
- 强调 AI 协作开发记录

## 5. 分步骤演示路径

### Step 1：打开 `/workspace`

展示：

- 三栏 IM Workspace
- Conversation List
- Agent List
- Message Stream
- TaskRunPanel
- ContextPanel
- ArtifactPanel

讲解词：

> AgentHub 不是普通 Chatbot，也不是以 Workflow Canvas 为主入口的工具。当前主入口是一个 IM Workspace，用户通过聊天组织多 Agent 协作，并围绕 Artifact 持续迭代。

评分点：

- 产品定位
- IM 主界面
- 创新与产品感

### Step 2：打开 `/agents`

展示：

- Agent Builder 表单
- 可配置 `preferredAdapterType`

讲解词：

> 这里用户可以创建自定义 Agent，而不是只能使用系统内置角色。当前支持最小保存闭环，包括名称、头像、System Prompt、能力标签、工具标签和 preferred adapter。

评分点：

- 用户自建 Agent
- Agent 联系人

### Step 3：创建 `My Frontend Agent`

建议输入：

- Agent Name：`My Frontend Agent`
- System Prompt：`You are a frontend specialist.`
- Capability Tags：`React, UI, CSS`
- Tool Tags：`code, preview`
- Preferred Adapter：`CODEX`

讲解词：

> 这一步的重点不是复杂配置，而是让自定义 Agent 真正进入后续执行链路。

评分点：

- 自定义 Agent 闭环

### Step 4：回到 `/workspace`

展示：

- Agent List 中出现新 Agent

讲解词：

> 回到 Workspace 后，可以看到这个 Agent 已经作为联系人进入系统。

评分点：

- Agent 联系人展示

### Step 5：在 ChatInput 输入带 `@Agent` 的消息

建议输入：

```text
@My Frontend Agent 帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。
```

展示：

- ChatInput 的 `@Agent` 提示
- 发送后 MessageBubble 中的 `To: @My Frontend Agent`

讲解词：

> 当前支持最小 `@Agent` 文本标记解析。只要在消息开头输入 `@AgentName`，系统就会把这条消息显式指向对应 Agent。

评分点：

- `@Agent`
- IM 交互

### Step 6：点击 `Run Demo Task`

展示：

- 生成 TaskRun
- 生成多个 TaskStep

讲解词：

> 这里的 demo-task 仍是静态 Demo，但它已经把 Orchestrator、TaskRun、TaskStep、Artifact、Context 和 Handoff 这条协作链路完整展示出来。

评分点：

- Orchestrator 结构
- 任务拆解可见化

### Step 7：展示 TaskRun / TaskStep / assigned Agent

展示：

- 第一个 step 的 assigned Agent 为 `My Frontend Agent`
- preferred adapter / actual adapter / fallback 状态

讲解词：

> 这里可以看到，selectedAgent 和 `@Agent` 已经进入执行链路。第一个 specialist step 会优先使用这个 Agent 的 preferred adapter，但当前真实平台还没接通，所以会 fallback 到 Mock。

评分点：

- 多 Agent 接入架构
- Adapter fallback 显式化

### Step 8：展示 ContextSnapshot / HandoffSummary

展示：

- summary
- pinnedContextItems
- sourceAgent -> targetAgent
- keyDecisions / openIssues

讲解词：

> Context 和 Handoff 是本项目对 AI 协作能力的重点回答。当前虽然仍是静态构造，但它说明系统已经把任务交接和上下文显式建模出来。

评分点：

- AI 协作能力
- 上下文管理

### Step 9：展示 ArtifactPanel

展示：

- `LoginPage.tsx`
- `README.md`
- API Contract
- Review Report

讲解词：

> Artifact 在这里不是聊天附件，而是可继续迭代的核心对象。

评分点：

- 产物预览

### Step 10：执行 Artifact Revision

建议输入：

```text
把按钮改成蓝色，并增加 loading 状态。
```

展示：

- revision TaskRun
- 新 Artifact
- 新 Review Report

讲解词：

> 这一步展示的是 Artifact-centered iteration。用户不是重新发起一个全新任务，而是围绕已有 Artifact 做持续修改。

评分点：

- 产物编辑 / 二次修改

### Step 11：展示 `v1 -> v2`

展示：

- Version History
- parent artifact 来源

讲解词：

> 当前版本已经能把同一份产物的 v1 到 v2 关系清楚地展示出来。

评分点：

- Version History

### Step 12：展示 Diff Summary

展示：

- Revision Instruction
- Changed Items
- Not Changed
- Risk

讲解词：

> 需要说明的是，这里的 Diff Summary 仍是静态摘要，不是真实代码 diff，但已经足以展示版本演进和修改意图。

评分点：

- 生成效果质量
- 产物演进

### Step 13：展示 `docs/collaboration`

展示：

- `development-workflow.md`
- `prompt-template.md`
- `dev-log.md`
- `demo-checklist.md`
- `decision-log.md`

讲解词：

> 这些文档对应比赛里 AI 协作能力 30% 的评分项。它们说明我们不是随手让 AI 写代码，而是形成了 Spec、Rules、Prompt、开发日志和决策记录的完整协作工作流。

评分点：

- AI 协作开发记录
- 代码理解度

## 6. 每一步讲解词要点

建议统一口径：

- 当前是 MVP 演示闭环
- 当前有可见 Orchestrator / TaskRun / Artifact 结构
- 当前有可见 selectedAgent / `@Agent`
- 当前 Adapter 仍以 Mock fallback / placeholder 为主
- 当前 Revision / Diff Summary / Context 仍有静态 Demo 成分

## 7. 每一步展示的评分点

| 步骤 | 主要评分点 |
|---|---|
| Workspace | 功能完整度、产品感 |
| Agent Builder | 多 Agent 接入、自建 Agent |
| `@Agent` 消息 | IM 主交互、协作语义 |
| TaskRun / Adapter | Orchestrator、Adapter Layer、代码理解度 |
| Context / Handoff | AI 协作能力 |
| Artifact / Revision | 生成效果质量、产品感 |
| collaboration docs | AI 协作能力、代码理解度 |

## 8. 失败兜底方案

### demo-task 异常

- 重新创建新会话再试一次
- 若仍失败，优先展示已有 TaskRun / Artifact 结构

### revision 异常

- 优先展示已有 `v1`
- 说明 revision 设计与链路已存在，当前接口偶发失败时保留结构展示

### `/agents` 页面异常

- 先完成 `/workspace` 主线
- 再补讲 Agent Builder 功能

## 9. 不要演示的功能

以下内容不要放进 3 分钟视频主线：

- 真实 Codex / Claude Code / OpenCode 外部调用
- 真实部署
- 多人协作
- 多端同步
- WebSocket / SSE
- 复杂群聊调度
- 多个 `@Agent`

原因：

- 当前这些能力未完成
- 会增加演示不稳定性
- 会稀释主线表达
