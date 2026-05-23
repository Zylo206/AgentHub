# AgentHub

AgentHub 是一个以 IM 聊天为核心交互范式的多 Agent 协作平台原型，用于演示「用户发起任务 -> Orchestrator 编排 -> Agent 分工 -> Context / Handoff 可见 -> Artifact 预览与迭代」的完整闭环。

当前仓库已经不是早期骨架，而是一个**可运行的 MVP 演示闭环**。用户可以在 Web Workspace 中创建会话、选择或 `@Agent`、发送消息、运行静态 demo-task、查看 TaskRun / Context / Artifact，并对已有 Artifact 发起 revision，观察版本演进和 Diff Summary。

当前最新课题对齐和下一阶段计划见：

- [docs/mvp-requirements-alignment.md](E:/CodeProject2/AgentHub/docs/mvp-requirements-alignment.md)
- [docs/roadmap.md](E:/CodeProject2/AgentHub/docs/roadmap.md)

## 当前阶段说明

当前阶段可定义为：

- 已形成可运行的 V1.0 MVP 演示闭环
- 已形成稳定 AI 协作开发工作流
- 当前定位为半真实 AgentHub 原型，不是完整生产平台
- 下一步重点是稳定验收、文档收口和少量硬缺口补强
- 当前仍可继续功能扩展，但应避免继续堆静态卡片

当前版本适合：

- 阶段性演示
- 3 分钟 Demo 脚本准备
- 比赛提交前的架构和产品说明收口

当前版本不应被表述为：

- 已完成真实多 Agent 平台接入
- 已完成真实动态 Orchestrator
- 已完成生产级部署与多人协作平台

## 当前已实现功能

### 后端

- Spring Boot 后端工程
- 核心领域模型
  - Agent
  - Conversation
  - Message
  - TaskSpec
  - TaskRun
  - TaskStep
  - Artifact
  - ContextSnapshot
  - HandoffSummary
- 内存 Repository
- 静态 demo-task 主链路
- 静态 Artifact revision 链路
- ContextSnapshot / HandoffSummary 查询接口
- Agent Adapter Layer 第一版
  - MockAgentAdapter
  - CodexAgentAdapter placeholder
  - ClaudeCodeAgentAdapter placeholder
  - Adapter fallback 到 MOCK
- OrchestratorService
- AgentRoutingService
- `selectedAgentId` 接入 demo-task
- `Message.targetAgentId`
- `Message.mentionedAgentIds`
- Orchestrator 从 `Message.targetAgentId` 推断 selectedAgent
- Orchestrator 从 `mentionedAgentIds` 推断参与 Agent
- 群聊式 Agent 消息流
- Pinned Context / MemoryItem MVP
- MemoryItem 本地文件持久化 / 规则检索
- 可配置 LLM Planner JSON Schema MVP
- Prompt Layering / RuleBased Planner fallback
- TaskGraph / ExecutionBatch / `CompletableFuture` 并行执行语义
- OrchestratorDecisionLog 结构化解释链路
- Adapter Output Artifact 半真实链路
- Deploy Status Card / Preview URL
- `/preview/:artifactId` 静态预览页
- Artifact Snapshot / Restore
- ApprovalRequest 后端强制审批
- Action Audit 时间线
- 用户自建 Agent 最小保存闭环

### 前端

- React + Vite Web 前端
- 三栏 IM Workspace
  - 左侧 Conversation List + Agent List
  - 中间 Message Stream + TaskRunPanel + ContextPanel + ChatInput
  - 右侧 ArtifactPanel
- Agent Builder 页面
- selectedAgent 可视化展示
- ChatInput 显式 `@Agent` token
- 文本开头最小 `@AgentName` 解析
- 文本开头连续多个 `@AgentName` 解析
- MessageBubble 显示 `To: @Agent`
- MessageBubble 支持固定到上下文、保存为记忆、复制 / 引用 / 重新运行 Demo Task
- TaskRunPanel 展示
  - assigned Agent
  - preferred adapter
  - actual adapter
  - fallback 状态
  - Orchestrator Planner / Router / Executor / Aggregator 可解释链路
- Artifact Preview
- Artifact Revision
- Version History
- Diff Summary
- line diff
- Artifact 内容复制 / 文件下载
- Deploy Status Card
- Preview 页面版本切换
- Revision 来源提示
- Approval Gate 影响范围摘要
- Action Audit 时间线

### AI 协作开发记录

- `docs/spec`
- `docs/skills`
- `docs/rules`
- `docs/collaboration`
- `development-workflow.md`
- `prompt-template.md`
- `dev-log.md`
- `demo-checklist.md`
- `decision-log.md`

## 当前仍是静态 Demo / Mock / Placeholder 的部分

以下能力必须明确区分，不应写成真实完成：

- demo-task 仍以规则化 / 可 fallback 编排为主，不是真实动态 Orchestrator
- LLM Planner 需要显式配置 `AGENTHUB_PLANNER_TYPE=LLM` 和可用 `OPENAI_COMPATIBLE` Adapter，失败时默认回退规则 Planner
- Artifact revision 仍以 Demo 模板为主，不是真实 Agent 代码生成
- Diff / Apply Diff 已有轻量行级 patch 和冲突 guard，但不是 AST diff、Git merge 或 IDE 级代码编辑
- ContextSnapshot / HandoffSummary 仍偏 Demo 构造，不是真实长期 memory system
- MemoryItem 当前是本地 JSON 文件持久化和规则检索，不是 MySQL / 向量数据库 / 生产级长期记忆系统
- Codex / Claude Code / OpenCode 当前是 CLI 探测型半真实 Adapter，不是深度平台接入
- Adapter Output Artifact 只在非 MOCK Adapter 成功且未 fallback 时生成；默认未配置真实 Adapter 时不会伪造输出产物
- 当前没有真实 Codex / Claude Code / OpenCode 完整接入
- 当前没有 MySQL 持久化
- 当前没有 WebSocket / SSE 流式执行
- 当前没有真实部署发布链路
- 当前 Deploy Status Card 是静态 Demo simulation
- 当前没有多端同步
- 当前没有真实多人协作
- 当前 demo-task 已有 TaskGraph / ExecutionBatch / 执行层并发组，但还没有完整动态 DAG 调度
- ApprovalRequest / Action Audit 当前仍是 MVP 能力，不是企业级多人审批或权限审计系统

## 技术栈

### 前端

- React 18
- TypeScript
- Vite
- React Router
- 原生 `fetch`
- CSS Modules 之外的项目级样式文件组织

### 后端

- Java 17
- Spring Boot 3
- Spring Web
- Spring Validation
- 内存 Repository

## 目录结构

```text
AgentHub/
├── backend/
│   └── src/main/java/com/agenthub
│       ├── api/
│       ├── application/
│       ├── common/
│       ├── domain/
│       └── infrastructure/
├── frontend/
│   └── src/
│       ├── api/
│       ├── features/
│       ├── layouts/
│       ├── pages/
│       ├── router/
│       ├── styles/
│       └── utils/
├── docs/
│   ├── collaboration/
│   ├── rules/
│   ├── skills/
│   └── spec/
└── scripts/
```

## 启动方式

### 启动后端

```powershell
cd backend
mvn spring-boot:run
```

默认地址：

- `http://localhost:8080`

### 启动前端

```powershell
cd frontend
npm install
npm run dev
```

前端入口：

- `/workspace`
- `/agents`

如需覆盖后端地址，可设置：

```powershell
$env:VITE_API_BASE_URL="http://localhost:8080"
```

## Demo 操作流程

推荐主线：

1. 打开 `/agents`
2. 创建一个自定义 Agent，例如 `My Frontend Agent`
3. 回到 `/workspace`
4. 在 Agent List 中看到该 Agent
5. 在 ChatInput 输入：
   - `@My Frontend Agent 帮我生成一个 React 登录页面`
6. 发送消息，观察 `To: @My Frontend Agent`
7. 点击 `Run Demo Task`
8. 查看 TaskRun / TaskStep / assigned Agent
9. 查看 adapter fallback 信息
10. 查看 ContextSnapshot / HandoffSummary
11. 在 ArtifactPanel 中查看 `LoginPage.tsx`
12. 发起 revision
13. 查看 `v1 -> v2`
14. 查看 Diff Summary

## 核心架构说明

当前主链路可以概括为：

```text
User
  -> ChatInput / selectedAgent / @Agent / multi @Agent
  -> Message(targetAgentId / mentionedAgentIds)
  -> OrchestratorService
  -> TaskPlanner / AgentRouter / AgentStepExecutor / ResultAggregator
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> Mock / OpenAI Compatible / CLI Adapter
  -> TaskRun / TaskStep / Artifact
  -> ContextSnapshot / HandoffSummary / Pinned Context / Memory
  -> Frontend Workspace Render
```

当前架构重点不是生产化，而是：

- 把多 Agent 协作链路可视化
- 把 Adapter fallback 显式化
- 把 Artifact-centered iteration 做成可演示闭环

## 课题要求对齐情况

### 已基本满足

- IM 聊天主界面
- 对话列表
- 群聊式 Agent 消息流最小闭环
- 用户自建 Agent
- Agent 作为联系人展示
- 统一 Agent Adapter Layer 骨架
- Artifact Preview
- Artifact Revision
- Version History
- AI 协作开发记录
- 可运行 Web Demo
- API 级 smoke test

### 部分满足

- 单聊模式
- `@Agent`
- 多 `@Agent`
- 上下文管理
- 主 Agent Orchestrator
- 对话式局部修改
- 部署状态卡片
- 长期记忆 MVP 和本地文件持久化
- 后端强制审批 / 操作审计
- 轻量代码冲突 guard

### 当前仍是静态 Demo / Placeholder

- 动态任务拆解
- 真实 Agent 执行
- 生产级长期 memory
- 真实平台接入
- 真实部署

### 当前未完成

- 至少两个主流 Agent 平台的深度真实接入
- 生产级真实 LLM Planner 主链路
- 生产级长期记忆治理
- 完整代码冲突处理 / merge UI
- 多端支持
- 多人协作
- WebSocket / SSE

## 下一阶段 Roadmap

1. 提交前仓库卫生与 smoke test 固化
2. Adapter 测试面板，提升半真实接入可验收性
3. ApprovalRequest 与 Action Audit 统一展示
4. Context Retrieval 排序解释增强
5. 深度真实平台接入
6. 生产级长期记忆治理、SSE / WebSocket、MySQL 和真实部署

## 注意事项

- 当前 Adapter 仍以 Mock fallback / CLI 探测 / OpenAI-compatible 半真实接入为主
- 当前没有真实 Codex / Claude Code / OpenCode 深度接入
- 当前没有 MySQL、SSE、真实部署、多端同步和真实多人协作
- 当前文档与代码应始终以“已完成 / 静态 Demo / Placeholder / 未完成”明确区分
- 若用于答辩或视频演示，建议严格遵循 `docs/demo-scenario.md` 中的主线，避免现场演示未完成功能

## OPENAI_COMPATIBLE 配置说明

当前仓库已包含一个可配置的 `OPENAI_COMPATIBLE` Adapter，用于最小真实 / 半真实模型接入探索。

环境变量示例见：

- [`.env.example`](E:/CodeProject2/AgentHub/.env.example)

所需变量：

```env
AGENTHUB_OPENAI_BASE_URL=
AGENTHUB_OPENAI_API_KEY=
AGENTHUB_OPENAI_MODEL=
```

说明：

- 不要提交真实 API key
- 未配置时，前端会显示 `DISABLED` 或 `MISCONFIGURED`
- 未配置或调用失败时，执行链路会 fallback 到 `MOCK`
- 该 Adapter 是 OpenAI-compatible 模型调用入口，不代表 Codex / Claude Code / OpenCode 已完整真实接入
## CLI Agent Adapter 配置说明

当前 Codex / Claude Code / OpenCode 通过 CLI 探测型 Adapter 做半真实接入探索。

配置示例见：

- [`.env.example`](E:/CodeProject2/AgentHub/.env.example)

相关变量：

```env
AGENTHUB_CODEX_ENABLED=false
AGENTHUB_CODEX_COMMAND=codex
AGENTHUB_CODEX_ARGS_TEMPLATE=

AGENTHUB_CLAUDE_CODE_ENABLED=false
AGENTHUB_CLAUDE_CODE_COMMAND=claude
AGENTHUB_CLAUDE_CODE_ARGS_TEMPLATE=

AGENTHUB_OPEN_CODE_ENABLED=false
AGENTHUB_OPEN_CODE_COMMAND=opencode
AGENTHUB_OPEN_CODE_ARGS_TEMPLATE=
```

说明：

- 未启用时，Adapter 状态显示 `DISABLED`。
- 启用但 `command` 不可用时，Adapter 状态显示 `MISCONFIGURED`。
- `command` 可用但 `args-template` 为空时仍不能执行，会 fallback 到 `MOCK`。
- `args-template` 支持 `{prompt}`、`{taskDescription}`、`{userInput}` 占位符。
- 配置不完整、CLI 超时、退出码非 0 或执行失败时，执行链路会 fallback 到 `MOCK`。
- 这是 CLI 探测型半真实接入，不代表 Codex / Claude Code / OpenCode 已完成深度平台集成。
- 不要提交真实密钥或本机敏感路径。
