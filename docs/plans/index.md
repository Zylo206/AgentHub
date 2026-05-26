# AgentHub Plans Index

本文档目录用于把之前 Plan Mode 和 `docs/collaboration/dev-log.md` 中的阶段计划项目化，避免重要路线只散落在对话上下文或开发日志里。

## 来源范围

- 主要来源：`docs/collaboration/dev-log.md` Phase 40 - Phase 84。
- 辅助来源：`docs/roadmap.md`、`docs/technical-design.md`、`docs/persistence-plan.md` 中已经同步过的能力边界。
- 本目录记录的是产品 / 架构 / 工程计划，不替代 `dev-log.md` 的逐轮开发记录。

## 当前阶段判断

AgentHub 当前处于 MVP 增强后期，已经具备 IM Workspace、多 Agent 联系人、自建 Agent、多 `@Agent`、规则化 / LLM fallback Orchestrator、TaskGraph、REAL_ADAPTER Artifact、Artifact Revision、Approval / Audit、Deploy Preview、SSE 实时刷新、API smoke test 等闭环。

但项目仍不是完整生产级多 Agent 平台。当前核心路线是继续从 static / mock / half-real 能力切到真实动态能力，同时保留默认可运行的 fallback。

## 文档地图

| 文件 | 用途 |
|---|---|
| `active-roadmap.md` | 当前建议优先推进的 P0 / P1 任务 |
| `completed-roadmap.md` | Phase 40-84 中已经落地的能力归档 |
| `deferred-roadmap.md` | 明确后置的能力和暂缓原因 |
| `real-adapter-plan.md` | OpenAI-compatible、REAL_FIRST、REAL_ADAPTER 质量闭环计划 |
| `persistence-plan.md` | memory / JDBC / MySQL 验证路线 |
| `realtime-plan.md` | SSE、Realtime State、WebSocket control、token streaming 路线 |
| `orchestrator-plan.md` | Planner / Router / Executor / Aggregator、TaskGraph、多 Agent 调度路线 |
| `productionization-plan.md` | 附件、安全边界、质量指标、仓库卫生、验证脚本等生产化计划 |

## 状态约定

- `Done`：已经进入代码或文档主线，并通过至少一次构建 / smoke / 手动验证。
- `Active`：近期应继续推进，已经具备实现基础。
- `Deferred`：有价值，但当前阶段不应优先做，避免扩大工程面。
- `Boundary`：必须明确不夸大的能力边界，例如 fixture 不等于真实 provider、static preview 不等于真实部署。

## 使用方式

1. 每次开新开发轮次前，先看 `active-roadmap.md`。
2. 涉及专题能力时，优先看对应专题计划。
3. 开发完成后继续追加 `docs/collaboration/dev-log.md`。
4. 如果路线变化，同步更新本目录，而不是只把计划留在对话里。
