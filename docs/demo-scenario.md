# AgentHub Demo 场景文档 V0.5

## 1. Demo 目标

本次 Demo 的目标不是证明“模型很强”，而是证明以下产品链路已经成立：

- IM Workspace 是主入口
- 多 Agent 协作可以被看见
- TaskSpec、TaskRun、TaskStep、Context、Handoff、Artifact 形成闭环
- 用户可以围绕已有 Artifact 发起二次修改
- 自定义 Agent 最小闭环已打通

## 2. Demo 前置条件

### 2.1 后端

- backend 已启动
- 默认地址为 `http://localhost:8080`

### 2.2 前端

- frontend 已启动
- 打开 `/workspace` 和 `/agents` 可正常访问

### 2.3 当前说明

需要提前说明：

- 当前是静态 Demo
- 当前 Adapter 以 Mock / placeholder / fallback 为主
- 不展示真实 Codex / Claude Code 外部调用

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

## 4. 演示路径

### Step 1：打开 `/workspace`

展示能力：

- 三栏 IM 工作台
- 左侧 Conversation List 和 Agent List
- 中间 Message Stream、TaskRunPanel、ContextPanel
- 右侧 ArtifactPanel

讲解重点：

- AgentHub 不是普通 Chatbot
- 主入口是聊天式工作台

### Step 2：点击 `Create Demo Conversation`

展示能力：

- 会话创建
- 当前会话激活

### Step 3：发送任务

输入：

> 帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。

展示能力：

- 用户消息进入聊天流
- 后续 demo-task 的输入来源明确

### Step 4：点击 `Run Demo Task`

展示能力：

- 生成 TaskRun
- 生成多个 TaskStep
- 生成 Artifact
- 生成 ContextSnapshot / HandoffSummary

讲解重点：

- 这是一个静态 demo-task，但它体现了 Orchestrator 编排结构

### Step 5：展示 TaskRun / TaskStep

展示内容：

- Frontend Builder step
- Backend Worker step
- Reviewer step

额外重点：

- 展示 Adapter 信息
- Frontend Builder：preferred `CODEX`，actual `MOCK`，`FALLBACK_USED`
- Backend Worker：`MOCK`
- Reviewer：preferred `CLAUDE_CODE`，actual `MOCK`，`FALLBACK_USED`

### Step 6：展示 ContextSnapshot / HandoffSummary

展示能力：

- ContextSnapshot 中的 summary、pinned context、artifact 引用
- HandoffSummary 中的 `sourceAgent -> targetAgent`
- `passedArtifacts`
- `keyDecisions`
- `openIssues`

讲解重点：

- 这部分对应 AI 协作能力评分中的 Spec / Rules / Context Handoff

### Step 7：展示 Artifact Panel

展示内容：

- `LoginPage.tsx`
- `README.md`
- API Contract / Data Model
- Review Report

讲解重点：

- Artifact 不是聊天结果附属品，而是后续迭代核心对象

### Step 8：点击 `LoginPage.tsx`

展示能力：

- 右侧详情区
- Version History
- 当前版本信息

### Step 9：输入 revision 指令

输入：

> 把按钮改成蓝色，并增加 loading 状态。

然后点击 `Revise Selected Artifact`

展示能力：

- 基于已有 Artifact 创建 revision TaskRun
- 生成 `LoginPage.tsx v2`
- 生成新的 Review Report

### Step 10：展示 v1 -> v2

展示内容：

- Version History 中的 `v1 -> v2`
- revision 标签
- parent artifact 来源提示

讲解重点：

- 体现 Artifact-centered iteration

### Step 11：展示 Diff Summary

展示内容：

- Revision Instruction
- Changed Items
- Not Changed
- Risk

讲解重点：

- 当前是静态 Diff Summary，不是真实代码 diff

### Step 12：打开 `/agents`

展示内容：

- 自定义 Agent 表单
- name / avatarUrl / systemPrompt / capabilityTags / toolTags / preferredAdapterType

### Step 13：创建自定义 Agent

建议输入：

- Agent Name：`My Frontend Agent`
- System Prompt：`You are a frontend specialist.`
- Capability Tags：`React, UI, CSS`
- Tool Tags：`code, preview`
- Preferred Adapter：`CODEX`

### Step 14：回到 `/workspace`

展示能力：

- Agent List 中出现新建 Agent
- 显示 `CUSTOM`
- 显示 capability tags
- 显示 preferred adapter

## 5. 讲解词草稿

可直接用于 3 分钟演示：

1. “AgentHub 的目标不是做一个普通聊天机器人，而是做一个以聊天为入口的人与多 Agent 协作平台。”
2. “在这个工作台中，左侧是会话和 Agent 联系人，中间是消息、任务和上下文，右侧是产物和版本演进。”
3. “我先发起一个复杂任务，系统会生成 TaskSpec，并拆成 Frontend Builder、Backend Worker、Reviewer 三个步骤。”
4. “这里可以看到每个 TaskStep 的 Adapter 信息。当前 Codex 和 Claude Code 还只是 placeholder，所以会 fallback 到 Mock，这一点在界面里是显式可见的。”
5. “任务执行后，右侧会出现代码、README、Review Report 等 Artifact。下方还能看到 ContextSnapshot 和 HandoffSummary，说明上下文和交接不是黑盒。”
6. “接着我选中 `LoginPage.tsx`，输入一个修改要求。系统会基于已有 Artifact 创建 revision TaskRun，并生成 `v2` 版本。”
7. “这里的 Version History 和 Diff Summary 体现了当前 Demo 的 Artifact-centered iteration。需要说明的是，这仍是静态 Demo，不是真实代码 diff 或真实模型修改。”
8. “最后我切到 Agent Builder 页面，创建一个自定义 Agent，并回到工作台查看它已经进入 Agent List。这证明我们已经打通了最小的用户自建 Agent 闭环。”

## 6. 每一步展示什么能力

| 步骤 | 主要展示能力 |
|---|---|
| 打开 `/workspace` | IM Workspace 主入口 |
| Create Demo Conversation | 会话管理 |
| 发送任务 | 聊天驱动任务发起 |
| Run Demo Task | Orchestrator 结构、TaskRun、TaskStep |
| 查看 Adapter 信息 | Adapter Layer + fallback |
| 查看 ContextPanel | ContextSnapshot / HandoffSummary |
| 查看 ArtifactPanel | Artifact 预览 |
| 执行 revision | Artifact-centered iteration |
| 查看 Version History / Diff Summary | 版本演进与修改摘要 |
| 创建自定义 Agent | Agent Builder 最小闭环 |

## 7. 失败兜底方案

### 7.1 demo-task 运行异常

- 提前准备一个新创建会话
- 重新点击 `Run Demo Task`
- 如仍异常，优先展示已存在的 TaskRun 和 Artifact 结构

### 7.2 revision 失败

- 优先展示当前已生成的 `v1`
- 说明 revision 目标与设计已实现，当前接口若失败则回退展示已有版本关系结构

### 7.3 前端页面局部异常

- 优先维持 `/workspace` 主链路演示
- `/agents` 页面作为补充环节，可单独打开

## 8. 当前静态 Demo 说明

演示时必须明确说明：

- demo-task 是静态编排，不是真实动态规划
- revision 是静态模板，不是真实代码修改
- Diff Summary 是静态摘要，不是真实代码 diff
- ContextSnapshot / HandoffSummary 是静态构造，不是真实 memory system
- Codex / Claude Code 仍是 placeholder + Mock fallback
