# Approval Audit Spec

## 目标

定义 AgentHub 中 ApprovalRequest、ActionAuditLog、高风险操作审批、risk level、affected items 和审计时间线的稳定规则。

该 spec 用于确保 Artifact 修改、部署、恢复等高风险操作不会绕过用户确认，并且所有关键动作可追踪。

## 范围

- ApprovalRequest 创建、批准、取消、消费。
- Apply Diff / Force Apply Diff / Demo Deploy / Restore Snapshot 的后端强制审批。
- ActionAuditLog 记录。
- affected artifact / diff preview 摘要。
- risk level 展示。
- Workspace Audit Timeline。
- Realtime control commands 的审计记录：`STOP_RUN` / `CANCEL_RUN` accepted 或 rejected。

## 非目标

- 不实现企业级 RBAC。
- 不实现多人审批。
- 不实现权限矩阵。
- 不实现审计后台。
- 不实现真实安全合规系统。

## Current behavior

- 高风险操作前端会发起 Approval Gate。
- 后端有 ApprovalRequest 模型和 API。
- Apply Diff、Force Apply、Deploy、Restore 等操作要求 approvalId。
- approvalId 缺失、不匹配、未批准、已消费时，后端拒绝执行。
- 操作会写入 ActionAuditLog。
- Workspace 可展示 Action Audit 时间线。
- Approval Gate 展示 affected artifact 和 diff preview 摘要。
- Realtime control plane 会对 `STOP_RUN` / `CANCEL_RUN` 写入 ActionAuditLog；terminal TaskRun 的控制命令会被拒绝并记录 rejected。

## 核心模型

### ApprovalRequest

- `approvalId`
- `conversationId`
- `actionType`
- `targetType`
- `targetId`
- `riskLevel`
- `summary`
- `affectedItems`
- `status`
- `createdAt`
- `resolvedAt`
- `expiresAt`

### Approval Status

- `PENDING`
- `APPROVED`
- `CANCELLED`
- `CONSUMED`
- `EXPIRED`

### ActionAuditLog

- `auditId`
- `conversationId`
- `actionType`
- `targetType`
- `targetId`
- `approvalId`
- `status`
- `summary`
- `createdAt`

## 关键流程

1. 用户点击 Apply Diff、Force Apply、Deploy 或 Restore。
2. 前端创建 ApprovalRequest。
3. 后端返回 approvalId、riskLevel、summary、affectedItems。
4. 前端显示确认卡片和影响范围。
5. 用户批准或取消。
6. 批准后前端带 approvalId 调用实际操作 API。
7. 后端校验 approvalId 是否存在、已批准、未消费且 action / target / conversation 匹配。
8. 校验通过后执行操作。
9. 后端将 approval 标记为 CONSUMED。
10. 后端写入 ActionAuditLog。
11. Realtime event 通知 Workspace 刷新 approval / audit / artifact / deployment 状态。

## 验收标准

- 缺少 approvalId 的高风险操作必须失败。
- approvalId 与 actionType、targetType、targetId、conversationId 不匹配时必须失败。
- 已消费 approvalId 不能重复使用。
- 用户取消审批后不得执行目标操作。
- Audit Timeline 能展示 created、approved、cancelled、consumed、rejected 等关键状态。
- Deploy / Apply / Restore 成功后应能追溯对应 approvalId。
- 失败原因必须可读，不能只返回通用 500。
- `STOP_RUN` 应将运行中的 TaskRun 收敛为 `STOPPED`，`CANCEL_RUN` 应收敛为 `CANCELLED`，并写入 ActionAuditLog。

## Fallback / Boundary

- Approval Gate 是单用户确认流，不是多人审批。
- ActionAuditLog 是产品内审计时间线，不是企业合规审计系统。
- riskLevel 是规则化字段，不代表真实安全扫描结果。
- affectedItems 和 diff preview 是操作影响摘要，不等于完整代码安全分析。
- 如果 realtime 事件失败，REST 数据仍是权威来源。

## 2026-06-08 补充

轻量生产化闭环新增以下审计口径：

- `APPROVAL_BYPASS_ATTEMPT`
  - 缺少 `approvalId`
  - `approvalId` 已过期
  - `approvalId` 未批准
  - `approvalId` 与 action / target 不匹配
- `APPLY_DIFF` 的 `CONFLICT`
- `ARTIFACT_STATE_CONFLICT`
- 过期执行结果丢弃
- 重复提交拒绝

冲突类 summary 统一使用：

- `conflictType=TEXT_CONFLICT; ...`
- `conflictType=STRUCTURE_CONFLICT; ...`
- `conflictType=APPROVAL_CONFLICT; ...`
