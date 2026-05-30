# Multi-Agent Chat Spec

## 目标

定义 AgentHub 中 Conversation、Agent participants、多 `@Agent`、Agent 协作消息和群聊式回复流的稳定规则。

该 spec 用于约束 IM-first 多 Agent 协作主链路，确保用户在一个会话中能看到多个 Agent 被主 Agent 协调并依次产出。

## 范围

- Conversation 与 participant Agent 的关系。
- 单个或多个 `@AgentName` 的消息目标表达。
- `targetAgentId` 与 `mentionedAgentIds` 的兼容规则。
- Orchestrator 如何从 selectedAgent / mention 中生成 TaskGraph。
- MessageStream 如何展示 Agent 协作消息。
- Agent protocol message 类型和最小展示要求。

## 非目标

- 不实现完整多人实时群聊系统。
- 不要求多个 Agent 自主长期运行。
- 不要求消息中间任意位置的自然语言 `@Agent` 解析。
- 不实现跨会话 Agent 状态同步。
- 不实现真实并行聊天 UI，例如多个 Agent 同时流式输入。

## Current behavior

- Workspace 支持左侧选择 Agent。
- ChatInput 支持 selectedAgent token。
- 消息开头支持连续多个 `@AgentName`。
- 单 Agent mention 会写入 `targetAgentId` 和 `mentionedAgentIds[0]`。
- 多 Agent mention 会写入 `mentionedAgentIds`。
- Demo Task 会根据 selectedAgent / mentionedAgentIds 生成多个 Agent step。
- MessageStream 可展示 Orchestrator、Frontend Builder、Backend Worker、Reviewer 或自定义 Agent 的协作消息。
- Agent 消息可使用 `TASK`、`RESULT`、`REVIEW`、`APPROVAL`、`REJECTION`、`ERROR` 等协议类型。

## 核心模型

### Conversation

- `conversationId`
- `title`
- `type`
- `participantAgentIds`
- `createdAt`
- `updatedAt`

### Message

- `messageId`
- `conversationId`
- `senderType`
- `senderAgentId`
- `messageType`
- `content`
- `targetAgentId`
- `mentionedAgentIds`
- `replyToMessageId`
- `quotedMessageId`
- `attachments`

### Agent Protocol Message

- `TASK`：任务理解、计划、分派。
- `RESULT`：执行结果或产物说明。
- `REVIEW`：评审结论。
- `APPROVAL`：通过或确认。
- `REJECTION`：拒绝、阻塞、需要修复。
- `ERROR`：错误或 fallback 说明。

## 关键流程

1. 用户选择一个 Agent 或在输入框开头输入一个或多个 `@AgentName`。
2. 前端解析 mention，并在发送消息时携带 `targetAgentId` / `mentionedAgentIds`。
3. 后端保存原始 Message 和目标 Agent 信息。
4. Orchestrator 读取 source Message。
5. 如果请求显式指定 selectedAgent，优先使用 selectedAgent。
6. 如果没有 selectedAgent，优先使用 `mentionedAgentIds`。
7. 如果没有 mentioned agents，再使用 `targetAgentId`。
8. Router 将 mentioned agents 转成 TaskGraph 中的 Agent step。
9. Orchestrator 追加群聊式 Agent messages。
10. MessageStream 按消息类型展示 Agent 名称、角色、协议状态和 TaskStep 关联。

## 验收标准

- 单 `@AgentName` 消息能正确显示 `To: @AgentName`。
- 多 `@AgentName` 消息能显示多个目标 Agent。
- Demo Task 后 MessageStream 至少出现 Orchestrator 和多个 specialist Agent 回复。
- selectedAgent 或 mention 能影响 TaskGraph 中的 Agent 分派。
- Agent 协作消息能显示协议类型 badge。
- REJECTION 消息不能被当作普通成功结果展示。

## Fallback / Boundary

- 如果 mention 的 Agent 不存在，应阻止发送或返回明确错误。
- 如果 mentioned agents 为空，Orchestrator 使用默认内置 Agent。
- 如果 Adapter 不可用，Agent step 仍可通过 MOCK fallback 完成。
- 当前群聊协作是 Orchestrator 驱动的 MVP，不是完整自治 Agent 群聊。
- 当前多 `@Agent` 解析只保证消息开头连续 mention，不承诺解析消息中间复杂语义。
## Routing Preview / Agent Builder Rules

- ChatInput 必须在发送前展示路由预览：`To: @Agent`、`To: 多 Agent 协作` 或 `Orchestrator 自动分派`。
- 路由预览展示目标 Agent、首选 Adapter 和 tool capability，帮助用户理解消息会交给谁处理。
- 单个 `@AgentName` 写入 `targetAgentId`，同时兼容 `mentionedAgentIds[0]`。
- 多个开头连续 `@AgentName` 写入 `mentionedAgentIds`，后续由 Orchestrator 纳入 TaskGraph。
- Agent Builder 创建的自定义 Agent 必须包含基本信息、System Prompt、tool capability 和 preferredAdapter。
- 自定义 Agent 保存后应出现在 Workspace 联系人列表，并能被 `@AgentName` 命中。
- TaskRun / Orchestrator Explain 应展示 Router 决策证据，例如 requiredSkill、matched capability、selected Agent、selected Adapter 和 fallback reason。
- Boundary：当前不是完整自然语言 Agent 创建，也不是完整工具调用系统；tool capability 是路由用的轻量能力标签。
