# Completed Roadmap

本文件归档 Phase 40-84 已经落地或基本闭环的计划，便于后续判断哪些能力不需要重复规划。

## Orchestrator 与多 Agent 协作

- `Done` Planner / Router / Executor / Aggregator 拆分。
- `Done` TaskGraph / ExecutionBatch 基础模型。
- `Done` 多 `@Agent` 最小链路，支持消息开头连续多个 Agent mention。
- `Done` mentioned agents 进入 TaskGraph，不再只影响第一个 step。
- `Done` Tool Capability Registry 与基于工具能力的 Router 策略。
- `Done` 真实并行执行语义基础：同一 batch 可通过 `CompletableFuture` 执行。
- `Done` Orchestrator Decision Log，前端解释面板可以展示 Planner / Router / Executor / Aggregator 决策。
- `Done` LLM Planner JSON Schema MVP 与 RuleBased fallback。
- `Done` Prompt Layering，把 planner prompt 拆成角色、可用 Agent、上下文、Artifact history、schema、fallback policy 等层。

## IM、消息操作与上下文

- `Done` 群聊式 Agent 消息流，MessageStream 中可见 Orchestrator / Frontend / Backend / Reviewer 等 Agent 回复。
- `Done` Agent 协作消息协议：`TASK`、`RESULT`、`REVIEW`、`APPROVAL`、`REJECTION`、`ERROR`。
- `Done` 消息复制、引用、回复、基于消息重新运行 Demo Task。
- `Done` 手动 pin message 进入 ContextPanel 和 TaskStep inputContext。
- `Done` MemoryItem MVP 与规则检索。
- `Done` Context Retrieval v2/v3/v4 解释字段：sourceType、score、reason、matchedTokens、semanticScore、injected step。
- `Done` ContextSnapshot / HandoffSummary 展示持续保留。

## Artifact、Diff、Approval 与 Audit

- `Done` Artifact Revision、Version History、Diff Summary。
- `Done` 轻量 line diff。
- `Done` Apply Diff / Force Apply Patch。
- `Done` Artifact Snapshot / Restore。
- `Done` Approval Gate，覆盖 apply diff、force apply、deploy、restore 等高风险操作。
- `Done` Approval 影响范围和 Diff Preview 摘要。
- `Done` ActionAuditLog 与 Workspace 时间线面板。
- `Done` Reviewer REJECTION -> BLOCKED -> Retry / Revise 建议闭环。
- `Done` 自动评审失败重试、REAL_ADAPTER 构建校验和代码质量评分基础。

## Adapter 与真实输出

- `Done` MockAdapter fallback 保留。
- `Done` OpenAI-compatible Adapter。
- `Done` Codex / Claude Code / OpenCode CLI 探测型 Adapter。
- `Done` Adapter 测试面板。
- `Done` REAL_ADAPTER 输出进入 Artifact 链路。
- `Done` `STATIC_TEMPLATE` / `HYBRID_REAL` / `REAL_FIRST` 生成模式。
- `Done` AdapterArtifactContractValidator。
- `Done` AdapterArtifactQualityEvaluator 与质量字段。
- `Done` 真实 OpenAI-compatible provider smoke 入口。
- `Done` 可选 CODE Artifact TypeScript 编译 smoke。
- `Done` Adapter Quality Metrics API 和 Workspace dashboard。

## 附件、持久化与实时能力

- `Done` 真实文件附件链路基础：上传、下载、消息关联、本地文件存储。
- `Done` AttachmentRecord 生产化字段：checksum、visibility、ownerUserId、storageKey、scanStatus、deletedAt。
- `Done` AttachmentAccessGuard、AttachmentCleanupService、AttachmentScanService 接口和 no-op scan 边界。
- `Done` JDBC schema 和 JDBC repository 骨架。
- `Done` JdbcContextRepository，避免 JDBC profile 下 context 回落内存。
- `Done` JDBC smoke 与 restart verify 脚本入口。
- `Done` SSE 实时事件总线和 conversation 级事件流。
- `Done` RealtimeRunState / active realtime state 查询。
- `Done` WebSocket control plane MVP 与 REST fallback。
- `Done` RunCancellationRegistry 和执行级 cancel token 基础。

## 验证与文档

- `Done` API smoke test。
- `Done` SSE smoke test。
- `Done` Browser E2E 脚本基础。
- `Done` real-adapter smoke test。
- `Done` jdbc smoke test。
- `Done` Demo Checklist 多轮同步。
- `Done` V1.0 文档同步。
- `Done` `AGENTS.md` 项目级 Agent 操作说明。

## 边界说明

这些能力多数已经具备 MVP 或半生产骨架，但不等同于完整生产系统。特别是：真实 Adapter 输出质量仍依赖 provider 和 prompt，JDBC 仍需真实 MySQL sprint，SSE 不等于多节点事件总线，WebSocket control 不等于完整 token streaming。
