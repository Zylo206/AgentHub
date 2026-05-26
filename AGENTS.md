## Commands

- 构建：`cd backend && mvn clean package -DskipTests`；`cd frontend && npm run build`
- 测试：`cd backend && mvn test`
- 单个测试：`cd backend && mvn test -Dtest=XxxTest`
- 代码检查：`cd frontend && npm run lint`；后端当前没有配置 SpotBugs，不要声称 `mvn spotbugs:check` 可用
- 格式化：当前没有配置 Spotless，不要声称 `mvn spotless:apply` 可用
- API smoke：`node scripts/smoke-test.mjs`
- SSE smoke：`node scripts/sse-smoke-test.mjs`
- JDBC smoke：`node scripts/jdbc-smoke-test.mjs`
- 真实 Adapter smoke：`node scripts/real-adapter-smoke-test.mjs`
- 浏览器 E2E：`node scripts/e2e-browser.mjs`

## What This Is

AgentHub 是一个 IM-first 的多 Agent 协作平台 MVP：用户在聊天工作台里选择或 @ 多个 Agent，由 Orchestrator 规划、路由、执行、聚合，并围绕 Artifact 完成生成、修订、审批、部署预览和实时状态刷新。

## Architecture

- 后端入口：Spring Boot，代码在 `backend/src/main/java/com/agenthub`
- API 层：`api/`，所有 REST 返回统一 `ApiResponse`
- 应用层：`application/`，Orchestrator、Agent、Context、Approval、Realtime、Deployment 等业务编排都在这里
- 领域层：`domain/`，Conversation、Message、Agent、TaskRun、TaskStep、Artifact、Context、Memory、Approval、Audit 等模型
- 基础设施层：`infrastructure/`，Adapter、CLI runner、memory / JDBC repository、文件存储等实现
- 前端入口：`frontend/src/main.tsx`，路由在 `frontend/src/router`
- Workspace 主页面：`frontend/src/pages/workspace/WorkspacePage.tsx`
- API Client：`frontend/src/api/agenthubApi.ts`，前端统一从这里调用后端，不要绕过它散落 fetch
- Orchestrator 主链路：`OrchestratorService` → `TaskPlanner` → `AgentRouter` → `AgentStepExecutor` → `ResultAggregator`
- Adapter 层：`AgentAdapterRegistry` 统一处理 MOCK、OPENAI_COMPATIBLE、Codex / Claude Code / OpenCode CLI 探测和 fallback
- 实时能力：SSE 事件通过 `RealtimeEventPublisher` 发布，WebSocket control 只用于 stop / cancel 控制面
- Artifact 链路：Artifact 生成、Revision、Diff、Apply、Snapshot、Restore、Deploy Preview 都必须保留 Approval / Audit 边界
- 不要随便改 `domain/` 下已有 public model 的字段语义，前端 DTO、JDBC repository、smoke test 都依赖它们

## Things That Will Bite You

- 默认 smoke 不等于真实 LLM 验证；真实 OpenAI-compatible provider 只能通过显式环境变量和 `real-adapter-smoke-test.mjs` 验证
- `MOCK` fallback 是稳定 demo 的安全网，不能移除，也不能把 fallback 伪装成真实成功
- Codex / Claude Code / OpenCode 当前是 CLI 探测型接入，不是深度真实平台集成
- `REAL_FIRST` 只在真实 Adapter 输出通过 JSON contract、quality evaluator、build validation 后才能把 `REAL_ADAPTER` 提升为主 Artifact
- 改 Orchestrator 主链路后必须跑 backend build 和 `node scripts/smoke-test.mjs`
- 改 realtime / cancel / run-state 后必须跑 `node scripts/sse-smoke-test.mjs`
- 改 Artifact apply / deploy / restore 后必须确认缺少 `approvalId` 时后端会拒绝执行
- 改 JDBC schema 或 repository 后，memory profile 仍必须可用，不能让默认 demo 依赖 MySQL
- `ContextRetrievalService` 目前是 heuristic / explainable retrieval，不是 embedding 或 vector search，不要在文档里夸大
- `mvn spring-boot:run` 在受限环境可能需要 Maven plugin 下载；构建验证优先用 `mvn clean package -DskipTests`
- 测试、文档和示例里的 API Key 全部用 mock 或占位符，禁止提交真实 Key

## Code Conventions

- 后端日志用 SLF4J，不用 `System.out`
- 异常不要吞掉，至少 `log.warn`，控制面 / audit / realtime 的非关键失败也要有明确 fallback
- REST API 返回统一 `ApiResponse`
- 前端 API 调用集中放在 `frontend/src/api/agenthubApi.ts`
- 前端不要引入 axios、Redux、Zustand 或 UI 组件库，除非有明确任务要求
- 新 Adapter 必须实现 `AgentAdapter` 并在 Spring Bean 中注册，由 `AgentAdapterRegistry` 统一 fallback
- 新工具能力先进入 `ToolCapabilityRegistry`，再让 Router 使用，不要只加标签不接路由
- 新高风险操作必须接 ApprovalRequest 和 ActionAuditLog
- 新 Artifact 修改路径必须考虑 Snapshot / Restore / Conflict / Diff Summary
- 新脚本优先用 Node 原生能力和 fetch，不要引入 Playwright / Cypress 以外的新测试框架
- 每轮有意义的功能开发必须追加 `docs/collaboration/dev-log.md`

## Don't

- 不要在业务代码里直接 `new Thread`，需要并发时使用现有 `CompletableFuture` / executor 语义或显式服务封装
- 不要提交真实 API Key、数据库密码、本机敏感路径或真实用户数据
- 不要改 `.env.example` 为包含真实密钥的格式
- 不要删除 Mock fallback
- 不要把不可用 Adapter 标成 AVAILABLE
- 不要把静态部署 Preview 写成真实 Vercel / Netlify / Docker / Kubernetes 部署
- 不要把 CLI 探测写成 Codex / Claude Code / OpenCode 深度接入完成
- 不要让默认 demo 强依赖真实 LLM、MySQL、WebSocket、token streaming、多节点事件总线或真实部署平台
- 不要绕过附件 AccessGuard / Scan / Cleanup 抽象直接暴露本地 storage path
- 不要大范围重写 README 或 docs，除非任务明确要求
- 不要留下临时日志、构建缓存、死文件、未使用目录或一次性 debug 脚本
