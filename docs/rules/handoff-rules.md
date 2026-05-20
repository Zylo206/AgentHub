# Handoff Rules

## 1. Agent 之间如何传递上下文

Agent 之间传递上下文时，目标不是复制全部历史，而是传递“足够完成下一步工作”的最小必要信息。

Handoff 的最小输入应包括：

- Task Spec
- 当前 TaskStep
- 上一个 Agent 生成的核心 Artifact
- Handoff Summary

## 2. Handoff Summary 格式

推荐统一格式：

```json
{
  "sourceAgent": "frontend-builder",
  "targetAgent": "reviewer",
  "passedArtifacts": ["artifact_code_login_page", "artifact_readme_login_page"],
  "keyDecisions": [
    "登录页采用邮箱登录和验证码登录双 Tab 结构",
    "按钮已预留 loading 状态位置"
  ],
  "openIssues": [
    "README 暂未补充验证码流程说明"
  ]
}
```

## 3. Artifact 如何传给下一个 Agent

规则：

- 上一个 Agent 生成的主 Artifact 必须作为下一个 Agent 的核心上下文
- 不能只传 summary 而不传 Artifact 引用
- 对于 Reviewer，Artifact 是主要检查对象

## 4. 哪些信息必须传递

- taskSpecId
- userGoal
- acceptanceCriteria
- 当前步骤输出的核心 Artifact
- keyDecisions
- openIssues

## 5. 哪些信息不能传递

- 与当前 TaskStep 无关的大量历史噪音
- 无法验证的推测性结论
- 整段完整聊天历史的无差别复制

## 6. 上下文过长时如何压缩

压缩优先级：

1. 保留 Task Spec
2. 保留 Pinned Context
3. 保留核心 Artifact 引用
4. 用 Handoff Summary 代替大段聊天记录

## 7. 示例

### Frontend Builder -> Reviewer

- 传递登录页面代码 Artifact
- 传递 README Artifact
- 传递“支持两种登录模式”这一关键决策
- 传递“README 仍需补充部分说明”这一 open issue

### Backend Worker -> Reviewer

- 传递 API Contract Artifact
- 传递字段命名约定
- 传递未确定的接口错误码设计

## 8. 对实现的指导意义

Handoff Rules 后续应体现在：

- ContextManager 的 snapshot 构造逻辑
- Message Stream 中的 Handoff Summary 卡片
- Reviewer 的输入整理逻辑
