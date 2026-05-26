# Context / Memory Spec

## 目标

定义 AgentHub 中上下文与记忆系统的稳定规则，让 Orchestrator 能基于聊天历史、手动 pin、Memory、Artifact、Attachment preview 和历史 TaskRun 做可解释的上下文注入。

## 范围

- Message pin / unpin。
- PinnedContext。
- MemoryItem。
- DB-backed Agentic Search。
- Context Retrieval explain。
- TaskStep inputContext 注入。
- ContextSnapshot。
- HandoffSummary。

## 非目标

- 不实现完整长期记忆系统。
- 不默认启用 embedding / vector search。
- 不引入 ES / OpenSearch / pgvector / Milvus。
- 不做跨用户全局记忆。
- 不做复杂隐私治理或多租户权限系统。

## Current behavior

- 用户可以将 Message pin 到上下文。
- 用户可以将 Message 保存为 MemoryItem。
- Orchestrator 每次运行前会执行 Context Retrieval。
- Context Retrieval 先通过 DB-backed Agentic Search 找候选，再按规则评分。
- JDBC profile 默认使用 `LIKE + LIMIT` 检索；可选启用 MySQL FULLTEXT。
- MemoryItem 已预留 `embeddingJson` 存储字段；当前不接真实 embedding provider。
- Retrieval 结果进入 TaskStep inputContext。
- ContextSnapshot 记录本轮使用的 pinned context、retrieved context、message ids 和 artifact ids。
- ContextPanel 展示 pinned context、Memory、retrieved context、ContextSnapshot 和 HandoffSummary。
- JDBC profile 支持 ContextSnapshot / PinnedContext / HandoffSummary / MemoryItem 持久化。

## 核心模型

### PinnedContext

- `pinnedContextId`
- `conversationId`
- `sourceType`
- `sourceId`
- `contentSnapshot`
- `createdAt`

### MemoryItem

- `memoryId`
- `conversationId`
- `sourceType`
- `sourceId`
- `scope`
- `category`
- `content`
- `embeddingJson`
- `importance`
- `createdAt`
- `updatedAt`
- `lastUsedAt`

### RetrievedContextItem

- `sourceType`
- `sourceId`
- `title`
- `content`
- `score`
- `sourceRank`
- `baseScore`
- `keywordScore`
- `recencyScore`
- `importanceScore`
- `semanticScore`
- `semanticBackend`
- `semanticExplanation`
- `matchedTokens`
- `reason`
- `windowPolicy`

### ContextSnapshot

- `contextSnapshotId`
- `taskRunId`
- `conversationId`
- `includedMessageIds`
- `includedArtifactIds`
- `pinnedContextItems`
- `retrievedContextItems`
- `summary`
- `createdAt`

## 关键流程

1. 用户 pin 消息或保存 Memory。
2. Run Demo Task / Orchestrator Run 开始前调用 ContextRetrievalService。
3. ContextSearchService 执行三段式检索。
4. `List / Glob` 阶段按 conversation、source type、时间窗口列出候选。
5. `Grep` 阶段对 Message、Artifact、Memory、Attachment preview、TaskRun summary 做关键词精确匹配。
6. JDBC profile 下默认使用 scoped `LIKE`；显式开启 FULLTEXT 后可使用 MySQL `MATCH ... AGAINST`。
7. `Read` 阶段读取候选源的权威内容片段，并限制最大读取长度。
8. ContextRetrievalService 对候选做 base / keyword / recency / importance / semantic 分项评分。
9. 结果按 score 排序，写入 TaskStep inputContext 和 ContextSnapshot。
10. ContextPanel 展示 sourceType、score breakdown、matchedTokens、semanticBackend、reason、windowPolicy 和 List / Grep / Read 阶段。
11. HandoffSummary 记录 Agent 间传递的 artifact、decision 和 open issue。

## 验收标准

- Pin 同一 message 不产生重复 pinned context。
- Unpin 后 ContextPanel 刷新并移除对应 pinned context。
- prompt 命中 Artifact title/content 时，Artifact 可以进入 retrieved context。
- prompt 命中 Attachment contentPreview 时，Attachment 可以进入 retrieved context。
- 没有关键词命中时，系统仍能按 recent / pinned / memory fallback 注入上下文。
- ContextSnapshot 能持久记录 retrievedContextItems。
- ContextPanel 能明确区分 `List -> Grep -> Read` 和 `List -> Read fallback`。
- `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=false` 时 JDBC search 继续使用 LIKE。
- `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true` 时，已初始化 FULLTEXT index 的 MySQL 数据库可走 MATCH AGAINST。
- JDBC profile 下重启后仍能查询 ContextSnapshot / PinnedContext / HandoffSummary / MemoryItem。
- `semanticScore` 存在，但默认不依赖真实 embedding provider。

## Fallback / Boundary

- 当前默认检索是 DB-backed Agentic Search，不是向量数据库 RAG。
- MySQL 是权威业务数据源，不是专业向量数据库。
- MySQL FULLTEXT 是 opt-in 增强；中文效果取决于 MySQL parser 和索引配置。
- 代码、Artifact、API Contract、Diff 优先使用精确检索，不默认向量化。
- Message、Memory、文档型 Attachment 未来可以使用 embedding 辅助，但 embedding 不能作为唯一召回依据。
- `AGENTHUB_CONTEXT_SEMANTIC_BACKEND=embedding` 在当前构建中只返回 `EMBEDDING_DISABLED` 并 fallback 到 heuristic。
- `embeddingJson` 当前是存储骨架，不代表已完成真实 embedding 检索或 cosine ranking。
- ContextSnapshot 记录的是本轮使用的上下文，不代表完整聊天历史全部进入模型。
