# AgentHub 产品设计文档

## 1. 产品定位

AgentHub 是一个 IM-first 多 Agent 协作平台 MVP。用户像使用即时通讯工具一样，通过会话、Agent 联系人、`@Agent` 指令和协作消息流，驱动多个 Agent 完成代码、页面、API 文档、评审报告等 Artifact 的生成、修改、评审和预览。

当前版本定位为产品化原型，而不是完整生产级多 Agent 平台。

## 2. 背景与问题

### 2.1 背景

当前 AI 编程工具多以单 Agent、单轮对话或 IDE 插件为主，用户难以清晰看到：

- 多个 Agent 如何分工；
- 任务如何被规划、路由、执行和聚合；
- 生成结果如何被持续修改、评审和发布预览；
- AI 输出是否真实、是否 fallback、是否经过质量门禁。

### 2.2 用户痛点

| 痛点 | 具体表现 | AgentHub 的解决方式 |
|---|---|---|
| 多 Agent 协作过程不可见 | 用户只看到最终回答，看不到分工 | Message Stream 展示 `TASK`、`RESULT`、`REVIEW`、`APPROVAL`、`REJECTION`、`ERROR` 等消息类型 |
| 生成结果不可持续迭代 | AI 回复是一次性文本 | Artifact Studio 支持 Revision、Diff、Apply、Snapshot、Restore |
| 真实能力和 Mock 能力混淆 | Demo 容易夸大真实完成度 | Source badge、Quality badge、fallback reason、realAdapterOutcome 显示真实边界 |
| 高风险操作不安全 | Apply、Restore、Deploy 等动作缺少确认 | Approval Gate + Action Audit |
| 上下文难以复用 | 历史消息、记忆、产物无法进入后续任务 | Context、Memory、PinnedContext、ContextSnapshot |

## 3. 目标用户

### 3.1 AI 工程产品使用者

关注是否可以通过聊天发起任务，看到多个 Agent 的分工、产物、修改和预览。

### 3.2 开发者 / 产研协作者

关注是否能创建自定义 Agent、配置能力标签、选择 Adapter，并安全地修改和部署 Artifact。

### 3.3 本地部署与团队验证用户

关注是否可以在本地快速启动、切换真实登录与 JDBC 持久化、配置 IM 远程问答 Provider，并验证 Claude Code / Codex 等适配器能力状态。

## 4. 产品目标与非目标

### 4.1 产品目标

1. 用 IM 交互降低多 Agent 协作使用门槛。
2. 让 Orchestrator 的规划、路由、执行、聚合过程可解释。
3. 让 Agent 输出从聊天文本变成可交付、可修改、可预览的 Artifact。
4. 通过 Approval / Audit 降低高风险操作风险。
5. 明确展示真实 Adapter、Mock fallback、static template 的能力边界。
6. 为真实登录、成员管理、IM 远程问答配置和 JDBC 持久化提供最小可用产品闭环。

### 4.2 非目标

当前版本不做：

- 完整生产级多用户协同；
- 企业级 RBAC、OAuth、SSO、MFA；
- 真实 Vercel / Netlify / Docker / Kubernetes 部署；
- 完整动态 DAG / Workflow Canvas；
- 完整图片、PPT、富媒体编辑；
- 完整 token 级流式持久化和多节点事件总线。

## 5. 核心产品原则

1. IM-first：主路径从发送消息开始，而不是从调试按钮开始。
2. Artifact-centered：Agent 输出必须形成可预览、可修改、可交付的产物。
3. Explainable orchestration：规划、路由、执行、聚合、fallback 必须可解释。
4. Safe by default：高风险操作必须经过 Approval 和 Audit。
5. Fallback visible：Mock、fixture、static fallback 不能伪装成真实能力。
6. Demo honest：演示时必须明确哪些是真实能力，哪些是半真实或静态模拟。

## 6. 用户主路径

1. 用户打开 `/workspace`。
2. 创建或选择 Conversation。
3. 选择内置 Agent，或在 Agent Builder 创建自定义 Agent。
4. 在 ChatInput 输入任务，例如：
   - `帮我生成一个登录页，并让 Reviewer 检查质量`
   - `@Frontend Specialist @Reviewer 做一个 React 用户表格并评审`
5. 系统展示协作建议或允许用户启动协作。
6. Orchestrator 生成计划并执行。
7. Message Stream 展示多个 Agent 的协作消息。
8. TaskRunPanel 展示 Planner、Router、Executor、Aggregator 决策链。
9. Artifact Studio 展示代码、文档、API Contract、Review Report。
10. 用户执行 Revision、Diff、Apply、Snapshot、Restore 或 Deploy Preview。
11. Preview Page 展示本地静态预览结果。
12. Action Audit 记录关键操作。

补充主路径：

- 用户可在登录页完成注册、登录、刷新登录态与退出登录。
- 管理员可在 `/admin/users` 管理本地账号。
- 用户可在 Workspace 高级面板配置 IM 端远程问答的 OpenAI-compatible Provider。

## 7. 信息架构

### 7.1 Workspace

三栏结构：

- 左侧：Conversation List + Agent List；
- 中间：Message Stream + ChatInput + TaskRunPanel + Orchestrator Explain；
- 右侧：Artifact Studio + ContextPanel + Approval / Deploy / Audit。

当前产品实现中，权限、成员管理、Adapter 路由说明、IM API Provider 配置等能力收敛在高级面板或次级面板中，避免主路径被诊断信息淹没。

### 7.2 Agent Builder

支持：

- Agent 名称；
- System Prompt；
- capabilityTags；
- tool capability；
- preferredAdapter；
- Adapter Test / Local CLI Health。

### 7.3 Preview Studio

支持：

- Artifact metadata；
- Version switcher；
- Source / Quality / Status；
- `CODE`、`MARKDOWN`、`REVIEW_REPORT`、`API_CONTRACT`、`DATA_MODEL`、`WEB_PREVIEW` 展示。

### 7.4 Auth / Admin

支持：

- 登录页；
- 注册页；
- 基于真实用户体系的登录态守卫；
- 管理后台用户列表、创建、禁用、重置密码、管理员切换。

## 8. 核心功能设计

### 8.1 Conversation

支持新建、切换、搜索、置顶、归档、未读状态、参与 Agent 展示。

Conversation 当前还带有：

- ownerUserId；
- orgTag；
- visibility；
- memberRoles。

这些字段用于 Workspace 成员管理和读写权限判断。

### 8.2 Agent

支持内置 Agent 和自定义 Agent。Agent 可以通过 selectedAgent、单 `@Agent`、多 `@Agent` 被路由进入 TaskGraph。

Agent 页面同时承载：

- Agent Directory；
- Create Agent；
- Local CLI Health；
- Adapter Test。

其中 Local CLI Health 是本地 CLI 探测与诊断入口，不等同于 IM 远程 API 配置。

### 8.3 多 Agent 协作

Orchestrator 根据用户消息、selectedAgent、mentionedAgentIds、tool capability 和 adapter 状态生成任务计划，并输出协作消息。

协议消息包括：

- `TASK`
- `RESULT`
- `REVIEW`
- `APPROVAL`
- `REJECTION`
- `ERROR`

当前实现支持：

- 规则化 Planner；
- 可选 LLM Planner；
- 轻量 Task DAG / 节点状态；
- 并行分组；
- fallback 可见；
- late result discard；
- 审批闭环；
- 冲突 compare / apply / force apply。

### 8.4 Artifact Studio

支持：

- Artifact list；
- Artifact preview；
- Source badge；
- Quality badge；
- Version History；
- Line Diff；
- Apply Diff / Force Apply；
- Snapshot / Restore；
- Deploy Preview；
- Copy / Download。

同时支持：

- 基于内容编辑的 Draft Revision；
- 选中片段后通过聊天发起修改请求；
- Compare Diff 返回冲突类型与推荐操作；
- 本地 Preview Studio 展示静态预览。

### 8.5 Approval / Audit

高风险操作必须经过审批：

- Apply Diff；
- Force Apply Diff；
- Demo Deploy；
- Restore Snapshot。

Audit 还记录：

- approval bypass attempt；
- stale result discard；
- duplicate submission reject；
- runtime config 更新等关键动作。

### 8.6 Context / Memory

上下文来源包括：

- recent messages；
- pinned messages；
- MemoryItem；
- Artifact；
- Attachment preview；
- previous TaskRun summary。

当前默认检索是规则化可解释检索，不是生产级向量记忆系统。

### 8.7 Auth / 成员管理

当前版本已支持：

- 用户名 / 邮箱 + 密码注册登录；
- refresh token；
- `/me`；
- 管理员用户管理；
- 会话成员搜索目录；
- 会话成员角色维护；
- `PRIVATE / ORG / PUBLIC` 可见范围。

### 8.8 IM 远程问答 Provider 配置

Workspace 中提供 IM 端远程问答的 OpenAI-compatible 配置面板，支持：

- provider name；
- base URL；
- model；
- API key；
- `USER / ORG / GLOBAL` scope；
- 有效配置解析；
- API key 掩码显示。

这项能力服务于 IM 端问答，不是本地 CLI 配置面板。

## 9. MVP 边界

当前版本必须明确：

- Deploy Preview 是本地静态模拟，不是真实云部署；
- Tool Capability 是路由能力标签，不是真实工具执行系统；
- Memory 是规则检索或本地 / JDBC profile，不是生产级长期记忆；
- Codex、Claude Code、OpenCode 是 headless / probe / Artifact-only 接入；
- `REAL_ADAPTER` 表示通过当前 contract 和 quality gate，不代表产物一定可生产上线；
- 登录 / 管理后台属于本地账号体系，不是企业级 IAM；
- IM API Provider 配置是远程 HTTP 问答入口，不是本机 CLI 接管；
- 实时协同与 Yjs / Redis / object storage 能力已有实现边界，但默认本地运行仍以稳定 demo 和单机验证为主。

## 10. 验收标准

V1.x 产品验收标准：

- 用户可以从 `/workspace` 完成“发任务 → 多 Agent 协作 → Artifact → Revision → Approval → Preview”主路径；
- 自定义 Agent 可以创建、展示、被 `@` 命中，并进入路由；
- Orchestrator 决策链可解释；
- Adapter 成功、失败、fallback 原因可见；
- Artifact 可以预览、修改、diff、apply、snapshot、restore、deploy preview；
- 高风险操作必须有 Approval 和 Audit；
- 用户可以完成注册、登录、退出、管理员用户管理与成员搜索；
- IM 远程问答 Provider 可以在 Workspace 中配置并参与实际问答链路；
- API smoke、SSE smoke、JDBC smoke、Browser E2E 和适配器专项 smoke 可以验证核心主链路。
