# Context Search Spec

## 目标

定义 AgentHub 的 Context Search 规则：使用 MySQL/JDBC 作为权威业务数据源，默认采用 DB-backed Agentic Search，也就是 `List / Grep / Read` 风格检索，为 Orchestrator 提供可解释、可回放、可降级的上下文候选。

## 范围

- Conversation 内上下文候选召回。
- Message / Artifact / Memory / Attachment preview / TaskRun summary 检索。
- PinnedContext 优先注入。
- JDBC profile 下的 `LIKE` 检索。
- MySQL FULLTEXT opt-in 增强。
- read window 控制。
- retrieved context explain 字段。
- ContextPanel 检索阶段展示。
- 可插拔 embedding 边界。

## 非目标

- 不实现 ES / OpenSearch / Milvus / pgvector。
- 不默认启用 embedding / vector search。
- 不把 MySQL 当专业向量数据库使用。
- 不做跨租户或跨用户全局检索。
- 不做复杂权限系统或数据治理系统。
- 不做代码仓库级 RAG 索引。
- 不保证 FULLTEXT 对中文、代码符号、短 token 的效果优于 LIKE。

## Current behavior

- Context Retrieval 已接入 `ContextSearchService`。
- 默认检索形态是 DB-backed Agentic Search。
- memory profile 下使用内存仓储候选过滤和关键词匹配。
- JDBC profile 下默认使用 scoped `LIKE + LIMIT`。
- MySQL FULLTEXT 通过 `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=true` 显式开启。
- FULLTEXT 不替代 LIKE；未开启或不适用时继续使用 LIKE。
- ContextPanel 已显示 `List -> Grep -> Read` 或 `List -> Read fallback`。
- RetrievedContextItem 已包含 score breakdown、matchedTokens、windowPolicy、semanticBackend、semanticScore。
- MemoryItem 已预留 `embeddingJson`，但真实 embedding provider 仍未默认接入。

## 核心模型

### ContextSearchCandidate

- `sourceType`
- `sourceId`
- `conversationId`
- `title`
- `preview`
- `createdAt`
- `status`
- `sourcePriority`

### ContextSearchResult

- `candidate`
- `matchedTokens`
- `searchStage`
- `readWindow`
- `contentSnippet`
- `reason`

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
- `matchedTokens`
- `windowPolicy`
- `reason`

### Embedding storage boundary

- `MemoryItem.embeddingJson` 可保存 embedding 向量或 provider metadata。
- 当前默认 backend 是 heuristic。
- embedding provider 即使启用，也只能作为辅助分数，不得成为唯一召回依据。

## 关键流程

1. Orchestrator 收到用户任务消息。
2. Context Retrieval 解析 userInput、最近消息、pinned context、memory、artifact metadata。
3. `List` 阶段按 conversationId、sourceType、status、createdAt、window 配置列出候选。
4. PinnedContext 直接进入高优先级候选。
5. `Grep` 阶段对 Message content、Artifact title/content、Memory content、Attachment contentPreview、TaskRun summary 做关键词匹配。
6. JDBC 默认使用 `LIKE`；FULLTEXT 开启且 schema 支持时可使用 `MATCH ... AGAINST`。
7. `Read` 阶段读取候选权威内容片段，并按 `read-max-chars` 截断。
8. Context Retrieval 对候选做 base / keyword / recency / importance / semantic 分项评分。
9. 系统按 score 排序，同时保留 source type 多样性，避免单一来源挤掉全部上下文。
10. 选中的 RetrievedContextItem 写入 TaskStep inputContext。
11. ContextSnapshot 记录本轮实际使用的 retrieved context。
12. ContextPanel 展示 sourceType、score breakdown、matchedTokens、read window、semantic backend、注入 Step 和 List / Grep / Read 阶段。

## Ranking 规则

- PinnedContext 和 MemoryItem 默认拥有较高 baseScore。
- keywordScore 来自 exact token hit，不来自模糊语义猜测。
- recencyScore 优先最近 Conversation 内容。
- importanceScore 主要用于 MemoryItem。
- semanticScore 默认来自 heuristic overlap。
- FULLTEXT 命中可以提升 keywordScore，但不能绕过 source diversity 和 read window。
- Artifact / API Contract / Diff 类型内容优先精确检索，不默认向量化。

## 配置

- `AGENTHUB_CONTEXT_SEARCH_FULLTEXT_ENABLED=false`
- `AGENTHUB_CONTEXT_SEARCH_MESSAGE_WINDOW=50`
- `AGENTHUB_CONTEXT_SEARCH_ARTIFACT_WINDOW=50`
- `AGENTHUB_CONTEXT_SEARCH_ATTACHMENT_WINDOW=30`
- `AGENTHUB_CONTEXT_SEARCH_TASK_RUN_WINDOW=20`
- `AGENTHUB_CONTEXT_SEARCH_GREP_LIMIT=20`
- `AGENTHUB_CONTEXT_SEARCH_READ_MAX_CHARS=4000`
- `AGENTHUB_CONTEXT_SEMANTIC_BACKEND=heuristic`
- `AGENTHUB_CONTEXT_EMBEDDING_PROVIDER=disabled`

## 验收标准

- prompt 命中最近 Message 时，Message 可进入 retrieved context。
- prompt 命中 Artifact title/content 时，Artifact 可进入 retrieved context。
- prompt 命中 Attachment contentPreview 时，Attachment 可进入 retrieved context。
- prompt 命中 Memory content 时，Memory 可进入 retrieved context。
- 无关键词命中时，系统仍能使用 pinned / recent / memory fallback。
- ContextSnapshot 持久记录 retrieved context explain。
- ContextPanel 能展示 List / Grep / Read 阶段、matchedTokens、read window、score breakdown。
- JDBC memory 默认路径不受 FULLTEXT 配置影响。
- FULLTEXT 开启时，JDBC/MySQL profile 可走 `MATCH ... AGAINST`，但失败时必须回退 LIKE 或返回清晰 explain。
- embedding backend 未启用时，semanticBackend 必须明确显示 heuristic / disabled 边界。

## Fallback / Boundary

- 默认检索是 Agentic Search，不是重型 RAG。
- LIKE 是默认稳定路径；FULLTEXT 是 opt-in 性能和召回增强。
- FULLTEXT 的中文分词、代码符号和短 token 效果取决于 MySQL 配置。
- embedding 只作为可插拔增强，不是当前默认能力。
- MySQL 是权威业务库，不承担专业向量数据库角色。
- Context Search 只决定候选和解释，不直接替代 Planner / Router / Executor。
- ContextSnapshot 记录的是本轮实际注入的上下文，不代表完整聊天历史全部进入模型。
