# AgentHub 产品设计文档

## 1. 产品定位

AgentHub 是一个以 IM Workspace 为主入口的多 Agent 协作平台原型。

它不是普通 Chatbot，也不是以 Workflow Canvas 为主入口的编排工具。当前产品形态强调：

- 用户通过聊天发起任务
- Orchestrator 负责任务拆解和路由
- Specialist Agent 负责执行不同子任务
- Artifact 是后续迭代的核心对象
- Context / Handoff 必须可见，而不是黑盒

## 2. 目标用户

当前版本面向两类用户：

- 比赛评审和导师
  - 关注产品是否真正体现多 Agent 协作
  - 关注 AI 协作记录是否完整
- 产品 / 工程混合型开发者
  - 需要在聊天中组织任务
  - 需要围绕代码、文档、评审报告做迭代

## 3. 核心痛点

传统 Chatbot 产品主要存在以下问题：

- 任务拆解不可见
- 多 Agent 协作关系不可见
- Context 交接不可见
- 产物只是聊天回复附件，不是可持续迭代对象
- 用户自建 Agent 很难真正进入执行链路

## 4. 产品目标

当前阶段的产品目标不是做全量平台，而是做一个可演示、可解释、可迭代的 MVP：

- 用 IM Workspace 作为主入口
- 让 Orchestrator / TaskRun / TaskStep 可见
- 让 ContextSnapshot / HandoffSummary 可见
- 让 Artifact 能被预览、修订、版本演进
- 让自定义 Agent 从“能创建”进入“可见执行链路”

## 5. 核心用户流程

当前最重要的用户流程是：

1. 创建或选择会话
2. 选择 Agent，或在输入框中使用 `@AgentName`
3. 发送消息
4. 运行 demo-task
5. 查看 TaskRun / TaskStep
6. 查看 assigned Agent 与 adapter fallback
7. 查看 Context / Handoff
8. 查看 Artifact
9. 发起 Artifact revision
10. 查看版本演进与 Diff Summary

## 6. 页面结构

### `/workspace`

三栏结构：

- 左侧：Conversation List + Agent List
- 中间：Message Stream + TaskRunPanel + ContextPanel + ChatInput
- 右侧：ArtifactPanel

### `/agents`

最小 Agent Builder：

- name
- avatarUrl
- systemPrompt
- capabilityTags
- toolTags
- preferredAdapterType

## 7. IM Workspace 设计

IM Workspace 是当前产品的核心入口。

设计原则：

- 所有主要操作都应围绕聊天流展开
- 聊天不是结果展示层，而是任务发起和协作组织层
- TaskRun、Context、Artifact 都需要嵌入在 Workspace 语义内

当前 Workspace 已体现：

- 对话列表
- Agent 联系人列表
- 任务发起
- 消息目标 Agent 显示
- 任务执行状态可视化
- Artifact 侧栏查看与修订

## 8. Agent List / Agent Builder 设计

### Agent List

Agent 以联系人形式展示，包含：

- 头像或首字母占位
- 名称
- role
- status
- preferredAdapterType
- capabilityTags
- toolTags

### Agent Builder

当前是最小保存闭环，不是完整配置系统。

它的价值在于：

- 让“用户自建 Agent”不再停留在文档层
- 能进入 Workspace 可见执行链路
- 为后续 `@Agent` 和更复杂路由预留入口

## 9. selectedAgent / @Agent 设计

当前支持两种目标 Agent 指定方式：

### 方式一：左侧 selectedAgent

- 点击 Agent List 中的 Agent
- Workspace 显示 Selected Agent banner
- ChatInput 展示 `@Agent` token

### 方式二：消息开头文本 `@AgentName`

例如：

```text
@My Frontend Agent 帮我生成一个登录页面
```

当前规则：

- 只解析消息开头
- 只支持一个 Agent
- 文本 `@Agent` 优先级高于左侧 selectedAgent
- 匹配失败时阻止消息发送并显示错误

## 10. Orchestrator 协作设计

当前 Orchestrator 的定位是：

- 读取 source message
- 推断 selectedAgent
- 创建 TaskSpec
- 创建 TaskRun / TaskStep
- 调用 Agent Adapter 执行 step
- 生成 Context / Handoff / Artifact

需要明确：

- 当前仍是规则化、静态 Demo 编排
- 还不是真实复杂动态规划系统
- 但已经可以把“任务拆解 -> 执行 -> 交接 -> 产物”完整展示出来

## 11. Context / Handoff 展示设计

当前设计目标是让协作过程显式化。

### ContextSnapshot 展示

展示内容包括：

- summary
- pinnedContextItems
- includedMessageIds
- includedArtifactIds

### HandoffSummary 展示

展示内容包括：

- sourceAgentId
- targetAgentId
- passedArtifactIds
- keyDecisions
- openIssues
- summary

作用：

- 支撑 AI 协作能力评分点
- 让评审看到“上下文交接不是黑盒”

## 12. Artifact Preview / Revision 设计

Artifact 是产品的第二核心对象，仅次于聊天流。

当前支持：

- 产物列表
- 产物详情查看
- revision 指令输入
- revision TaskRun 生成
- revision 后的新 Artifact 和新 Review Report

当前重点是：

- 让用户能看到“围绕已有 Artifact 持续迭代”
- 强化 Artifact-centered iteration

## 13. Version History / Diff Summary 设计

### Version History

当前基于：

- `title`
- `version`
- `parentArtifactId`
- `revisionInstruction`

构建轻量 lineage 展示。

### Diff Summary

当前不是实际代码 diff，而是静态摘要，展示：

- Revision Instruction
- Changed Items
- Not Changed
- Risk

设计目标是：

- 先让“版本演进”清晰可见
- 后续再考虑真实 diff

## 14. P0 / P1 / P2 范围

### P0

- 三栏 IM Workspace
- demo-task 主链路
- TaskRun / TaskStep
- Context / Handoff
- Artifact Preview
- Artifact Revision
- Version History / Diff Summary
- Agent Builder 最小闭环
- selectedAgent / `@Agent`

### P1

- 半真实 Agent Adapter 接入
- 更清晰的 Orchestrator 规则化规划
- Deploy Status Card 静态版
- 更强的多 Agent 显式协作语义

### P2

- 真实部署
- 多端支持
- 多人协作
- WebSocket / SSE
- MySQL 持久化
- 复杂群聊调度

## 15. 当前已实现 / 未实现对照表

### 已实现

- IM Workspace
- Conversation List
- Agent List
- Agent Builder
- selectedAgent
- 最小 `@Agent`
- TaskRun / TaskStep
- ContextSnapshot / HandoffSummary
- Artifact Preview
- Artifact Revision
- Version History
- Diff Summary
- AI 协作开发记录

### 静态 Demo / Mock / Placeholder

- demo-task 编排
- Artifact revision 内容生成
- Context / Handoff 内容生成
- Diff Summary
- Codex / Claude Code Adapter

### 未实现

- 真正群聊模式
- 多个 `@Agent`
- 真实平台接入
- 真实部署状态卡片
- 多端同步
- 多人协作

## 16. 评分点对齐说明

### AI 协作能力

当前优势明显：

- Spec / Skill / Rules / Collaboration 文档齐全
- 工作流文档已沉淀
- dev-log 可追踪每轮演进

### 功能完整度

当前 MVP 主线已经闭环，但群聊、多平台真实接入仍是硬缺口。

### 生成效果质量

当前 UI 已有较强演示力，但产物质量仍受限于静态 Demo。

### 代码理解度

领域模型、Orchestrator、Adapter、Context/Handoff 关系清晰，可用于答辩讲解。

### 创新与产品感

当前创新点主要体现在：

- IM Workspace 主入口
- Context / Handoff 可见化
- Artifact-centered iteration
- 自定义 Agent 进入执行链路
