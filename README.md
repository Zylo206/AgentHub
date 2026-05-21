# AgentHub

AgentHub 是一个 Web 优先、IM 式多 Agent 协作平台，用于演示“人 + AI + 产物”的协作闭环。当前仓库已经不是 V0.1 骨架，而是包含可运行 Web Demo 的 V0.5 同步版：用户可以在三栏工作台中创建会话、发送任务、运行静态 demo-task、查看 TaskRun / Context / Artifact、执行 Artifact 二次修改，并创建自定义 Agent。

## 产品定位

AgentHub 不是普通 Chatbot，也不是以 Workflow Canvas 为主入口的编排工具。当前产品主入口是 IM Workspace，核心体验围绕以下能力展开：

- 通过聊天发起复杂任务
- 通过 Orchestrator 组织多 Agent 分工
- 在聊天流中查看 TaskSpec、TaskRun、ContextSnapshot、HandoffSummary
- 围绕 Artifact 进行预览、版本演进和二次修改
- 通过统一 Agent Adapter Layer 为后续接入 Codex、Claude Code、OpenCode 做准备

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
- TaskStep 记录 Adapter 执行信息
- Agent Adapter Layer 第一版
  - MockAgentAdapter
  - CodexAgentAdapter placeholder
  - ClaudeCodeAgentAdapter placeholder
  - fallback 到 MOCK
- 用户自建 Agent 最小保存闭环

### 前端

- React + Vite Web 前端
- 三栏 IM 工作台
  - 左侧 Conversation List + Agent List
  - 中间 Message Stream + TaskRunPanel + ContextPanel + ChatInput
  - 右侧 ArtifactPanel
- Agent Builder 页面
  - 支持创建自定义 Agent
  - 支持 `name`、`avatarUrl`、`systemPrompt`、`capabilityTags`、`toolTags`、`preferredAdapterType`
- Artifact 预览与二次修改
- Version History
- Diff Summary
- Revision 来源提示
- TaskStep 与 Artifact 高亮联动

## 当前仍然是静态 Demo 的部分

以下能力在当前版本中仍是静态 Demo 或 placeholder，不应视为真实完成：

- demo-task 仍是静态生成，不是真实动态 Orchestrator 规划
- Artifact revision 仍是静态模板，不是真实代码修改
- Diff Summary 是静态摘要，不是真实代码 diff
- ContextSnapshot / HandoffSummary 是静态构造，不是真实长期 memory system
- Codex / Claude Code / OpenCode 当前仍以 placeholder / fallback / Mock 为主，不是完整真实接入
- 没有 MySQL 持久化
- 没有 WebSocket / SSE 流式执行
- 没有真实多人协作
- 没有完整 `@Agent` 路由
- 没有真实部署状态卡片和部署执行链路

## 当前目录结构

```text
AgentHub/
├─ backend/                      Spring Boot backend
│  └─ src/main/java/com/agenthub
│     ├─ api/                    REST API
│     ├─ application/            application services
│     ├─ common/                 ApiResponse, IdGenerator, TimeProvider
│     ├─ domain/                 核心领域模型
│     └─ infrastructure/         memory repository, adapter layer
├─ frontend/                     React + Vite web app
│  └─ src/
│     ├─ api/
│     ├─ features/
│     ├─ layouts/
│     ├─ pages/
│     ├─ router/
│     ├─ styles/
│     └─ utils/
├─ docs/                         产品、技术、协作、规则文档
└─ scripts/                      预留脚本目录
```

## 前端启动方式

```powershell
cd frontend
npm install
npm run dev
```

默认前端开发地址由 Vite 提供，工作台入口路由：

- `/workspace`
- `/agents`

如需覆盖后端地址，可设置：

```powershell
$env:VITE_API_BASE_URL="http://localhost:8080"
```

## 后端启动方式

```powershell
cd backend
mvn spring-boot:run
```

默认后端地址：

- `http://localhost:8080`

当前配置文件位置：

- [application.yml](E:/CodeProject2/AgentHub/backend/src/main/resources/application.yml)

## Demo 操作流程

推荐演示路径：

1. 打开 `/workspace`
2. 点击 `Create Demo Conversation`
3. 发送任务：
   - “帮我生成一个 React 登录页面，要求支持邮箱登录和验证码登录，同时生成 README，最后检查代码质量并给出修改建议。”
4. 点击 `Run Demo Task`
5. 查看 Message Stream、TaskRunPanel、ContextPanel、ArtifactPanel
6. 点击 `LoginPage.tsx`
7. 查看 Version History 和 Diff Summary
8. 在 revision 输入框中输入：
   - “把按钮改成蓝色，并增加 loading 状态。”
9. 点击 `Revise Selected Artifact`
10. 查看 `v1 -> v2` 演进
11. 打开 `/agents`
12. 创建一个自定义 Agent
13. 返回 `/workspace`，确认 Agent List 中出现新 Agent

## 核心架构概览

```text
User
  -> Frontend IM Workspace
  -> Backend REST API
  -> TaskApplicationService / OrchestratorService
  -> AgentRoutingService
  -> AgentExecutorService
  -> AgentAdapterRegistry
  -> Mock / Codex placeholder / Claude Code placeholder
  -> Artifact / Context / Handoff persistence (in memory)
  -> Frontend render of TaskRun / Artifact / Version History
```

关键原则：

- 聊天是主入口
- Artifact 是后续迭代核心对象
- Adapter Layer 是统一抽象层，不等于真实 provider 已接通

## 比赛交付物对应关系

- 产品设计文档
  - [docs/product-design.md](E:/CodeProject2/AgentHub/docs/product-design.md)
- 技术文档
  - [docs/technical-design.md](E:/CodeProject2/AgentHub/docs/technical-design.md)
- 可运行 Demo
  - 当前 `frontend + backend` 可演示静态多 Agent 协作链路
- AI 协作开发记录
  - `docs/spec` / `docs/skills` / `docs/rules` / `docs/collaboration`
- 3 分钟 Demo 视频
  - 参考 [docs/demo-scenario.md](E:/CodeProject2/AgentHub/docs/demo-scenario.md)

## 下一阶段 Roadmap

优先级建议：

1. Selected Agent / `@Agent` 最小执行链路
2. 把自定义 Agent 的 `preferredAdapterType` 真正接入执行路径
3. 强化 OrchestratorService，减少静态编排逻辑散落
4. 至少两个 Agent 平台的最小真实或半真实接入
5. SSE / WebSocket 流式状态
6. Deploy Status Card 静态展示
7. MySQL 持久化
8. 最终文档 V1.0 和 3 分钟 Demo 视频

## 注意事项

- 当前版本适合比赛演示，不适合作为“真实多 Agent 生产系统”描述
- Adapter fallback 是为了稳定 Demo，不代表真实 provider 调用成功
- 当前路由和协作信息已经可见，但 `@Agent`、多人协作、真实部署仍未完成
- 若文档与代码冲突，以当前仓库代码为准
