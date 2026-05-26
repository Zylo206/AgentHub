# Context Memory Spec

## 目标

定义 AgentHub 中 pinned context、MemoryItem、Context Retrieval explain、ContextSnapshot 和 HandoffSummary 的稳定规则。

该 spec 用于把“聊天历史作为上下文”和“手动 pin 长期上下文”从展示能力约束为可注入、可解释、可回放的上下文链路。

## 范围

- Message pin / unpin。
- PinnedContext。
- MemoryItem。
- Context Retrieval。
- RetrievedContextItem explain 字段。
- TaskStep inputContext 注入。
- ContextSnapshot 记录。
- HandoffSummary 展示。

## 非目标

- 不实现完整长期记忆系统。
- 不实现向量数据库。
- 不实现跨用户全局记忆。
- 不做自动隐私治理。
- 不要求 embedding backend 默认可用。

## Current behavior

- 用户可将 Message pin 到上下文。
- PinnedContext 会保存 message snapshot。
- 用户可将消息保存为 MemoryItem。
- Orchestrator 运行前会执行 Context Retrieval。
- Retrieval 结果会进入 TaskStep inputContext。
- ContextPanel 展示 pinned context、Memory、retrieved context、ContextSnapshot、HandoffSummary。
- Retrieval explain 已包含 sourceType、score、reason、matchedTokens、semanticScore、injected step 等字段。
- JDBC profile 已补 ContextSnapshot / PinnedContext / HandoffSummary repository。

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
- `importance`
- `createdAt`
- `updatedAt`
- `lastUsedAt`

### RetrievedContextItem

- `sourceType`
- `sourceId`
- `content`
- `score`
- `sourceRank`
- `baseScore`
- `keywordScore`
- `recencyScore`
- `importanceScore`
- `semanticScore`
- `matchedTokens`
- `reason`
- `windowPolicy`
- `injectedTaskStepId`

### ContextSnapshot

- `contextSnapshotId`
- `taskRunId`
- `conversationId`
- `includedMessageIds`
- `pinnedContextItems`
- `retrievedContextItems`
- `artifactSummary`
- `createdAt`

## 关键流程

1. 用户在 MessageBubble 中 pin 消息。
2. 后端创建或复用 PinnedContext，保持幂等。
3. 用户可将消息保存为 MemoryItem。
4. Run Demo Task 或 Orchestrator Run 前，ContextRetrievalService 收集候选上下文。
5. Retrieval 对 pinned message、MemoryItem、recent message、Artifact、TaskRun summary 做规则评分。
6. 结果按 score 排序并选择注入范围。
7. 第一个或相关 TaskStep 的 inputContext 包含 retrieved context 摘要。
8. ContextSnapshot 记录本轮使用的 context source。
9. ContextPanel 展示为什么这些上下文被选中。
10. HandoffSummary 记录 Agent 间传递的 artifacts、decisions、openIssues。

## 验收标准

- Pin 同一 message 不应产生重复 pinned context。
- Unpin 后 ContextPanel 应刷新。
- Run Task 后 TaskStep inputContext 能体现 pinned / retrieved context。
- ContextSnapshot 能记录 includedMessageIds 和 retrievedContextItems。
- ContextPanel 能显示 sourceType、score breakdown、matchedTokens、reason、injected step。
- HandoffSummary 能展示 sourceAgent、targetAgent、passedArtifacts、keyDecisions、openIssues。

## Fallback / Boundary

- 当前 retrieval 默认是 heuristic，不是 embedding / vector search。
- semanticScore 可存在，但 embedding backend 未启用时不能宣称语义检索完成。
- MemoryItem 当前是 MVP，不是完整长期记忆系统。
- ContextSnapshot 是运行时上下文记录，不代表完整聊天历史全部进入模型。
- 如果 retrieval 没有候选项，Orchestrator 应继续运行并说明无额外上下文。
