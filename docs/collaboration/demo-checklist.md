# AgentHub Demo Checklist

本清单用于比赛 Demo 前的人工验收。它不是自动化测试脚本，主要保证演示路径、静态 Demo 边界和 fallback 表达一致。

## 0. 前置检查

1. 打开 `http://127.0.0.1:5173/workspace`
2. 确认页面能正常加载三栏布局：
   - 左侧联系人栏
   - 中间聊天区
   - 右侧 Artifact Studio
3. 如果出现 `Request failed`，先刷新一次。
4. 如果仍失败，检查：
   - `http://localhost:8080/api/health`
   - `http://127.0.0.1:8080/api/adapters`
5. 确认前后端端口：
   - frontend: `http://127.0.0.1:5173`
   - backend: `http://127.0.0.1:8080`

## A. Workspace 主链路

1. 点击左侧 `创建 Demo 会话`。
2. 确认左侧 Conversations 出现新会话。
3. 确认中间 Message Stream 进入可输入状态。
4. 在输入框输入：
   `帮我生成一个 React 登录页面，支持邮箱登录和验证码登录，同时生成 README，并检查代码质量。`
5. 点击 `发送消息`。
6. 确认消息出现在聊天流中。
7. 点击 `运行 Demo Task`。
8. 检查中间是否出现 TaskRun / TaskStep 时间线。
9. 检查每个 step 是否显示：
   - 执行 Agent
   - Adapter
   - 状态
   - fallback 信息
10. 检查右侧 Artifact Studio 是否出现产物列表。
11. 点击 `LoginPage.tsx` 或类似代码产物。
12. 确认右侧显示代码预览、Version History、Diff Summary 区域。

## B. Artifact 二次修改

1. 在右侧选择一个 Artifact，优先选 `LoginPage.tsx`。
2. 在 Revision 输入框输入：
   `把按钮改成蓝色，并增加 loading 状态。`
3. 点击 `修改选中产物`。
4. 确认产生新版本，例如 `v2`。
5. 检查 Version History 是否显示 `v1 -> v2`。
6. 检查 Diff Summary 是否有摘要内容。
7. 检查 TaskRunPanel 是否新增 revision task run。
8. 点击 revision TaskStep，确认 Artifact 高亮联动仍正常。

## C. Agent Builder

1. 打开 `http://127.0.0.1:5173/agents`
2. 填写：
   - `Agent Name`: `My Frontend Agent`
   - `System Prompt`: `你是一个前端专家，擅长 React、UI 和 CSS。`
   - `Capability Tags`: `React, UI, CSS`
   - `Tool Tags`: `code, preview`
   - `Preferred Adapter`: 选择 `OPENAI_COMPATIBLE` 或 `CODEX`
3. 点击 `Create Agent` / `创建 Agent`。
4. 确认页面显示 Created Agent Summary。
5. 回到 `/workspace`。
6. 确认左侧 Agent List 中出现 `My Frontend Agent`。

## D. selectedAgent / @Agent

1. 在 `/workspace` 左侧点击 `My Frontend Agent`。
2. 确认中间 selectedAgent banner 显示该 Agent。
3. 确认 ChatInput 显示 `@My Frontend Agent` token。
4. 输入普通消息并发送。
5. 确认 MessageBubble 显示 `To: @My Frontend Agent`。
6. 点击 `运行 Demo Task`。
7. 确认第一个 TaskStep 的 Assigned Agent 是 `My Frontend Agent`。
8. 确认 Preferred Adapter 来自该 Agent，例如 `CODEX` 或 `OPENAI_COMPATIBLE`。
9. 如果 Adapter 不可用，确认 Actual Adapter fallback 到 `MOCK`。

## E. 文本 @Agent 解析

1. 点击 `Clear Selection` / 清除选择。
2. 在输入框输入：
   `@My Frontend Agent 帮我生成一个登录页`
3. 点击发送。
4. 确认消息正文显示为：
   `帮我生成一个登录页`
5. 确认 MessageBubble 显示：
   `To: @My Frontend Agent`
6. 确认 selectedAgent banner 同步显示 `My Frontend Agent`。
7. 点击 `运行 Demo Task`。
8. 确认后端能从 message targetAgentId 推断 selectedAgent。
9. 确认第一个 TaskStep 仍由 `My Frontend Agent` 执行。

## F. 多 @Agent 与群聊 Agent 消息

1. 确认左侧 Agent List 中存在 `Frontend Builder` 和 `Reviewer`，或先创建两个自定义 Agent。
2. 点击 `Clear Selection` / 清除选择。
3. 在输入框输入：
   `@Frontend Builder @Reviewer 帮我生成并评审一个登录页`
4. 点击发送。
5. 确认 MessageBubble 显示多个目标 Agent，例如：
   `To: @Frontend Builder @Reviewer`
6. 点击 `运行 Demo Task`。
7. 确认 MessageStream 出现多条 Agent 回复：
   - Orchestrator 任务理解 / 分派消息
   - Frontend Builder 或 selected Agent 的 specialist 消息
   - Backend Worker 消息
   - Reviewer 消息
   - Orchestrator 聚合总结消息
8. 确认 Conversation participants 能包含 Orchestrator、Frontend / selected Agent、Backend、Reviewer 以及 mentioned agents。
9. 确认 TaskRunPanel 能看到 parallel group / routing reason 等计划字段。
10. 注意：当前仍是计划层并行和可解释顺序执行，不是真实线程级并发。

## G. 错误路径

1. 输入：
   `@UnknownAgent hello`
2. 点击发送。
3. 预期：页面显示未知 Agent 提示，消息不发送。
4. 输入：
   `@My Frontend Agent`
5. 点击发送。
6. 预期：提示需要补充消息内容，消息不发送。
7. 清除选择后发送普通消息。
8. 预期：MessageBubble 不显示 `To: @Agent`，Demo Task 走默认内置 Agent。

## H. Adapter 状态与 fallback

1. 打开 `/agents`。
2. 查看 Preferred Adapter 下拉框。
3. 确认包含：
   - MOCK
   - CODEX
   - CLAUDE_CODE
   - OPEN_CODE
   - OPENAI_COMPATIBLE
4. 确认每个 Adapter 显示状态：
   - AVAILABLE
   - PLACEHOLDER
   - DISABLED
   - MISCONFIGURED
5. 选择 OPENAI_COMPATIBLE 创建 Agent。
6. 回到 `/workspace`。
7. 选择该 Agent。
8. Run Demo Task。
9. 确认 TaskStep 显示：
   - Preferred: OPENAI_COMPATIBLE
   - Actual: MOCK
   - Status: FALLBACK_USED
10. 确认页面没有把未配置 Adapter 伪装成真实成功。
11. 如果本机配置了 CLI Adapter，确认 Codex / Claude Code / OpenCode 只在 enabled、command 可用且 args-template 完整时显示 AVAILABLE。
12. 如果 CLI Adapter 执行失败，确认 TaskStep 仍 fallback 到 MOCK，不影响 Demo 主链路。

## I. Context / Handoff / Memory

1. Run Demo Task 后查看 ContextPanel。
2. 确认能看到 ContextSnapshot。
3. 确认 ContextSnapshot 包含：
   - 用户原始需求
   - TaskSpec 摘要
   - 相关 Artifact 数量
   - pinned context
4. 查看 HandoffSummary。
5. 确认存在类似：
   - Frontend Builder -> Backend Worker
   - Backend Worker -> Reviewer
6. 确认 Handoff 中展示：
   - passedArtifacts
   - keyDecisions
   - openIssues
7. 在 MessageBubble 点击 `固定到上下文`。
8. 确认 ContextPanel 的“手动固定上下文”区域出现该消息。
9. 在 MessageBubble 点击 `保存为记忆`。
10. 确认 ContextPanel 的“长期记忆”区域出现该消息。
11. 再次运行 Demo Task。
12. 确认第一个 TaskStep 的 inputContext 包含 pinned context 和 long-term memory。
13. 执行 Artifact Revision 后，确认 ContextPanel 更新到 revision 对应 TaskRun。

## J. Orchestrator 可解释面板

1. Run Demo Task 后查看 TaskRunPanel。
2. 确认能看到 Orchestrator 决策链：
   - Planner
   - Router
   - Executor
   - Aggregator
3. Planner 区域应展示任务目标、step 数量、预期产物和 required skills。
4. Router 区域应展示每个 step 的 assigned Agent、preferred adapter、parallel group 和 routing reason。
5. Executor 区域应展示 actual adapter、fallback 数量和执行状态。
6. Aggregator 区域应展示 resultSummary 和 artifact 数量。
7. 注意：当前解释面板主要由现有 TaskRun 数据派生，不代表真实 LLM planner 或动态 DAG 已完成。

## K. AI 协作开发记录

1. 打开 `docs/collaboration/development-workflow.md`。
2. 确认有项目开发工作流说明。
3. 打开 `docs/collaboration/prompt-template.md`。
4. 确认有标准 Codex prompt 模板。
5. 打开 `docs/collaboration/dev-log.md`。
6. 确认每轮开发都有 Phase 记录。
7. 打开 `docs/collaboration/decision-log.md`。
8. 确认记录了关键技术决策。
9. 打开 `docs/spec`、`docs/skills`、`docs/rules`。
10. 确认 Spec / Skill / Rules 能对应当前功能。

## L. 构建与仓库卫生

1. 执行：
   `cd backend && mvn -q -DskipTests package`
2. 执行：
   `cd frontend && npm run build`
3. 确认 `.gitignore` 包含：
   `*.tsbuildinfo`
4. 确认 `frontend/tsconfig.app.tsbuildinfo` 没有被提交。
5. 执行：
   `git status`
6. 确认没有误提交：
   - build cache
   - node_modules
   - dist
   - API key
   - 本地环境文件
7. 执行：
   `node scripts/smoke-test.mjs`
8. 确认 smoke test 覆盖：
   - health / adapters
   - create conversation / send message
   - multi-mention
   - pin context / memory
   - demo-task
   - artifact revision
   - demo deploy
   - preview URL HTTP 200
   - group chat agent messages

## 重点验收项

- 页面不白屏。
- 左侧 Agent / Conversation 能正常加载。
- ChatInput、MessageBubble、TaskRunPanel、ArtifactPanel 均可交互。
- selectedAgent、文本 `@AgentName`、多个开头连续 `@AgentName` 都能影响 TaskRun 第一个 step 或 conversation participants。
- MessageStream 能看到 Orchestrator / Frontend / Backend / Reviewer 群聊式 Agent 消息。
- Pinned Context 和 MemoryItem 能进入 TaskStep inputContext / ContextPanel。
- Artifact Revision 后 Version History / Diff Summary 正常。
- Deploy Status Card 和 `/preview/{artifactId}` 正常。
- Adapter fallback 显示清楚，不把 placeholder 伪装成真实接入。
- AI 协作开发记录可以被仓库直接查看。
