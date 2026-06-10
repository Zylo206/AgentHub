# Collaboration Protocol V0.5

## 1. 协议目标

Collaboration Protocol 用于定义 AgentHub 中用户、Orchestrator、Specialist Agent、Reviewer、Artifact 之间如何协同完成任务。它不是一句口号，而是当前比赛里用于体现 AI 协作能力的核心协议层。

目标：

- 可解释
- 可展示
- 可在代码和界面中落地

## 2. Spec 如何生成

当前协议要求：

1. 用户先通过聊天输入任务
2. 系统把用户输入结构化为 TaskSpec
3. TaskSpec 至少包含：
   - `userGoal`
   - `userInput`
   - `scope`
   - `nonGoals`
   - `acceptanceCriteria`
   - `requiredSkills`
   - `expectedArtifacts`

当前 Demo 体现方式：

- demo-task 会生成静态 TaskSpec
- ContextPanel 中可看到 TaskSpec 相关信息

当前限制：

- TaskSpec 仍是静态模板，不是真实模型抽取

## 3. Skill 如何匹配

当前协议中，Skill 的作用是把任务拆解到明确角色：

- `frontend-builder`
- `backend-worker`
- `reviewer`

Skill 匹配逻辑：

- 页面、组件、UI、样式相关任务优先进入 Frontend Builder
- API Contract、数据模型、服务逻辑相关任务优先进入 Backend Worker
- 验收、质量检查、风险检查相关任务优先进入 Reviewer

当前 Demo 体现方式：

- TaskRunPanel 中可看到不同角色的 TaskStep

## 4. Rules 如何约束执行

当前协议要求 Orchestrator 和 Routing Rules 必须共同约束：

- 任务先做 Specialist execution，再进入 Reviewer
- Context 不应无差别传递完整聊天历史
- Handoff 必须传核心 Artifact
- Revision 必须显式带上 `parentArtifactId` 和 `revisionInstruction`

当前 Demo 体现方式：

- 路由策略体现在 TaskStep 的 Agent 分工
- Handoff 体现在 ContextPanel 中的 HandoffSummary

## 5. Orchestrator 如何拆解任务

当前产品设计目标中，Orchestrator 类似 PM / PMO：

- 理解任务
- 拆解任务
- 分配任务
- 聚合结果
- 处理失败降级

当前代码状态：

- 后端已有 `OrchestratorService`
- demo-task 和 revision 主链路已通过该服务组织
- 但当前拆解仍是静态 Demo 编排，不是真实动态任务规划

## 6. Specialist Agent 如何执行

Specialist Agent 指：

- Frontend Builder
- Backend Worker

当前协议要求：

- Specialist Agent 负责生成主产物
- 每个 TaskStep 应产出可继续传递的 Artifact
- 执行时应附带 adapter 信息

当前 Demo 体现方式：

- TaskStep 中已记录：
  - `preferredAdapterType`
  - `actualAdapterType`
  - `adapterStatus`
  - `adapterResponseSummary`
  - `adapterErrorMessage`

## 7. Reviewer 如何验收

Reviewer 不负责主产物生成，而负责：

- 检查 `acceptanceCriteria`
- 检查代码和文档是否满足要求
- 输出 `Review Report`

当前 Demo 体现方式：

- Reviewer 生成静态 Review Report
- ContextPanel 中可看到 Reviewer 的上下文来源
- ArtifactPanel 中可看到 Review Report

当前限制：

- Reviewer 仍是静态审查，不是真实自动分析

## 8. Context 如何交接

交接原则：

- TaskSpec 必须传给相关 Agent
- 前一个 Agent 的 Artifact 是后一个 Agent 的核心上下文
- 使用 HandoffSummary 压缩关键上下文
- 不无差别传完整聊天历史

当前 Demo 体现方式：

- ContextSnapshot 保存当前任务上下文快照
- HandoffSummary 显示：
  - `sourceAgentId`
  - `targetAgentId`
  - `passedArtifactIds`
  - `keyDecisions`
  - `openIssues`

当前限制：

- 仍是静态构造
- 不是真实长期 memory system

## 9. Artifact 如何进入下一轮迭代

这是 AgentHub 当前最核心的协作设计：

1. Specialist Agent 先生成 Artifact
2. Artifact 在右侧面板中成为可选工作对象
3. 用户基于该 Artifact 发起 revision instruction
4. 系统生成新的 revision TaskRun
5. 生成新的版本 Artifact 和新的 Review Report

当前 Demo 体现方式：

- `LoginPage.tsx v1 -> v2`
- Version History
- Diff Summary
- Revision 来源提示

## 10. Human-in-the-loop 何时介入

用户在以下时点介入：

- 初始任务输入
- Artifact 选中与 revision 指令输入
- 自定义 Agent 创建和配置

当前未实现：

- 更复杂的确认流
- 审批式中断
- 多人协作中的人工仲裁

## 11. 当前静态 Demo 如何体现该协议

当前 Demo 虽然是静态，但已经可见地体现了协议中的关键元素：

- TaskSpec
- TaskRun / TaskStep
- Agent 分工
- Adapter 路由与 fallback
- ContextSnapshot
- HandoffSummary
- Artifact revision
- Version History
- Review Report

这意味着当前版本已经可以用于说明“协作协议成立”，但不能误写成“真实模型驱动的协作系统已完整完成”。

## 12. 后续真实 Agent 接入后的协议变化

当未来接入真实 Agent provider 后，协议会有两点变化：

1. TaskSpec 生成会从静态模板过渡到真实模型驱动
2. Specialist / Reviewer 的输出会从静态模板过渡到真实 Agent 执行结果

但即使接入真实 provider，以下协议层原则也不会变：

- 聊天是主入口
- Artifact 是协作核心对象
- Context 和 Handoff 必须显式化
- Reviewer 必须按验收标准输出结果
