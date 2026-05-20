# State Machine

## 1. 文档目标

本文件定义 AgentHub 在 V0.1 阶段使用的执行状态 State Machine，用于统一：

- TaskSpec 状态
- TaskRun 状态
- TaskStep 状态
- Artifact 状态

## 2. TaskSpec 状态机

### 状态定义

- DRAFT：刚从用户输入中整理出的草稿
- READY：结构化信息完整，可进入计划阶段
- APPROVED：经用户或系统确认，可正式执行
- REVISED：基于反馈更新后的版本
- CANCELLED：任务取消

### 迁移条件

- DRAFT -> READY：Task Spec 字段完整
- READY -> APPROVED：用户确认或系统自动确认
- APPROVED -> REVISED：用户提出重大变更
- 任意状态 -> CANCELLED：用户取消

## 3. TaskRun 状态机

### 状态定义

- PENDING：已创建，尚未开始执行
- RUNNING：执行中
- COMPLETED：全部关键步骤完成
- FAILED：执行失败
- BLOCKED：因缺少上下文或依赖阻塞
- CANCELLED：任务被取消

### 迁移条件

- PENDING -> RUNNING：开始执行第一个 TaskStep
- RUNNING -> COMPLETED：所有必要 TaskStep 完成且 review 结束
- RUNNING -> FAILED：关键步骤失败且无兜底
- RUNNING -> BLOCKED：等待用户确认或缺失核心上下文
- 任意状态 -> CANCELLED：用户取消

## 4. TaskStep 状态机

### 状态定义

- WAITING：等待前置步骤完成
- RUNNING：当前步骤执行中
- COMPLETED：当前步骤完成
- FAILED：当前步骤失败
- SKIPPED：该步骤被跳过

### 迁移条件

- WAITING -> RUNNING：前置依赖满足
- RUNNING -> COMPLETED：Agent 成功输出
- RUNNING -> FAILED：Agent 输出失败或无效
- WAITING -> SKIPPED：任务调整后该步骤不再需要

## 5. Artifact 状态机

### 状态定义

- CREATED：首次生成
- UPDATED：已有 Artifact 的后续版本
- REVIEWED：已被 Reviewer 检查
- ACCEPTED：满足当前任务要求
- REJECTED：不满足要求
- ARCHIVED：进入历史状态

### 迁移条件

- CREATED -> UPDATED：用户或系统触发变更
- CREATED / UPDATED -> REVIEWED：进入 Reviewer 检查
- REVIEWED -> ACCEPTED：通过检查
- REVIEWED -> REJECTED：检查未通过
- ACCEPTED / REJECTED -> ARCHIVED：产生新版本后旧版本归档

## 6. 异常状态

### BLOCKED

用于 TaskRun 层，表示：

- 信息不足
- 用户尚未确认
- 依赖未满足

### FAILED

用于 TaskRun 或 TaskStep 层，表示：

- 执行错误
- 输出无法验证
- 关键 Agent 失败且没有有效兜底

### REJECTED

用于 Artifact 层，表示：

- Artifact 未通过 Reviewer 检查
- 需要重新生成或修订

## 7. 示例流程

### Demo 场景示例

```text
TaskSpec: DRAFT -> READY -> APPROVED
TaskRun: PENDING -> RUNNING -> COMPLETED
TaskStep(frontend): WAITING -> RUNNING -> COMPLETED
TaskStep(backend): WAITING -> RUNNING -> COMPLETED
TaskStep(review): WAITING -> RUNNING -> COMPLETED
Artifact(code): CREATED -> REVIEWED -> ACCEPTED
Artifact(readme): CREATED -> REVIEWED -> ACCEPTED
Artifact(reviewReport): CREATED -> ACCEPTED
```

### 二次修改示例

```text
TaskSpec: APPROVED -> REVISED
TaskRun: PENDING -> RUNNING -> COMPLETED
Artifact(code-v1): ACCEPTED -> ARCHIVED
Artifact(code-v2): CREATED -> REVIEWED -> ACCEPTED
```

## 8. 对实现的指导意义

State Machine 的作用不是为了画流程图，而是为了统一：

- 后端状态字段
- 前端状态展示
- Orchestrator 和 Reviewer 的处理逻辑
- Demo 里的可解释执行过程
