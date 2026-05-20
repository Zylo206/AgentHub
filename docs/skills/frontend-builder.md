# Frontend Builder Skill

## 1. Skill 目标

Frontend Builder Skill 用于生成前端页面、组件、样式和交互逻辑，是 AgentHub 中最重要的主产物生成 Skill 之一。

它负责把 Task Spec 中与 UI、页面结构、交互行为相关的部分，转化为可阅读、可预览、可继续迭代的前端 Artifact。

## 2. 输入 Input

Frontend Builder 至少需要以下输入：

- Task Spec
- 当前 TaskStep 描述
- Required Context
- 前序 Agent 生成的 Artifact
- Handoff Summary

示例输入内容：

- 页面目标
- 约束条件
- 代码风格要求
- 是否需要生成 README

## 3. 输出 Output

输出内容至少包括：

- 结构化完成摘要
- 一个或多个前端 Artifact
- 后续建议或待确认点

推荐输出格式：

- summary
- artifacts
- openIssues

## 4. 负责 Agent

默认负责 Agent：

- Frontend Builder

也允许：

- 用户自定义 Agent 绑定该 Skill

## 5. 可生成的 Artifact 类型

- CODE
- WEB_PREVIEW
- MARKDOWN

说明：

- CODE 用于页面代码和组件代码
- WEB_PREVIEW 用于可视化预览
- MARKDOWN 用于补充说明或 README

## 6. 必需上下文 Required Context

执行前至少需要：

- taskSpecId
- userGoal
- scope
- acceptanceCriteria
- constraints
- relevantArtifacts

如果是二次修改任务，还需要：

- 上一个版本的 CODE Artifact
- 变更请求对应的 Message

## 7. 执行步骤

1. 读取 Task Spec，确认页面范围
2. 读取与当前页面相关的 Artifact 和上下文
3. 识别页面结构、状态、交互要求
4. 生成代码 Artifact
5. 如有条件，生成 WEB_PREVIEW 或 MARKDOWN 说明
6. 返回结构化 summary，说明完成内容和剩余问题

## 8. 验证规则 Verification Rules

- 输出代码必须与 Task Spec 的 scope 对齐
- 必须尽量保证代码可读性
- 命名应清晰
- 结构应便于后续 Agent 或用户继续修改
- 若存在明显不确定项，必须显式说明

## 9. 失败处理 Failure Handling

如果无法完整生成页面：

- 优先输出页面结构草案
- 或输出关键组件结构和交互说明
- 不得伪造“已经完成预览”
- 必须说明失败原因和缺失项

## 10. 对 AgentHub 的意义

Frontend Builder Skill 是 Demo 中最容易被评委直接感知的 Skill，因为它直接对应：

- 生成效果质量
- 功能完整度
- Artifact 可视化

因此它的输出必须优先考虑：

- 可展示
- 可解释
- 可继续修改
