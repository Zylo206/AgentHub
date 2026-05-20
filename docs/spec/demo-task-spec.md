# Demo 任务规格 Task Spec

## 1. Demo 任务目标

本 Demo 的目标是用一个稳定、典型、可解释的多步骤任务，展示 AgentHub 的核心协作能力。

目标任务：

- 生成一个 React 登录页面
- 支持邮箱登录和验证码登录
- 生成 README
- 输出代码质量检查结果
- 支持基于已有 Artifact 的二次修改

## 2. 用户输入

用户输入如下：

> 帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。

## 3. 任务范围 Scope

本次任务包含：

- 登录页面的前端结构
- 表单模式切换
- README 文档
- 可选 API Contract 或 Data Model
- Reviewer 检查结果

## 4. 非目标范围 Non-goals

本次 Demo 不包括：

- 真实后端服务完整实现
- 真实部署发布
- 复杂多端支持
- 完整版本历史

## 5. 子任务拆解

| taskStepId | 子任务 | 说明 |
|---|---|---|
| step_frontend | 生成登录页面 | Frontend Builder 负责生成主要页面代码 |
| step_backend | 生成接口草案 | Backend Worker 可选输出 API Contract 或 Data Model |
| step_docs | 生成 README | 可由 Frontend Builder 或 Backend Worker 附带输出 Markdown |
| step_review | 检查验收标准 | Reviewer 输出 Review Report |

## 6. 需要调用的 Skill

- frontend-builder
- backend-worker
- reviewer

说明：

- Frontend Builder 是主产物生成者
- Backend Worker 在 MVP 阶段可以先输出接口草案，不强制真实后端代码
- Reviewer 负责验收标准检查，不负责主产物生成

## 7. 需要生成的 Artifact

| Artifact | artifactType | 说明 |
|---|---|---|
| React 登录页面代码 | CODE | 核心主产物 |
| README 文档 | MARKDOWN | 文档产物 |
| API Contract 或 Data Model | MARKDOWN 或 FILE | 可选后端产物 |
| Review Report | REVIEW_REPORT | 审查结果 |
| 网页预览 | WEB_PREVIEW | 若前端可预览则展示 |

## 8. 验收标准 Acceptance Criteria

- 登录页面支持邮箱登录和验证码登录两种模式
- 页面代码结构清晰，便于二次修改
- README 明确说明页面功能和基本使用方式
- Reviewer 输出结构化检查结果
- 用户提出后续修改后，系统能基于已有 Artifact 继续迭代

## 9. 风险与兜底策略

### 风险 1：前端无法稳定展示实时网页预览

兜底：

- 以 Code Card 为主
- 右侧面板展示代码和说明

### 风险 2：Backend Worker 不需要真实后端实现

兜底：

- 输出 API Contract
- 输出 Request / Response Schema

### 风险 3：Reviewer 检查过于复杂

兜底：

- 先做结构化规则检查
- 重点检查 Acceptance Criteria、代码可读性和潜在问题

## 10. 与 Demo 场景的对应关系

本 Task Spec 对应 Demo 流程中的每个环节：

- 用户输入：来源于真实聊天消息
- Task Spec：由 Orchestrator 自动生成
- Frontend Builder：负责页面主代码
- Backend Worker：负责接口草案或数据模型
- Reviewer：负责验收和建议
- Artifact：作为后续二次修改的核心上下文

## 11. 二次修改说明

推荐二次修改输入：

> 把按钮改成蓝色，并增加 loading 状态。

这一步的意义是验证：

- 系统不是重新生成全新结果
- 而是基于已有 Artifact 做增量协作
