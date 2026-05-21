# AgentHub

AgentHub 是一个以 IM 聊天为核心交互范式的多 Agent 协作平台原型，用于演示「用户发起任务 -> Orchestrator 编排 -> Agent 分工 -> Context / Handoff 可见 -> Artifact 预览与迭代」的完整闭环。

当前仓库已经不是早期骨架，而是一个**可运行的 MVP 演示闭环**。用户可以在 Web Workspace 中创建会话、选择或 `@Agent`、发送消息、运行静态 demo-task、查看 TaskRun / Context / Artifact，并对已有 Artifact 发起 revision，观察版本演进和 Diff Summary。

## 当前阶段说明

当前阶段可定义为：

- 已形成 MVP 演示闭环
- 已形成稳定 AI 协作开发工作流
- 正处于收敛式开发阶段
- 下一步重点是补齐硬要求，而不是继续扩散功能面

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
- Orchestrator 从 `Message.targetAgentId` 推断 selectedAgent
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
- MessageBubble 显示 `To: @Agent`
- TaskRunPanel 展示
  - assigned Agent
  - preferred adapter
  - actual adapter
  - fallback 状态
- Artifact Preview
- Artifact Revision
- Version History
- Diff Summary
- Revision 来源提示

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

- demo-task 仍是静态编排，不是真实动态 Orchestrator
- Artifact revision 仍是静态模板，不是真实代码修改
- Diff Summary 是静态摘要，不是真实代码 diff
- ContextSnapshot / HandoffSummary 是静态构造，不是真实长期 memory system
- Codex / Claude Code / OpenCode 当前仍以 placeholder / Mock fallback 为主
- 当前没有真实 Codex / Claude Code / OpenCode 完整接入
- 当前没有 MySQL 持久化
- 当前没有 WebSocket / SSE 流式执行
- 当前没有真实部署发布链路
- 当前没有真实部署状态卡片
- 当前没有多端同步
- 当前没有真实多人协作
- 当前没有完整群聊调度

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
  -> ChatInput / selectedAgent / @Agent
  -> Message(targetAgentId)
  -> OrchestratorService
  -> AgentRoutingService
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> Mock / Placeholder Adapter
  -> TaskRun / TaskStep / Artifact
  -> ContextSnapshot / HandoffSummary
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
- 用户自建 Agent
- Agent 作为联系人展示
- 统一 Agent Adapter Layer 骨架
- Artifact Preview
- Artifact Revision
- Version History
- AI 协作开发记录
- 可运行 Web Demo

### 部分满足

- 单聊模式
- `@Agent`
- 上下文管理
- 主 Agent Orchestrator
- 对话式局部修改

### 当前仍是静态 Demo / Placeholder

- 动态任务拆解
- 真实 Agent 执行
- 真实代码 diff
- 真实长期 memory
- 真实平台接入

### 当前未完成

- 至少两个主流 Agent 平台的真实 / 半真实接入
- 群聊模式
- 并行调度
- 代码冲突处理
- 部署状态卡片
- 多端支持
- 多人协作
- WebSocket / SSE

## 下一阶段 Roadmap

1. Agent Adapter 半真实接入 / 最小真实模型调用
2. OrchestratorService 规则化增强
3. 静态 Deploy Status Card
4. Demo 视频脚本与录制
5. 最终文档 V1.0
6. 自动化启动 / smoke test 脚本

## 注意事项

- 当前 Adapter 仍以 Mock fallback / placeholder 为主
- 当前没有真实 Codex / Claude Code / OpenCode 完整接入
- 当前没有 MySQL、SSE、真实部署、多端同步
- 当前文档与代码应始终以“已完成 / 静态 Demo / Placeholder / 未完成”明确区分
- 若用于答辩或视频演示，建议严格遵循 `docs/demo-scenario.md` 中的主线，避免现场演示未完成功能
