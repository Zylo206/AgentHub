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
10. 确认同一 parallel group 的 Step 已进入执行层并发调度，TaskRunPanel 能展示并行组和执行结果。
11. 注意：当前仍不是完整动态 DAG 引擎，也不代表真实复杂群聊调度已完成。

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
13. 如果本机配置了可成功执行的非 MOCK Adapter，确认 Artifact Studio 出现 `Adapter Output - ...` 产物。
14. 确认 Adapter Output Artifact 内容包含 preferred / actual adapter、TaskStep 和原始 response。
15. 确认 MessageStream 出现 Adapter Output Artifact card；默认未配置真实 Adapter 时不要伪造该产物。

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
13. 通过 Memory API 或页面确认 MemoryItem 支持 category / scope / importance 更新。
14. 重启 backend 后确认 `backend/.agenthub/memories.json` 中的 MemoryItem 能被重新加载。
15. 执行 Artifact Revision 后，确认 ContextPanel 更新到 revision 对应 TaskRun。

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
7. 确认 TaskRun 返回 `orchestratorDecisionLog`，解释面板优先展示后端结构化决策日志，而不是只由前端推断。
8. 默认配置下 Planner 应显示规则化规划模式。
9. 如果设置 `AGENTHUB_PLANNER_TYPE=LLM` 且 OPENAI_COMPATIBLE 配置可用，确认 Planner 可尝试生成 JSON plan。
10. 如果 LLM Planner 配置缺失、返回非法 JSON 或 schema 校验失败，确认自动 fallback 到 RuleBasedPlanner，并在解释面板显示 fallback reason。

## K. 消息操作与一键应用 Diff

1. 在任意 MessageBubble 点击 `复制`，确认消息内容写入剪贴板或出现成功提示。
2. 点击 `引用`，确认 ChatInput 显示引用预览，发送后新消息保留 `quotedMessageId` 和内容快照。
3. 点击 `回复`，确认 ChatInput 显示回复预览，发送后新消息保留 `replyToMessageId` 和内容快照。
4. 确认新消息中显示结构化引用 / 回复卡片，包含被引用消息 ID 和内容快照。
5. 在被回复消息上点击 `查看 N 条回复`，确认回复线程可展开 / 折叠。
6. 在引用卡片点击 `定位原消息`，确认原消息被滚动定位并短暂高亮。
7. 对用户消息点击 `重新运行 Demo Task`，确认可以基于该消息重新生成 TaskRun。
8. 对 Agent 消息点击 `重新生成回复`，确认追加一条同 sender Agent 的新回复，并引用原 Agent 消息。
9. 在 Artifact Studio 选择 revision 产物，例如 `LoginPage.tsx v2`。
10. 确认 Diff Summary 显示行级 added / removed / unchanged 统计。
11. 点击 `应用 Diff 结果`。
12. 确认后端调用 `/api/artifacts/{artifactId}/apply-diff` 并生成新的 `ACCEPTED` Artifact 版本。
13. 对同一个 revision 再次点击 `应用 Diff 结果`，确认页面提示 Diff 冲突。
14. 点击 `仍然强制应用`，确认可以强制生成新的 `ACCEPTED` Artifact。
15. 注意：当前 patch apply 是轻量行级 patch，冲突检测是版本链规则，不是 AST 级代码编辑器、语义合并或完整 Git merge。

## L. Approval Gate / Action Audit / Snapshot Restore

1. 在 Artifact Studio 选择一个可操作 Artifact。
2. 点击 `应用 Diff 结果` 或 `仍然强制应用`。
3. 确认页面先展示 Approval Gate，而不是直接执行。
4. 确认 Approval Gate 中展示：
   - action type
   - affected artifact
   - risk level
   - diff preview / changed item 摘要
5. 点击 approve 后，确认后端创建并批准 ApprovalRequest，然后执行操作。
6. 再次使用同一个 approvalId 调用同一高风险接口应失败，确认 approval 已被 consumed。
7. 点击 `Deploy Selected Artifact`。
8. 确认 Deploy 同样需要 ApprovalRequest，并在通过后生成 Deploy Status Card。
9. 在 Snapshot 区域点击 Restore。
10. 确认 Restore 同样需要 ApprovalRequest，并在通过后生成恢复版本 Artifact。
11. 展开 Action Audit 时间线。
12. 确认能看到 approval created / approved / consumed / apply / deploy / restore 等记录。
13. 注意：当前 Approval / Audit 是 MVP 审批审计，不是企业级多人审批、权限系统或持久审计后台。

## M. AI 协作开发记录

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

## N. 构建与仓库卫生

1. 执行：
   `cd backend && mvn -q -DskipTests package`
2. 执行：
   `cd frontend && npm run build`
3. 确认 `.gitignore` 包含：
   `*.tsbuildinfo`
4. 确认 `.gitignore` 包含：
   `backend/.agenthub/`
5. 确认 `frontend/tsconfig.app.tsbuildinfo` 没有被提交。
6. 确认 `backend/.agenthub/memories.json` 没有被提交。
7. 执行：
   `git status`
8. 确认没有误提交：
   - build cache
   - node_modules
   - dist
   - API key
   - 本地环境文件
9. 执行：
   `node scripts/smoke-test.mjs`
10. 确认 smoke test 覆盖：
   - health / adapters
   - create conversation / send message
   - multi-mention
   - pin context / memory
   - demo-task
   - artifact revision
   - demo deploy
   - preview URL HTTP 200
   - group chat agent messages
   - LLM Planner fallback
   - Memory persistence / retrieval
   - Adapter Output Artifact optional positive path
   - structured reply / quote message fields
   - apply-diff generated Artifact
   - apply-diff conflict detection / force apply
   - single Agent reply regeneration

## 重点验收项

- 页面不白屏。
- 左侧 Agent / Conversation 能正常加载。
- ChatInput、MessageBubble、TaskRunPanel、ArtifactPanel 均可交互。
- selectedAgent、文本 `@AgentName`、多个开头连续 `@AgentName` 都能影响 TaskRun 第一个 step 或 conversation participants。
- MessageStream 能看到 Orchestrator / Frontend / Backend / Reviewer 群聊式 Agent 消息。
- Pinned Context 和 MemoryItem 能进入 TaskStep inputContext / ContextPanel。
- Artifact Revision 后 Version History / Diff Summary 正常。
- 消息复制、引用、回复、回复线程、原消息定位、基于消息重跑 Demo Task、单条 Agent 回复重新生成正常。
- 一键应用 Diff 能通过后端轻量 patch apply 生成新的 ACCEPTED Artifact，并能提示旧 revision 冲突。
- Apply Diff / Force Apply / Deploy / Restore 必须经过 ApprovalRequest，Action Audit 时间线可追溯。
- Deploy Status Card 和 `/preview/{artifactId}` 正常。
- Adapter fallback 显示清楚，不把 placeholder 伪装成真实接入。
- AI 协作开发记录可以被仓库直接查看。
