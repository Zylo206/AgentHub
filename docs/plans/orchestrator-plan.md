# Orchestrator Plan

本计划记录主 Agent Orchestrator 的演进路线。目标是让主 Agent 更像 PM / PMO：理解任务、拆解、路由、执行、聚合、解释和处理失败。

## 当前状态

- `Done` `TaskPlanner`：规则化 planning，支持 selectedAgent、mentioned agents、default demo task。
- `Done` `AgentRouter`：处理 selectedAgent、mentionedAgentIds、built-in agents、Tool Capability。
- `Done` `AdapterRoutingService`：引入 adapter health、success rate、fallback penalty、preferred bonus。
- `Done` `AgentStepExecutor`：执行 Agent request，记录 adapter fallback 和 output 质量字段。
- `Done` `ResultAggregator`：生成 TaskRun summary 和 Orchestrator 汇总消息。
- `Done` `OrchestratorPlan` / `OrchestratorStepPlan`。
- `Done` `TaskGraph` / `ExecutionBatch`。
- `Done` multi-mention Agent 进入多个 custom Agent step。
- `Done` LLM Planner JSON Schema MVP，失败 fallback RuleBased。
- `Done` Prompt Layering。
- `Done` Orchestrator Decision Log。
- `Done` Reviewer REJECTION -> BLOCKED -> retry / revise 建议。

## 活跃计划

### P0：真实动态 planning 稳定化

- 继续让 LLM Planner 只输出 plan，不直接生成最终 Artifact。
- 严格 schema 校验。
- schema 不合格、timeout、adapter failure 时 fallback RuleBased。
- Explain panel 展示 planner mode、fallback reason、prompt layering 摘要。

### P0：TaskGraph 执行语义继续收敛

- 同一 batch 内并行执行。
- 后续 batch 等依赖完成。
- cancel / stop token 影响 step 执行。
- TaskRunPanel 展示 batch status、duration、failure policy。

### P1：Failure Recovery

- Reviewer REJECTION 后可触发 revise 建议。
- 后续可实现更明确的 retry policy：
  - retry same Agent
  - route to Reviewer
  - create revision task
  - ask user approval
- 不做完整动态 DAG 引擎前，保持路径可解释、可验收。

## 暂缓

- 完整 DAG 编辑器。
- Workflow Canvas。
- LLM 自由生成可执行 workflow。
- 跨会话全局调度。
- 多 Agent 自治长期运行。

## 边界

Orchestrator 已具备 MVP 协调器形态，但仍不是完整自主多 Agent 系统。当前重点是可解释、可 fallback、可验证，而不是黑箱自治。
