# AgentHub Roadmap V1.0

## 1. 当前阶段

AgentHub 当前处于 **MVP 增强后期**。

项目已经形成可运行闭环：

- IM Workspace。
- Agent 联系人和 Agent Builder。
- selectedAgent、单 `@Agent`、多 `@Agent`。
- 规则化 Orchestrator + 可配置 LLM Planner。
- TaskGraph / ExecutionBatch / `CompletableFuture` 并行执行语义。
- Agent 协作消息协议。
- ContextSnapshot / HandoffSummary / PinnedContext / MemoryItem。
- Adapter Layer / Mock fallback / OPENAI_COMPATIBLE / CLI 探测型 Adapter。
- REAL_ADAPTER Artifact 半真实链路。
- Artifact Studio / Revision / Version History / line diff / Apply Diff。
- ApprovalRequest / ActionAudit / Snapshot Restore。
- Deploy Status Card / `/preview/:artifactId`。
- API 级 smoke test。
- AI 协作开发记录。

当前仍不能描述为完整生产级多 Agent 平台：

- 群聊协作仍主要由 demo-task 触发。
- LLM Planner 默认关闭，失败 fallback。
- Codex / Claude Code / OpenCode 是 CLI 探测型半真实接入。
- Tool Capability 是静态 registry，不是真实工具执行系统。
- Deploy Preview 是本地静态模拟。
- Memory 是本地 JSON + 规则检索，不是生产级长期记忆。
- 无 MySQL、SSE/WebSocket、多端、真实部署平台。

## 2. 已完成

### 文档与协作资产

- `docs/spec`
- `docs/skills`
- `docs/rules`
- `docs/collaboration`
- `development-workflow.md`
- `prompt-template.md`
- `decision-log.md`
- `dev-log.md`
- `demo-checklist.md`
- API smoke test 说明

### IM 与 Agent 工作台

- 三栏 Workspace。
- Conversation List。
- Agent List。
- Message Stream。
- ChatInput。
- MessageBubble。
- Agent Builder。
- Adapter Test Panel。
- selectedAgent。
- `Message.targetAgentId`。
- `Message.mentionedAgentIds`。
- 单 `@Agent` / 多 `@Agent` 开头解析。
- Conversation participants。
- 消息复制、引用、回复、回复线程、原消息定位。
- Message pin / save memory。
- 基于消息重新运行 Demo Task。
- 单条 Agent 回复重新生成。

### Orchestrator

- TaskSpec / TaskRun / TaskStep。
- TaskPlanner / AgentRouter / AgentStepExecutor / ResultAggregator。
- RuleBased Planner。
- LLM Planner JSON Schema MVP。
- Prompt Layering。
- Planner fallback。
- Tool Capability Router。
- TaskGraph。
- ExecutionBatch。
- `CompletableFuture` 并行执行。
- OrchestratorDecisionLog。
- Planner / Router / Executor / Aggregator 可解释面板。
- Agent 协作消息协议：`TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR`。

### Context / Memory

- ContextSnapshot。
- HandoffSummary。
- PinnedContext。
- MemoryItem CRUD。
- MemoryItem 本地 JSON 持久化。
- 规则化 relevant memory retrieval。
- Context Retrieval v2。
- TaskStep.inputContext 注入 pinned context / memory / retrieved context。

### Adapter

- AgentAdapterRegistry。
- AgentAdapterDescriptor。
- MockAgentAdapter。
- OpenAICompatibleAgentAdapter。
- DeepSeek OpenAI-compatible 配置说明。
- Codex CLI 探测型 Adapter。
- Claude Code CLI 探测型 Adapter。
- OpenCode CLI 探测型 Adapter。
- Adapter fallback 到 MOCK。
- Adapter 成功输出进入 Artifact / MessageStream / ContextSnapshot 的半真实链路。
- Adapter Test Panel。

### Artifact / Diff / Deploy

- Artifact Preview。
- Artifact Revision。
- Version History。
- line diff。
- Diff Summary。
- Apply Diff。
- Force Apply Diff。
- Conflict guard。
- Artifact Copy。
- Artifact Download。
- Artifact Snapshot。
- Restore Snapshot。
- Deploy Status Card。
- `/preview/:artifactId`。
- Preview 页面版本切换。

### Approval / Audit

- ApprovalRequest。
- approve / cancel / consume。
- 高风险操作强制校验 approvalId。
- ActionAuditLog。
- Workspace Action Audit timeline。
- Approval Gate affected artifact / diff preview 摘要。

### 验证

- `cd backend && mvn -q -DskipTests package`
- `cd frontend && npm run build`
- `node scripts/smoke-test.mjs`

smoke test 覆盖：

- health / adapters
- create conversation / send message
- multi-mention
- message relation
- pin context / memory
- demo-task
- TaskGraph / parallel batch
- artifact revision
- apply diff / force apply
- approval
- deploy
- preview URL HTTP 200
- group chat agent messages
- collaboration protocol
- single Agent reply regeneration

## 3. 下一阶段 P0

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P0-1 | 文档 V1.0 同步 | 让 README、technical-design、roadmap、demo-checklist 与 Phase 58/59 后代码一致 | 文档明确真实 / 半真实 / 静态边界 |
| P0-2 | REAL_FIRST 收敛 | 真实 Adapter 成功时优先成为主 Artifact | OPENAI_COMPATIBLE 成功时主 Artifact 来源为 REAL_ADAPTER，失败才静态 fallback |
| P0-3 | Adapter fixture / mock server | 无真实 key 时也能稳定验证真实输出 contract | smoke test 可验证 REAL_ADAPTER JSON contract |
| P0-4 | Reviewer REJECTION 闭环 | 让 `REJECTION` 协议进入 retry / revise 流程 | Reviewer 可生成 REJECTION，Orchestrator 给出重试或修改建议 |
| P0-5 | Tool Capability UI 化 | 将 toolTags 从文本标签升级为明确能力选择 | Agent Builder 可选择 code / preview / review / deploy / api，并影响 Router |
| P0-6 | 仓库卫生与编码检查 | 降低交付风险 | 无 build cache / API key / 本地环境文件误提交；中文文档可读；build + smoke 通过 |

## 4. 下一阶段 P1

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P1-1 | 任意消息触发 Agent 协作 | 减少 demo-task 按钮感 | 发送任务消息后可触发 Orchestrator run，保留确认或手动入口 |
| P1-2 | Adapter health 加权路由 | Router 不只看 tool capability | Router score 引入 Adapter status、历史成功率、fallback 频率 |
| P1-3 | Context Retrieval 可解释 UI | 强化上下文连续评分 | ContextPanel 展示 sourceType、score、reason、注入到哪个 Step |
| P1-4 | 轻量附件模型 | 补齐消息类型短板 | 支持 demo 文件附件上传 / 展示，不接复杂对象存储 |
| P1-5 | 浏览器级 E2E | 降低 UI 回归 | Playwright 覆盖 workspace、preview、approval gate 主流程 |
| P1-6 | Demo 视频脚本 | 为最终收敛做准备 | 3 分钟脚本覆盖 IM、多 Agent、Artifact、Deploy、AI 协作记录 |

## 5. P2 后置

| 优先级 | 任务 | 当前建议 |
|---:|---|---|
| P2-1 | MySQL 持久化 | P0 稳定后再做 |
| P2-2 | SSE / WebSocket | 后置，开发面较大 |
| P2-3 | 真实部署集成 | 后置，避免引入外部平台不确定性 |
| P2-4 | Workflow Canvas | 暂不做，避免偏离 IM-first |
| P2-5 | 桌面端 / 移动端 | 文档说明即可，真实实现后置 |
| P2-6 | 向量检索 / RAG | 需持久化和数据治理后再做 |

## 6. 当前推荐顺序

1. 完成文档 V1.0 同步。
2. 清理仓库卫生并跑 build + smoke。
3. 做 REAL_FIRST 收敛。
4. 做 Adapter fixture / mock server。
5. 做 Reviewer REJECTION 闭环。
6. 做 Tool Capability UI 化。

## 7. 不建议现在做

- MySQL 全量迁移。
- SSE / WebSocket。
- 真实部署平台。
- 桌面端 / 移动端。
- 完整 Workflow Canvas。
- 完整动态 DAG 引擎。
- 向量数据库 / embedding RAG。
