# AgentHub Demo 场景文档

## 1. Demo 目标

本 Demo 用于稳定展示 AgentHub 的核心价值：

- 不是普通 Chatbot，而是多 Agent 协作平台
- 主入口是 IM 聊天
- Orchestrator 能理解复杂任务并拆分
- Specialist Agent 能生成主产物
- Reviewer 能按 Acceptance Criteria 检查结果
- 用户能基于已有 Artifact 继续迭代

## 2. Demo 前置条件

### 2.1 产品前提

- Web 聊天工作台可用
- 至少支持单会话消息流展示
- 可展示 Task Spec 卡片
- 可展示至少 3 类 Artifact：
  - CODE
  - MARKDOWN
  - REVIEW_REPORT

### 2.2 Agent 前提

- Orchestrator 可用
- Frontend Builder 可用
- Backend Worker 可选可用
- Reviewer 可用

### 2.3 演示策略

- 优先确保流程稳定，不追求复杂外部依赖
- Backend Worker 可以只输出 API Contract 或 Data Model

## 3. 用户输入

推荐统一输入：

> 帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。

## 4. 系统响应步骤

### Step 1：用户提交多步骤任务

前端展示用户消息，并明确这是一个复杂任务。

### Step 2：系统生成 Task Spec

系统在聊天流中展示一张 Task Spec 卡片，内容包括：

- 任务目标
- Scope
- Non-goals
- Acceptance Criteria
- Expected Artifacts

### Step 3：Orchestrator 拆解任务

系统在聊天流中展示 Task Plan，拆分为：

- 前端页面生成
- 可选后端接口草案
- README 生成
- Review 检查

### Step 4：Frontend Builder 生成 React 页面

输出 Artifact：

- LoginPage.tsx
- 登录表单相关样式
- 交互说明

### Step 5：Backend Worker 输出接口草案或数据结构

如果该步骤启用，则输出：

- API Contract
- Request/Response Schema
- 可选 Data Model

### Step 6：Reviewer 检查验收标准

Reviewer 输出：

- Passed
- Issues
- Suggestions
- Risk Level

### Step 7：Artifact 在聊天中出现

聊天中至少出现以下卡片：

- Code Card
- Markdown Card
- Review Report Card

### Step 8：右侧 Artifact Panel 展示核心产物

右侧面板集中展示：

- 代码
- README
- Review Report

### Step 9：用户提出一次后续修改

推荐修改输入：

> 把按钮改成蓝色，并增加 loading 状态。

### Step 10：系统基于已有 Artifact 继续迭代

系统不重新创建全新任务，而是：

- 基于现有 Artifact 做增量修改
- 更新 Code Artifact
- 更新 Review Report 或变更摘要

## 5. 展示重点

Demo 中必须强调的不是“生成了一段代码”，而是：

### 5.1 协作能力

- Task Spec 是如何形成的
- Skill 是如何参与路由的
- Rules 是如何决定 Agent 分工的
- Handoff 是如何把 Artifact 传给下一个 Agent 的

### 5.2 产品体验

- 聊天流是否像 IM
- Artifact 是否能内联显示
- 右侧面板是否能把产物展示清楚

### 5.3 可解释性

- 为什么 Frontend Builder 接了页面任务
- 为什么 Reviewer 在最后执行
- 为什么第二次修改基于已有 Artifact 而不是重新开始

## 6. 预期生成的 Artifact

| Artifact | artifactType | 说明 |
|---|---|---|
| React 登录页面代码 | CODE | 主产物 |
| README | MARKDOWN | 文档产物 |
| API Contract 或 Data Model | MARKDOWN 或 FILE | Backend Worker 可选产物 |
| Review Report | REVIEW_REPORT | Reviewer 输出 |
| 网页预览 | WEB_PREVIEW | 如前端支持则展示 |

## 7. 失败兜底策略

### 7.1 Frontend Builder 失败

兜底方式：

- 至少输出页面结构草案
- 或输出组件树和关键交互说明

### 7.2 Backend Worker 不可用

兜底方式：

- 直接输出 API Contract 文本版
- 不阻塞主 Demo 链路

### 7.3 Reviewer 失败

兜底方式：

- 输出最小 Review Summary
- 明确说明本次只做规则级检查

### 7.4 Web Preview 不稳定

兜底方式：

- 以 Code Card + Markdown Card 为核心
- 右侧面板展示代码而不是依赖实时运行

## 8. 3 分钟视频讲解结构

### 第 1 分钟：问题和产品定位

- AgentHub 不是普通聊天机器人
- 它解决的是复杂任务协作问题
- 主入口是聊天，核心是多 Agent 协作

### 第 2 分钟：主流程演示

- 用户输入任务
- 系统生成 Task Spec
- Orchestrator 拆解任务
- Frontend Builder / Backend Worker / Reviewer 协作
- Artifact 卡片出现

### 第 3 分钟：二次迭代与总结

- 用户提出“按钮改成蓝色并增加 loading 状态”
- 系统基于已有 Artifact 修改
- 展示 Review Report 或变更结果
- 总结 Spec / Skill / Rules / Collaboration Protocol 如何驱动整套系统
