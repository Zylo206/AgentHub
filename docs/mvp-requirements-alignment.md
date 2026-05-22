# AgentHub MVP 课题要求对齐评估

## 1. 总体判断

当前 AgentHub 已经不是早期工程骨架，而是处于 **MVP 主链路已跑通、仍在功能补强阶段**。

一句话结论：

> AgentHub 已经形成“IM 工作台 + Agent 选择 / @Agent + Orchestrator 规则化静态编排 + Artifact 迭代 + Deploy Preview + 协作文档 + smoke test”的 MVP 闭环，但距离课题要求中的真实多 Agent 平台仍有明显差距，主要缺口是群聊多 Agent、真实 Agent 平台深度接入、消息操作、真实上下文、多端与真实部署。

| 项目阶段 | 判断 |
|---|---|
| 当前阶段 | MVP 功能扩展期，不急于最终收敛 |
| Demo 闭环 | 已形成，可阶段性展示 |
| AI 协作工作流 | 已形成，并有文档沉淀 |
| 产品完整度 | 中等偏上，核心体验有形，但多处仍是静态 / Mock / 半真实 |
| 下一步方向 | 继续补课题硬缺口，而不是马上只打磨 Demo |

## 2. 课题功能对齐表

| 课题要求 | 当前实现 | 状态 | 实现程度 | 主要缺口 |
|---|---|---|---:|---|
| IM 聊天主界面 | `/workspace` 三栏 IM 工作台，左侧会话 / Agent，中间消息流，右侧 Artifact Studio | 部分满足 | 75% | 还不是完整 IM，多窗口、多消息操作不足 |
| 对话列表 | Conversation List，可创建 Demo Conversation，可切换会话 | 部分满足 | 60% | 无置顶、归档、搜索、最近活跃排序 |
| 新建对话 | Create Demo Conversation | 部分满足 | 55% | 仍偏 Demo，会话创建参数较少 |
| 单聊模式 | selectedAgent / targetAgentId 可指向单个 Agent | 部分满足 | 55% | 不是完整 1v1 聊天线程，没有真实单 Agent 多轮执行 |
| 群聊模式 | demo-task 中有多个 TaskStep / Agent 分工 | 静态 Demo | 45% | 不支持一个会话中多个 Agent 自然轮流回复，不支持多个 @Agent |
| @Agent | 支持左侧选择 Agent、ChatInput token、文本开头 `@AgentName` 解析 | 部分满足 | 70% | 仅支持单个开头 @Agent，不支持消息中多个 @Agent |
| 多会话并行 | 内存中可有多个 Conversation，前端可切换 | 部分满足 | 50% | 不是多窗口并行，没有持久化 |
| 聊天历史上下文 | Message 保存，Orchestrator 可从 source message targetAgentId 推断 selectedAgent | 部分满足 | 45% | Agent 未真正基于完整聊天历史推理 |
| 手动 pin 上下文 | ContextSnapshot / pinned context 展示 | 静态 Demo | 35% | 用户不能手动 pin 消息 |
| 消息类型：文本 | 已支持普通消息 | 已满足 | 80% | 消息操作较少 |
| 消息类型：代码块 | Artifact 代码预览支持 code block | 部分满足 | 60% | 聊天流内代码块能力有限 |
| 消息类型：文件附件 / 图片 | 未见完整附件上传链路 | 未完成 | 0% | 需要附件模型、上传、展示 |
| 网页预览卡片 | Artifact 支持 `WEB_PREVIEW` / iframe，Preview 页面支持 iframe `srcDoc` | 部分满足 | 60% | 当前主要是静态 Artifact 内容 |
| Diff 视图卡片 | Diff Summary 面板 | 静态 Demo | 55% | 不是基于真实代码 diff |
| 部署状态卡片 | Deploy Status Card、Preview URL、`/preview/:artifactId`、smoke test 验证 200 | 静态 Demo | 70% | 不是真实部署 |
| 消息操作 | Copy URL、Artifact 选择、Revision 操作 | 部分满足 | 30% | 无回复、引用、重新生成、复制代码、一键应用 Diff |
| Orchestrator 任务拆解 | 已拆出 TaskPlanner / AgentRouter / AgentStepExecutor / ResultAggregator | 部分满足 | 65% | Planner 仍是规则化，不是 LLM 动态规划 |
| Orchestrator 分派 Agent | selectedAgent 优先，第一个 step 使用 selectedAgent；默认 Frontend / Backend / Reviewer | 部分满足 | 65% | 不支持动态多 Agent 调度 |
| Orchestrator 聚合产出 | ResultAggregator 生成 summary，TaskRun 展示结果 | 部分满足 | 60% | 聚合仍偏模板 |
| 并行调度 | 未实现 | 未完成 | 0% | 当前是顺序静态 step |
| 失败降级 | Adapter fallback 到 MOCK | 部分满足 | 60% | 只覆盖 Adapter，不是完整任务级降级 |
| 代码冲突处理 | 未实现 | 未完成 | 0% | 无冲突检测 / merge 策略 |
| 统一 Adapter 层 | AgentAdapter、Registry、Descriptor、fallback | 已满足 | 80% | 真实平台深度不足 |
| Codex 接入 | CLI 探测型 Adapter，可配置 command / args-template | 半真实 | 50% | 不是深度平台接入，不保证真实可用 |
| Claude Code 接入 | CLI 探测型 Adapter | 半真实 | 50% | 同上 |
| OpenCode 接入 | CLI 探测型 Adapter | 半真实 | 50% | 同上 |
| OpenAI Compatible Adapter | 可配置真实模型调用，未配置 fallback | 部分满足 | 65% | 非流式，产物未真实替代静态 Artifact |
| 用户自建 Agent | Agent Builder 支持 name、prompt、tags、preferredAdapterType | 部分满足 | 70% | 不是对话式创建，工具集能力偏配置展示 |
| Agent 联系人 | Agent List 显示头像、名称、状态、能力标签、Adapter 状态 | 已满足 | 80% | 联系人搜索 / 分组未做 |
| Artifact 预览 | Artifact Studio、PreviewPage、code / markdown / report / iframe | 部分满足 | 75% | 文档富渲染、真实网页产物仍弱 |
| Artifact 编辑 / 二次修改 | Demo Revision，可生成 v2 | 静态 Demo | 65% | 不是真实代码编辑或真实 Agent 修改 |
| Version History | v1 / v2 版本链，Preview 页面可切换 | 部分满足 | 75% | 版本关系仍基于轻量 lineage |
| Diff Summary | 静态 Diff Summary | 静态 Demo | 55% | 非真实 diff |
| 一键部署发布 | Demo Deploy，Deploy Status Card，Preview URL | 静态 Demo | 65% | 无真实 Vercel / Netlify / Docker |
| Web 端 | React + Vite Web 已可运行 | 已满足 | 80% | 仍需稳定性和产品细节 |
| 桌面端 | 未实现 | 未完成 | 0% | P2，可后置 |
| 移动端 | 未实现 | 未完成 | 0% | P2，可后置 |
| AI 协作记录 | docs/collaboration、dev-log、workflow、prompt-template、decision-log | 已满足 | 85% | 继续保持每轮追加 |
| 产品设计文档 | 已存在 | 部分满足 | 70% | 需随功能继续同步 |
| 技术文档 | 已存在 | 部分满足 | 70% | 需补最新 Orchestrator / Deploy / Preview / smoke test |
| 可运行 Demo | 前后端 + smoke test 主链路 | 已满足 | 80% | 需稳定启动脚本或更强验收 |
| 3 分钟 Demo 视频 | 未见成品 | 未完成 | 0% | 当前不急，可后置 |

## 3. 评分维度自评

| 评分维度 | 权重 | 当前预估 | 理由 | 下一步提升点 |
|---|---:|---:|---|---|
| AI 协作能力 | 30% | 80 / 100 | Spec / skills / rules / dev-log / workflow 已沉淀，且每轮开发有记录 | 继续保持 dev-log，补一份 AI 协作链路说明图 |
| 功能完整度 | 25% | 58 / 100 | MVP 主链路完整，但群聊、多消息操作、真实平台接入不足 | 优先补群聊最小链路、消息操作、真实 Adapter 输出进入 Artifact |
| 生成效果质量 | 20% | 68 / 100 | UI 已打磨，Artifact Studio、Preview、Deploy Card 有产品感 | 补真实 diff、代码复制、Preview 体验细节 |
| 代码理解度 | 15% | 75 / 100 | 后端分层、Orchestrator 拆分、Adapter fallback 可解释 | 技术文档要同步最新架构，否则答辩会扣分 |
| 创新与产品感 | 10% | 72 / 100 | IM + Artifact-centered iteration + Agent Builder + Deploy Preview 有辨识度 | 增加群聊 Agent 回复流和可视化 Orchestrator 解释 |

## 4. 当前已形成的 MVP 主链路

当前最稳的主链路是：

1. 打开 `/workspace`。
2. 创建 Demo Conversation。
3. 创建或选择自定义 Agent。
4. 在 ChatInput 使用 `@AgentName` 或左侧 selectedAgent。
5. 发送消息，MessageBubble 显示目标 Agent。
6. 运行 Demo Task。
7. Orchestrator 规则化规划 Frontend / Backend / Reviewer step。
8. TaskRunPanel 展示 TaskStep、assigned Agent、Adapter fallback。
9. ContextPanel 展示 ContextSnapshot / HandoffSummary。
10. Artifact Studio 展示 LoginPage、README、API Contract、Review Report。
11. 对 Artifact 执行 Revision，生成 v2。
12. 查看 Version History / Diff Summary。
13. 执行 Demo Deploy，生成 Deploy Status Card。
14. 打开 `/preview/{artifactId}`，查看静态 Artifact 预览和版本切换。
15. 运行 `node scripts/smoke-test.mjs` 验证 API + Deploy Preview URL 主链路。

这条链路适合阶段性展示，但不应被描述为最终提交版完整能力。

## 5. 当前最重要的未实现 / 弱实现缺口

| 优先级 | 缺口 | 为什么重要 | 当前程度 | 建议 |
|---:|---|---|---|---|
| 1 | 群聊多 Agent 最小闭环 | 课题明确强调群聊协作和多个 Agent 依次回复 | 当前是 TaskStep 静态分工，不是聊天群聊 | 做 Conversation participants / 多 Agent 回复消息流 |
| 2 | 真实 Adapter 输出进入 Artifact | “至少接入 2 个主流 Agent 平台”是硬要求 | CLI 探测是半真实，产物仍静态 | 选 1 个最可控 Adapter，把输出写入一个 Artifact |
| 3 | 消息操作 | IM 核心体验要求回复、引用、复制、重新生成、一键应用 Diff | 当前很弱 | 先做复制代码、引用消息、重新生成 demo-task |
| 4 | 上下文管理真实化 | 课题强调聊天历史和 pin 长期上下文 | 当前 ContextSnapshot 静态构造 | 做手动 pin 消息 + TaskRun inputContext 引用 pinned messages |
| 5 | 真实 Diff / 代码编辑 | 产物编辑要求较强 | 当前 Diff Summary 静态 | 做轻量 line diff，不必上 Monaco |
| 6 | 持久化 | 当前内存仓储刷新丢数据 | MVP 可接受，但最终展示风险高 | 若时间允许再做 MySQL；现在不是最高优先级 |
| 7 | SSE / WebSocket | 真实执行体验需要流式状态 | 当前无流式 | 可后置，先用轮询或静态状态 |
| 8 | 多端支持 | P2 加分项 | 未做 | 目前不建议做真实多端，只写产品定位和响应式基础 |

## 6. 下一阶段建议排序

| 优先级 | 任务 | 是否现在做 | 产出 |
|---:|---|---|---|
| 1 | 群聊多 Agent 最小消息流 | 建议做 | 一个 conversation 中 Orchestrator / Frontend / Backend / Reviewer 作为多条 Agent 消息依次出现 |
| 2 | 手动 pin 消息作为 Context | 建议做 | Message 操作进入上下文管理，ContextPanel 更真实 |
| 3 | 真实 Adapter 输出进入一个 Artifact | 建议做 | OPENAI_COMPATIBLE 或 CLI 成功时，可把 response 作为 Review Report / Text Artifact |
| 4 | 消息操作最小集 | 建议做 | 复制、引用、重新生成，提高 IM 评分 |
| 5 | 真实 line diff 轻量版 | 建议做 | Diff Summary 从静态摘要升级为更可信 |
| 6 | 技术文档同步最新架构 | 建议穿插做 | 解释 Orchestrator / Adapter / Deploy / Preview / smoke test |
| 7 | 启动脚本 / smoke test 文档固化 | 建议做 | 降低后续回归风险 |
| 8 | MySQL 持久化 | 暂缓 | 功能完整度加分，但会增加开发面 |
| 9 | SSE / WebSocket | 暂缓 | 展示效果好，但不是当前最高性价比 |
| 10 | 桌面端 / 移动端 | 后置 | P2，先不要展开 |

## 7. 当前阶段建议

当前不急着收敛 Demo 是合理的。现阶段不应只做视频脚本，而应继续补 2-3 个课题硬相关的 MVP 缺口。

建议接下来按这个顺序推进：

1. **群聊多 Agent 最小闭环**：让多个 Agent 在 Message Stream 中可见地依次回复。
2. **Context pin 最小闭环**：把聊天历史 / 长期上下文从展示变成用户可操作。
3. **真实 Adapter 输出进入 Artifact**：至少让一个半真实 Adapter 的输出成为可见产物。
4. **消息操作最小集**：复制、引用、重新生成。
5. **技术文档同步**：把新增能力写入 technical-design / roadmap。

暂时不要优先做：

- MySQL。
- WebSocket / SSE。
- 桌面端 / 移动端。
- 复杂 Workflow Canvas。
- 完整真实部署。
- 多 Agent 动态 DAG 引擎。

## 8. 当前项目状态标签

| 标签 | 是否适合 |
|---|---|
| V0.1 骨架 | 不适合，已经明显超过 |
| 静态 Demo | 不准确，因为已有多条可交互链路 |
| MVP 演示闭环 | 准确 |
| 完整多 Agent 平台 | 不准确 |
| 半真实 AgentHub 原型 | 准确 |
| 可提交最终版 | 还不建议 |

最准确表述：

> AgentHub 当前是一个可运行的 MVP 原型：完成 IM 工作台、Agent 联系人、自建 Agent、@Agent 最小链路、规则化 Orchestrator、Adapter fallback、Artifact 迭代、静态部署预览和 smoke test；但群聊多 Agent、真实平台深度接入、真实上下文、消息操作和真实部署仍处于未完成或半真实阶段。
