# AgentHub 产品设计文档 V0.1

## 1. 项目背景

AgentHub 面向 AI 全栈挑战赛，赛题要求构建一个“人和 AI 协作的平台”，而不是一个单纯的聊天问答产品。

根据最新课题讲解，平台需要：

- 以 IM 聊天作为核心交互范式
- 支持人与多个 Agent 协作完成复杂任务
- 支持主 Agent `Orchestrator` 负责任务理解、拆解、调度、汇总
- 支持围绕代码、网页、文档、PPT 等产物持续迭代
- 支持沉淀 `Spec / Skill / Rules` 等 AI 协作资产

因此，AgentHub 的产品核心不是“回答问题”，而是“组织多 Agent 协作并围绕 Artifact 推进工作”。

## 2. 产品定位

一句话定位：

> AgentHub 是一个基于 IM 聊天交互的多 Agent 协作平台，支持用户通过对话发起复杂任务，由主 Agent 拆解并调度多个专业 Agent 协作完成，最终生成可预览、可编辑、可迭代的产物。

定位拆解：

- 不是普通 Chatbot
- 不是以 Workflow Canvas 为主入口的编排工具
- 而是一个聊天优先、协作优先、产物优先的 AI 开发工作台

## 3. 目标用户

### 3.1 评委与导师

他们关注：

- 协作范式是否成立
- `Spec / Skill / Rules` 是否落地
- 多 Agent 调度是否真实可演示
- 产物链路是否完整

### 3.2 开发型用户

典型任务：

- 生成页面
- 生成 README
- 输出接口草案
- 检查代码质量
- 围绕已有产物继续修改

### 3.3 复杂任务发起者

他们不希望：

- 手动切换多个工具
- 自己拼接上下文
- 重复描述同一个需求

他们希望：

- 一句话发起复杂任务
- 多个 Agent 自动协作
- 生成结果后还能继续迭代

## 4. 核心痛点

### 4.1 单 Agent 产品难以处理复杂任务

复杂任务通常包含多个步骤，例如：

- 前端页面生成
- 接口草案输出
- 文档补充
- 质量检查

单 Agent 很难同时兼顾专业分工与执行过程透明度。

### 4.2 多 Agent 协作中的上下文容易混乱

如果没有明确的 Handoff 机制，前一个 Agent 的结果很难稳定传给下一个 Agent。

### 4.3 传统问答模式无法围绕产物持续推进

如果系统只返回一段文字，用户无法把代码、网页、文档当作后续修改的工作对象。

### 4.4 协作过程不可见

如果看不到：

- Task Spec
- Agent 分工
- Routing Rules
- Handoff Summary
- Reviewer 检查依据

那么评委很难认可系统具备真正的 AI 协作能力。

## 5. 产品目标

### 5.1 比赛目标

用一个稳定的 Demo 证明：

- 多 Agent 能协作完成任务
- Orchestrator 能拆任务并调度
- 系统能围绕 Artifact 做二次迭代
- 协作资产 `Spec / Skill / Rules` 已沉淀且可展示

### 5.2 MVP 目标

先完成一个 Web 优先的三栏工作台，覆盖：

- IM 会话列表
- 聊天消息流
- TaskRun / TaskStep 展示
- Context / Handoff 展示
- Artifact 预览
- Artifact 二次修改静态 Demo

## 6. 核心使用场景

### 6.1 多步骤任务生成

用户输入：

“帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。”

系统流程：

1. 生成 `Task Spec`
2. `Orchestrator` 拆解任务
3. `Frontend Builder` 生成页面
4. `Backend Worker` 生成接口草案或数据模型
5. `Reviewer` 检查验收标准
6. 在聊天流中展示 `Artifact`

### 6.2 基于已有 Artifact 的二次修改

用户选择 `LoginPage.tsx`，输入：

“把按钮改成蓝色，并增加 loading 状态。”

系统流程：

1. 创建 revision `Task Spec`
2. 创建新的 revision `TaskRun`
3. 生成新的 `LoginPage.tsx v2`
4. 生成新的 `Review Report`
5. 生成新的 `ContextSnapshot` 和 `HandoffSummary`
6. 刷新消息、任务、产物和上下文展示

这个场景是本项目体现“Artifact-centered iteration”的关键。

### 6.3 群聊协作场景

一个会话中包含：

- Orchestrator
- Frontend Builder
- Backend Worker
- Reviewer

用户既可以手动 `@Agent`，也可以让 Orchestrator 自动分派。

## 7. P0 / P1 / P2 功能范围

### 7.1 P0 必须完成

#### IM 工作台

- 会话列表
- 单聊
- 群聊
- 输入区
- 消息流

#### Orchestrator

- 任务理解
- 任务拆解
- Agent 路由
- 结果聚合

#### 多 Agent Adapter

- 至少支持 2 个主流 Agent 平台的统一接入设计
- V0.1 可先采用薄 Adapter

#### Context Management

- 聊天历史
- Pinned Context
- Artifact Handoff
- Handoff Summary

#### Artifact 预览

- Code Card
- Web Preview Card
- File Card
- Markdown Card

#### 用户自定义 Agent

- Agent 名称
- System Prompt
- Tool Tags
- Capability Tags

#### AI 协作资产

- Task Spec
- Skill
- Rules
- Collaboration Protocol

### 7.2 P1 应该完成

- Agent 状态展示
- Reviewer Flow
- Handoff Summary 可视化
- Artifact revision 链路
- 简单部署状态卡片
- 轻量 Knowledge Bridge

### 7.3 P2 时间允许再做

- Diff View
- Version History
- Deploy Action
- PPT 浏览
- 多端支持设计
- 多人协作与冲突解决说明

## 8. 页面结构

### 8.1 总体布局

MVP 采用三栏式布局：

- 左侧：Conversation List + Agent List
- 中间：Message Stream + TaskRunPanel + ContextPanel + ChatInput
- 右侧：ArtifactPanel

### 8.2 左侧栏

功能：

- 展示会话列表
- 支持新建 Demo 会话
- 展示内置 Agent 和未来的用户自定义 Agent

### 8.3 中间栏

功能：

- 作为聊天主工作台
- 展示消息流
- 展示 TaskRun / TaskStep
- 展示 ContextSnapshot / HandoffSummary
- 允许发送消息和运行 Demo Task

### 8.4 右侧栏

功能：

- 展示 Artifact 列表
- 展示 Artifact 详情
- 展示版本号
- 提供二次修改输入区

## 9. 用户流程

### 9.1 主流程

1. 用户进入工作台
2. 新建会话
3. 输入复杂需求
4. 系统生成 `Task Spec`
5. Orchestrator 拆解任务
6. 多个 Agent 返回产物
7. Reviewer 进行检查
8. 右侧展示 Artifact
9. 用户继续围绕 Artifact 发起修改

### 9.2 Revision 流程

1. 用户选中已有 Artifact
2. 输入 revision 指令
3. 系统创建新的 revision TaskRun
4. 生成新版 Artifact
5. Reviewer 输出新的 Review Report
6. ContextPanel 展示新的上下文与交接记录

## 10. Demo 场景

推荐 Demo 由两段组成：

### 第一段：任务生成

- 输入复杂需求
- 展示 Task Spec
- 展示 3 个 Agent 分工
- 展示首轮 Artifact

### 第二段：产物二次修改

- 选中 `LoginPage.tsx`
- 输入“把按钮改成蓝色，并增加 loading 状态。”
- 生成 `LoginPage.tsx v2`
- 展示新的 Review Report
- 展示新的 ContextSnapshot 和 HandoffSummary

这样能完整体现：

- 聊天式协作
- 主 Agent 调度
- 产物中心迭代
- AI 协作资产沉淀

## 11. 非目标范围 Non-goals

以下内容不属于 V0.1 必做：

- 桌面端真实实现
- 移动端真实实现
- 完整 Workflow Canvas
- 真实第三方部署
- 复杂 Diff 编辑器
- 复杂多人实时协作
- 企业级知识库基础设施

## 12. 评分点对应关系

| 评分维度 | 对应设计策略 |
|---|---|
| AI 协作能力 30% | 在 UI 和仓库中同时沉淀 `Spec / Skill / Rules / Collaboration Protocol` |
| 功能完整度 25% | 跑通 IM 主链路、Orchestrator、TaskRun、Artifact、Reviewer |
| 生成效果质量 20% | 突出三栏工作台、消息流、Artifact 预览和 revision 链路 |
| 代码理解度 15% | 保持实体、状态、服务边界清晰，便于答辩解释 |
| 创新与产品感 10% | 强调“围绕 Artifact 持续协作”的产品体验，而不是简单多模型聊天 |

## 13. 当前版本结论

当前版本的 AgentHub 应继续坚持以下产品判断：

- 聊天工作台是唯一主入口
- 多 Agent 协作是核心机制
- Artifact 是后续迭代的核心对象
- AI 协作能力必须被看见、被解释、被提交

后续所有开发和 Demo 打磨，都应围绕这条主线推进。
