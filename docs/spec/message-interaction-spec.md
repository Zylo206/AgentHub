# Message Interaction Spec

## 目标

把 AgentHub 的 MessageStream 定义为 IM-first 多 Agent 协作消息中心，而不是普通日志列表。

稳定规则：

- 每条消息必须有清晰的消息类型。
- 每条消息必须有统一的 Message Action Bar。
- 用户能从消息上完成复制、引用、回复、pin、保存记忆、重跑和 Agent 回复再生成。
- Artifact、Diff、Deploy、Preview、附件必须用卡片语义展示，而不是只显示裸文本。

## 范围

本 spec 覆盖：

- 文本消息。
- 文件附件消息。
- Artifact 关联消息。
- Diff / Apply 风险消息。
- Deploy Status 消息。
- Preview 链接消息。
- Agent protocol 消息：TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR。
- 消息操作：copy / quote / reply / pin / memory / rerun / regenerate。
- 引用和轻量 thread 展示。

## 非目标

本 spec 不覆盖：

- 完整 Slack 式 thread 侧栏。
- 图片编辑、OCR、视觉理解。
- PPT 在线渲染或幻灯片浏览器。
- 富 Markdown 编辑器。
- Monaco Editor。
- 真实部署平台。
- 消息多用户权限和已读回执。

## Current Behavior

- MessageStream 已能展示用户消息、Agent 消息、系统消息和 Agent protocol 消息。
- 用户消息支持 @Agent、附件、引用、回复、pin、保存为记忆和基于消息重跑协作。
- Agent 消息支持复制、引用、回复、保存为记忆和单条 Agent 回复再生成。
- 附件支持上传、metadata、文本预览和下载。
- Artifact 可通过消息中的 artifactId 打开并在 Artifact Studio 中选择。
- Deploy Preview 目前是本地静态 preview，不是真实云部署。

## 核心模型

Message 必须至少包含：

- `id`
- `conversationId`
- `senderType`
- `senderId`
- `messageType`
- `content`
- `attachments`
- `artifactIds`
- `replyToMessageId`
- `quotedMessageId`
- `quotedMessageContent`
- `createdAt`

消息类型分层：

- `TEXT`：普通聊天文本。
- `TASK`：Orchestrator 任务规划。
- `RESULT`：Specialist Agent 执行结果。
- `REVIEW`：Reviewer 检查中或检查结果。
- `APPROVAL`：评审通过或审批相关。
- `REJECTION`：评审拒绝或阻塞。
- `ERROR`：执行错误。
- `ARTIFACT_CARD`：产物卡片。
- `DEPLOY_STATUS`：部署状态。
- `TASK_SPEC` / `TASK_STATUS`：任务规格和任务状态。

## Message Action Bar

统一操作区必须遵守：

- 所有消息显示 copy / quote / reply。
- 所有消息可 pin 到 Context。
- 所有消息可保存为 Memory。
- 用户消息显示 rerun / start collaboration。
- Agent 消息显示 regenerate reply。
- 操作状态必须可见：
  - `已固定`
  - `已保存记忆`
  - `重跑中`
  - `再生成中`
  - 失败原因通过 Workspace error / operation message 显示。

## 消息类型展示

文本消息：

- 使用 IM 气泡。
- 保留 copy / quote / reply。

附件消息：

- 显示文件名、contentType、size、preview 摘要和下载入口。
- 图片附件只标注为文件附件预览，不做图片编辑或 OCR。
- PPT 附件只标注为文件附件预览，不做在线渲染。

Artifact 消息：

- 显示 title、type、sourceKind、quality / realAdapterOutcome、language。
- 提供选择产物和打开 `/preview/:artifactId` 入口。

Diff 消息：

- 显示变更摘要、风险、Apply Diff 入口和审批状态。
- 真实 apply 仍由 ArtifactPanel / Approval Gate 承接。

Deploy Status 消息：

- 显示 target、status、Preview URL、Open Preview、Copy URL。
- 必须标注本地静态预览边界。

Preview 消息：

- 点击进入 `/preview/:artifactId`。
- Preview 页面负责内容渲染和版本切换。

## 引用和 Thread

- `replyToMessageId` 表示回复关系。
- `quotedMessageId` 表示引用关系。
- `quotedMessageContent` 用于在消息卡片中展示引用摘要。
- MessageStream 只做轻量 inline thread indicator。
- 不做完整 thread 侧栏。

## 验收标准

- 用户扫一眼能区分文本、附件、Artifact、Diff、Deploy、Preview、Agent protocol。
- 用户不需要在不同卡片里找操作；每条消息的操作入口统一。
- Pin / Memory 状态能在消息上反馈。
- Agent 回复再生成可从 Agent 消息直接触发。
- 图片 / PPT 不再是空白能力，但必须显示弱能力边界。
- Browser E2E 覆盖 Message Action Bar、引用、回复、pin、memory、Agent 回复再生成。

## Fallback / Boundary

- 本轮不做完整图片编辑、PPT 渲染、复杂 thread 侧栏。
- Artifact 卡片只展示当前已知 metadata；真实质量仍由 Artifact Studio 和 Adapter quality gate 负责。
- Deploy Preview 仍是本地静态预览。
- Message Action Bar 是前端产品化入口，不改变后端 Orchestrator 主链路。
## Coursework Boundary Update

- PPT is accepted as a file-level preview capability: show metadata, preview shell, download action, and allow the file or related excerpt to be added to Context / Memory. Full online slide rendering is not required.
- Code editing is accepted as lightweight Artifact editing: textarea content editing, revision instruction, diff summary, approval, and applied revision. Full IDE behavior such as Monaco, CodeMirror, AST patching, Git merge, or terminal sessions is not required.
