# AgentHub UI Audit

本文档用于固化 AgentHub 当前 UI 审计结论，避免设计判断只散落在 dev-log 或对话上下文中。

## 设计方向

- 产品定位：IM-first 多 Agent 协作平台，不是普通 SaaS 表单后台。
- 视觉方向：technical command center + premium collaboration studio。
- 页面语言：中文优先，后端状态枚举保留英文以便和 API / smoke test 对齐。
- 设计参数：`DESIGN_VARIANCE=7`，`MOTION_INTENSITY=3-4`，`VISUAL_DENSITY=7-8`。
- 核心原则：信息密度高，但必须通过分区、badge、timeline、diagnostic panel 和稳定 CTA 控制认知负担。

## 全局保留项

- 保留 `/workspace` 三栏结构：Conversation / Agent 左栏，MessageStream 中栏，Artifact / Context / TaskRun 右侧工作区。
- 保留 Mock / fallback / static / fixture 状态可见性，不为了视觉简化隐藏真实边界。
- 保留 Approval Gate、Action Audit、Context explain、Adapter quality、REAL_ADAPTER metadata 这些信任面板。
- 保留 Browser E2E 作为 Workspace / ArtifactPanel / Approval / Preview 大改后的固定回归门禁。

## 审计清单

| 区域 | 当前状态 | 保留 | 已重做 / 已增强 | 后续建议 |
|---|---|---|---|---|
| `/workspace` Shell | 已产品化 | 三栏 IM 工作台 | command-center 背景、sticky panel header、中文主路径提示 | 后续可拆分更多 page-level 子组件 |
| Conversation List | 已增强 | 会话切换、新建会话 | IM 会话卡片、状态摘要、主路径文案 | 可补搜索、置顶、归档 |
| Agent List | 已增强 | Agent 联系人、能力标签、adapter 状态 | presence dot、capability 摘要、adapter health | 可补分组、搜索、真实在线状态 |
| MessageStream | 已增强 | 文本、附件、协议消息、确认卡 | TASK / RESULT / REVIEW / APPROVAL / REJECTION / ERROR 协议视觉、Orchestrator / Specialist 区分、streaming 状态条 | 可继续增强回复线程和单条 Agent retry |
| TaskRunPanel | 已增强 | TaskRun / TaskStep / Adapter / Decision Log | 质量门禁、Stop / Cancel、parallel batch、真实输出状态说明 | 可继续拆分 Executor / Decision / Quality 子面板 |
| ArtifactPanel | 已重做 | Artifact list、revision、diff、snapshot、deploy | Artifact Cockpit、Delivery Workbench、diagnostic panel、risk summary、snapshot timeline、release panel | 组件仍大，应继续拆分 revision / approval / diff 子组件 |
| ContextPanel | 已增强 | Pinned context、Memory、ContextSnapshot、Handoff | List / Grep / Read pipeline、score breakdown、matched tokens、read window | 可补 source preview 和跳转 |
| Adapter Dashboard | 已增强 | Adapter descriptor、quality metrics | KPI cards、failure taxonomy、highest-risk adapter | 可补趋势图和 adapter-specific drilldown |
| PreviewPage | 已增强 | `/preview/:artifactId`、版本切换、内容预览 | Preview Studio、trust status、source metadata、local-static boundary | 可做更强的独立预览布局和窄屏 QA |

## 当前边界

- Deploy Preview 是本地静态预览，不是真实云部署。
- Streaming UI 是执行体验增强，最终 Artifact 仍以后端 contract / quality / build 校验为准。
- Context Search 是 DB-backed Agentic Search + heuristic scoring；embedding/vector search 仍为后置增强。
- Adapter health 和 quality dashboard 展示当前观测指标，不代表所有外部 Agent 的长期生产 SLA。
- 当前响应式主要是窄屏保护，不是完整移动端产品。

## 下一步 UI 建议

1. 继续拆分 `WorkspacePage`：将 realtime / audit / selected agent / right panel orchestration 拆成更小组件。
2. 继续拆分 `ArtifactPanel`：将 approval gate、revision box、diff apply、content preview 拆成独立子组件。
3. 为 diagnostic / release / snapshot timeline 增加更细的 `data-testid`，提高 Browser E2E 定位稳定性。
4. 做一次窄屏视觉 QA，但不要把它包装成完整移动端。
