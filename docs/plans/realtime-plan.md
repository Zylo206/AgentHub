# Realtime Plan

本计划记录 AgentHub 实时能力路线。当前核心是 SSE 实时刷新 + Run State Snapshot + WebSocket control plane MVP；真实 token streaming 和多节点事件总线后置。

## 当前状态

- `Done` SSE endpoint：conversation 级事件流。
- `Done` RealtimeEvent、RealtimeEventPublisher、RealtimeEventStore。
- `Done` SseConnectionRegistry。
- `Done` Last-Event-ID 补偿与 heartbeat。
- `Done` RealtimeRunState 与 active realtime state。
- `Done` 事件接入点：
  - message created
  - task run created / updated
  - task step updated
  - artifact created / updated
  - context / handoff updated
  - approval / audit updated
  - deployment created
  - error
- `Done` WebSocket control endpoint MVP。
- `Done` REST fallback：cancel / stop run。
- `Done` RunCancellationRegistry 和 execution-level cancel token 基础。
- `Done` Workspace EventSource 集成，收到事件后刷新对应 panel。

## 活跃计划

### P0：Stop / Cancel 语义继续收敛

- 区分 `STOP_RUN` 和 `CANCEL_RUN`。
- `STOP_RUN`：停止后续 step，保留已完成 partial output。
- `CANCEL_RUN`：取消整个 run，后续结果丢弃。
- 对运行中 long task 做 opt-in 验证。
- ActionAuditLog 记录 command accepted / rejected / consumed。
- SSE 事件同步刷新 TaskRunPanel 和 Realtime State。

### P1：Token streaming 评估

只有在真实 Adapter 输出质量稳定后再做。

未来边界：

- 优先只做 OpenAI-compatible streaming。
- stream chunk 用于 progress / temporary message，不直接替代最终 Artifact contract。
- 最终仍必须聚合为完整 JSON contract，并通过 validator 与 quality gate。

## 暂缓

- 多节点事件总线。
- Redis / Kafka / broker。
- token 级持久化。
- 完整双向聊天 WebSocket。

## 边界

- SSE 事件是刷新提示，不是唯一数据源。
- REST API 仍是权威数据来源。
- 当前 cancel token 不能强杀已经在执行中的非流式 HTTP 调用线程，但可以丢弃完成后的结果并阻止后续 step。
