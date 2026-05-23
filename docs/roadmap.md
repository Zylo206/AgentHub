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

- 并行调度仍是计划字段和展示基础，不是真实线程级并发
- LLM Planner 仍是配置入口和规则 fallback，不是真实 planning 主链路
- MemoryItem 仍是内存 Repository，不是持久化长期记忆系统
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
- Adapter fallback 记录

### Context / Memory

- ContextSnapshot
- HandoffSummary
- Pinned Context
- Message pin / unpin
- MemoryItem MVP
- Message 保存为长期记忆
- Pinned context / memory 注入 TaskStep inputContext

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
- Adapter 成功输出进入 Artifact 的基础链路

## 3. 下一阶段 P0

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P0-1 | 真实并行多 Agent 调度 v1 | 课题明确要求并行调度；当前只有 parallelGroupKey 展示基础 | 同一 parallel group 的 step 使用 `CompletableFuture` 并发执行；失败不影响主 Demo；TaskRunPanel 能展示真实并发执行结果 |
| P0-2 | LLM Planner JSON Schema MVP | Orchestrator 仍是规则化，答辩时需要真实 planning 可选能力 | 配置 `LLM` planner 后调用 OPENAI_COMPATIBLE 生成 JSON plan；schema 校验失败或超时回退 RuleBasedPlanner |
| P0-3 | MemoryItem 持久化与检索策略 | 当前长期记忆仍是内存态，刷新后丢失 | Memory API 支持稳定查询、更新、删除；Orchestrator 按 scope / category / importance 检索 memory |
| P0-4 | Adapter 成功输出 Artifact 增强 | 降低“Adapter 只是状态展示”的风险 | 非 MOCK 成功响应能生成 Review Report / Markdown / Text Artifact，并进入 MessageStream / ContextSnapshot |
| P0-5 | 文档 V1.0 同步 | 代码能力变化快，文档必须跟上 | README、technical-design、demo-checklist、roadmap 与当前代码一致 |
| P0-6 | 仓库卫生与提交前检查 | 保证 MVP 可稳定交接 | 清理构建缓存；backend build、frontend build、smoke test 全通过 |

## 4. 下一阶段 P1

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P1-1 | 消息操作深化 | IM 核心体验还不完整 | 支持回复、结构化引用、基于引用消息执行局部修改 |
| P1-2 | 一键应用 Diff | 让 Diff 从展示走向操作 | Diff Summary 可触发 patch preview 或 Artifact Revision |
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
2. 推进真实并行多 Agent 调度 v1。
3. 实现 LLM Planner JSON Schema MVP。
4. 推进 MemoryItem 持久化与规则检索。
5. 增强 Adapter 成功输出进入 Artifact 的质量。
6. 补消息操作深化和一键应用 Diff。

## 7. 当前阶段结论

当前 AgentHub 是一个 **半真实 AgentHub MVP 原型**。

它已经能证明 IM 式多 Agent 协作、Artifact-centered iteration、Adapter fallback、Context / Memory 和 Deploy Preview 的产品方向；但仍需要补真实并行调度、真实 LLM Planner、持久化长期记忆和更可信的真实 Agent 产物，才能更接近课题完整要求。
