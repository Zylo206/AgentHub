# AgentHub

AgentHub 是一个以 IM 聊天为核心交互范式的多 Agent 协作平台 MVP。当前项目已经从早期工程 Demo 进入 **MVP 增强后期**：用户可以在 Web Workspace 中创建会话、选择或 `@Agent`、运行 Orchestrator 编排、查看多 Agent 协作消息、迭代 Artifact、执行静态部署预览，并通过 smoke test 验证主链路。

当前项目仍不是完整生产级多 Agent 平台。默认演示环境保留 Mock fallback 和静态模板兜底；真实 Adapter、LLM Planner、Deploy、Memory、Tool Capability 等能力均以 MVP / 半真实方式接入，并在界面和文档中明确边界。

## 当前阶段

| 项目状态 | 判断 |
|---|---|
| 当前阶段 | MVP 增强后期 |
| 可运行 Demo | 已具备 API + Web 主链路 |
| 多 Agent 协作 | 已支持 selectedAgent、单/多 `@Agent`、TaskGraph、Agent 协作协议消息 |
| 真实能力边界 | 真实 Adapter 输出、LLM Planner、Deploy Preview 均为可配置 / 半真实 / 可 fallback |
| 下一步重点 | 文档 V1.0 同步、REAL_FIRST 收敛、Adapter fixture、Reviewer REJECTION 闭环、Tool Capability UI 化 |

## 已实现能力

### 后端

- Spring Boot 3 + Java 17。
- 核心模型：Agent、Conversation、Message、TaskSpec、TaskRun、TaskStep、TaskGraph、Artifact、ContextSnapshot、HandoffSummary。
- Orchestrator 内部结构：TaskPlanner、AgentRouter、AgentStepExecutor、ResultAggregator。
- TaskGraph / ExecutionBatch / `CompletableFuture` 并行执行语义。
- RuleBased Planner + 可配置 LLM Planner JSON Schema + Prompt Layering + fallback。
- selectedAgent、`Message.targetAgentId`、`Message.mentionedAgentIds`。
- 多 `@Agent` 进入 TaskGraph，额外 mentioned Agent 生成 custom collaboration step。
- Agent 协作消息协议：`TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR`。
- Tool Capability Registry：`toolTags -> capability -> Router scoring`。
- Adapter 层：MOCK、OPENAI_COMPATIBLE、Codex / Claude Code / OpenCode CLI 探测型 Adapter。
- 非 MOCK Adapter 成功时可生成 REAL_ADAPTER Artifact；失败时 fallback 到 MOCK。
- Context / Memory：PinnedContext、MemoryItem、本地 JSON 持久化、规则检索、ContextSnapshot 注入。
- Artifact：Revision、line diff、Apply Diff、Force Apply、Snapshot、Restore。
- ApprovalRequest：Apply Diff / Force Apply / Deploy / Restore 等高风险操作需要后端审批。
- Action Audit：记录 approval、apply、deploy、restore 等操作时间线。
- Deploy Status Card：静态 demo deploy、Preview URL、`/preview/:artifactId`。
- API 级 smoke test：覆盖主链路、multi-mention、memory、approval、deploy preview、protocol messages。

### 前端

- React + Vite + TypeScript。
- 三栏 IM Workspace：
  - 左侧 Conversation / Agent 联系人栏。
  - 中间 MessageStream / ChatInput / TaskRunPanel / ContextPanel。
  - 右侧 Artifact Studio。
- Agent Builder：自建 Agent、system prompt、capability tags、tool tags、preferred adapter。
- ChatInput：selectedAgent token、单/多开头 `@AgentName` 解析。
- MessageBubble：目标 Agent、协议 badge、复制、引用、回复、pin、保存为 Memory、重新运行 Demo Task、单条 Agent 回复重新生成。
- TaskRunPanel：TaskStep、Adapter fallback、TaskGraph、ExecutionBatch、Orchestrator explain panel。
- ContextPanel：Pinned Context、Memory、ContextSnapshot、Handoff。
- Artifact Studio：预览、复制、下载、Version History、Diff Summary、Apply Diff、Approval Gate、Snapshot Restore、Deploy Status Card、Action Audit。
- Preview Page：`/preview/:artifactId`，支持版本切换和本地静态内容预览。
- Adapter Test Panel：可在 `/agents` 手动测试 Adapter execute、查看原始响应、fallback 和 artifact JSON contract 解析结果。

## 静态 / Mock / 半真实边界

以下能力不能描述为生产级真实完成：

- demo-task 仍是规则化主链路，不是完整自治 Agent runtime。
- LLM Planner 需要显式配置 OPENAI_COMPATIBLE，失败会 fallback 到 RuleBased Planner。
- Codex / Claude Code / OpenCode 是 CLI 探测型半真实 Adapter，不是深度平台接入。
- OPENAI_COMPATIBLE 可接 DeepSeek / OpenAI-style API，但默认不提交真实 key，也不要求真实调用成功。
- REAL_ADAPTER Artifact 只在非 MOCK 成功且响应可解析时生成；默认仍保留静态模板兜底。
- Tool Capability 是静态 registry，不是真实工具执行系统。
- Deploy Status Card 是本地 static demo simulation，不是真实 Vercel / Netlify / Docker 部署。
- MemoryItem 是本地 JSON + 规则检索，不是 MySQL / 向量数据库 / 生产级长期记忆。
- TaskGraph 已有并行执行语义，但不是完整动态 DAG 引擎。
- Approval / Audit 是 MVP 审批审计，不是企业级权限与多人审批系统。

## 启动方式

### Backend

```powershell
cd backend
mvn spring-boot:run
```

默认地址：

- `http://127.0.0.1:8080`
- health check: `http://127.0.0.1:8080/api/health`

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

默认地址：

- `http://127.0.0.1:5173/workspace`
- `http://127.0.0.1:5173/agents`

如需指定后端地址：

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8080"
```

## Smoke Test

启动 backend 和 frontend 后运行：

```powershell
node scripts/smoke-test.mjs
```

可配置：

```powershell
$env:AGENTHUB_API_BASE_URL="http://127.0.0.1:8080"
$env:AGENTHUB_FRONTEND_BASE_URL="http://127.0.0.1:5173"
node scripts/smoke-test.mjs
```

smoke test 是 API 级主链路验证，不是浏览器 E2E。当前覆盖 health、adapter、conversation、message、multi-mention、TaskGraph、memory、revision、apply diff、approval、deploy、preview URL、Agent 协作协议和单条 Agent 回复重新生成。

## OPENAI_COMPATIBLE / DeepSeek 配置

不要提交真实 API key。可在本机临时设置：

```powershell
$env:AGENTHUB_OPENAI_ENABLED="true"
$env:AGENTHUB_OPENAI_BASE_URL="https://api.deepseek.com"
$env:AGENTHUB_OPENAI_API_KEY="<your-api-key>"
$env:AGENTHUB_OPENAI_MODEL="deepseek-v4-flash"
```

然后打开 `/agents`，使用 Adapter Test Panel 测试 `OPENAI_COMPATIBLE`。

## 推荐演示主线

1. 打开 `/workspace`，创建 Demo Conversation。
2. 在 `/agents` 创建自定义 Agent，设置 `toolTags=code, preview` 或 `review`。
3. 回到 `/workspace`，输入单个或多个 `@AgentName`。
4. 发送消息，确认 MessageBubble 显示目标 Agent。
5. 运行 Demo Task。
6. 查看 MessageStream 中的 `TASK / RESULT / REVIEW / APPROVAL` Agent 协作消息。
7. 查看 TaskRunPanel 的 Planner / Router / Executor / Aggregator 决策链。
8. 查看 ContextPanel 的 pinned context、Memory、retrieved context、Handoff。
9. 在 Artifact Studio 查看 LoginPage、README、API Contract、Review Report。
10. 执行 Revision，查看 Version History 和 line diff。
11. 通过 Approval Gate 执行 Apply Diff / Force Apply。
12. 执行 Deploy，打开 Preview URL。
13. 展开 Action Audit 时间线。

## 文档入口

- [技术设计](E:/CodeProject2/AgentHub/docs/technical-design.md)
- [Roadmap](E:/CodeProject2/AgentHub/docs/roadmap.md)
- [Demo Checklist](E:/CodeProject2/AgentHub/docs/collaboration/demo-checklist.md)
- [开发记录](E:/CodeProject2/AgentHub/docs/collaboration/dev-log.md)
- [课题对齐评估](E:/CodeProject2/AgentHub/docs/mvp-requirements-alignment.md)

## 下一阶段

下一阶段优先级：

1. 文档 V1.0 同步与仓库卫生。
2. REAL_FIRST 收敛：真实 Adapter 成功时优先成为主 Artifact。
3. Adapter fixture / mock server：让真实输出契约可稳定测试。
4. Reviewer REJECTION 闭环：协议消息进入 retry / revise 流程。
5. Tool Capability UI 化：Agent Builder 中将 toolTags 变成明确能力选择。
