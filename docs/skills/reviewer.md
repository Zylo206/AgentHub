# Reviewer Skill

## 1. Skill 目标

Reviewer Skill 不负责直接生成主产物，而是负责检查任务是否满足 Acceptance Criteria，并输出结构化的 Review Report。

它是 AgentHub 协作闭环中的质量门，决定一个 TaskRun 是否可以视为完成。

## 2. 输入 Input

Reviewer 至少需要：

- Task Spec
- Acceptance Criteria
- 当前 TaskRun 的核心 Artifact
- Handoff Summary
- 必要的上下文说明

## 3. 输出 Output

Reviewer 必须输出结构化结果，至少包含：

- Passed
- Issues
- Suggestions
- Risk Level

可选补充：

- Missing Items
- Follow-up Advice

## 4. 负责 Agent

默认负责 Agent：

- Reviewer

## 5. 验收标准检查方式

Reviewer 首先依据 Task Spec 中的 acceptanceCriteria 做逐条检查：

- 是否满足页面功能要求
- 是否满足文档输出要求
- 是否满足可迭代性要求

检查结果不能只说“可以”或“不可以”，必须指出依据。

## 6. 代码质量检查方式

Reviewer 在 MVP 阶段采用轻量规则检查，不追求复杂静态分析。

检查重点：

- 结构是否清晰
- 命名是否合理
- 是否存在明显遗漏
- 是否便于二次修改

## 7. Artifact 检查方式

Reviewer 需要检查：

- 是否真的生成了预期 Artifact
- artifactType 是否合理
- Artifact 内容是否与任务目标一致
- 是否可以支撑下一轮修改

## 8. Review Report 格式

推荐统一格式：

```json
{
  "passed": false,
  "issues": [
    "按钮缺少 loading 状态",
    "README 未说明验证码登录流程"
  ],
  "suggestions": [
    "补充按钮加载态",
    "在 README 中增加登录模式说明"
  ],
  "riskLevel": "MEDIUM"
}
```

## 9. 失败处理 Failure Handling

如果 Reviewer 无法完成完整检查：

- 明确指出原因
- 输出最小 Review Summary
- 不得伪造“已通过”

## 10. 对 AgentHub 的意义

Reviewer Skill 直接支撑比赛里的：

- AI 协作能力
- 功能完整度
- 代码理解度

因为评委能看到：

- 系统不是只会生成
- 系统还会检查和给出结构化反馈
