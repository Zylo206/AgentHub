# AgentHub 产品设计文档 V1.0

## 1. 产品定位

AgentHub 是一个 **IM-first 多 Agent 协作平台产品化原型**。

用户像使用即时通讯工具一样创建会话、选择或 `@` Agent、发送任务消息，并由 Orchestrator 组织多个 Agent 完成网页、代码、API 文档、评审报告等 Artifact 的生成、评审、修改和预览。

当前版本不是完整生产级多 Agent 平台，也不是纯静态 Demo。它已经形成可运行主链路：

- IM Workspace
- Agent 联系人和自建 Agent
- 单 Agent / 多 Agent `@` 路由
- Orchestrator 规划、路由、执行、聚合
- 多 Agent 协作消息流
- Context / Memory / Context Search
- Artifact Studio
- Revision / Diff / Apply / Snapshot / Restore
- Approval / Audit
- Deploy Preview
- SSE 实时刷新
- OpenAI-compatible / Claude Code / Codex 的 Artifact-only Adapter 链路
- API smoke、SSE smoke、Browser E2E、JDBC smoke、真实 Adapter smoke

## 2. 产品阶段

当前阶段：**MVP 后期到产品化原型阶段**。

| 维度 | 当前判断 |
|---|---|
| 主链路 | 已跑通，支持阶段性演示 |
| 产品体验 | 正在从调试入口收敛到 IM 主路径 |
| 真实能力 | 部分真实，仍保留 Mock / static fallback |
| 生产能力 | 有骨架和验证入口，但未默认生产化 |
| 下一阶段重点 | 稳定真实 Agent 输出、质量门禁、MySQL profile、UI E2E 常态化 |

## 3. 目标用户

### 3.1 比赛评审 / 答辩场景

关注点：

- 是否体现“多 Agent 协作平台”而不是普通 Chatbot。
- 是否能解释 Orchestrator、Adapter、Artifact、Context 的架构。
- 是否有可运行 Demo、技术文档、AI 协作记录和验证脚本。

### 3.2 AI 工程产品使用者

关注点：

- 能否通过聊天发起任务。
- 能否看到多个 Agent 如何分工。
- 能否持续修改和预览产物。
- 能否知道失败原因、fallback 原因和下一步操作。

### 3.3 开发者 / 产研协作者

关注点：

- 能否创建自定义 Agent。
- 能否选择 tool capability 和 preferred adapter。
- 能否基于上下文、记忆、附件和历史产物继续协作。
- 能否安全地 Apply Diff、Restore、Deploy Preview。

## 4. 核心产品原则

1. **IM-first**：主路径必须从发送消息开始，而不是从调试按钮开始。
2. **Artifact-centered**：Agent 输出不是一次性回复，而是可预览、可修改、可部署预览的产物。
3. **Explainable orchestration**：Planner、Router、Executor、Aggregator、Fallback 必须可解释。
4. **Safe by default**：高风险操作必须经过 Approval Gate 和 Audit Log。
5. **Fallback visible**：Mock、fixture、static fallback 不能伪装成真实能力。
6. **Chinese-first UI**：默认面向中文演示和答辩，术语可保留英文枚举。

## 5. 默认用户主路径

当前推荐主路径：

1. 打开 `/workspace`。
2. 创建或选择 Conversation。
3. 选择内置 Agent，或在 Agent Builder 创建自定义 Agent。
4. 在 ChatInput 输入任务消息，例如：
   - `帮我生成一个登录页，并让 Reviewer 检查质量`
   - `@Frontend Specialist @Reviewer 做一个 React 用户表格并评审`
5. Workspace 展示协作建议卡片。
6. 用户点击 `Start Collaboration`。
7. Orchestrator 生成计划并执行。
8. MessageStream 展示 `TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR` 协作消息。
9. Artifact Studio 展示代码、文档、API Contract、Review Report。
10. 用户执行 Revision、Apply Diff、Restore 或 Deploy Preview。
11. `/preview/:artifactId` 展示本地静态 Artifact 预览。

`Run Demo Task` 仍保留，但定位为 Debug / Advanced 入口，不是产品主 CTA。

## 6. 信息架构

### 6.1 Workspace

三栏结构：

- 左侧：Conversation List + Agent List。
- 中间：MessageStream + ChatInput + TaskRun / Orchestrator Explain。
- 右侧：Artifact Studio / Context / Quality / Deployment 等工作台面板。

### 6.2 Preview Studio

`/preview/:artifactId` 是独立预览工作台：

- Artifact metadata bar。
- Version switcher。
- Source / quality / status 信息。
- CODE / MARKDOWN / REVIEW_REPORT / API_CONTRACT / DATA_MODEL / WEB_PREVIEW presentation mode。
- 本地静态预览边界提示。

## 7. Conversation 设计

当前 Conversation 已从 Demo 列表增强为 IM 会话管理：

- 新建和切换会话。
- 参与 Agent 展示。
- pin / unpin。
- archive / unarchive。
- unreadCount。
- lastReadAt / lastMessageAt。
- 服务端 query 搜索。
- 默认排序：pinned first + lastMessageAt desc。

边界：

- 当前不是完整企业 IM。
- 置顶、归档、未读是产品化会话管理能力，不包含多用户实时协同或权限体系。

## 8. Agent 设计

### 8.1 内置 Agent

内置 Agent 包括：

- Orchestrator
- Frontend Specialist
- Backend Specialist
- Reviewer
- Claude Code
- Codex
- OpenCode / MOCK fallback 等 Adapter 入口

Agent 联系人展示：

- 名称 / 头像或缩写。
- role。
- status。
- capability。
- preferredAdapter。
- adapter health。
- success rate / fallback rate。

### 8.2 自定义 Agent

Agent Builder 支持：

- 基本信息。
- System Prompt。
- capabilityTags。
- tool capability：`code / review / api / preview / deploy / docs`。
- preferredAdapter：`MOCK / OPENAI_COMPATIBLE / CLAUDE_CODE / CODEX / OPEN_CODE`。

当前能力：

- 保存后出现在左侧 Agent List。
- 可被 `@AgentName` 命中。
- 可进入 `mentionedAgentIds`。
- 可进入 TaskGraph 和 Router scoring。

边界：

- 不是完整对话式 Agent 创建。
- Tool capability 是路由能力标签，不是真实工具调用系统。

## 9. 多 Agent 协作设计

### 9.1 指定方式

支持三种路径：

- 左侧 selectedAgent。
- 消息开头单个 `@AgentName`。
- 消息开头连续多个 `@AgentName`。

示例：

```text
@Frontend Specialist @Reviewer 做一个用户表格组件并评审
```

### 9.2 Orchestrator 协作流程

Orchestrator 负责：

- 识别任务。
- 读取 selectedAgent / targetAgentId / mentionedAgentIds。
- 结合 tool capability 选择 Agent。
- 构造 TaskGraph / ExecutionBatch。
- 调用 Adapter。
- 聚合结果。
- 生成多 Agent 协作消息。
- 写入 Artifact、ContextSnapshot、HandoffSummary、DecisionLog。

### 9.3 协作消息协议

MessageStream 使用协议视觉区分：

- `TASK`：计划、分派、执行开始。
- `RESULT`：Specialist 输出结果。
- `REVIEW`：Reviewer 检查。
- `APPROVAL`：通过。
- `REJECTION`：拒绝和修复建议。
- `ERROR`：失败或 fallback。

边界：

- 当前不是完全自治群聊。
- 不是任意自然语言中间 `@` 解析。
- 多 Agent 调度已有执行语义，但不是完整动态 DAG 平台。

## 10. 消息与操作设计

消息类型：

- 文本消息。
- 附件消息。
- Artifact 消息。
- Diff 消息。
- Deploy Status 消息。
- Preview 消息。
- Agent protocol 消息。

消息操作统一到 Message Action Bar：

- copy。
- quote。
- reply。
- pin。
- save memory。
- rerun / start collaboration。
- regenerate Agent reply。

边界：

- 图片和 PPT 目前以附件 metadata / download 为主。
- 未实现完整图片编辑、OCR、PPT 在线浏览器渲染。
- 未实现完整 Slack 式 thread 侧栏。

## 11. Context / Memory 设计

上下文来源：

- recent messages。
- pinned messages。
- MemoryItem。
- Artifact。
- Attachment contentPreview。
- previous TaskRun summary。

Context Search 使用 DB-backed Agentic Search 思路：

1. List / Glob：按 conversation、sourceType、时间、状态列候选。
2. Grep：关键词精确匹配。
3. Read：读取权威内容片段。
4. Scoring：启发式打分和解释。
5. Injected Step：注入 TaskStep.inputContext。

ContextPanel 展示：

- sourceType。
- score breakdown。
- matchedTokens。
- List / Grep / Read 阶段。
- semantic backend。
- injected TaskStep。

边界：

- 默认是 heuristic，不是向量数据库。
- embedding backend 是可插拔边界，默认不依赖外部 embedding 服务。

## 12. Artifact Studio 设计

Artifact Studio 定位为 **产物交付工作台**。

支持 Artifact 类型：

- `CODE`
- `MARKDOWN`
- `REVIEW_REPORT`
- `API_CONTRACT`
- `DATA_MODEL`
- `WEB_PREVIEW`

核心能力：

- Artifact list。
- Artifact Cockpit。
- Source badge：`REAL_ADAPTER / STATIC_TEMPLATE / MOCK_FALLBACK / USER_REVISION`。
- Quality badge：`ACCEPTED / PARSE_FAILED / QUALITY_FAILED / BUILD_FAILED / FALLBACK`。
- Diagnostic Panel。
- Version History。
- Line Diff。
- Apply Diff / Force Apply。
- Snapshot timeline。
- Restore。
- Deploy Status release panel。
- Copy / Download。

边界：

- 不使用 Monaco Editor。
- Patch apply 是轻量实现，不是完整 Git merge。
- Snapshot restore 生成新 Artifact 版本，不是覆盖原文件系统。

## 13. 真实 Agent 输出设计

真实 Adapter 输出必须遵循统一 JSON contract：

```json
{
  "assistantMessage": "string",
  "artifacts": [
    {
      "title": "string",
      "type": "CODE|MARKDOWN|REVIEW_REPORT|API_CONTRACT|DATA_MODEL|WEB_PREVIEW",
      "language": "string",
      "content": "string",
      "summary": "string"
    }
  ]
}
```

当前已接入：

- `OPENAI_COMPATIBLE`
- `CLAUDE_CODE` headless Artifact-only v1
- `CODEX` headless Artifact-only v1
- `OPEN_CODE` probe / fallback
- `MOCK`

质量门禁：

- contract validator。
- quality evaluator。
- optional CODE build validation。
- fallback reason。
- Adapter Quality Dashboard。

边界：

- 真实 provider 验证是 opt-in。
- 默认 smoke 不依赖 API key。
- `REAL_ADAPTER` 表示通过当前门禁，不代表代码一定生产可上线。

## 14. Approval / Audit 设计

高风险操作必须经过后端强制审批：

- Apply Diff。
- Force Apply Diff。
- Demo Deploy。
- Restore Snapshot。

ApprovalRequest 生命周期：

- `PENDING`
- `APPROVED`
- `CANCELLED`
- `CONSUMED`
- `EXPIRED`

ActionAuditLog 记录：

- approval created / approved / cancelled / consumed / rejected。
- apply diff。
- deploy。
- restore。
- regenerate。
- stop / cancel。

边界：

- 当前不是企业级多人审批。
- 没有 RBAC、组织权限、审计导出。

## 15. Deploy Preview 设计

当前 Deploy Preview 是本地静态预览闭环：

- Deploy Status Card。
- Preview URL。
- Open Preview。
- Copy URL。
- `/preview/:artifactId`。
- Version switcher。
- WEB_PREVIEW iframe srcDoc。

必须明确：

- 不是 Vercel / Netlify / Docker / Kubernetes。
- 不生成公网 URL。
- 不做真实构建发布。

## 16. Realtime 设计

当前实时能力：

- SSE server push。
- Realtime event store。
- Run state snapshot。
- Last-Event-ID replay。
- Workspace 自动刷新。
- WebSocket control plane 用于 Stop / Cancel。

边界：

- SSE 是刷新提示，不是唯一数据源。
- 不做多节点 event bus。
- token streaming 是 opt-in preview，不做 token 级持久化。

## 17. 验证与演示

主要验证入口：

- `node scripts/smoke-test.mjs`
- `node scripts/sse-smoke-test.mjs`
- `node scripts/jdbc-smoke-test.mjs`
- `node scripts/real-adapter-smoke-test.mjs`
- `node scripts/claude-code-smoke-test.mjs`
- `node scripts/codex-smoke-test.mjs`
- `node scripts/e2e-browser.mjs`
- `node scripts/verify-local.mjs`

Browser E2E 已作为 UI 主链路回归入口，覆盖：

- Workspace。
- 消息触发协作。
- 自定义 Agent。
- `@Agent` 路由。
- Approval。
- Restore。
- Deploy Preview。
- Preview Page。

## 18. 当前未完成能力

| 能力 | 当前边界 |
|---|---|
| 真实云部署 | 未实现 |
| 桌面端 / 移动端 | 未实现 |
| 完整多用户协同 | 未实现 |
| 完整图片 / PPT 富媒体 | 弱能力，附件展示为主 |
| 完整 token streaming | 非默认，仍是体验增强 |
| 多节点事件总线 | 未实现 |
| 生产级 MySQL 默认运行 | JDBC profile 可验证，但默认 memory |
| 企业级权限 / 审计 | 未实现 |
| 完整动态 DAG / Workflow Canvas | 未实现 |

## 19. V1.0 产品验收标准

V1.0 文档对应的产品验收标准：

- 用户不看文档也能从 `/workspace` 走完“发任务 -> 确认协作 -> 多 Agent 回复 -> Artifact -> Approval -> Preview”。
- 自定义 Agent 可以创建、展示、`@` 命中并进入路由。
- Orchestrator 决策链可解释。
- 真实 Adapter 输出和 fallback 原因可见。
- Artifact 可以预览、修改、diff、apply、snapshot、restore、deploy preview。
- 高风险操作必须有 Approval 和 Audit。
- Browser E2E、API smoke、SSE smoke 能作为稳定回归入口。
## 20. 课题边界更新：PPT 与代码编辑

- PPT 能力不再作为“完整在线幻灯片渲染”缺口追踪；当前验收只要求用户能看到 PPT 文件级预览壳、metadata、下载入口，并能把相关文件加入 Context / Memory 或交给 Agent 处理。
- Artifact 代码编辑不追求完整 IDE；当前验收只要求可查看、可编辑文本内容、生成 revision、查看 diff、走 Approval 后应用。
- Monaco / CodeMirror、PPT 在线逐页渲染、复杂富媒体编辑均作为后置增强，不影响当前生产级对齐主线。
