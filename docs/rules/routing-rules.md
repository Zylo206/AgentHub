# Routing Rules V0.5

## 1. 文档目的

Routing Rules 用于说明 Orchestrator 和 AgentRoutingService 如何为不同角色、不同任务选择 preferred adapter，以及当前 Demo 中哪些行为已经实现，哪些仍是设计目标。

## 2. 当前已实现的路由规则

当前代码中已经存在显式 preferred adapter 路由：

- `ORCHESTRATOR -> MOCK`
- `FRONTEND_BUILDER -> CODEX`
- `BACKEND_WORKER -> MOCK`
- `REVIEWER -> CLAUDE_CODE`
- `CUSTOM -> MOCK`（如果没有单独配置）

另外，当前自定义 Agent 支持配置 `preferredAdapterType`：

- 如果自定义 Agent 配了 `preferredAdapterType`，优先使用该配置
- 如果配置非法，fallback 到 `MOCK`

## 3. 当前 demo-task 中的实际执行结果

虽然当前存在 preferred adapter 路由，但由于 `CODEX` 和 `CLAUDE_CODE` 仍是 placeholder，因此 demo-task 的实际执行结果是：

- Frontend Builder
  - preferred: `CODEX`
  - actual: `MOCK`
  - status: `FALLBACK_USED`
- Backend Worker
  - preferred: `MOCK`
  - actual: `MOCK`
  - status: `COMPLETED`
- Reviewer
  - preferred: `CLAUDE_CODE`
  - actual: `MOCK`
  - status: `FALLBACK_USED`

这部分已经在 TaskStep 和前端 TaskRunPanel 中可见。

## 4. 当前 Artifact revision 中的实际执行结果

revision TaskRun 同样适用当前策略：

- Frontend Builder revision step
  - preferred: `CODEX`
  - actual: `MOCK`
  - status: `FALLBACK_USED`
- Reviewer revision step
  - preferred: `CLAUDE_CODE`
  - actual: `MOCK`
  - status: `FALLBACK_USED`

## 5. 角色到 adapter 的当前策略

### Frontend Builder

适用任务：

- 页面
- 组件
- UI
- 样式
- 表单
- revision of code artifact

当前策略：

- preferred adapter: `CODEX`
- current executable path in demo: fallback to `MOCK`

### Backend Worker

适用任务：

- API Contract
- Data Model
- 服务草案

当前策略：

- preferred adapter: `MOCK`

说明：

- 未来可以演进为 `OPEN_CODE`
- 但当前代码仍以 `MOCK` 为主

### Reviewer

适用任务：

- 验收
- 质量检查
- 风险检查
- revision 后检查

当前策略：

- preferred adapter: `CLAUDE_CODE`
- current executable path in demo: fallback to `MOCK`

### Custom Agent

当前策略：

- 优先读取 `preferredAdapterType`
- 若为空，默认 `MOCK`
- 若非法，fallback `MOCK`

当前限制：

- 自定义 Agent 尚未真正进入 demo-task 执行链路
- 因此这部分当前更准确地说是“已实现配置能力，未完成完整执行接入”

## 6. fallback 规则

当前 AgentAdapterRegistry 的设计目标是：

1. 如果 preferred adapter 是 `MOCK`，直接执行 `MOCK`
2. 如果 preferred adapter 是 `CODEX` 或 `CLAUDE_CODE`
   - 先走对应 placeholder adapter
   - 若返回 `FAILED` 或 `FALLBACK_USED`
   - 则 fallback 到 `MOCK`
3. 在 TaskStep 中记录：
   - `preferredAdapterType`
   - `actualAdapterType`
   - `adapterStatus`
   - `adapterResponseSummary`
   - `adapterErrorMessage`

## 7. 当前已完成与下一阶段边界

### 已完成

- 显式 preferred adapter 路由规则
- placeholder adapter + mock fallback
- TaskStep 中的 preferred / actual / status 展示

### 下一阶段

- 让自定义 Agent 的 `preferredAdapterType` 真正进入执行链路
- 至少两个主流平台的最小真实或半真实接入
- 在 Workspace 中补最小 `@Agent` 选择执行链路

## 8. 对比赛要求的对应关系

当前 Routing Rules 已经体现出以下硬要求方向：

- 存在统一 Agent Adapter Layer
- 存在多个 adapter 类型抽象
- 存在失败降级 fallback 机制

但仍未完全满足：

- 至少两个主流 Agent 平台真实接入
- `@Agent` 指定执行
- 更真实的动态路由和并行调度
