# Collaboration Protocol

## 1. 协作协议目标

Collaboration Protocol 用于定义 AgentHub 中用户、Orchestrator、Specialist Agent、Reviewer 之间如何协同完成任务。

它的目标是让协作流程：

- 可规划
- 可执行
- 可追踪
- 可解释

## 2. Orchestrator 的职责

Orchestrator 是协作流程的协调者，而不是替代所有 Agent 的超级执行器。

职责包括：

- 从用户输入生成 Task Spec
- 生成 TaskPlan
- 基于 Skill 和 Routing Rules 分配 TaskStep
- 管理执行顺序
- 聚合结果
- 在失败时触发降级或回退

## 3. Specialist Agent 的职责

Specialist Agent 指承载具体 Skill 的执行 Agent。

职责包括：

- 负责完成某个明确 TaskStep
- 生成主产物 Artifact
- 输出结构化 summary
- 为下一个 Agent 提供 Handoff 基础

## 4. Reviewer Agent 的职责

Reviewer 不负责替代主产物生成，而是负责：

- 检查 Acceptance Criteria
- 检查 Artifact 是否完整
- 检查风险和明显缺陷
- 输出结构化 Review Report

## 5. Human-in-the-loop 规则

用户在以下关键点介入：

- 任务歧义较大时
- 任务方向变化时
- 失败需要重试或改路线时
- 最终结果确认时

原则：

- 不要让用户介入每个细节
- 只在关键决策点拉用户进入

## 6. Task Spec 生成流程

1. 用户提交原始任务
2. Orchestrator 提取 userGoal
3. Orchestrator 明确 scope 和 nonGoals
4. Orchestrator 生成 acceptanceCriteria
5. Orchestrator 识别 requiredSkills 和 expectedArtifacts
6. 形成 Task Spec

## 7. Skill 匹配流程

1. Orchestrator 读取 Task Spec
2. 根据 requiredSkills 找到合适 Skill
3. AgentRouter 根据 Routing Rules 绑定 Agent
4. 形成 TaskStep -> Agent 的映射

## 8. 上下文交接流程

1. 当前 TaskStep 完成
2. 系统保存 Artifact
3. ContextManager 生成 Handoff Summary
4. 形成 ContextSnapshot
5. 下一个 Agent 接收 Task Spec + Artifact + Handoff Summary

## 9. Artifact 迭代流程

1. Specialist Agent 生成 Artifact
2. Artifact 在消息流中展示
3. 用户或 Reviewer 基于 Artifact 给反馈
4. Orchestrator 重新生成局部 TaskStep
5. 新版本 Artifact 覆盖或追加

## 10. 协作失败处理流程

当协作失败时：

- 如果是信息不足，回到用户确认
- 如果是某个 Agent 输出无效，重试或切换 fallback Agent
- 如果 Web Preview 失败，以 Code / Markdown Artifact 兜底
- 如果 Reviewer 无法完成完整检查，输出最小 Review Summary

## 11. 对比赛评分的价值

Collaboration Protocol 直接对应比赛中的 AI 协作能力评分，因为它把：

- Spec
- Skill
- Rules
- Handoff
- Reviewer

串成了一套可执行协议，而不是停留在概念层。
