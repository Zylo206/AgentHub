# Handoff Rules V0.5

## 1. 文档目的

Handoff Rules 用于约束 Agent 之间如何传递上下文，避免把完整聊天历史无差别复制给下一个执行者，同时保证 Reviewer 和 revision 流程能够获得足够的核心信息。

## 2. 必须传递的内容

### 2.1 TaskSpec

TaskSpec 必须传给所有相关 Agent，因为它定义了：

- `userGoal`
- `scope`
- `nonGoals`
- `acceptanceCriteria`
- `expectedArtifacts`

### 2.2 前一个 Agent 的核心 Artifact

前一个 Agent 生成的核心 Artifact 必须作为下一个 Agent 的关键输入，而不是只传一句 summary。

例如：

- Frontend Builder 生成的 `LoginPage.tsx`
- Backend Worker 生成的 API Contract
- README

### 2.3 HandoffSummary

每次交接都应带上结构化 HandoffSummary，至少包含：

- `sourceAgent`
- `targetAgent`
- `passedArtifacts`
- `keyDecisions`
- `openIssues`

### 2.4 Reviewer 特殊要求

Reviewer 必须接收：

- `acceptanceCriteria`
- 相关 Artifact
- 必要的 `keyDecisions`
- 未解决问题 `openIssues`

## 3. 不应无差别传递完整聊天历史

当前规则明确要求：

- 不把完整消息流原样复制给每个 Agent
- 不把与当前步骤无关的噪声一起传递
- 不传递无法验证的推测性结论

交接目标是：

> 传递足以完成下一步工作的最小必要上下文。

## 4. ContextSnapshot 的作用

ContextSnapshot 是一次任务执行的上下文快照，用于说明：

- 本轮任务包含哪些消息
- 本轮任务包含哪些 Artifact
- 哪些内容被视为 pinned context
- 当前任务的 summary 是什么

当前状态：

- 已在 demo-task 和 revision 链路中静态生成
- 用于前端 ContextPanel 展示

## 5. HandoffSummary 的作用

HandoffSummary 用于显示：

- 谁把结果交给了谁
- 交接了哪些 Artifact
- 关键决策是什么
- 还有哪些开放问题

当前状态：

- 已在 demo-task 和 revision 链路中静态生成
- 用于前端 ContextPanel 展示

## 6. revision 场景的额外交接规则

在 Artifact revision 时，以下内容必须传递：

- `parentArtifactId`
- `revisionInstruction`
- 原始 Artifact
- revised Artifact
- Reviewer 所需的验收依据

原因：

- revision 不是凭空重做任务
- 而是基于已有 Artifact 做增量修改

## 7. 当前 Demo 中的交接实例

### Frontend Builder -> Backend Worker

必须传递：

- `LoginPage.tsx`
- TaskSpec
- 页面目标说明
- 关键决策，例如登录方式、表单结构

### Backend Worker -> Reviewer

必须传递：

- API Contract 或 Data Model
- `LoginPage.tsx`
- README
- acceptanceCriteria
- openIssues

### Frontend Builder -> Reviewer（revision）

必须传递：

- revised `LoginPage.tsx v2`
- revisionInstruction
- 本次修改摘要

## 8. 当前实现边界

### 已完成

- demo-task 中有静态 ContextSnapshot
- demo-task 中有静态 HandoffSummary
- revision 中也会生成对应 snapshot 和 handoff
- 前端可以直接展示这些数据

### 未完成

- 真实自动上下文压缩
- 长会话下的动态裁剪
- 真实 provider 执行前的上下文注入策略
- 多人协作下的冲突合并与交接治理

## 9. 与比赛评分的关系

Handoff Rules 直接对应 AI 协作能力中的“rules”和“协作规范”：

- 证明系统不是简单多模型聊天
- 证明任务如何从一个 Agent 传到下一个 Agent
- 证明 Artifact 在协作里是核心上下文对象
