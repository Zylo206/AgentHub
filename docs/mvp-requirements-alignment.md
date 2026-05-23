# AgentHub MVP 课题要求对齐评估

## 1. 总体判断

当前 AgentHub 已进入 **MVP 功能扩展期**，不是早期骨架，也还不是最终收敛展示阶段。

一句话结论：

> AgentHub 已经形成 IM Workspace、Agent 联系人、自建 Agent、多 @Agent、规则化 Orchestrator、群聊式 Agent 消息、Context / Memory、Artifact Revision、Deploy Preview、Adapter fallback、smoke test 的 MVP 闭环；下一阶段应优先补真实并行调度、真实 LLM Planner、长期记忆持久化、真实 Adapter 产物质量和消息操作深化。

| 项目阶段 | 判断 |
|---|---|
| 当前阶段 | MVP 功能扩展期，不急于最终收敛 |
| Demo 闭环 | 已形成，可阶段性展示 |
| AI 协作工作流 | 已形成，并有文档沉淀 |
| 产品完整度 | 中等偏上，核心体验有形，但多处仍是静态 / Mock / 半真实 |
| 下一步方向 | 继续补课题硬缺口，而不是马上只打磨 Demo |

## 2. 课题功能对齐表

| 课题要求 | 当前实现 | 状态 | 实现程度 | 下一步缺口 |
|---|---|---|---:|---|
| IM 聊天主界面 | 三栏 Workspace，Conversation / Agent / Message / Artifact Studio | 部分满足 | 80% | 置顶、归档、搜索、多窗口并行仍弱 |
| 对话列表 | 可创建 Demo Conversation，可切换会话 | 部分满足 | 65% | 最近活跃排序、搜索、归档未完成 |
| 单聊模式 | selectedAgent、targetAgentId、单 @Agent 可路由 | 部分满足 | 70% | 还不是完整 1v1 Agent 长线程 |
| 群聊模式 | 多 Agent 参与者、群聊式 Agent 消息、多个 @Agent、TaskStep 分工 | 部分满足 | 65% | 真实并行执行、动态群聊回复仍未完成 |
| 多 @Agent | 消息开头连续多个 @AgentName，mentionedAgentIds 保存 | 部分满足 | 70% | 不解析消息中间 @，不支持自然语言复杂 @ |
| 多会话并行 | 内存多 Conversation，可切换 | 部分满足 | 55% | 非多窗口，刷新丢数据 |
| 聊天历史上下文 | Message 保存，Pinned Context，MemoryItem MVP | 部分满足 | 65% | 未持久化，未做检索策略和长期记忆治理 |
| 手动 pin 上下文 | Message pin、ContextPanel 展示、TaskStep inputContext 引用 | 部分满足 | 75% | pin 仍是内存态，引用关系可更结构化 |
| 消息类型：文本 | 已支持普通文本消息 | 已满足 | 85% | 消息操作还可增强 |
| 消息类型：代码块 | Artifact 代码预览、复制、下载 | 部分满足 | 70% | 聊天流内代码块操作仍弱 |
| 文件附件 / 图片 | 未见完整上传和附件模型 | 未完成 | 0% | 需要附件领域模型和上传接口 |
| 网页预览卡片 | WEB_PREVIEW、PreviewPage、iframe srcDoc | 部分满足 | 70% | 真实网页生成和沙箱策略仍可增强 |
| Diff 视图 | line diff / Diff Summary / Version History | 部分满足 | 70% | 仍不是完整代码编辑器和真实 patch apply |
| 部署状态卡片 | Demo Deploy、Deploy Status Card、Preview URL、/preview 页面 | 静态 Demo | 75% | 不是真实 Vercel / Netlify / Docker |
| 消息操作 | pin、保存为记忆、复制、引用、重新运行 Demo Task | 部分满足 | 65% | 回复、重新生成单条 Agent 回复、一键应用 Diff 待补 |
| Orchestrator 拆解 | Planner / Router / Executor / Aggregator 拆分和可解释面板 | 部分满足 | 75% | Planner 仍是规则化，不是真实 LLM planning |
| Orchestrator 分派 | selectedAgent、mentionedAgentIds、内置 Agent 路由 | 部分满足 | 75% | 多 Agent 动态路由策略仍浅 |
| Orchestrator 聚合 | ResultAggregator、群聊总结消息、TaskRun summary | 部分满足 | 70% | 聚合仍偏模板 |
| 并行调度 | parallelGroupKey / dependsOn 字段和展示基础 | 静态 / 计划层 | 35% | 未做真实线程级并发执行 |
| 失败降级 | Adapter fallback 到 MOCK，状态可见 | 部分满足 | 70% | 任务级失败恢复树未完成 |
| 代码冲突处理 | 未实现 | 未完成 | 0% | 需要冲突检测和 merge / resolution UI |
| 统一 Adapter 层 | Mock、OpenAI Compatible、Codex / Claude Code / OpenCode CLI 探测 | 部分满足 | 75% | 主流平台深度接入不足 |
| 至少 2 个主流 Agent 平台 | Codex / Claude Code / OpenCode 为 CLI 探测型半真实接入 | 半真实 | 55% | 不是深度真实平台能力 |
| OpenAI Compatible | 可配置真实模型调用，失败 fallback | 部分满足 | 65% | 非流式，输出只部分进入 Artifact |
| 用户自建 Agent | Agent Builder，prompt、tags、adapter 配置 | 部分满足 | 75% | 不是对话式创建，工具集较轻 |
| Agent 联系人 | Agent List 展示头像、名称、能力标签、Adapter 状态 | 已满足 | 85% | 分组、搜索、在线状态可增强 |
| Artifact 预览 | Artifact Studio、PreviewPage、版本切换 | 部分满足 | 80% | 富 Markdown / 文件附件 / PPT 未做 |
| Artifact 编辑 / 二次修改 | Revision、v1 -> v2、line diff | 部分满足 | 75% | 不是真实代码编辑器 |
| Version History | Artifact lineage 和版本切换 | 部分满足 | 80% | 版本关系仍轻量 |
| 一键部署发布 | 静态 demo deploy + Preview URL | 静态 Demo | 70% | 真实构建日志和公网部署未做 |
| Web 端 | React + Vite 可运行 | 已满足 | 85% | 可继续做稳定性和响应式 |
| 桌面端 / 移动端 | 未实现 | 未完成 | 0% | P2 后置 |
| AI 协作记录 | docs/collaboration、dev-log、workflow、prompt-template、decision-log | 已满足 | 90% | 继续保持每轮同步 |
| 产品 / 技术文档 | 已有，但需要同步 Phase 37-39 最新能力 | 部分满足 | 70% | 文档 V1.0 需要继续修复和更新 |
| 可运行 Demo | 前后端 + smoke test 主链路 | 已满足 | 85% | 需要稳定启动说明和缓存文件清理 |
| 3 分钟 Demo 视频 | 未完成 | 未完成 | 0% | 当前不急，可后置 |

## 3. 评分维度自评

| 评分维度 | 权重 | 当前预估 | 理由 | 下一步提升点 |
|---|---:|---:|---|---|
| AI 协作能力 | 30% | 85 / 100 | Spec / Skills / Rules / dev-log / workflow 已沉淀，且每轮开发有记录 | 继续保持 dev-log，补 AI 协作链路说明图 |
| 功能完整度 | 25% | 68 / 100 | MVP 主链路完整，多 @Agent、群聊消息、Memory、Deploy Preview 已具备，但真实并行和真实平台深度不足 | 优先补真实并行调度、LLM Planner、Memory 持久化 |
| 生成效果质量 | 20% | 74 / 100 | UI 已打磨，Artifact Studio、Preview、Deploy Card、Version History 有产品感 | 补真实 Adapter 产物质量、Markdown 富渲染、Diff 应用 |
| 代码理解度 | 15% | 78 / 100 | 后端分层、Orchestrator 拆分、Adapter fallback、smoke test 可解释 | 技术文档需同步最新架构和边界 |
| 创新与产品感 | 10% | 76 / 100 | IM + Artifact-centered iteration + Agent Builder + Memory + Deploy Preview 有辨识度 | 增强 Orchestrator 决策链和 Agent 协作可视化 |

## 4. 当前已形成的 MVP 主链路

当前最稳的主链路是：

1. 打开 `/workspace`。
2. 创建 Demo Conversation。
3. 创建或选择自定义 Agent。
4. 在 ChatInput 使用 `@AgentName` 或多个开头连续 `@AgentName`。
5. 发送消息，MessageBubble 显示目标 Agent。
6. 运行 Demo Task。
7. Orchestrator 规则化规划 Frontend / Backend / Reviewer step。
8. MessageStream 出现 Orchestrator / Frontend / Backend / Reviewer 群聊式 Agent 消息。
9. TaskRunPanel 展示 TaskStep、assigned Agent、Adapter fallback 和 Planner / Router / Executor / Aggregator 可解释链路。
10. ContextPanel 展示 pinned context、MemoryItem、ContextSnapshot / HandoffSummary。
11. Artifact Studio 展示 LoginPage、README、API Contract、Review Report。
12. 对 Artifact 执行 Revision，生成 v2 和 line diff。
13. 执行 Demo Deploy，生成 Deploy Status Card。
14. 打开 `/preview/{artifactId}`，查看静态 Artifact 预览和版本切换。
15. 运行 `node scripts/smoke-test.mjs` 验证 API + Deploy Preview URL 主链路。

这条链路适合阶段性展示，但不应被描述为完整生产级多 Agent 平台。

## 5. 下一阶段 P0 / P1 / P2 计划

### P0：必须优先补齐

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P0-1 | 真实并行多 Agent 调度 v1 | 把当前 parallelGroupKey 从展示字段推进到执行层并发 | 同一 parallel group 的 step 使用 `CompletableFuture` 并发执行；失败仍 fallback；TaskRunPanel 显示真实并发结果 |
| P0-2 | LLM Planner JSON Schema MVP | 让 OPENAI_COMPATIBLE 可选生成 OrchestratorPlan | 配置 `LLM` planner 后调用模型产出 JSON plan；schema 校验失败回退 RuleBasedPlanner；可解释面板展示 fallback reason |
| P0-3 | MemoryItem 持久化与检索策略 | 把长期记忆从内存 MVP 推进到可复用上下文能力 | Memory API 支持稳定查询、更新、删除；Orchestrator 按 conversation / scope / importance 选取 memory |
| P0-4 | Adapter 成功输出进入真实 Artifact 链路增强 | 降低“Adapter 只是状态展示”的风险 | 非 MOCK 成功响应能生成 Review Report / Markdown / Text Artifact，并进入 ContextSnapshot / MessageStream |
| P0-5 | 文档修复与架构同步 | 防止代码能力和文档脱节 | README、technical-design、roadmap、demo-checklist 同步最新能力 |
| P0-6 | 仓库卫生与提交前检查 | 保证 MVP 可稳定交接 | 清理 `frontend/tsconfig.app.tsbuildinfo` 等构建缓存；smoke test、backend build、frontend build 全通过 |

### P1：增强可信度和产品感

| 优先级 | 任务 | 目标 | 验收标准 |
|---:|---|---|---|
| P1-1 | 消息操作深化 | 补 IM 核心体验 | 支持回复、引用关系结构化、基于引用消息执行局部修改 |
| P1-2 | 一键应用 Diff | 让 Diff 从展示变成操作 | Diff Summary 可触发 Artifact Revision 或 patch preview |
| P1-3 | Orchestrator Decision DTO | 后端输出结构化决策链 | 不再只由前端派生 Planner / Router / Executor / Aggregator 面板 |
| P1-4 | Adapter 测试面板 | 让半真实接入更可验收 | `/agents` 可测试 Adapter execute，明确 AVAILABLE / MISCONFIGURED / FALLBACK |
| P1-5 | Smoke test 扩展 | 降低回归风险 | 覆盖真实并行 group、LLM planner fallback、Memory retrieval、Adapter output Artifact |

### P2：后置或加分项

| 优先级 | 任务 | 目标 | 是否现在做 |
|---:|---|---|---|
| P2-1 | MySQL 持久化全量替换 | 解决刷新丢数据 | P0 完成后再做 |
| P2-2 | WebSocket / SSE | 执行状态流式展示 | 暂缓，开发面较大 |
| P2-3 | 真实部署集成 | Vercel / Netlify / Docker | 暂缓，风险高 |
| P2-4 | 文件附件 / 图片 | 完整富媒体消息 | P1 后再做 |
| P2-5 | 桌面端 / 移动端 | P2 加分项 | 当前不做 |
| P2-6 | 动态 DAG 引擎 | 复杂多 Agent 任务图 | 当前不做，先保 MVP 可解释性 |

## 6. 推荐立即执行顺序

1. **P0-6 仓库卫生与文档修复**：先修复文档同步和构建缓存问题，避免后续协作混乱。
2. **P0-1 真实并行多 Agent 调度 v1**：这是课题“并行调度”和“群聊协作”的硬缺口，且当前已有 parallelGroupKey 基础。
3. **P0-2 LLM Planner JSON Schema MVP**：让 Orchestrator 从规则化 Demo 迈向可配置真实 planning，但必须保持 fallback。
4. **P0-3 MemoryItem 持久化 / 检索策略**：把当前 Memory MVP 从展示能力推进到真正上下文能力。
5. **P0-4 Adapter 输出 Artifact 增强**：让真实 / 半真实 Agent 输出影响产物，而不是只出现在状态栏。
6. **P1 消息操作和 Diff 操作**：在核心平台能力稳定后再补体验细节。

## 7. 当前项目状态标签

| 标签 | 是否适合 |
|---|---|
| V0.1 骨架 | 不适合，已经明显超过 |
| 纯静态 Demo | 不准确，因为已有多条可交互链路 |
| MVP 演示闭环 | 准确 |
| 完整多 Agent 平台 | 不准确 |
| 半真实 AgentHub 原型 | 准确 |
| 可提交最终版 | 还不建议 |

最准确表述：

> AgentHub 当前是一个可运行的 MVP 原型：完成 IM 工作台、Agent 联系人、自建 Agent、多 @Agent、规则化 Orchestrator、群聊式 Agent 消息、Context / Memory、Adapter fallback、Artifact 迭代、静态部署预览和 smoke test；但真实并行调度、真实 LLM Planner、长期记忆持久化、真实部署、文件附件、多端和代码冲突处理仍处于未完成或半真实阶段。
