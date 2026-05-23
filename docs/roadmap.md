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

## 3. V1.0 已完成的 P0 / P1 增强

| 优先级 | 任务 | 当前状态 | 边界 |
|---:|---|---|---|
| P0-1 | 真实并行多 Agent 调度 v1 | 已完成 MVP：同一 parallel group 使用 `CompletableFuture` 并发执行，并在 ExecutionBatch 中记录 runtime 字段 | 不是完整动态 DAG 引擎 |
| P0-2 | LLM Planner JSON Schema MVP | 已完成 MVP：可配置 LLM planner，失败回退 RuleBasedPlanner，并展示 fallback reason | 默认仍关闭，不代表生产级 LLM planning |
| P0-3 | MemoryItem 持久化与检索策略 | 已完成 MVP：本地 JSON 持久化、规则检索、lastUsedAt 更新 | 非 MySQL / vector DB / 生产级记忆治理 |
| P0-4 | Adapter 成功输出 Artifact 增强 | 已完成 MVP：非 MOCK 成功响应可进入 Artifact / MessageStream / ContextSnapshot | 默认未配置真实 Adapter 时不会伪造 |
| P1-1 | 消息操作深化 | 已完成 MVP：复制、引用、回复、回复线程、原消息定位、基于消息重跑、单条 Agent 回复重新生成 | 非完整 IM thread |
| P1-2 | 一键应用 Diff | 已完成 MVP：轻量行级 patch apply、force apply、冲突 guard | 非 AST diff / Git merge |
| P1-3 | Orchestrator Decision DTO | 已完成 MVP：TaskRun 携带 OrchestratorDecisionLog，前端优先展示后端事实输出 | 未独立持久化为审计表 |
| P1-4 | HITL / Approval Gate | 已完成 MVP：ApprovalRequest 后端强制审批，Action Audit 时间线 | 非企业级多人审批 |

## 4. 下一阶段 P0

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P0-1 | 文档 V1.0 与提交前仓库卫生 | 当前代码能力变化快，文档和状态需要收口 | README、technical-design、product-design、roadmap、demo-checklist 与当前代码一致；无误提交缓存 |
| P0-2 | Adapter 测试面板 | 半真实接入需要更容易演示和验收 | `/agents` 或 Workspace 可测试 Adapter availability / execute，并明确 fallback |
| P0-3 | ApprovalRequest / ActionAudit 合并展示 | 当前审批和审计是两套记录，展示有割裂 | Workspace 能统一查看 approval lifecycle 和 action audit timeline |
| P0-4 | Context Retrieval 排序解释 | 课题强调上下文连续，需要说明为什么选中上下文 | ContextPanel 展示 source、score、reason、recency / importance |
| P0-5 | Smoke test 固化 | 防止后续回归 | 覆盖 approval enforcement、parallel batch、planner fallback、memory retrieval、preview URL |

## 5. 下一阶段 P1

| 优先级 | 任务 | 为什么排这里 | 验收标准 |
|---:|---|---|---|
| P1-1 | 附件 / 文件消息 MVP | 补 IM 消息类型硬缺口 | 支持上传或静态附件记录，MessageBubble 和 ArtifactPanel 可展示 |
| P1-2 | Adapter 输出质量增强 | 降低“半真实只展示状态”的风险 | OPENAI_COMPATIBLE 或 CLI 成功时产出更可读的 Markdown / Review Report |
| P1-3 | Demo 数据重置 / 稳定启动脚本 | 提升录制和评审稳定性 | 一键启动说明和 smoke test 顺序稳定 |
| P1-4 | 技术文档图示 | 提升答辩解释力 | 增加 Orchestrator / Adapter / Context / Approval 的结构图 |

## 6. P2 后置

| 优先级 | 任务 | 当前建议 |
|---:|---|---|
| P2-1 | MySQL 全量持久化 | P0 完成后再做 |
| P2-2 | WebSocket / SSE | 暂缓，开发面较大 |
| P2-3 | 真实 Vercel / Netlify / Docker 部署 | 暂缓，风险高 |
| P2-4 | 文件附件 / 图片 | P1 后再做 |
| P2-5 | 桌面端 / 移动端 | 只做设计说明，真实实现后置 |
| P2-6 | 动态 DAG 引擎 | 当前不做，先保 MVP 可解释性 |

## 7. 推荐立即执行顺序

1. 完成仓库卫生与文档同步。
2. 重启前后端并跑 `node scripts/smoke-test.mjs`。
3. 做 Adapter 测试面板。
4. 合并展示 ApprovalRequest / ActionAudit。
5. 根据时间评估附件消息、MySQL、SSE 或真实部署。

## 8. 当前阶段结论

当前 AgentHub 是一个 **半真实 AgentHub MVP 原型**。

它已经能证明 IM 式多 Agent 协作、demo-task 并发组、可配置 LLM Planner、Artifact-centered iteration、Adapter fallback、Adapter Output Artifact、本地持久化 Context / Memory、结构化消息引用 / 回复、Diff 轻量 patch apply 和 Deploy Preview 的产品方向；但仍需要补完整回复线程、生产级记忆治理、冲突处理和深度真实平台接入，才能更接近课题完整要求。
