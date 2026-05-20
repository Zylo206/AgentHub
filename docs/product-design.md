# AgentHub 产品设计文档 V0.1

## 1. 项目背景

AgentHub 面向 AI 全栈挑战赛，目标不是做一个普通 Chatbot，而是做一个基于 IM 聊天交互的多 Agent 协作平台。用户通过聊天发起复杂任务，由协调器 Orchestrator 负责理解需求、拆解任务、路由 Agent、组织上下文交接 Handoff，并围绕代码、网页、文档等产物 Artifact 持续迭代。

比赛明确强调的重点不是单点模型能力，而是：

- IM 聊天式产品体验
- 多 Agent 协作机制
- Orchestrator 的任务调度能力
- 上下文管理 Context Management
- Artifact 预览与迭代能力
- AI 协作资产的沉淀能力

## 2. 产品定位

一句话定位：

> AgentHub 是一个基于 IM 聊天交互的多 Agent 协作平台，支持用户通过对话方式发起复杂任务，由主 Agent 拆解并调度多个专业 Agent 协作完成，最终生成可预览、可编辑、可迭代的产物。

定位拆解：

- 不是普通问答产品，而是协作系统
- 主入口是聊天工作台，不是 Workflow Canvas
- 核心价值是“任务协作 + 产物演进”
- Web 端是 MVP 主交付端

## 3. 目标用户

### 3.1 比赛评审与导师

关注点：

- 是否体现多 Agent 协作能力
- 是否沉淀出 Spec / Skill / Rules / Collaboration Protocol
- 是否能在 3 分钟内看懂产品价值和技术实现

### 3.2 开发者型用户

典型任务：

- 生成前端页面
- 补 README 或技术文档
- 做简单 API 设计
- 对代码进行检查和修改

### 3.3 复杂任务发起者

典型诉求：

- 不想手动切换多个工具
- 希望把一个复杂任务交给多 Agent 协作完成
- 希望围绕生成产物持续修改，而不是反复重新提问

## 4. 核心痛点

### 4.1 单 Agent 模式难以处理复杂任务

普通聊天机器人更适合单轮问答，不适合“页面生成 + 文档生成 + 质量检查”这种多步骤任务。

### 4.2 上下文容易丢失或污染

多个 Agent 协作时，前一个 Agent 的输出如何准确传递给下一个 Agent 是核心难点。

### 4.3 产物无法持续迭代

传统问答模式只返回文本，无法把代码、网页、README 作为可继续修改的工作对象。

### 4.4 协作过程不可见

如果 Orchestrator 如何拆解任务、如何路由 Agent、为什么得出某个结果都不可见，评委很难认可“AI 协作能力”。

## 5. 产品目标

### 5.1 MVP 目标

构建一个稳定的 Web 端多 Agent 聊天工作台，支持：

- 单聊和群聊
- Orchestrator 任务拆解
- 至少 2 个 Agent Adapter 的统一设计
- Context Handoff
- Artifact 卡片预览
- 用户自定义 Agent

### 5.2 比赛目标

围绕评分点明确达成：

- AI 协作能力可见、可交付、可解释
- 核心功能可跑通
- 产物展示效果清晰
- 架构逻辑容易答辩

## 6. 核心使用场景

### 6.1 多步骤开发任务

用户输入：

“帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。”

系统流程：

1. Orchestrator 生成 Task Spec
2. Frontend Builder 负责页面代码
3. Backend Worker 可选输出 API Contract 或 Data Model
4. Reviewer 检查 Acceptance Criteria
5. Artifact 在聊天流中显示
6. 用户继续迭代修改

### 6.2 基于已有产物继续修改

用户不重新描述全部需求，而是基于当前 Artifact 提出局部修改，例如：

“把按钮改成蓝色，并增加 loading 状态。”

系统应能围绕已有 Artifact 继续工作，而不是重新开始。

### 6.3 群聊协作场景

一个会话内同时包含：

- Orchestrator
- Frontend Builder
- Backend Worker
- Reviewer

用户既可以手动 `@Agent`，也可以让 Orchestrator 自动分派。

## 7. 功能范围

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

- 统一 Adapter 设计
- 至少支持 2 个 Agent 平台的接入预留
- V0.1 允许先做薄 Adapter，不承诺复杂平台能力

#### 上下文管理 Context Management

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

- Agent Name
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
- Handoff Summary 可视化
- Reviewer Flow
- Knowledge Bridge

### 7.3 P2 时间允许再做

- Diff View
- Deploy Action
- Version History
- 多端支持设计说明

## 8. 页面结构

## 8.1 整体布局

MVP 推荐采用三栏式布局：

- 左侧：Conversation List + Agent List
- 中间：Chat Workspace
- 右侧：Artifact Panel + Task Status + Review Result

## 8.2 页面组成

### 页面一：Chat Workspace

核心职责：

- 作为唯一主入口
- 承载单聊与群聊
- 显示消息流、状态卡片、Artifact 卡片

### 页面二：Agent Builder

核心职责：

- 创建和编辑用户自定义 Agent
- 配置 System Prompt、Tool Tags、Capability Tags

### 页面三：Artifact Panel

核心职责：

- 预览代码、文档、网页
- 展示 Review Report
- 后续支持 Diff View

### 页面四：Task Detail Drawer

核心职责：

- 查看当前 Task Spec
- 查看 TaskPlan
- 查看路由和执行状态

## 9. 用户流程

### 9.1 主流程

1. 用户进入 Web 工作台
2. 新建会话或选择现有会话
3. 输入一个复杂任务
4. 系统生成 Task Spec
5. Orchestrator 拆解任务并路由 Agent
6. Specialist Agent 生成主产物
7. Reviewer 检查结果
8. 产物以内联卡片 + 右侧面板形式展示
9. 用户基于 Artifact 继续提修改要求
10. 系统围绕已有 Artifact 继续迭代

### 9.2 自定义 Agent 流程

1. 用户进入 Agent Builder
2. 设置名称、Prompt、Tool Tags、Capability Tags
3. 保存后在会话中作为独立 Agent 出现
4. 后续可由用户手动 `@Agent` 或被 Orchestrator 路由调用

## 10. Demo 场景

推荐使用统一稳定场景：

- 用户要求生成 React 登录页面
- 系统输出代码、README、Review Report
- 用户基于已有 Artifact 继续提出 UI 修改

这个场景能完整覆盖：

- 多步骤任务
- 多 Agent 分工
- Handoff
- Artifact 预览
- Reviewer 检查
- 二次迭代

## 11. 非目标范围 Non-goals

以下内容不属于 V0.1 必做范围：

- 桌面端真实实现
- 移动端真实实现
- 完整 Workflow Canvas
- 复杂多人实时协同
- 深度 IDE 集成
- 真实生产级部署流水线
- 复杂知识库基础设施

## 12. 评分点对应关系

| 评分维度 | 对应产品策略 |
|---|---|
| AI 协作能力 30% | 让 Spec、Skill、Rules、Collaboration Protocol 既存在于 docs，也体现在产品流程里 |
| 功能完整度 25% | 优先完成聊天、Orchestrator、Adapter、Artifact 主链路 |
| 生成效果质量 20% | 提升聊天界面、Artifact 卡片、右侧预览面板体验 |
| 代码理解度 15% | 确保实体、流程、状态机清晰，便于答辩解释 |
| 创新与产品感 10% | 强调“围绕 Artifact 持续协作”的体验，而不是普通聊天切模型 |

## 13. V0.1 输出结论

V0.1 阶段的目标不是交付完整成品，而是完成以下初始化：

- 冻结产品范围
- 冻结主入口和主链路
- 明确前后端模块边界
- 建立可复用的 Spec / Skill / Rules / Collaboration Protocol 文档体系
- 定义一个稳定可演示的 Demo 场景
