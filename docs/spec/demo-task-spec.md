# Demo Task Spec V0.5

## 1. 基本信息

```json
{
  "taskSpecId": "task_spec_demo_login_page_v1",
  "title": "Generate React Login Page Demo",
  "status": "READY"
}
```

## 2. userGoal

生成一个可演示的登录页面协作链路，展示 AgentHub 如何围绕页面、文档、审查和后续修改组织多 Agent 协作。

## 3. userInput

> 帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。

## 4. scope

- 生成一个 React 登录页面代码 Artifact
- 生成 README 文档 Artifact
- 生成 API Contract 或 Data Model 类 Artifact
- 生成 Review Report
- 支持基于 `LoginPage.tsx` 的 revision 演示

## 5. nonGoals

- 不实现真实后端服务
- 不实现真实部署
- 不实现真实代码 diff
- 不实现真实 provider 调用
- 不实现多人协作

## 6. acceptanceCriteria

- 登录页面支持邮箱登录和验证码登录两种模式
- 页面代码结构清晰，便于展示和后续修改
- README 能描述页面功能和使用方式
- 系统能展示 Reviewer 的检查结果
- 用户能够基于已有 Artifact 发起二次修改
- 二次修改后能看到 `v1 -> v2` 的版本演进

## 7. requiredSkills

- `frontend-builder`
- `backend-worker`
- `reviewer`

## 8. expectedArtifacts

- `LoginPage.tsx`
- `README.md`
- `login-api-contract.json` 或 Data Model 文本
- `Review Report`

## 9. taskSteps

### Step 1

- `stepOrder`: 1
- `assignedAgent`: `Frontend Builder`
- `goal`: 生成 React 登录页面
- `preferredAdapter`: `CODEX`
- `actualAdapter`: `MOCK` fallback in current demo

### Step 2

- `stepOrder`: 2
- `assignedAgent`: `Backend Worker`
- `goal`: 输出 API Contract 或 Data Model
- `preferredAdapter`: `MOCK`
- `actualAdapter`: `MOCK`

### Step 3

- `stepOrder`: 3
- `assignedAgent`: `Reviewer`
- `goal`: 按 acceptanceCriteria 进行检查
- `preferredAdapter`: `CLAUDE_CODE`
- `actualAdapter`: `MOCK` fallback in current demo

## 10. contextHandoff

交接要求：

- TaskSpec 传给所有相关 Agent
- Frontend Builder 产出的 `LoginPage.tsx` 必须传给 Backend Worker 和 Reviewer
- README 作为附加上下文传给 Reviewer
- API Contract / Data Model 传给 Reviewer
- HandoffSummary 中必须包含：
  - `sourceAgent`
  - `targetAgent`
  - `passedArtifacts`
  - `keyDecisions`
  - `openIssues`

## 11. revisionFlow

revision 输入示例：

> 把按钮改成蓝色，并增加 loading 状态。

revision 预期行为：

1. 选中 `LoginPage.tsx v1`
2. 创建新的 revision TaskSpec
3. 创建新的 revision TaskRun
4. 生成 `LoginPage.tsx v2`
5. 生成新的 Review Report
6. 生成新的 ContextSnapshot / HandoffSummary
7. 在前端展示 Version History、Diff Summary、Revision 来源提示

## 12. fallbackPlan

若 preferred adapter 不可真实执行：

- Frontend Builder：`CODEX -> MOCK`
- Reviewer：`CLAUDE_CODE -> MOCK`
- Backend Worker：直接 `MOCK`

若 Web Preview 不稳定：

- 以 CODE / MARKDOWN / REVIEW_REPORT 文本预览为主

若 revision 执行失败：

- 保留 `v1` 演示
- 使用当前已加载的 Version History 和 Diff Summary 结构继续说明设计目标
