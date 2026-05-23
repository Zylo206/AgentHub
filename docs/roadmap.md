# AgentHub Roadmap

## 1. 当前阶段

当前 AgentHub 处于 **MVP 功能扩展期**。

项目已经形成可运行闭环：

- IM Workspace
- Agent 联系人和 Agent Builder
- selectedAgent / 单 @Agent / 多 @Agent
- 规则化 Orchestrator
- 群聊式 Agent 消息流
- ContextSnapshot / HandoffSummary
- Pinned Context / MemoryItem MVP
- Agent Adapter Layer / Mock fallback / OpenAI Compatible / CLI 探测型 Adapter
- Artifact Studio / Revision / Version History / line diff
- Deploy Status Card / `/preview/:artifactId`
- API 级 smoke test
- AI 协作开发记录

当前阶段还不应表述为完整多 Agent 平台。关键边界是：

- 并行调度已在 demo-task Agent Step 层使用 `CompletableFuture` 执行并发组，但仍不是完整动态 DAG
- LLM Planner 已支持 `OPENAI_COMPATIBLE` 可配置 JSON plan，但默认仍关闭并保留规则 fallback
- MemoryItem 已有本地 JSON 文件持久化和规则检索，但不是生产级长期记忆系统
- Deploy Preview 仍是本地静态模拟，不是真实部署
- Codex / Claude Code / OpenCode 仍是 CLI 探测型半真实接入，不是深度平台集成

## 2. 已完成

### 文档与协作资产

- Spec / Skill / Rules / Collaboration 文档体系
- `development-workflow.md`
- `prompt-template.md`
- `dev-log.md`
- `demo-checklist.md`
- `decision-log.md`
- `mvp-requirements-alignment.md`
- 本地 smoke test 说明

### 前后端基础工程

- React + Vite 前端工程
- Spring Boot 后端工程
- 核心领域模型
- 内存 Repository
- 基础 REST API
- API 级 smoke test

### IM 与 Agent 工作台

- 三栏 IM Workspace
- Conversation List
- Agent List
- Message Stream
- ChatInput
- TaskRunPanel
- ContextPanel
- ArtifactPanel / Artifact Studio
- Agent Builder
- selectedAgent
- `Message.targetAgentId`
- `Message.mentionedAgentIds`
- 单 @Agent / 多 @Agent 文本解析
- Conversation participants 最小模型

### Orchestrator 与协作链路

- TaskSpec / TaskRun / TaskStep
- Planner / Router / Executor / Aggregator 拆分
- Orchestrator 可解释面板
- 群聊式 Agent 消息流
- selectedAgent / mentionedAgentIds 路由
- parallelGroupKey / dependsOnStepOrders 计划字段
- demo-task Agent Step 并发组执行 v1
- LLM Planner JSON Schema MVP
- Adapter fallback 记录

### Context / Memory

- ContextSnapshot
- HandoffSummary
- Pinned Context
- Message pin / unpin
- MemoryItem MVP
- Message 保存为长期记忆
- Pinned context / memory 注入 TaskStep inputContext
- MemoryItem 本地文件持久化
- MemoryItem 规则检索和 lastUsedAt 更新

### Artifact / Deploy

- Artifact Preview
- Artifact Revision
- Version History
- line diff / Diff Summary
- Artifact 内容复制
- Artifact 文件下载
- Deploy Status Card
- `/preview/:artifactId`
- Preview 页面版本切换

### Adapter

- AgentAdapterRegistry
- AdapterDescriptor / Adapter 状态展示
- MockAgentAdapter
- OpenAICompatibleAgentAdapter
- Codex / Claude Code / OpenCode CLI 探测型 Adapter
- Adapter fallback 到 MOCK
- Adapter 成功输出进入 Artifact / MessageStream / ContextSnapshot 的半真实链路

## 3. 下一阶段 P0

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P0-1 | 真实并行多 Agent 调度 v1 | 已推进：课题明确要求并行调度，当前已把 parallelGroupKey 接入执行层 | 同一 parallel group 的 step 使用 `CompletableFuture` 并发执行；失败不影响主 Demo；TaskRunPanel 能展示真实并发执行结果 |
| P0-2 | LLM Planner JSON Schema MVP | 已推进：Orchestrator 可选用 OPENAI_COMPATIBLE 生成 plan，并保留规则 fallback | 配置 `LLM` planner 后调用 OPENAI_COMPATIBLE 生成 JSON plan；schema 校验失败、fallback 或模型不可用时回退 RuleBasedPlanner；TaskRunPanel 可展示 planner mode / fallback reason |
| P0-3 | MemoryItem 持久化与检索策略 | 已推进：长期记忆从内存态升级到本地文件持久化和规则检索 | Memory API 支持稳定查询、更新、删除；Orchestrator 按 scope / category / importance / lastUsedAt 检索 memory |
| P0-4 | Adapter 成功输出 Artifact 增强 | 已推进：降低“Adapter 只是状态展示”的风险 | 非 MOCK 成功响应能生成 Review Report / Markdown Artifact，并进入 TaskStep producedArtifactIds / MessageStream / ContextSnapshot / TaskRun summary |
| P0-5 | 文档 V1.0 同步 | 代码能力变化快，文档必须跟上 | README、technical-design、demo-checklist、roadmap 与当前代码一致 |
| P0-6 | 仓库卫生与提交前检查 | 保证 MVP 可稳定交接 | 清理构建缓存；backend build、frontend build、smoke test 全通过 |

## 4. 下一阶段 P1

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P1-1 | 消息操作深化 | 已推进：复制、引用、回复、结构化引用字段、基于消息重新运行 Demo Task 已可见 | 后续继续补完整 reply thread 和单条 Agent 回复重新生成 |
| P1-2 | 一键应用 Diff | 已推进：Diff Summary 可调用后端轻量行级 patch apply 生成 ACCEPTED Artifact | 后续继续补 AST patch / 代码编辑器 / 冲突处理 |
| P1-3 | Orchestrator Decision DTO | 当前解释面板由前端派生，后端缺结构化决策输出 | 后端返回 planner / router / executor / aggregator decision trace |
| P1-4 | Adapter 测试面板 | 半真实接入需要更容易演示和验收 | `/agents` 或 Workspace 可测试 Adapter availability / execute |
| P1-5 | Smoke test 扩展 | 防止后续回归 | 覆盖并行 group、LLM planner fallback、Memory retrieval、Adapter output Artifact |

## 5. P2 后置

| 优先级 | 任务 | 当前建议 |
|---:|---|---|
| P2-1 | MySQL 全量持久化 | P0 完成后再做 |
| P2-2 | WebSocket / SSE | 暂缓，开发面较大 |
| P2-3 | 真实 Vercel / Netlify / Docker 部署 | 暂缓，风险高 |
| P2-4 | 文件附件 / 图片 | P1 后再做 |
| P2-5 | 桌面端 / 移动端 | 只做设计说明，真实实现后置 |
| P2-6 | 动态 DAG 引擎 | 当前不做，先保 MVP 可解释性 |

## 6. 推荐立即执行顺序

1. 完成仓库卫生与文档同步。
2. 继续补完整回复线程、单条 Agent 回复重新生成和冲突处理。
3. 同步 technical-design / demo-checklist 到最新能力。
4. 准备最终提交前 smoke test 和仓库卫生检查。
5. 评估是否需要 MySQL 持久化或更真实 Adapter 测试面板。

## 7. 当前阶段结论

当前 AgentHub 是一个 **半真实 AgentHub MVP 原型**。

它已经能证明 IM 式多 Agent 协作、demo-task 并发组、可配置 LLM Planner、Artifact-centered iteration、Adapter fallback、Adapter Output Artifact、本地持久化 Context / Memory、结构化消息引用 / 回复、Diff 轻量 patch apply 和 Deploy Preview 的产品方向；但仍需要补完整回复线程、生产级记忆治理、冲突处理和深度真实平台接入，才能更接近课题完整要求。
