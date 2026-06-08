# Lightweight Task DAG And Conflict Spec

## 目标

把 AgentHub 当前 `TaskGraph + parallelGroup + optimistic conflict + approval/audit + SSE` 收敛成一条可生产验收的轻量闭环。

第一阶段只解决：

- 任务节点可见
- 运行态可控
- 冲突可判
- 覆盖可审
- 聚合可解释
- 运行诊断可查询

第一阶段不做：

- 通用工作流 DSL
- IDE 级三方 merge editor
- 复杂语义 rebase
- Prometheus / Grafana 级监控平台

## 节点模型

`TaskGraph` 在原有 execution batch 之外，新增显式节点记录 `nodes[]`。

每个节点至少持久化以下字段：

- `nodeId`
- `nodeType`
- `stepOrder`
- `dependsOnNodeIds`
- `retryPolicy`
- `timeoutSeconds`
- `idempotencyKey`
- `fallbackStrategy`
- `nodeStatus`
- `terminalStatus`
- `retryAttempt`
- `executionToken`
- `leaseVersion`
- `startedAt`
- `completedAt`
- `failureType`
- `discardedReason`
- `finalDecision`

`TaskRun.timeline[]` 是面向前端和 smoke 的回放视图，不替代 `TaskStep` 明细。

## 状态机

统一节点状态：

- `PENDING`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `FALLBACK`
- `CANCELLED`
- `SKIPPED`

`terminalStatus` 用于区分：

- `FAILED`
- `FALLBACK`
- `CANCELLED`
- `STOPPED`
- `LEASE_EXPIRED`

## 运行态控制

每个 step 在执行前分配：

- `executionToken`
- `leaseVersion`
- `idempotencyKey`

结果写回前必须校验 token/lease。过期结果一律丢弃，并记录审计。

重复提交保护基于：

- `taskRunId + nodeId + idempotencyKey`

第一阶段 failure taxonomy：

- `ADAPTER_TIMEOUT`
- `CONTROL_CANCELLED`
- `CONTROL_STOPPED`
- `LEASE_EXPIRED`
- `DUPLICATE_SUBMISSION_REJECTED`
- `PARSE_FAILED`
- `BUILD_FAILED`
- `QUALITY_REJECTED`
- `ADAPTER_FAILED`

## Compare / Apply 协议

保留 `baseVersion / baseContentHash`，新增结构化 compare：

- `GET /api/artifacts/{artifactId}/compare-diff`

返回：

- `currentArtifactId`
- `candidateArtifactId`
- `baseArtifactId`
- `latestAppliedArtifactId`
- `currentVersion`
- `candidateVersion`
- `currentContentHash`
- `candidateContentHash`
- `baseContent`
- `candidateContent`
- `currentContent`
- `conflictType`
- `canApplyDirectly`
- `requiresApproval`
- `recommendedAction`
- `conflictReason`

当前 conflict type：

- `NONE`
- `TEXT_CONFLICT`
- `STRUCTURE_CONFLICT`
- `APPROVAL_CONFLICT`

`POST /api/artifacts/{artifactId}/apply-diff` 继续作为唯一 Apply 入口。

规则：

- 普通 apply 必须先有 approval
- stale diff 不能直接覆盖当前 accepted artifact
- `force=true` 只能在 `approvalId` 已批准时执行
- 强制覆盖必须进入 audit

## 审计口径

以下动作必须写 `ActionAuditLog`：

- `FORCE_APPLY_DIFF`
- `APPLY_DIFF` conflict
- `ARTIFACT_STATE_CONFLICT`
- `APPROVAL_BYPASS_ATTEMPT`
- `DUPLICATE_SUBMISSION_REJECTED`
- `CANCEL_RUN` accepted / rejected
- `STOP_RUN` accepted / rejected
- stale result discard

冲突 summary 使用：

- `conflictType=...; ...`

## 聚合器

聚合器第一阶段不做通用 AI merge。

按节点类型给出最小规则：

- `CODE`: 保留主结果，记录未采纳原因
- `MARKDOWN` / `DOC`: 主次合并或说明丢弃理由
- `REVIEW`: 汇总 blocker / warning / pass
- `DEPLOY`: 只认终态和来源

聚合解释必须保留：

- 来源
- 完成时间
- final decision
- discarded reason

## 诊断查询

新增：

- `GET /api/conversations/{conversationId}/task-run-observability`

返回：

- `taskRunCount`
- `timelineEntryCount`
- `retryCount`
- `fallbackCount`
- `discardedResultCount`
- `approvalBypassAttempts`
- `failureTypes[]`
- `conflictTypes[]`
- `fallbackReasons[]`
- `discardedReasons[]`

## 前端边界

TaskRunPanel 第一阶段展示：

- 节点依赖
- retry / timeout / lease / idempotency key
- final decision
- discarded reason
- observability summary

Conflict Panel 第一阶段展示：

- 当前版本
- 用户基线
- Agent 候选
- 冲突类型
- 推荐动作
- 手动粘贴合并内容后生成新 revision

不做 Monaco / CodeMirror 三方 merge editor。

## 验收

- 同一任务内支持串行、并行、失败回退
- SSE / REST 回放能看到节点状态流
- stop / cancel / retry 不写回过期结果
- stale diff 不能直接覆盖 accepted artifact
- force apply 必须带 `approvalId`
- 冲突面板支持人工合并后生成新 revision
- 主消息流和 TaskRunPanel 能解释采纳与丢弃原因
- 管理面或诊断面能回答为什么 fallback / 冲突 / 被拒绝 / 被丢弃

## 边界

- 这是 AgentHub 的轻量生产化闭环，不是通用工作流平台
- 这是显式节点和乐观冲突治理，不是完整 Git / IDE merge 体系
- 诊断汇总是产品内运行账本，不是企业级 observability 平台
