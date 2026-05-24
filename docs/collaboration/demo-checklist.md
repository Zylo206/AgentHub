# AgentHub Demo Checklist V1.0

本清单用于比赛提交前或阶段性演示前的人工验收。它不是浏览器自动化测试；自动 API 主链路请使用 `node scripts/smoke-test.mjs`。

## 0. 前置检查

1. 启动 backend：
   `cd backend && mvn spring-boot:run`
2. 启动 frontend：
   `cd frontend && npm run dev`
3. 打开 `http://127.0.0.1:5173/workspace`。
4. 确认页面能正常加载：
   - 左侧 Conversation / Agent 联系人栏。
   - 中间 MessageStream / TaskRunPanel / ContextPanel。
   - 右侧 Artifact Studio。
5. 如果出现 `Request failed`，检查：
   - `http://127.0.0.1:8080/api/health`
   - `http://127.0.0.1:8080/api/adapters`
6. 确认端口：
   - frontend: `http://127.0.0.1:5173`
   - backend: `http://127.0.0.1:8080`

## A. Workspace 主链路

1. 点击左侧 `创建 Demo 会话`。
2. 确认 Conversation List 出现新会话。
3. 在输入框输入：
   `帮我生成一个 React 登录页面，支持邮箱登录和验证码登录，同时生成 README，并检查代码质量。`
4. 点击发送。
5. 确认消息出现在 MessageStream。
6. 点击 `运行 Demo Task`。
7. 确认 TaskRunPanel 出现 TaskRun / TaskStep。
8. 检查每个 Step 是否显示：
   - Assigned Agent。
   - Preferred Adapter。
   - Actual Adapter。
   - fallback 状态。
   - parallel group / dependency。
   - routing reason。
9. 检查 Artifact Studio 是否出现：
   - LoginPage.tsx。
   - README.md。
   - API Contract。
   - Review Report。
10. 点击 LoginPage.tsx，确认右侧显示代码预览、Version History、Diff Summary。

## B. selectedAgent / 单 @Agent

1. 打开 `/agents`。
2. 创建一个自定义 Agent：
   - Agent Name: `My Frontend Agent`
   - System Prompt: `你是一个前端专家，擅长 React、UI 和 CSS。`
   - Capability Tags: `React, UI, CSS`
   - Tool Tags: `code, preview`
   - Preferred Adapter: `MOCK` 或 `OPENAI_COMPATIBLE`
3. 回到 `/workspace`。
4. 左侧选择 `My Frontend Agent`。
5. 确认 selectedAgent banner 显示该 Agent。
6. 输入普通消息并发送。
7. 确认 MessageBubble 显示 `To: @My Frontend Agent`。
8. 运行 Demo Task。
9. 确认第一个 TaskStep 的 Assigned Agent 是 `My Frontend Agent`。
10. 如果 Adapter 不可用，确认 Actual Adapter fallback 到 `MOCK`。

## C. 多 @Agent 与群聊协作

1. 确认存在 `Frontend Builder` 和 `Reviewer`，或创建两个自定义 Agent。
2. 点击 `Clear Selection`。
3. 输入：
   `@Frontend Builder @Reviewer 帮我生成并评审一个登录页`
4. 点击发送。
5. 确认 MessageBubble 显示多个目标 Agent。
6. 点击 `运行 Demo Task`。
7. 确认 TaskRun steps 数量大于等于 4：
   - Step 1：第一个 selected / mentioned Agent。
   - Step 2：Backend Worker 或 capability routed Agent。
   - Step 3：Reviewer 或 capability routed Agent。
   - Step 4+：额外 mentioned custom collaboration step。
8. 确认 TaskGraph 中存在 `MENTIONED_AGENT_GROUP`。
9. 确认同一 group 的 step 有 ExecutionBatch runtime 字段。
10. 确认 MessageStream 出现 Agent 协作协议消息：
   - `TASK`
   - `RESULT`
   - `REVIEW`
   - `APPROVAL`
11. 注意：当前仍不是完整自由群聊 runtime；多 Agent 回复由 demo-task 触发。

## D. Tool Capability Router

1. 打开 `/agents`。
2. 创建自定义 Agent：
   - Agent Name: `My Review Agent`
   - Tool Tags: `review`
   - Preferred Adapter: `MOCK`
3. 回到 `/workspace`。
4. 不选择该 Agent，也不 `@` 该 Agent。
5. 创建会话，发送：
   `帮我生成一个 React 登录页面，并重点检查质量风险。`
6. 运行 Demo Task。
7. 检查 Review Step：
   - Assigned Agent 应可被路由到 `My Review Agent`。
   - routingReason 包含 `Tool capability router selected Agent`。
   - requiredSkill 为 `QUALITY_REVIEW`。
8. 注意：Tool Capability 当前是静态 registry，不是真实工具调用系统。

## E. Context / Memory

1. 对任意用户消息点击 `固定到上下文`。
2. 确认 ContextPanel 中出现 pinned message。
3. 对任意消息点击 `保存为记忆`。
4. 确认 ContextPanel 中出现 MemoryItem。
5. 再次运行 Demo Task。
6. 检查第一个 TaskStep inputContext：
   - 包含 pinned context。
   - 包含 long-term memory。
   - 包含 retrieved context item。
7. 检查 ContextSnapshot：
   - includedMessageIds。
   - pinnedContextItems。
   - retrievedContextItems。
8. 注意：Memory 当前是本地 JSON + 规则检索，不是向量数据库或生产级长期记忆系统。

## F. Orchestrator 可解释面板

1. 运行 Demo Task 后查看 TaskRunPanel。
2. 确认 Orchestrator explain panel 显示：
   - Planner。
   - Router。
   - Executor。
   - Aggregator。
3. Planner 区域应显示 planningMode、steps、expected artifacts、fallback reason。
4. Router 区域应显示 assignedAgent、preferredAdapter、parallelGroup、routingReason。
5. Executor 区域应显示 actualAdapter、fallback、ExecutionBatch。
6. Aggregator 区域应显示 resultSummary、artifact count、fallback count。
7. 如果设置 `AGENTHUB_PLANNER_TYPE=LLM` 且 OPENAI_COMPATIBLE 可用，确认 Planner 可尝试 LLM JSON plan。
8. 如果 LLM Planner 不可用，确认 fallback 到 RuleBased Planner。

## G. Adapter 状态与测试面板

1. 打开 `/agents`。
2. 查看 Adapter health：
   - MOCK 应为 AVAILABLE。
   - OPENAI_COMPATIBLE 未配置时为 DISABLED 或 MISCONFIGURED。
   - Codex / Claude Code / OpenCode 未配置时为 DISABLED 或 MISCONFIGURED。
3. 在 Adapter Test Panel 选择 `MOCK`，执行测试。
4. 确认返回 preferred / actual / status / fallbackUsed。
5. 选择未配置的 OPENAI_COMPATIBLE 或 CLI Adapter，确认 fallback 到 MOCK 且原因可见。
6. 如本机配置 DeepSeek / OpenAI-compatible：
   - 设置 `AGENTHUB_OPENAI_ENABLED=true`
   - 设置 `AGENTHUB_OPENAI_BASE_URL`
   - 设置 `AGENTHUB_OPENAI_API_KEY`
   - 设置 `AGENTHUB_OPENAI_MODEL`
   - 重启 backend。
   - 在 Adapter Test Panel 测试 OPENAI_COMPATIBLE。
7. 注意：不要把未配置 Adapter 伪装成真实成功。

## H. REAL_ADAPTER Artifact

1. 在真实 OPENAI_COMPATIBLE 或可执行 CLI Adapter 成功时运行 Demo Task。
2. 检查 Artifact Studio 是否出现 REAL_ADAPTER 来源的 Artifact。
3. 检查 MessageStream 是否出现相关 Artifact card。
4. 检查 ContextSnapshot 是否记录 Adapter output。
5. 若真实 Adapter 未配置或 fallback 到 MOCK，不应生成伪造 REAL_ADAPTER Artifact。
6. 当前默认仍保留静态模板 Artifact 兜底。

## I. Artifact Revision / Diff / Apply

1. 选择 LoginPage.tsx。
2. 在 Revision 输入框输入：
   `把按钮改成蓝色，并增加 loading 状态。`
3. 点击修改选中产物。
4. 确认生成 v2。
5. 检查 Version History 显示版本链。
6. 检查 Diff Summary 显示 added / removed / unchanged。
7. 点击 `应用 Diff 结果`。
8. 确认出现 Approval Gate。
9. 审批通过后确认生成新的 ACCEPTED Artifact。
10. 对旧 revision 再次 apply，确认出现 conflict。
11. 点击 Force Apply，确认再次走 Approval Gate，并生成新 Artifact。
12. 注意：当前是轻量 line patch，不是 AST diff、IDE 编辑器或完整 Git merge。

## J. Approval / Audit / Snapshot / Restore

1. 对 Apply Diff / Force Apply / Deploy / Restore 执行操作。
2. 确认前端先显示 Approval Gate。
3. Approval Gate 应展示：
   - action type。
   - affected artifact。
   - risk level。
   - diff preview / changed item summary。
4. 审批通过后，后端执行操作。
5. 确认同一 approvalId 不能重复使用。
6. 展开 Action Audit timeline。
7. 确认出现：
   - approval created。
   - approved / cancelled。
   - consumed。
   - apply diff。
   - deploy。
   - restore。
8. 选择 ArtifactSnapshot 并 Restore。
9. 确认 Restore 同样需要 ApprovalRequest。
10. 注意：Approval / Audit 是 MVP 审批审计，不是企业级多人审批或 RBAC。

## K. Deploy Preview

1. 选择一个 Artifact。
2. 点击 Deploy Selected Artifact。
3. 确认出现 Approval Gate。
4. 审批通过后确认 Deploy Status Card 出现：
   - deploymentId。
   - deployTarget。
   - status。
   - previewUrl。
   - createdAt。
5. 点击 Open Preview。
6. 确认打开 `/preview/:artifactId`。
7. Preview 页面应显示：
   - title。
   - type。
   - version。
   - language。
   - content。
   - version switcher。
8. 注意：当前是本地静态部署模拟，不是真实公网部署。

## L. 消息操作

1. 点击 MessageBubble 的复制，确认内容可复制。
2. 点击引用，确认 ChatInput 显示引用预览。
3. 发送后确认新消息包含 quotedMessageId 和引用快照。
4. 点击回复，确认 ChatInput 显示回复预览。
5. 发送后确认新消息包含 replyToMessageId 和回复快照。
6. 展开回复线程，确认可查看相关回复。
7. 点击定位原消息，确认原消息高亮。
8. 对用户消息点击重新运行 Demo Task，确认基于该消息生成新 TaskRun。
9. 对 Agent 消息点击重新生成回复，确认追加一条同 sender Agent 的新回复。

## M. AI 协作开发记录

1. 打开 `docs/collaboration/development-workflow.md`。
2. 打开 `docs/collaboration/prompt-template.md`。
3. 打开 `docs/collaboration/dev-log.md`。
4. 打开 `docs/collaboration/decision-log.md`。
5. 打开 `docs/spec`、`docs/skills`、`docs/rules`。
6. 确认文档能解释当前实现，而不是旧骨架状态。

## N. 构建与仓库卫生

1. 执行：
   `cd backend && mvn -q -DskipTests package`
2. 执行：
   `cd frontend && npm run build`
3. 启动 backend 和 frontend。
4. 执行：
   `node scripts/smoke-test.mjs`
5. 如需要验收 auto-trigger approval 与 Adapter stats persistence，先按 PowerShell 设置：
   `$env:AGENTHUB_SMOKE_EXPECT_AUTO_TRIGGER_APPROVAL="true"`
   `$env:AGENTHUB_SMOKE_EXPECT_ADAPTER_STATS_PERSISTENCE="true"`
   `$env:AGENTHUB_ADAPTER_STATS_PERSISTENCE_PATH="E:\CodeProject2\AgentHub\backend\target\adapter-route-stats-smoke.json"`
   然后再次执行：
   `node scripts/smoke-test.mjs`
6. 检查 `.gitignore` 包含：
   - `*.tsbuildinfo`
   - `backend/.agenthub/`
   - `.agenthub/`
7. 执行：
   `git status`
8. 确认没有误提交：
   - `node_modules`
   - `dist`
   - `target`
   - `*.tsbuildinfo`
   - `backend/.agenthub/memories.json`
   - `.env`
   - API key

## 重点验收项

- 页面不白屏。
- Conversation / Agent / Message / Artifact 均可交互。
- selectedAgent、单 `@Agent`、多 `@Agent` 都能影响 TaskRun。
- 多 `@Agent` 进入 TaskGraph，并产生 Agent 协作协议消息。
- Tool Capability Router 能根据 `requiredSkill -> toolTags` 选择 Agent。
- Context / Memory 能进入 TaskStep.inputContext。
- Adapter fallback 不伪装真实成功。
- REAL_ADAPTER Artifact 只在真实 / 半真实 Adapter 成功时出现。
- Apply Diff / Deploy / Restore 必须经过 ApprovalRequest。
- Action Audit 可追踪高风险操作。
- Deploy Preview URL 可打开。
- `node scripts/smoke-test.mjs` 通过。注意：默认 smoke 不代表 REAL_ADAPTER、REAL_FIRST、REJECTION、auto-trigger approval、Adapter stats persistence 全部闭环；这些需要显式开启对应环境变量做扩展断言。

## O. Reviewer REJECTION / Retry-Revise 可选验收

1. 启动 backend 时保持默认配置，运行普通 demo-task，确认默认 TaskRun 仍为 `COMPLETED`，消息流出现 `APPROVAL`。
2. 使用拒绝触发 prompt，例如包含 `decision: reject`、`blocker` 或 `不通过`。
3. 运行 Demo Task。
4. 确认 TaskRun 状态为 `BLOCKED`。
5. 确认 MessageStream 出现：
   - Reviewer `REJECTION`
   - Orchestrator `REJECTION`
   - retry / revise 建议
6. 确认 Artifact Studio 中 Review Report 状态为 `REJECTED`。
7. 确认存在 `Reviewer retry / revise advice` Artifact，内容包含 blockers、affected artifacts 和 retry instruction。
8. 执行 Artifact Revision 后，再次运行不含拒绝触发词的 Demo Task，确认可回到 `APPROVAL` 路径。
9. 可用 smoke 扩展验证：
   `$env:AGENTHUB_SMOKE_EXPECT_REVIEW_REJECTION="true"`
   `node scripts/smoke-test.mjs`
10. 注意：该能力仍是规则化 Reviewer decision，不是真实静态分析或完整自动修复系统。
