# Artifact Lifecycle Spec

## 目标

定义 AgentHub 中 Artifact 从生成、展示、修订、Diff、Apply、Snapshot、Restore 到 Deploy Preview 的稳定生命周期规则。

该 spec 用于保证 Artifact 是多 Agent 协作的核心产物，而不是临时文本输出。

## 范围

- Artifact 生成来源。
- REAL_ADAPTER、STATIC_TEMPLATE、MOCK_FALLBACK、USER_REVISION 等 source kind。
- Version History 与 parent relation。
- Line Diff 与 Diff Summary。
- Apply Diff / Force Apply。
- Snapshot / Restore。
- Deploy Preview 与 Preview URL。

## 非目标

- 不实现完整代码编辑器。
- 不引入 Monaco Editor。
- 不实现真实 Git merge。
- 不实现真实外部部署。
- 不实现生产级构建日志。

## Current behavior

- Demo Task 会生成 LoginPage、README、API Contract、Review Report 等 Artifact。
- OpenAI-compatible 在 REAL_FIRST / HYBRID_REAL 下可生成 REAL_ADAPTER Artifact。
- 静态模板 Artifact 保留为 fallback 或 archived。
- Artifact Revision 可生成 v2。
- Version History 能展示 v1 / v2。
- Line Diff 和 Diff Summary 能展示变更摘要。
- Apply Diff / Force Apply 需要 Approval Gate。
- Apply / Restore / Deploy 等高风险操作记录 ActionAuditLog。
- Snapshot / Restore 已用于保护 Artifact 修改链路。
- Deploy 会生成静态 Preview URL，并可打开 `/preview/:artifactId`。

## 核心模型

### Artifact

- `artifactId`
- `conversationId`
- `taskRunId`
- `taskStepId`
- `title`
- `artifactType`
- `language`
- `content`
- `version`
- `status`
- `parentArtifactId`
- `sourceKind`
- `sourceAdapterType`
- `sourceTaskStepId`
- `generationMode`
- `qualityStatus`
- `buildValidationStatus`

### ArtifactSnapshot

- `snapshotId`
- `artifactId`
- `version`
- `content`
- `operationType`
- `createdAt`

### Diff / Patch

- `baseArtifactId`
- `targetArtifactId`
- `changedLines`
- `addedLines`
- `removedLines`
- `summary`
- `conflictStatus`

## 关键流程

1. Orchestrator 执行 TaskStep。
2. Agent output 或 static template 生成 Artifact。
3. ArtifactPanel 展示 title、type、status、source、version 和 content。
4. 用户对选中 Artifact 发起 revision。
5. 后端创建 revision TaskRun，并生成新版本 Artifact。
6. Version History 建立 v1 -> v2 关系。
7. Diff Summary 和 line diff 展示变更。
8. 用户申请 Apply Diff / Force Apply 时，先创建 ApprovalRequest。
9. Approval 通过后执行修改，并写入 ActionAuditLog。
10. Deploy 前可创建 snapshot，并生成 DeploymentRecord 与 Preview URL。
11. Restore 使用 snapshot 恢复 Artifact 内容，并记录 audit。

## 验收标准

- 每个 Artifact 都能说明来源。
- REAL_ADAPTER Artifact 不能被静态模板伪装。
- Revision 后必须有新版本或明确失败原因。
- Version History 能展示版本链。
- Diff Summary 必须与 Artifact 版本关系一致。
- Apply / Force Apply / Deploy / Restore 缺少 approval 时必须被后端拒绝。
- Preview URL 能打开静态 Artifact preview 页面。

## Fallback / Boundary

- STATIC_TEMPLATE 是稳定 demo fallback，不等于真实模型产物。
- REAL_ADAPTER 必须通过 contract / quality / build validation 才能成为主产物。
- 当前 Diff 是轻量 line diff，不是完整 Git patch engine。
- Restore 是 Artifact 内容级恢复，不是文件系统或 Git 仓库恢复。
- Deploy Preview 是本地静态模拟，不是真实公网部署。
